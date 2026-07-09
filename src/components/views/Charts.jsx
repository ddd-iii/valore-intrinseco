"use client";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, TT } from "../ui/Primitives";
import { fmtBig } from "@/services/formatters";

function Charts() {
  const { state, val } = useStore();
  const d = state.data;
  const h = d.historical && d.historical.length ? d.historical : null;
  if (!h) return <Panel title="Serie storiche"><div style={{ color: T.muted, fontSize: 13, padding: 20, textAlign: "center" }}>Storico non disponibile per questa fonte dati. Con una API key (Alpha Vantage / FMP) vengono caricati ricavi, EPS e FCF degli ultimi anni.</div></Panel>;
  const chart = (title, key, color, isBar) => (
    <Panel title={title}>
      <ResponsiveContainer width="100%" height={200}>
        {isBar ? (
          <BarChart data={h}><CartesianGrid vertical={false} stroke={T.border} /><XAxis dataKey="year" stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} /><YAxis stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} tickFormatter={fmtBig} /><Tooltip content={<TT />} cursor={{ fill: "rgba(255,255,255,.03)" }} /><Bar dataKey={key} fill={color} radius={[3, 3, 0, 0]} /></BarChart>
        ) : (
          <AreaChart data={h}><CartesianGrid vertical={false} stroke={T.border} /><XAxis dataKey="year" stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} /><YAxis stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} tickFormatter={fmtBig} /><Tooltip content={<TT />} /><Area dataKey={key} stroke={color} fill={color + "33"} strokeWidth={2} /></AreaChart>
        )}
      </ResponsiveContainer>
    </Panel>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {chart("Historical Revenue", "revenue", T.blue, true)}
      {chart("Historical Net Income", "netIncome", T.violet, true)}
      {chart("Historical EPS", "eps", T.green, false)}
      {chart("Historical Free Cash Flow", "fcf", T.amber, false)}
    </div>
  );
}

export { Charts };
