"use client";
import { useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel } from "../ui/Primitives";
import { btn, btnGhost, chip } from "../ui/styleHelpers";
import { EXAMPLES } from "./TopBar";

function Welcome() {
  const { loadTicker } = useStore();
  return (
    <div style={{ maxWidth: 760, margin: "60px auto", textAlign: "center" }}>
      <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: T.amber, fontWeight: 700, marginBottom: 14 }}>Fundamental Analysis Engine</div>
      <h1 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 14px", letterSpacing: -1, lineHeight: 1.05 }}>
        Quanto vale <span style={{ background: `linear-gradient(120deg,${T.green},${T.amber})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>davvero</span> un'azione?
      </h1>
      <p style={{ color: T.sub, fontSize: 15, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 28px" }}>
        Stima il <b style={{ color: T.text }}>fair value</b> con 7 modelli — dal modello a scenari di Sven Carlin
        (replica fedele del suo Excel) a DCF, Graham, Lynch, Owner Earnings e valutazione relativa.
        Modifica ogni ipotesi e vedi il valore intrinseco ricalcolarsi in tempo reale.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {EXAMPLES.slice(0, 6).map(t => <button key={t} onClick={() => loadTicker(t)} style={{ ...chip(), padding: "8px 16px", fontSize: 13 }}>{t}</button>)}
      </div>
      <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, textAlign: "left" }}>
        {[["7 modelli di valutazione", "Sven Carlin, DCF, Relative, Graham, Lynch, Owner Earnings, Margin of Safety"],
          ["Ricalcolo istantaneo", "Ogni slider aggiorna fair value, upside e grafici in tempo reale"],
          ["Dati liberi + manuale", "Catena di provider gratuiti o inserimento manuale con validazione"]].map(([h, b], i) => (
          <div key={i} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>{h}</div>
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.5 }}>{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function LoadingState() {
  return <div style={{ display: "grid", placeItems: "center", height: 400, color: T.sub }}>
    <div style={{ textAlign: "center" }}><RefreshCw size={28} color={T.amber} style={{ animation: "spin 1s linear infinite" }} />
      <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 13 }}>Recupero dati finanziari…</div></div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}
function ManualEntry() {
  const { state, dispatch } = useStore();
  const emptyF = { ticker: "", name: "", currency: "USD", price: "", shares: "", eps: "", bvps: "", revenue: "", netIncome: "", ebitda: "", ebit: "", fcf: "", operatingCashFlow: "", capex: "", depreciation: "", cash: "", debt: "", dividendYield: "", epsGrowth: "" };
  const [f, setF] = useState(() => {
    if (!state.data) return emptyF;
    const d = state.data;
    const toStr = (v) => (v === null || v === undefined || !isFinite(v)) ? "" : String(v);
    return {
      ticker: d.ticker || "", name: d.name || "", currency: d.currency || "USD",
      price: toStr(d.price), shares: toStr(d.shares), eps: toStr(d.eps), bvps: toStr(d.bvps),
      revenue: toStr(d.revenue), netIncome: toStr(d.netIncome), ebitda: toStr(d.ebitda), ebit: toStr(d.ebit),
      fcf: toStr(d.fcf), operatingCashFlow: toStr(d.operatingCashFlow), capex: toStr(d.capex),
      depreciation: toStr(d.depreciation), cash: toStr(d.cash), debt: toStr(d.debt),
      dividendYield: toStr(d.dividendYield), epsGrowth: toStr(d.epsGrowth),
    };
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const fields = [["ticker", "Ticker *"], ["name", "Nome"], ["price", "Prezzo *"], ["shares", "Azioni (n)"], ["eps", "EPS"], ["bvps", "Book Value/share"], ["revenue", "Revenue"], ["netIncome", "Net Income"], ["ebitda", "EBITDA"], ["ebit", "EBIT"], ["fcf", "Free Cash Flow"], ["operatingCashFlow", "Operating CF"], ["capex", "CapEx"], ["depreciation", "D&A"], ["cash", "Cash"], ["debt", "Debt"], ["dividendYield", "Div Yield (0-1)"], ["epsGrowth", "EPS Growth (0-1)"]];
  const submit = () => {
    if (!f.ticker || !f.price) return;
    const data = { source: "Manuale", ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, ["ticker", "name", "currency"].includes(k) ? v : (v === "" ? null : parseFloat(v))])) };
    data.ticker = f.ticker.toUpperCase(); data.name = f.name || data.ticker; data.currency = f.currency || "USD";
    dispatch({ type: "LOADED", data, status: { live: false, source: "Manuale", note: "Dati inseriti manualmente." } });
  };
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <Panel title="Inserimento manuale" subtitle="Compila i campi noti (minimo: Ticker e Prezzo). I calcoli useranno solo i dati disponibili.">
        {state.error && <div style={{ background: "rgba(239,75,91,.1)", border: `1px solid ${T.redDim}`, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: T.red, marginBottom: 16, display: "flex", gap: 8 }}><AlertTriangle size={16} />{state.error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {fields.map(([k, lbl]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>{lbl}</div>
              <input value={f[k]} onChange={set(k)} placeholder={k === "shares" ? "es. 15200000000" : ""}
                style={{ width: "100%", background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", color: T.text, fontSize: 12.5, fontFamily: MONO, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button onClick={submit} style={btn(T.green)}>Calcola fair value</button>
          <button onClick={() => dispatch({ type: "MANUAL", open: false })} style={btnGhost()}>Annulla</button>
        </div>
      </Panel>
    </div>
  );
}

export { Welcome, LoadingState, ManualEntry };
