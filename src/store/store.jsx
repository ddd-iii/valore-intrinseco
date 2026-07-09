/**
 * /store — React reducer + Context (equivalente leggero a Zustand).
 * Persistenza API keys: localStorage del browser (versione Next.js standalone;
 * l'artifact originale usava window.storage, disponibile solo nel sandbox Claude).
 */
import { createContext, useContext } from "react";

const Ctx = createContext(null);
const useStore = () => useContext(Ctx);

// Ipotesi default = valori del foglio Excel Sven Carlin
function defaultAssumptions(data) {
  const base = deriveBase(data, "fcfps");
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
};
