/**
 * /store — React reducer + Context (equivalente leggero a Zustand).
 * Persistenza API keys: localStorage del browser (versione Next.js standalone;
 * l'artifact originale usava window.storage, disponibile solo nel sandbox Claude).
 */
import { createContext, useContext } from "react";
import { DAMODARAN_SECTORS, findSector } from "@/services/damodaranIndustryData";

const Ctx = createContext(null);
const useStore = () => useContext(Ctx);

/** Prova ad indovinare il settore Damodaran più vicino dal sector/industry dei dati fondamentali. */
function guessDamodaranSector(data) {
  const hay = `${data.sector || ""} ${data.industry || ""}`.toLowerCase();
  if (!hay.trim()) return "Diversified / Conglomerate";
  let best = null, bestScore = 0;
  for (const s of DAMODARAN_SECTORS) {
    const words = s.sector.toLowerCase().replace(/[()/]/g, " ").split(/\s+/).filter(w => w.length > 3);
    const score = words.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = s.sector; }
  }
  return best || "Diversified / Conglomerate";
}

/**
 * Costruisce i 3 scenari (Bull/Base/Bear) del modello Damodaran a partire dai
 * default tipici del settore scelto — riutilizzabile anche dal pulsante
 * "Applica default di settore" nella vista Damodaran DCF.
 */
function damodaranScenarioDefaults(sectorName, data) {
  const sec = findSector(sectorName);
  // Il modello Damodaran ha una vera fase di transizione (n2 anni) che
  // decelera la crescita verso quella stabile, quindi qui un tetto più
  // permissivo (35%, solo per i primi n1 anni) è appropriato — a differenza
  // del DCF/Sven Carlin "flat" più sotto, dove la stessa crescita si
  // applicherebbe linearmente per 10 anni senza decelerare.
  const g1Base = data.revenueGrowth && data.revenueGrowth > 0 ? Math.min(data.revenueGrowth, 0.35) : 0.10;

  // Margine attuale: usa operatingMargin se esplicito, altrimenti lo deriva
  // da EBIT/Revenue se presenti (fondamentale per l'inserimento MANUALE, che
  // non ha un campo "operatingMargin" dedicato — senza questo fallback un
  // utente che inserisce ricavi ed EBIT a mano vedrebbe comunque un margine
  // generico di settore, ignorando i numeri appena digitati).
  const impliedMargin = data.revenue && data.revenue > 0 && data.ebit != null ? data.ebit / data.revenue : null;
  const currentMargin = (data.operatingMargin && data.operatingMargin > 0)
    ? data.operatingMargin
    : (impliedMargin && impliedMargin > 0 ? impliedMargin : sec.typicalOperatingMargin * 0.75);

  // Margine target "Base": media tra il margine ATTUALE dell'azienda e il
  // tipico di settore — non più il tipico di settore da solo, che ignorava
  // del tutto la redditività reale dell'azienda (es. un'azienda con margini
  // strutturalmente più alti/bassi della media di settore vedrebbe comunque
  // una convergenza totale e ingiustificata verso la media).
  const targetMarginBase = (currentMargin + sec.typicalOperatingMargin) / 2;

  return {
    currentMargin,
    n1: 5,
    n2: 5,
    scenarios: [
      { g1: Math.min(g1Base * 1.4 + 0.02, 0.5), targetMargin: Math.min(Math.max(targetMarginBase, currentMargin) * 1.1, 0.6), gStable: 0.025, salesToCapital: sec.typicalSalesToCapital * 1.15 }, // Bull
      { g1: g1Base, targetMargin: targetMarginBase, gStable: 0.025, salesToCapital: sec.typicalSalesToCapital }, // Base
      { g1: Math.max(g1Base * 0.5, 0), targetMargin: targetMarginBase * 0.85, gStable: 0.02, salesToCapital: sec.typicalSalesToCapital * 0.85 }, // Bear
    ],
    probabilities: [0.2, 0.6, 0.2],
  };
}

