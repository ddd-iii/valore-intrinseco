"use client";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, Badge } from "../ui/Primitives";
import { fmtNum, fmtPct } from "@/services/formatters";
import { ratingFromUpside } from "@/models/valuationEngine";

function Valuation() {
  const { state, val } = useStore();
  const cur = state.data.currency, p = val.price;
  const rows = [
    ["Sven Carlin Intrinsic Value", val.sven.intrinsicValue, "Foglio '= (2)' — DCF 3 scenari pesati 60/20/20"],
    ["Discounted Cash Flow (Gordon)", val.dcf.fairValue, "FCF proiettato + terminal Gordon growth"],
    ["Relative Valuation (media)", val.rel.average, "Media multipli target: PE, PB, PS, EV/EBITDA…"],
    ["Relative Valuation (mediana)", val.rel.median, "Mediana degli stessi multipli"],
    ["Graham (formula rivista)", val.graham.revised, "EPS·(8.5+2g)·4.4/Y"],
    ["Graham Number", val.graham.grahamNumber, "√(22.5·EPS·BVPS)"],
    ["Peter Lynch Fair Value", val.lynch.fairValue, `EPS · (growth% + yield%) = fair PE ${fmtNum(val.lynch.fairPE, 0)}`],
    ["Owner Earnings (capitalized)", val.oe.capitalized, "Buffett: (NI+D&A−CapEx)/share capitalizzato"],
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel title="Sintesi valutazioni" subtitle={`Fair value per azione da ogni modello · prezzo attuale ${fmtNum(p)} ${cur}`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ color: T.muted, fontSize: 10.5, textTransform: "uppercase", letterSpacing: .6 }}>
              {["Modello", "Fair Value", "Upside", "Rating", "Note"].map(h => <th key={h} style={{ textAlign: h === "Modello" || h === "Note" ? "left" : "right", padding: "8px 12px", fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(([name, fv, note], i) => {
                const up = isFinite(fv) ? (fv - p) / p : NaN, r = ratingFromUpside(up);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: MONO }}>{fmtNum(fv)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: MONO, color: up >= 0 ? T.green : T.red }}>{isFinite(up) ? (up >= 0 ? "+" : "") + fmtPct(up, 0) : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}><Badge label={r.label} tone={r.tone} /></td>
                    <td style={{ padding: "10px 12px", color: T.muted, fontSize: 11 }}>{note}</td>
                  </tr>
                );
              })}
              <tr style={{ background: T.panel2 }}>
                <td style={{ padding: "12px", fontWeight: 800 }}>COMPOSITE INTRINSIC VALUE</td>
                <td style={{ padding: "12px", textAlign: "right", fontFamily: MONO, fontWeight: 800, color: T.green }}>{fmtNum(val.composite)}</td>
                <td style={{ padding: "12px", textAlign: "right", fontFamily: MONO, fontWeight: 800, color: val.upside >= 0 ? T.green : T.red }}>{val.upside >= 0 ? "+" : ""}{fmtPct(val.upside, 0)}</td>
                <td style={{ padding: "12px", textAlign: "right" }}><Badge label={val.rating.label} tone={val.rating.tone} /></td>
                <td style={{ padding: "12px", color: T.muted, fontSize: 11 }}>Media DCF + Relative (Alpha Spread style)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <MarginOfSafetyPanel />
    </div>
  );
}
function MarginOfSafetyPanel() {
  const { state, val } = useStore();
  const cur = state.data.currency, p = val.price;
  return (
    <Panel title="Margin of Safety" subtitle="Prezzo massimo d'acquisto per ogni livello di margine di sicurezza sul fair value composito">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
        {val.mos.map((m, i) => {
          const ok = p <= m.buyBelow;
          return (
            <div key={i} style={{ background: T.panel2, border: `1px solid ${ok ? T.greenDim : T.border}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.muted, letterSpacing: .5 }}>MOS {(m.mos * 100).toFixed(0)}%</div>
              <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, margin: "6px 0", color: ok ? T.green : T.text }}>{fmtNum(m.buyBelow)}</div>
              <div style={{ fontSize: 10.5, color: ok ? T.green : T.muted, fontFamily: MONO }}>{ok ? "✓ prezzo sotto soglia" : `${cur}`}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export { Valuation, MarginOfSafetyPanel };
