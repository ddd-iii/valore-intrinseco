"use client";
import { useMemo } from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, Badge } from "../ui/Primitives";
import { fmtPct } from "@/services/formatters";
import { generateAIAnalysis } from "@/services/aiAnalysis";

function AIView() {
  const { state, val } = useStore();
  const d = state.data, cur = d.currency;
  const ai = useMemo(() => generateAIAnalysis({ data: d, price: val.price, composite: val.composite, upside: val.upside, rating: val.rating, sven: val.sven, dcf: val.dcf, rel: val.rel, assumptions: state.assumptions }), [d, val, state.assumptions]);
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 980, margin: "0 auto" }}>
      <Panel title="AI Analysis" subtitle="Sintesi generata dal motore analitico a partire dai fondamentali e dalle ipotesi correnti"
        right={<Badge label={val.rating.label} tone={val.rating.tone} />}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 14, background: `conic-gradient(${ai.qualityScore > 60 ? T.green : T.amber} ${ai.qualityScore * 3.6}deg, ${T.panel3} 0)`, display: "grid", placeItems: "center", position: "relative" }}>
            <div style={{ position: "absolute", inset: 6, borderRadius: 10, background: T.panel, display: "grid", placeItems: "center" }}>
              <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 18 }}>{ai.qualityScore}</div>
            </div>
          </div>
          <div style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.6 }}>{ai.summary}</div>
        </div>
      </Panel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel title="Punti di forza"><List items={ai.strengths} icon={CheckCircle2} color={T.green} empty="Nessuno rilevato dai dati" /></Panel>
        <Panel title="Debolezze"><List items={ai.weaknesses} icon={XCircle} color={T.red} empty="Nessuna rilevata" /></Panel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel title="Rischi principali"><List items={ai.risks} icon={AlertTriangle} color={T.amber} empty="Nessun rischio evidente dai dati" /></Panel>
        <Panel title="Sensibilità del fair value" subtitle="Impatto sul valore intrinseco Sven Carlin">
          {ai.sensitivities.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 12.5, color: T.sub }}>{s.k}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: s.d >= 0 ? T.green : T.red }}>{s.d >= 0 ? "+" : ""}{fmtPct(s.d, 1)}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
function List({ items, icon: Icon, color, empty }) {
  if (!items || !items.length) return <div style={{ color: T.muted, fontSize: 12.5, padding: "6px 0" }}>{empty}</div>;
  return items.map((it, i) => (
    <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "7px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : "none" }}>
      <Icon size={15} color={color} style={{ marginTop: 1, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: T.sub, textTransform: "capitalize" }}>{it}</span>
    </div>
  ));
}

export { AIView };
