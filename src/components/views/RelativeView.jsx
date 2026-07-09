"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, Ctrl, TT } from "../ui/Primitives";
import { fmtNum } from "@/services/formatters";

function RelativeView() {
  const { state, val, dispatch } = useStore();
  const a = state.assumptions, cur = state.data.currency, d = state.data;
  const set = (k, v) => dispatch({ type: "ASSUME", updater: (as) => ({ ...as, targets: { ...as.targets, [k]: v } }) });
  const current = { PE: d.pe, PB: d.pb, PS: d.ps, "EV/EBITDA": d.evEbitda, PEG: d.pegRatio };
  const data = Object.entries(val.rel.perMultiple).map(([k, v]) => ({ name: k, value: v }));
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        <Panel title="Multipli target" subtitle="Confronta con i multipli attuali del titolo / settore">
          <Ctrl label={`Target P/E  (attuale ${fmtNum(d.pe, 1)})`} value={a.targets.pe} min={3} max={50} step={0.5} onChange={(v) => set("pe", v)} format={(v) => v.toFixed(1)} unit="x" />
          <Ctrl label={`Target P/B  (attuale ${fmtNum(d.pb, 1)})`} value={a.targets.pb} min={0.3} max={20} step={0.1} onChange={(v) => set("pb", v)} format={(v) => v.toFixed(1)} unit="x" />
          <Ctrl label={`Target P/S  (attuale ${fmtNum(d.ps, 1)})`} value={a.targets.ps} min={0.3} max={20} step={0.1} onChange={(v) => set("ps", v)} format={(v) => v.toFixed(1)} unit="x" />
          <Ctrl label={`Target EV/EBITDA (attuale ${fmtNum(d.evEbitda, 1)})`} value={a.targets.evEbitda} min={3} max={40} step={0.5} onChange={(v) => set("evEbitda", v)} format={(v) => v.toFixed(1)} unit="x" />
          <Ctrl label="Target EV/EBIT" value={a.targets.evEbit} min={3} max={40} step={0.5} onChange={(v) => set("evEbit", v)} format={(v) => v.toFixed(1)} unit="x" />
          <Ctrl label="Target PEG" value={a.targets.peg} min={0.3} max={3} step={0.05} onChange={(v) => set("peg", v)} format={(v) => v.toFixed(2)} />
          <Ctrl label="Target P/FCF" value={a.targets.pFcf} min={5} max={45} step={0.5} onChange={(v) => set("pFcf", v)} format={(v) => v.toFixed(1)} unit="x" />
        </Panel>
        <div style={{ display: "grid", gap: 16 }}>
          <Panel title="Fair value per multiplo" subtitle={`Media ${fmtNum(val.rel.average)} · mediana ${fmtNum(val.rel.median)} ${cur}`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 10 }}>
                <CartesianGrid vertical={false} stroke={T.border} />
                <XAxis dataKey="name" stroke={T.muted} tick={{ fontSize: 10.5 }} />
                <YAxis stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} />
                <Tooltip content={<TT />} cursor={{ fill: "rgba(255,255,255,.03)" }} />
                <ReferenceLine y={val.price} stroke={T.amber} strokeDasharray="4 3" label={{ value: "Prezzo", fill: T.amber, fontSize: 10 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((x, i) => <Cell key={i} fill={x.value >= val.price ? T.green : T.red} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="Multipli attuali">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
              {Object.entries(current).map(([k, v]) => (
                <div key={k} style={{ textAlign: "center", background: T.panel2, borderRadius: 8, padding: "10px 6px" }}>
                  <div style={{ fontSize: 10, color: T.muted }}>{k}</div>
                  <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, marginTop: 3 }}>{fmtNum(v, 1)}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export { RelativeView };
