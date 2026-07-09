"use client";
import { Sliders } from "lucide-react";
import { T } from "@/lib/theme";
import { useStore, deriveBase } from "@/store/store";
import { Panel, Ctrl } from "../ui/Primitives";
import { fmtNum } from "@/services/formatters";

function Assumptions() {
  const { state, dispatch } = useStore();
  const a = state.assumptions, d = state.data;
  const setBaseMetric = (m) => dispatch({ type: "ASSUME", updater: (as) => ({ ...as, baseMetric: m, base: deriveBase(d, m) }) });
  const setF = (path, v) => dispatch({ type: "ASSUME", updater: (as) => { const n = structuredClone(as); path(n, v); return n; } });
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ background: "rgba(245,166,35,.06)", border: `1px solid ${T.amber}33`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: T.sub, display: "flex", gap: 8 }}>
        <Sliders size={15} color={T.amber} /> Ogni modifica ricalcola istantaneamente tutti i modelli, il fair value composito, l'upside e i grafici.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        <Panel title="Valore base (Sven Carlin)">
          <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>Metrica per azione</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[["fcfps", "FCF/sh"], ["eps", "EPS"], ["oeps", "Owner E./sh"]].map(([m, l]) => (
              <button key={m} onClick={() => setBaseMetric(m)} style={{ flex: 1, padding: "7px 4px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${a.baseMetric === m ? T.amber : T.border}`, background: a.baseMetric === m ? "rgba(245,166,35,.12)" : T.panel2, color: a.baseMetric === m ? T.amber : T.sub }}>{l}</button>
            ))}
          </div>
          <Ctrl label="Base value / share" value={a.base} min={0.1} max={Math.max(20, a.base * 2)} step={0.05} onChange={(v) => setF((n, x) => { n.base = x; }, v)} format={fmtNum} />
        </Panel>
        <Panel title="DCF">
          <Ctrl label="Crescita FCF" value={a.dcf.growth} min={-0.05} max={0.4} step={0.005} onChange={(v) => setF((n, x) => { n.dcf.growth = x; }, v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
          <Ctrl label="Sconto (WACC)" value={a.dcf.discount} min={0.04} max={0.2} step={0.005} onChange={(v) => setF((n, x) => { n.dcf.discount = x; }, v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
          <Ctrl label="Crescita terminale" value={a.dcf.terminalGrowth} min={0} max={0.05} step={0.0025} onChange={(v) => setF((n, x) => { n.dcf.terminalGrowth = x; }, v)} format={(v) => (v * 100).toFixed(2)} unit="%" />
        </Panel>
        <Panel title="Extra">
          <Ctrl label="Graham AAA yield" value={a.aaaYield} min={1} max={10} step={0.1} onChange={(v) => setF((n, x) => { n.aaaYield = x; }, v)} format={(v) => v.toFixed(1)} unit="%" />
          <Ctrl label="Owner Earnings growth" value={a.ownerGrowth} min={0} max={0.15} step={0.005} onChange={(v) => setF((n, x) => { n.ownerGrowth = x; }, v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
          <Ctrl label="Tax rate" value={a.taxRate} min={0} max={0.5} step={0.01} onChange={(v) => setF((n, x) => { n.taxRate = x; }, v)} format={(v) => (v * 100).toFixed(0)} unit="%" />
        </Panel>
      </div>
      <div style={{ fontSize: 12, color: T.muted, textAlign: "center" }}>
        Per gli scenari Sven Carlin (crescita, sconto, terminal multiple, probabilità) usa la vista <b style={{ color: T.sub }}>Intrinsic Value</b>; per i multipli target la vista <b style={{ color: T.sub }}>Relative</b>.
      </div>
    </div>
  );
}

export { Assumptions };