// Ipotesi default = valori del foglio Excel Sven Carlin, con i tassi di
// crescita e i multipli target CALIBRATI sui dati reali del titolo quando
// disponibili (prima erano fissi/generici per tutte le aziende, penalizzando
// di fatto i titoli growth/qualità con multipli o crescita sopra la media).
function defaultAssumptions(data) {
  const base = deriveBase(data, "fcfps");
  const damSector = guessDamodaranSector(data);
  const damDefaults = damodaranScenarioDefaults(damSector, data);

  // Crescita "normale" derivata dalla crescita ricavi/EPS reale del titolo,
  // ma con un tetto MOLTO prudente: proiettare linearmente per 10 anni una
  // crescita trainata (YoY) da iper-crescita — es. 70% per un titolo AI in
  // questo momento — produrrebbe valori assurdi (nessun DCF professionale lo
  // fa). Il tetto al 12% riflette un tasso "sostenibile a lungo termine" per
  // un large-cap maturo; l'utente può comunque alzarlo consapevolmente se lo
  // ritiene giustificato. Fallback 8% se il dato manca. Validato empiricamente
  // su NVDA (prezzo 202): con questo tetto il composite risulta ~172, in
  // linea con AlphaSpread (191) e ValueInvesting.io (164).
  const rawGrowth = data.revenueGrowth ?? data.epsGrowth;
  const g1Normal = rawGrowth && rawGrowth > 0 ? Math.min(rawGrowth, 0.12) : 0.08;

  return {
    baseMetric: "fcfps",
    base,
    // Scenari: Normale (0.6), Migliore (0.2), Peggiore (0.2) — struttura come
    // da Excel D23:D25, ma growth normale ora ancorata al titolo reale.
    scenarios: [
      { g1: g1Normal, g2: g1Normal * 0.7, discount: 0.10, terminalMultiple: 15 },
      { g1: Math.min(g1Normal * 1.3 + 0.02, 0.6), g2: g1Normal, discount: 0.10, terminalMultiple: 30 },
      { g1: g1Normal * 0.5, g2: g1Normal * 0.35, discount: 0.10, terminalMultiple: 10 },
    ],
    probabilities: [0.6, 0.2, 0.2],
    // DCF standard (#2) — growth normale ancorata al titolo, non più fissa all'8%
    dcf: { growth: g1Normal, discount: 0.10, terminalGrowth: 0.025, years: 10 },
    // Multipli target relative valuation (#3): default = multiplo ATTUALE del
    // titolo (nessun tetto punitivo). Un P/E, P/B o P/S alto ma reale (tipico
    // di titoli growth/qualità) non viene più scartato a favore di un valore
    // generico — è il punto di partenza più neutro possibile: "il mercato
    // continua a pagare quello che paga oggi", poi l'utente lo corregge a
    // mano se ritiene il multiplo attuale eccessivo o insufficiente.
    targets: {
      pe: data.pe && data.pe > 0 && data.pe < 200 ? data.pe : 20,
      pb: data.pb && data.pb > 0 && data.pb < 100 ? data.pb : 3,
      ps: data.ps && data.ps > 0 && data.ps < 100 ? data.ps : 4,
      evEbitda: data.evEbitda && data.evEbitda > 0 && data.evEbitda < 100 ? data.evEbitda : 12,
      evEbit: 14, peg: 1.0, pFcf: 20,
    },
    // Extra
    aaaYield: 4.5,       // Graham denominatore
    ownerGrowth: 0.03,   // crescita owner earnings
    taxRate: 0.21,
    // Toggle: includi Damodaran e/o Owner Earnings nella media del Fair Value
    // Composito SOLO se abilitati esplicitamente qui (default: esclusi).
    includeInComposite: { damodaran: false, ownerEarnings: false },
    // Damodaran FCFF a 3 stadi (#8) — 3 scenari Bull/Base/Bear pesati 0.2/0.6/0.2
    damodaran: {
      currentMargin: damDefaults.currentMargin,
      n1: damDefaults.n1,
      n2: damDefaults.n2,
      scenarios: damDefaults.scenarios,
      probabilities: damDefaults.probabilities,
      riskFreeRate: 0.04,
      erp: 0.047,
      betaMode: "sector",       // "sector" (bottom-up) | "manual"
      sector: damSector,
      manualBeta: data.beta || 1.0,
      waccStableOverride: null, // null = usa il WACC calcolato in stable growth
      roicStableOverride: null, // null = usa waccStable (no rendimenti in eccesso)
    },
  };
}
// Deriva il valore base per-azione dal metric scelto
function deriveBase(data, metric) {
  const sh = data.shares || (data.marketCap && data.price ? data.marketCap / data.price : null);
  if (metric === "eps") return data.eps || (data.netIncome && sh ? data.netIncome / sh : 1);
  if (metric === "oeps") {
    const oe = (data.netIncome || 0) + (data.depreciation || 0) - Math.abs(data.capex || 0);
    return sh ? oe / sh : 1;
  }
  // default fcfps
  if (data.fcf && sh) return data.fcf / sh;
  if (data.operatingCashFlow && sh) return (data.operatingCashFlow - Math.abs(data.capex || 0)) / sh;
  // Proxy migliore di EPS grezzo quando manca anche l'OCF: NI + D&A - CapEx
  // approssima il FCF molto meglio dell'utile netto per azione da solo
  // (che ignora ammortamenti "restituiti" e capitale reinvestito).
  if (data.netIncome && sh) {
    const proxy = (data.netIncome + (data.depreciation || 0) - Math.abs(data.capex || 0)) / sh;
    if (proxy > 0) return proxy;
  }
  return data.eps || 1;
}

