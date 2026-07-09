"use client";
/** Signature widget: prezzo vs fair value composito + bande margin of safety. */
import { T, MONO } from "@/lib/theme";
import { fmtNum, fmtPct } from "@/services/formatters";

function FairValueGauge({ price, fair, mos }) {
  const max = Math.max(price, fair) * 1.35;
  const pct = (v) => `${Math.min(100, (v / max) * 100)}%`;
  const upside = (fair - price) / price;
  return (
    <div style={{ padding: "6px 2px" }}>
      <div style={{ position: "relative", height: 54, marginTop: 30, marginBottom: 8 }}>
        {/* MOS bands */}
        {mos.map((m, i) => (
          <div key={i} style={{ position: "absolute", left: 0, width: pct(m.buyBelow), top: 0, bottom: 0, background: `rgba(34,199,118,${0.05 + i * 0.03})`, borderRadius: 3 }} />
        ))}
        <div style={{ position: "absolute", left: 0, right: 0, top: 24, height: 6, background: T.panel3, borderRadius: 3 }} />
        {/* fair value marker */}
        <Marker x={pct(fair)} color={T.green} label={`Fair ${fmtNum(fair)}`} top />
        {/* price marker */}
        <Marker x={pct(price)} color={T.amber} label={`Prezzo ${fmtNum(price)}`} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.muted, fontFamily: MONO }}>
        <span>0</span><span>Margin of safety zone (verde) →</span><span>{fmtNum(max, 0)}</span>
      </div>
      <div style={{ marginTop: 14, textAlign: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 15, color: upside >= 0 ? T.green : T.red, fontWeight: 700 }}>
          {upside >= 0 ? "▲ Sottovalutata" : "▼ Sopravvalutata"} {upside >= 0 ? "+" : ""}{fmtPct(upside, 1)}
        </span>
      </div>
    </div>
  );
}
function Marker({ x, color, label, top }) {
  return (
    <div style={{ position: "absolute", left: x, top: top ? -4 : 34, transform: "translateX(-50%)", textAlign: "center" }}>
      {top && <div style={{ fontSize: 10, fontFamily: MONO, color, fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap" }}>{label}</div>}
      <div style={{ width: 2, height: top ? 30 : 22, background: color, margin: "0 auto" }} />
      <div style={{ width: 11, height: 11, borderRadius: "50%", background: color, margin: "-2px auto 0", boxShadow: `0 0 10px ${color}` }} />
      {!top && <div style={{ fontSize: 10, fontFamily: MONO, color, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap" }}>{label}</div>}
    </div>
  );
}

export { FairValueGauge };
