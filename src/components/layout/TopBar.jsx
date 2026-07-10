"use client";
import { useState } from "react";
import { Search, Zap, Database, SquarePen } from "lucide-react";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Badge } from "../ui/Primitives";
import { btn, chip } from "../ui/styleHelpers";
import { fmtNum, fmtPct } from "@/services/formatters";

export const EXAMPLES = ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "ASML", "KO", "JPM"];

function TopBar() {
  const { state, val, loadTicker, dispatch } = useStore();
  const [q, setQ] = useState("");
  const d = state.data;
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(10,11,14,.86)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}`, padding: "12px 26px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 0 320px" }}>
          <Search size={15} color={T.muted} style={{ position: "absolute", left: 12, top: 11 }} />
          <input value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loadTicker(q)}
            placeholder="Cerca ticker (es. AAPL, MSFT, NVDA)…"
            style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 12px 9px 34px", color: T.text, fontSize: 13, fontFamily: MONO, outline: "none" }} />
        </div>
        <button onClick={() => loadTicker(q)} style={btn(T.amber)}>Analizza</button>
        {d && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: 4 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name} <span style={{ color: T.muted, fontWeight: 500, fontFamily: MONO }}>{d.ticker}</span></div>
              <div style={{ fontSize: 11, color: T.sub }}>{d.sector || "—"} · {d.currency || "USD"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700 }}>{fmtNum(d.price)}</div>
              {val && <div style={{ fontSize: 11, fontFamily: MONO, color: val.upside >= 0 ? T.green : T.red }}>
                Fair {fmtNum(val.composite)} · {val.upside >= 0 ? "+" : ""}{fmtPct(val.upside, 0)}
              </div>}
            </div>
            {val && <Badge label={val.rating.label} tone={val.rating.tone} />}
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {state.dataStatus && (
            <span style={{ fontSize: 10.5, color: state.dataStatus.live ? T.green : T.amber, fontFamily: MONO, display: "flex", alignItems: "center", gap: 5 }}>
              {state.dataStatus.live ? <Zap size={12} /> : <Database size={12} />}{state.dataStatus.source}
            </span>
          )}
          {d && (
            <button onClick={() => dispatch({ type: "MANUAL", open: true })} style={chip()} title="Correggi o completa i dati fondamentali mancanti">
              <SquarePen size={11} style={{ marginRight: 4, verticalAlign: -2 }} />Modifica dati
            </button>
          )}
        </div>
      </div>
      {!d && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {EXAMPLES.map(t => <button key={t} onClick={() => { setQ(t); loadTicker(t); }} style={chip()}>{t}</button>)}
        </div>
      )}
    </div>
  );
}

export { TopBar };
