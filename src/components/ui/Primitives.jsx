"use client";
/**
 * SHARED UI PRIMITIVES — Panel, Stat, Row, Badge, Ctrl (slider).
 */
import { T, MONO, SANS } from "@/lib/theme";
import { fmtBig } from "@/services/formatters";

/* ==========================================================================
 * SHARED UI PRIMITIVES
 * ========================================================================== */
function Panel({ title, subtitle, children, right, style }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: subtitle ? 2 : 14 }}>
          <div>
            {title && <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: T.sub, fontWeight: 600 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      {subtitle && <div style={{ height: 12 }} />}
      {children}
    </div>
  );
}
function Stat({ label, value, sub, tone }) {
  const col = tone === "green" ? T.green : tone === "red" ? T.red : tone === "amber" ? T.amber : T.text;
  return (
    <div>
      <div style={{ fontSize: 10.5, letterSpacing: .8, textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: col, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.sub, marginTop: 2, fontFamily: MONO }}>{sub}</div>}
    </div>
  );
}
function Row({ k, v, tone, mono = true }) {
  const col = tone === "green" ? T.green : tone === "red" ? T.red : tone === "amber" ? T.amber : T.text;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12.5, color: T.sub }}>{k}</span>
      <span style={{ fontSize: 12.5, color: col, fontFamily: mono ? MONO : SANS, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{v}</span>
    </div>
  );
}
function Badge({ label, tone }) {
  const map = { green: [T.green, "rgba(34,199,118,.12)"], red: [T.red, "rgba(239,75,91,.12)"], amber: [T.amber, "rgba(245,166,35,.12)"], muted: [T.sub, "rgba(154,163,178,.1)"] };
  const [c, bg] = map[tone] || map.muted;
  return <span style={{ color: c, background: bg, border: `1px solid ${c}44`, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, letterSpacing: .5 }}>{label}</span>;
}
// Slider input con label e valore live
function Ctrl({ label, value, min, max, step, onChange, format = (v) => v, unit = "" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, color: T.sub }}>{label}</span>
        <span style={{ fontSize: 11.5, color: T.amber, fontFamily: MONO, fontWeight: 600 }}>{format(value)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: T.amber, height: 4 }} />
    </div>
  );
}
const TT = ({ active, payload, label, cur }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.borderS}`, borderRadius: 8, padding: "8px 12px", fontFamily: MONO, fontSize: 12 }}>
      <div style={{ color: T.sub, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.text }}>{p.name}: {fmtBig(p.value)}</div>
      ))}
    </div>
  );
};


export { Panel, Stat, Row, Badge, Ctrl, TT };
