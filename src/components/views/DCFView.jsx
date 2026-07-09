"use client";
import {
  Bar, Area, ComposedChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, Ctrl, TT } from "../ui/Primitives";
import { fmtNum, fmtBig } from "@/services/formatters";
import { dcfValuation } from "@/models/valuationEngine";

function DCFView() {
  const { state, val, dispatch } = useStore();
  const a = state.assumptions, cur = state.data.currency, d = state.data;
  const set = (k, v) => dispatch({ type: "ASSUME", updater: (as) => ({ ...as, dcf: { ...as.dcf, [k]: v } }) });
  // sensitivity matrix growth x discount
  const growths = [-0.02, -0.01, 0, 0.01, 0.02].map(x => a.dcf.growth + x);
  const discounts = [-0.02, -0.01, 0, 0.01, 0.02].map(x => a.dcf.discount + x);
  const matrix = discounts.map(dd => growths.map(gg => {
    const r = dcfValuation({ fcf: d.fcf || val.fcfps * val.shares, growth: gg, discount: dd, terminalGrowth: a.dcf.terminalGrowth, years: a.dcf.years, netDebt: val.netDebt, shares: val.shares });
    return r.fairValue;
  }));
  const allVals = matrix.flat().filter(isFinite);
  const lo = Math.min(...allVals), hi = Math.max(...allVals);
  const heat = (v) => {
    if (!isFinite(v)) return T.panel2;
    const t = (v - lo) / (hi - lo || 1);
    return v >= val.price ? `rgba(34,199,118,${0.15 + t * 0.5})` : `rgba(239,75,91,${0.15 + (1 - t) * 0.5})`;
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        <Panel title="Ipotesi DCF">
          <Ctrl label="Crescita FCF" value={a.dcf.growth} min={-0.05} max={0.4} step={0.005} onChange={(v) => set("growth", v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
          <Ctrl label="Tasso di sconto (WACC)" value={a.dcf.discount} min={0.04} max={0.2} step={0.005} onChange={(v) => set("discount", v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
          <Ctrl label="Crescita terminale" value={a.dcf.terminalGrowth} min={0} max={0.05} step={0.0025} onChange={(v) => set("terminalGrowth", v)} format={(v) => (v * 100).toFixed(2)} unit="%" />
          <Ctrl label="Anni di proiezione" value={a.dcf.years} min={5} max={15} step={1} onChange={(v) => set("years", v)} format={(v) => v.toFixed(0)} unit=" anni" />
          <div style={{ marginTop: 8, padding: "12px", background: T.panel2, borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 10.5, color: T.muted, textTransform: "uppercase" }}>DCF Fair Value</div>
            <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: val.dcf.fairValue >= val.price ? T.green : T.red, marginTop: 4 }}>{fmtNum(val.dcf.fairValue)} {cur}</div>
            <div style={{ fontSize: 10.5, color: T.muted, marginTop: 4, fontFamily: MONO }}>EV {fmtBig(val.dcf.ev)} · TV(PV) {fmtBig(val.dcf.tvPV)}</div>
          </div>
        </Panel>
        <Panel title="Free Cash Flow proiettato" subtitle="Valore nominale vs attualizzato per anno">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={val.dcf.rows}>
              <CartesianGrid vertical={false} stroke={T.border} />
              <XAxis dataKey="year" stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} tickFormatter={(y) => "Y" + y} />
              <YAxis stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} tickFormatter={fmtBig} />
              <Tooltip content={<TT />} />
              <Bar dataKey="fcf" name="FCF nominale" fill={T.panel3} radius={[3, 3, 0, 0]} />
              <Area dataKey="pv" name="FCF attualizzato" fill="rgba(34,199,118,.2)" stroke={T.green} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <Panel title="DCF Sensitivity Matrix" subtitle="Fair value al variare di crescita (colonne) e tasso di sconto (righe). Verde = sopra il prezzo attuale.">
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: MONO, fontSize: 12, margin: "0 auto" }}>
            <thead><tr>
              <th style={{ padding: 8, color: T.muted, fontSize: 10 }}>disc \ growth</th>
              {growths.map((g, i) => <th key={i} style={{ padding: "8px 12px", color: T.sub, fontSize: 11 }}>{(g * 100).toFixed(1)}%</th>)}
            </tr></thead>
            <tbody>
              {matrix.map((rrow, ri) => (
                <tr key={ri}>
                  <td style={{ padding: "8px 12px", color: T.sub, fontWeight: 700 }}>{(discounts[ri] * 100).toFixed(1)}%</td>
                  {rrow.map((v, ci) => (
                    <td key={ci} style={{ padding: "10px 14px", textAlign: "center", background: heat(v), color: T.text, fontWeight: ri === 2 && ci === 2 ? 800 : 500, border: ri === 2 && ci === 2 ? `2px solid ${T.amber}` : `1px solid ${T.border}` }}>{fmtNum(v, 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export { DCFView };
