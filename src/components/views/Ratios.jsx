"use client";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { T } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, Row } from "../ui/Primitives";
import { fmtNum, fmtPct } from "@/services/formatters";

function Ratios() {
  const { state } = useStore();
  const d = state.data;
  // normalizza su 0-100 per lo spider (soglie tipiche)
  const norm = (v, good) => v == null ? 0 : Math.max(0, Math.min(100, (v / good) * 100));
  const spider = [
    { k: "Profitability (ROE)", v: norm(d.roe, 0.25) },
    { k: "Net Margin", v: norm(d.netMargin, 0.30) },
    { k: "Growth (Rev)", v: norm(d.revenueGrowth, 0.25) },
    { k: "Gross Margin", v: norm(d.grossMargin, 0.60) },
    { k: "Low Leverage", v: d.ebitda ? Math.max(0, 100 - norm(((d.debt || 0) - (d.cash || 0)) / d.ebitda, 4)) : 50 },
    { k: "Value (inv P/E)", v: d.pe ? Math.max(0, Math.min(100, (20 / d.pe) * 60)) : 50 },
  ];
  const ratios = [
    ["Valuation", [["P/E", d.pe, "x"], ["Forward P/E", d.forwardPe, "x"], ["P/B", d.pb, "x"], ["P/S", d.ps, "x"], ["PEG", d.pegRatio, ""], ["EV/EBITDA", d.evEbitda, "x"]]],
    ["Profitability", [["ROE", d.roe, "%"], ["ROA", d.roa, "%"], ["Gross Margin", d.grossMargin, "%"], ["Operating Margin", d.operatingMargin, "%"], ["Net Margin", d.netMargin, "%"]]],
    ["Growth & Risk", [["Revenue Growth", d.revenueGrowth, "%"], ["EPS Growth", d.epsGrowth, "%"], ["Beta", d.beta, ""], ["Dividend Yield", d.dividendYield, "%"]]],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
      <Panel title="Spider dei fondamentali" subtitle="Punteggio normalizzato 0-100 su soglie tipiche di qualità">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={spider}>
            <PolarGrid stroke={T.border} />
            <PolarAngleAxis dataKey="k" tick={{ fontSize: 10, fill: T.sub }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: T.muted }} stroke={T.border} />
            <Radar dataKey="v" stroke={T.green} fill={T.green} fillOpacity={0.25} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </Panel>
      <div style={{ display: "grid", gap: 16 }}>
        {ratios.map(([title, rows], i) => (
          <Panel key={i} title={title}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              {rows.map(([k, v, u]) => <Row key={k} k={k} v={v == null ? "—" : u === "%" ? fmtPct(v) : fmtNum(v, 2) + (u ? u : "")} />)}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

export { Ratios };