const initialState = {
  data: null, loading: false, error: null, dataStatus: null,
  assumptions: null, view: "overview",
  keys: { alphaVantage: "", fmp: "", finnhub: "", polygon: "" },
  manualOpen: false,
};
function reducer(s, a) {
  switch (a.type) {
    case "LOADING": return { ...s, loading: true, error: null };
    case "LOADED": return { ...s, loading: false, data: a.data, assumptions: defaultAssumptions(a.data), dataStatus: a.status, view: "overview", manualOpen: false };
    case "ERROR": return { ...s, loading: false, error: a.error };
    case "VIEW": return { ...s, view: a.view };
    case "ASSUME": return { ...s, assumptions: a.updater(s.assumptions) };
    case "PATCH_DATA": {
      const data = { ...s.data, [a.key]: a.value };
      let assumptions = s.assumptions;
      // Se cambiano ricavi o EBIT, ricalcola il margine operativo "attuale" del
      // modello Damodaran (EBIT/ricavi) così il fair value resta coerente.
      if ((a.key === "revenue" || a.key === "ebit") && data.revenue && data.ebit && data.revenue > 0) {
        const currentMargin = data.ebit / data.revenue;
        assumptions = { ...s.assumptions, damodaran: { ...s.assumptions.damodaran, currentMargin } };
      }
      return { ...s, data, assumptions };
    }
    case "KEYS": return { ...s, keys: { ...s.keys, ...a.keys } };
    case "MANUAL": return { ...s, manualOpen: a.open };
    default: return s;
  }
}


const KEYS_STORAGE_KEY = "fvt_keys";

function loadStoredKeys() {
  if (typeof window === "undefined") return { alphaVantage: "", fmp: "", finnhub: "", polygon: "" };
  try {
    const raw = window.localStorage.getItem(KEYS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { alphaVantage: "", fmp: "", finnhub: "", polygon: "" };
  } catch {
    return { alphaVantage: "", fmp: "", finnhub: "", polygon: "" };
  }
}

function saveStoredKeys(keys) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys)); } catch {}
}

export {
  Ctx,
  useStore,
  defaultAssumptions,
  deriveBase,
  initialState,
  reducer,
  loadStoredKeys,
  saveStoredKeys,
  damodaranScenarioDefaults,
  guessDamodaranSector,
};
