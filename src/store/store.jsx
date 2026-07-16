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
  const g1Base = data.revenueGrowth && data.revenueGrowth > 0 && data.revenueGrowth < 0.5 ? data.revenueGrowth : 0.10;
  const currentMargin = data.operatingMargin && data.operatingMargin > 0 ? data.operatingMargin : sec.typicalOperatingMargin * 0.75;
  return {
    currentMargin,
    n1: 5,
    n2: 5,
    scenarios: [
      { g1: Math.min(g1Base * 1.4 + 0.02, 0.5), targetMargin: Math.min(sec.typicalOperatingMargin * 1.15, 0.6), gStable: 0.025, salesToCapital: sec.typicalSalesToCapital * 1.15 }, // Bull
      { g1: g1Base, targetMargin: sec.typicalOperatingMargin, gStable: 0.025, salesToCapital: sec.typicalSalesToCapital }, // Base
      { g1: Math.max(g1Base * 0.5, 0), targetMargin: sec.typicalOperatingMargin * 0.85, gStable: 0.02, salesToCapital: sec.typicalSalesToCapital * 0.85 }, // Bear
    ],
    probabilities: [0.2, 0.6, 0.2],
  };
}

// Ipotesi default = valori del foglio Excel Sven Carlin
function defaultAssumptions(data) {
  const base = deriveBase(data, "fcfps");
  const damSector = guessDamodaranSector(data);
  const damDefaults = damodaranScenarioDefaults(damSector, data);
  return {
    baseMetric: "fcfps",
    base,
    // Scenari: Normale (0.6), Migliore (0.2), Peggiore (0.2) — come Excel D23:D25
    scenarios: [
      { g1: 0.08, g2: 0.08, discount: 0.10, terminalMultiple: 15 }, // normal (righe 5-8)
      { g1: 0.10, g2: 0.10, discount: 0.10, terminalMultiple: 30 }, // best   (righe 11-14)
      { g1: 0.04, g2: 0.04, discount: 0.10, terminalMultiple: 10 }, // worst  (righe 17-20)
    ],
    probabilities: [0.6, 0.2, 0.2],
    // DCF standard (#2)
    dcf: { growth: 0.08, discount: 0.10, terminalGrowth: 0.025, years: 10 },
    // Multipli target relative valuation (#3) — default = attuali del titolo se noti
    targets: {
      pe: data.pe && data.pe < 60 ? Math.min(data.pe, 25) : 20,
      pb: data.pb && data.pb < 20 ? data.pb : 3,
      ps: data.ps && data.ps < 15 ? data.ps : 4,
      evEbitda: data.evEbitda && data.evEbitda < 40 ? data.evEbitda : 12,
      evEbit: 14, peg: 1.0, pFcf: 20,
    },
    // Extra
    aaaYield: 4.5,       // Graham denominatore
    ownerGrowth: 0.03,   // crescita owner earnings
    taxRate: 0.21,
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
  if (data.operatingCashFlow && data.capex && sh) return (data.operatingCashFlow - Math.abs(data.capex)) / sh;
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
