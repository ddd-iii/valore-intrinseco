"use client";
/**
 * MAIN CONTAINER — monta Sidebar + TopBar + area contenuti, gestisce lo
 * store globale (reducer) e il caricamento dati (provider chain -> sample
 * -> inserimento manuale).
 */
import { useReducer, useEffect, useCallback } from "react";
import { LayoutDashboard, Scale, Target, Activity, Layers, DollarSign, BarChart3, Percent, Sliders, FileText, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { T, SANS } from "@/lib/theme";
import { Ctx, initialState, reducer, loadStoredKeys } from "@/store/store";
import { useValuations } from "@/hooks/useValuations";
import { fetchCompany } from "@/providers/dataProviders";
import { SAMPLE } from "@/services/sampleData";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Welcome, LoadingState, ManualEntry } from "./Shell";
import { Views } from "../views/Views";

export const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "valuation", label: "Valuation", icon: Scale },
  { id: "intrinsic", label: "Intrinsic Value", icon: Target },
  { id: "dcf", label: "DCF", icon: Activity },
  { id: "relative", label: "Relative", icon: Layers },
  { id: "financials", label: "Financials", icon: DollarSign },
  { id: "charts", label: "Charts", icon: BarChart3 },
  { id: "ratios", label: "Ratios", icon: Percent },
  { id: "assumptions", label: "Assumptions", icon: Sliders },
  { id: "report", label: "Report", icon: FileText },
  { id: "ai", label: "AI Analysis", icon: Sparkles },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function FairValueTerminal() {
  const [s, dispatch] = useReducer(reducer, initialState);
  const val = useValuations(s.data, s.assumptions);

  // Carica chiavi salvate (window.storage sanzionato per artifact)
  useEffect(() => {
    (async () => {
      const stored = loadStoredKeys(); dispatch({ type: "KEYS", keys: stored });
    })();
  }, []);

  const loadTicker = useCallback(async (ticker) => {
    const tk = ticker.trim().toUpperCase();
    if (!tk) return;
    dispatch({ type: "LOADING" });
    // 1) prova la catena provider (funziona con key gratuite)
    try {
      const data = await fetchCompany(tk, s.keys);
      dispatch({ type: "LOADED", data, status: { live: true, source: data.source } });
      return;
    } catch (e) {
      // 2) fallback: dati campione se disponibili
      if (SAMPLE[tk]) {
        dispatch({ type: "LOADED", data: SAMPLE[tk], status: { live: false, source: SAMPLE[tk].source, note: "Dati campione — aggiungi una API key gratuita in Settings per dati live, oppure modifica i valori in Assumptions." } });
        return;
      }
      // 3) inserimento manuale
      dispatch({ type: "ERROR", error: `Nessun dato per ${tk}. Aggiungi una API key gratuita in Settings o inserisci i dati manualmente.` });
      dispatch({ type: "MANUAL", open: true });
    }
  }, [s.keys]);

  const ctx = { state: s, dispatch, val, loadTicker };

  return (
    <Ctx.Provider value={ctx}>
      <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar />
          <div style={{ padding: "20px 26px", flex: 1 }}>
            {!s.data && !s.loading && <Welcome />}
            {s.loading && <LoadingState />}
            {s.manualOpen && <ManualEntry />}
            {s.data && val && <Views />}
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}

export { FairValueTerminal };
