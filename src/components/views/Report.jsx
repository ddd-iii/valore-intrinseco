"use client";
import { useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, Badge } from "../ui/Primitives";
import { btnGhost } from "../ui/styleHelpers";
import { fmtNum, fmtBig, fmtPct } from "@/services/formatters";
import { generateAIAnalysis } from "@/services/aiAnalysis";
import { exportExcel, exportCSV } from "@/services/exporters";

function Report() {
  const { state, val } = useStore();
  const d = state.data, cur = d.currency;
  const ai = useMemo(() => generateAIAnalysis({ data: d, price: val.price, composite: val.composite, upside: val.upside, rating: val.rating, sven: val.sven, dcf: val.dcf, rel: val.rel, assumptions: state.assumptions }), [d, val, state.assumptions]);
  const ctx = { data: d, price: val.price, composite: val.composite, sven: val.sven, dcf: val.dcf, rel: val.rel, graham: val.graham, lynch: val.lynch, oe: val.oe, mos: val.mos, assumptions: state.assumptions };
  const Section = ({ n, title, children }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 6 }}>
        <span style={{ fontFamily: MONO, color: T.amber, fontSize: 12, fontWeight: 700 }}>{n}</span>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: .3 }}>{title}</span>
      </div>
      <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "flex-end" }} className="no-print">
        <button onClick={() => exportExcel(ctx)} style={btnGhost()}><Download size={14} />Excel</button>
        <button onClick={() => exportCSV(ctx)} style={btnGhost()}><Download size={14} />CSV</button>
        <button onClick={() => window.print()} style={btnGhost()}><Printer size={14} />Stampa / PDF</button>
      </div>
      <Panel style={{ padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.amber, textTransform: "uppercase", fontWeight: 700 }}>Investment Research Report</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0 4px" }}>{d.name} <span style={{ color: T.muted, fontFamily: MONO }}>{d.ticker}</span></h1>
          <div style={{ fontSize: 12, color: T.sub }}>{d.sector} · {d.industry || ""} · {d.country || ""}</div>
          <div style={{ marginTop: 12 }}><Badge label={val.rating.label} tone={val.rating.tone} /></div>
        </div>
        <Section n="01" title="Company Overview">
          {d.name} tratta a {fmtNum(val.price)} {cur} con una capitalizzazione di {fmtBig(d.marketCap)} {cur}.
          Ricavi {fmtBig(d.revenue)}, utile netto {fmtBig(d.netIncome)}, free cash flow {fmtBig(d.fcf)}.
        </Section>
        <Section n="02" title="Business Quality">
          Qualità del business valutata <b style={{ color: T.text }}>{ai.quality}</b> (score {ai.qualityScore}/100).
          ROE {fmtPct(d.roe)}, margine netto {fmtPct(d.netMargin)}, margine lordo {fmtPct(d.grossMargin)}.
        </Section>
        <Section n="03" title="Strengths">
          <ul style={{ margin: 0, paddingLeft: 18 }}>{ai.strengths.length ? ai.strengths.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>) : <li>Dati insufficienti</li>}</ul>
        </Section>
        <Section n="04" title="Weaknesses & Risks">
          <ul style={{ margin: 0, paddingLeft: 18 }}>{[...ai.weaknesses, ...ai.risks].length ? [...ai.weaknesses, ...ai.risks].map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>) : <li>Nessun rischio rilevante identificato dai dati</li>}</ul>
        </Section>
        <Section n="05" title="Valuation">
          Valore intrinseco composito <b style={{ color: T.green }}>{fmtNum(val.composite)} {cur}</b> ({val.upside >= 0 ? "+" : ""}{fmtPct(val.upside, 0)} vs prezzo).
          Sven Carlin IV {fmtNum(val.sven.intrinsicValue)}, DCF {fmtNum(val.dcf.fairValue)}, Relative {fmtNum(val.rel.average)},
          Graham {fmtNum(val.graham.revised)}, Lynch {fmtNum(val.lynch.fairValue)}, Owner Earnings {fmtNum(val.oe.capitalized)},
          Damodaran FCFF 3 stadi {fmtNum(val.damodaran.valuePerShare)}.
          Prezzo d'acquisto con 30% margine di sicurezza: {fmtNum(val.mos[2].buyBelow)} {cur}.
        </Section>
        <Section n="06" title="Investment Thesis">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "rgba(34,199,118,.06)", border: `1px solid ${T.greenDim}`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: T.green, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>▲ Bull Case</div>
              La crescita si mantiene sopra le attese e il terminal multiple regge → i modelli DCF puntano verso lo scenario "best" ({fmtNum(val.sven.perScenarioPV[1])} {cur}).
            </div>
            <div style={{ background: "rgba(239,75,91,.06)", border: `1px solid ${T.redDim}`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: T.red, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>▼ Bear Case</div>
              Crescita in rallentamento e compressione dei multipli → scenario "worst" a {fmtNum(val.sven.perScenarioPV[2])} {cur}.
            </div>
          </div>
        </Section>
        <Section n="07" title="Conclusione">{ai.summary}</Section>
        <div style={{ fontSize: 10.5, color: T.muted, textAlign: "center", marginTop: 20, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
          Disclaimer: solo a scopo educativo, non è consulenza finanziaria. Modello basato sull'Intrinsic Value di Sven Carlin (Stock Market Research Platform).
        </div>
      </Panel>
    </div>
  );
}

export { Report };
