"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { Info } from "lucide-react";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, Stat, Row, Badge, TT } from "../ui/Primitives";
import { fmtNum, fmtBig, fmtPct } from "@/services/formatters";
import { FairValueGauge } from "../charts/FairValueGauge";

function Overview() {
  const { state, val } = useStore();
  const d = state.data, cur = d.currency;
  const models = [
    ["Sven Carlin IV", val.sven.intrinsicValue], ["DCF (Gordon)", val.dcf.fairValue],
    ["Relative (avg)", val.rel.average], ["Graham revised", val.graham.revised],
    ["Peter Lynch", val.lynch.fairValue], ["Owner Earnings", val.oe.capitalized],
    ["Damodaran FCFF", val.damodaran.valuePerShare],
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {state.dataStatus?.note && (
        <div style={{ background: "rgba(245,166,35,.08)", border: `1px solid ${T.amber}44`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: T.amber, display: "flex", gap: 8, alignItems: "center" }}>
          <Info size={15} />{state.dataStatus.note}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Panel title="Fair Value vs Prezzo" subtitle="Valore intrinseco composito (media DCF + valutazione relativa) e zone di margine di sicurezza">
          <FairValueGauge price={val.price} fair={val.composite} mos={val.mos} />
        </Panel>
        <Panel title="Verdetto">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <Badge label={val.rating.label} tone={val.rating.tone} />
              <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 800, marginTop: 12, color: val.upside >= 0 ? T.green : T.red }}>
                {val.upside >= 0 ? "+" : ""}{fmtPct(val.upside, 1)}
              </div>
              <div style={{ fontSize: 11.5, color: T.muted }}>upside vs fair value</div>
            </div>
            <div>
              <Row k="Current Price" v={`${fmtNum(val.price)} ${cur}`} />
              <Row k="Composite Fair Value" v={`${fmtNum(val.composite)} ${cur}`} tone="green" />
              <Row k="Buy below (MOS 30%)" v={`${fmtNum(val.mos[2].buyBelow)} ${cur}`} tone="amber" />
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Panel><Stat label="Market Cap" value={fmtBig(d.marketCap)} sub={cur} /></Panel>
        <Panel><Stat label="P/E" value={fmtNum(d.pe)} sub={d.forwardPe ? `fwd ${fmtNum(d.forwardPe)}` : ""} /></Panel>
        <Panel><Stat label="ROE" value={fmtPct(d.roe)} tone={d.roe > 0.15 ? "green" : undefined} /></Panel>
        <Panel><Stat label="Net Margin" value={fmtPct(d.netMargin)} /></Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel title="Confronto modelli di valutazione" subtitle="Fair value per azione da ciascun metodo vs prezzo corrente">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={models.map(([name, v]) => ({ name, value: isFinite(v) ? v : 0 }))} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid horizontal={false} stroke={T.border} />
              <XAxis type="number" stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} />
              <YAxis type="category" dataKey="name" stroke={T.muted} tick={{ fontSize: 10.5 }} width={100} />
              <Tooltip content={<TT />} cursor={{ fill: "rgba(255,255,255,.03)" }} />
              <ReferenceLine x={val.price} stroke={T.amber} strokeDasharray="4 3" label={{ value: "Prezzo", fill: T.amber, fontSize: 10, position: "top" }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {models.map(([, v], i) => <Cell key={i} fill={v >= val.price ? T.green : T.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Fondamentali chiave" subtitle="Snapshot dello stato di salute finanziaria">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <div>
              <Row k="Revenue" v={fmtBig(d.revenue)} />
              <Row k="Net Income" v={fmtBig(d.netIncome)} />
              <Row k="Free Cash Flow" v={fmtBig(d.fcf)} />
              <Row k="EPS" v={fmtNum(d.eps)} />
              <Row k="Dividend Yield" v={fmtPct(d.dividendYield)} />
            </div>
            <div>
              <Row k="Net Debt" v={fmtBig(val.netDebt)} tone={val.netDebt < 0 ? "green" : undefined} />
              <Row k="Gross Margin" v={fmtPct(d.grossMargin)} />
              <Row k="Op. Margin" v={fmtPct(d.operatingMargin)} />
              <Row k="Beta" v={fmtNum(d.beta)} />
              <Row k="52W Range" v={`${fmtNum(d.week52Low, 0)}–${fmtNum(d.week52High, 0)}`} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export { Overview };
