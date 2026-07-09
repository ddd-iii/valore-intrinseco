"use client";
import {
  BarChart, Bar, Line, ComposedChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { BookOpen } from "lucide-react";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, Ctrl, TT } from "../ui/Primitives";
import { fmtNum } from "@/services/formatters";

function IntrinsicView() {
  const { state, val, dispatch } = useStore();
  const a = state.assumptions, cur = state.data.currency;
  const names = ["Scenario 1 — Normal", "Scenario 2 — Best", "Scenario 3 — Worst"];
  const years = Array.from({ length: 10 }, (_, i) => 2022 + i);
  const setScen = (i, k, v) => dispatch({ type: "ASSUME", updater: (as) => { const n = structuredClone(as); n.scenarios[i][k] = v; return n; } });
  const setProb = (i, v) => dispatch({ type: "ASSUME", updater: (as) => { const n = structuredClone(as); n.probabilities[i] = v; return n; } });
  const setBase = (v) => dispatch({ type: "ASSUME", updater: (as) => ({ ...as, base: v }) });

  // dati per il waterfall dei contributi pesati
  const contrib = val.sven.perScenarioPV.map((pv, i) => ({ name: ["Normal", "Best", "Worst"][i], part: pv * a.probabilities[i], pv }));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ background: "rgba(76,141,255,.06)", border: `1px solid ${T.blue}33`, borderRadius: 10, padding: "10px 14px", fontSize: 11.5, color: T.sub, display: "flex", gap: 8 }}>
        <BookOpen size={15} color={T.blue} />
        Replica del foglio Excel <b style={{ color: T.text, margin: "0 4px" }}>"= (2)"</b> di Sven Carlin.
        Valore base = {a.baseMetric.toUpperCase()} per azione. Terminal value = valore anno&nbsp;9 × multiplo (cella N6=L6·O8, fedele all'originale).
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        <Panel title="Valore base & probabilità" subtitle="Cella C6 (input per azione) e pesi scenari D23:D25">
          <Ctrl label={`Base value / share (${a.baseMetric.toUpperCase()})`} value={a.base} min={0.1} max={Math.max(20, a.base * 2)} step={0.05} onChange={setBase} format={(v) => fmtNum(v)} />
          {names.map((n, i) => (
            <Ctrl key={i} label={`Probabilità — ${n.split("—")[1]}`} value={a.probabilities[i]} min={0} max={1} step={0.05} onChange={(v) => setProb(i, v)} format={(v) => (v * 100).toFixed(0)} unit="%" />
          ))}
          <div style={{ marginTop: 8, padding: "10px 12px", background: T.panel2, borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: .8 }}>Intrinsic Value (F26)</div>
            <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 800, color: T.green, marginTop: 4 }}>{fmtNum(val.sven.intrinsicValue)} {cur}</div>
          </div>
        </Panel>
        <Panel title="Contributo pesato per scenario" subtitle="PV di scenario × probabilità = parte del valore finale (colonna F)">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={contrib} margin={{ top: 10 }}>
              <CartesianGrid vertical={false} stroke={T.border} />
              <XAxis dataKey="name" stroke={T.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} />
              <Tooltip content={<TT />} cursor={{ fill: "rgba(255,255,255,.03)" }} />
              <Bar dataKey="pv" name="PV scenario" fill={T.panel3} radius={[4, 4, 0, 0]} />
              <Bar dataKey="part" name="Contributo pesato" fill={T.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}>
            {contrib.map((c, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 11, fontFamily: MONO }}>
                <div style={{ color: T.muted }}>{c.name}</div>
                <div style={{ color: T.text, fontWeight: 700 }}>{fmtNum(c.pv)}</div>
                <div style={{ color: T.green }}>→ {fmtNum(c.part)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Un pannello per scenario con proiezione + controlli */}
      {names.map((n, i) => {
        const sc = val.sven.scenarios[i], scA = a.scenarios[i];
        const proj = years.map((y, k) => ({ year: y, value: sc.values[k], pv: sc.discounted[k] }));
        return (
          <Panel key={i} title={n} subtitle={`PV scenario = ${fmtNum(sc.pv)} ${cur} · terminal ${fmtNum(sc.terminal)} (PV ${fmtNum(sc.termPV)})`}>
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
              <div>
                <Ctrl label="Crescita anni 1-5 (O5)" value={scA.g1} min={-0.1} max={0.6} step={0.005} onChange={(v) => setScen(i, "g1", v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
                <Ctrl label="Crescita anni 6-10 (O6)" value={scA.g2} min={-0.1} max={0.4} step={0.005} onChange={(v) => setScen(i, "g2", v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
                <Ctrl label="Tasso di sconto (O7)" value={scA.discount} min={0.04} max={0.2} step={0.005} onChange={(v) => setScen(i, "discount", v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
                <Ctrl label="Terminal multiple (O8)" value={scA.terminalMultiple} min={5} max={45} step={1} onChange={(v) => setScen(i, "terminalMultiple", v)} format={(v) => v.toFixed(0)} unit="x" />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={proj}>
                  <CartesianGrid vertical={false} stroke={T.border} />
                  <XAxis dataKey="year" stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} />
                  <YAxis stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} />
                  <Tooltip content={<TT />} />
                  <Bar dataKey="value" name="Valore proiettato" fill={T.panel3} radius={[3, 3, 0, 0]} />
                  <Line dataKey="pv" name="Valore attualizzato" stroke={T.green} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

export { IntrinsicView };
