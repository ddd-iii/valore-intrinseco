"use client";
import { AlertTriangle } from "lucide-react";
import { T, MONO } from "@/lib/theme";
import { useStore } from "@/store/store";
import { Panel, Badge } from "../ui/Primitives";
import { btnGhost } from "../ui/styleHelpers";
import { fmtNum, fmtPct } from "@/services/formatters";
import { ratingFromUpside } from "@/models/valuationEngine";
import { TradingViewWidget, toTradingViewSymbol } from "../charts/TradingViewWidget";

function toggleComposite(dispatch, key) {
  dispatch({ type: "ASSUME", updater: (as) => ({ ...as, includeInComposite: { ...as.includeInComposite, [key]: !as.includeInComposite[key] } }) });
}

function IncludeToggle({ active, valid, onClick }) {
  if (!valid) {
    return <span style={{ fontSize: 10.5, color: T.muted }} title="Valore non ancora valido (dati mancanti)">non disponibile</span>;
  }
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: active ? T.green : T.muted, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {active ? "✓ incluso" : "○ escluso"}
    </button>
  );
}

function Valuation() {
  const { state, val, dispatch } = useStore();
  const cur = state.data.currency, p = val.price;
  const inc = state.assumptions.includeInComposite || { damodaran: false, ownerEarnings: false };

  const rows = [
    ["Sven Carlin Intrinsic Value", val.sven.intrinsicValue, "Foglio '= (2)' — DCF 3 scenari pesati 60/20/20", "always"],
    ["Discounted Cash Flow (Gordon)", val.dcf.fairValue, "FCF proiettato + terminal Gordon growth", null],
    ["Relative Valuation (media)", val.rel.average, "Media multipli target: PE, PB, PS, EV/EBITDA…", "always"],
    ["Relative Valuation (mediana)", val.rel.median, "Mediana degli stessi multipli", null],
    ["Graham (formula rivista)", val.graham.revised, "EPS·(8.5+2g)·4.4/Y", null],
    ["Graham Number", val.graham.grahamNumber, "√(22.5·EPS·BVPS)", null],
    ["Peter Lynch Fair Value", val.lynch.fairValue, `EPS · (growth% + yield%) = fair PE ${fmtNum(val.lynch.fairPE, 0)}`, null],
    ["Owner Earnings (capitalized)", val.oe.capitalized, "Buffett: (NI+D&A−CapEx)/share capitalizzato", "ownerEarnings"],
    ["Damodaran FCFF 3 stadi", val.damodaran.valuePerShare, "Bottom-up beta + FCFF 3 stadi con terminal ROIC≈WACC", "damodaran"],
  ];

  const compositeParts = ["Sven Carlin", "Relative"];
  if (inc.damodaran && val.damodaranValid) compositeParts.push("Damodaran");
  if (inc.ownerEarnings && val.oeValid) compositeParts.push("Owner Earnings");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel title="Sintesi valutazioni" subtitle={`Fair value per azione da ogni modello · prezzo attuale ${fmtNum(p)} ${cur}`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ color: T.muted, fontSize: 10.5, textTransform: "uppercase", letterSpacing: .6 }}>
              {["Modello", "Fair Value", "Upside", "Rating", "Nella media?", "Note"].map(h => <th key={h} style={{ textAlign: (h === "Modello" || h === "Note") ? "left" : "right", padding: "8px 12px", fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(([name, fv, note, compositeKey], i) => {
                const up = isFinite(fv) ? (fv - p) / p : NaN, r = ratingFromUpside(up);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: MONO }}>{fmtNum(fv)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: MONO, color: up >= 0 ? T.green : T.red }}>{isFinite(up) ? (up >= 0 ? "+" : "") + fmtPct(up, 0) : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}><Badge label={r.label} tone={r.tone} /></td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {compositeKey === "always" && <span style={{ fontSize: 10.5, color: T.green }}>✓ sempre</span>}
                      {compositeKey === "damodaran" && <IncludeToggle active={inc.damodaran} valid={val.damodaranValid} onClick={() => toggleComposite(dispatch, "damodaran")} />}
                      {compositeKey === "ownerEarnings" && <IncludeToggle active={inc.ownerEarnings} valid={val.oeValid} onClick={() => toggleComposite(dispatch, "ownerEarnings")} />}
                      {!compositeKey && <span style={{ fontSize: 10.5, color: T.muted }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 12px", color: T.muted, fontSize: 11 }}>{note}</td>
                  </tr>
                );
              })}
              <tr style={{ background: T.panel2 }}>
                <td style={{ padding: "12px", fontWeight: 800 }}>COMPOSITE INTRINSIC VALUE</td>
                <td style={{ padding: "12px", textAlign: "right", fontFamily: MONO, fontWeight: 800, color: T.green }}>{fmtNum(val.composite)}</td>
                <td style={{ padding: "12px", textAlign: "right", fontFamily: MONO, fontWeight: 800, color: val.upside >= 0 ? T.green : T.red }}>{val.upside >= 0 ? "+" : ""}{fmtPct(val.upside, 0)}</td>
                <td style={{ padding: "12px", textAlign: "right" }}><Badge label={val.rating.label} tone={val.rating.tone} /></td>
                <td style={{ padding: "12px" }}></td>
                <td style={{ padding: "12px", color: T.muted, fontSize: 11 }}>Media di: {compositeParts.join(" + ")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <OwnerEarningsDataPanel />
      <MarginOfSafetyPanel />
    </div>
  );
}

/**
 * Owner Earnings (Buffett) ha bisogno di netIncome/depreciation/capex, campi
 * che alcuni provider (es. Finnhub) non forniscono — se mancano il modello
 * risulta sempre a zero. Stesso pattern della scheda Damodaran: widget
 * TradingView di riferimento + campi rapidi solo per i dati mancanti.
 */
function OwnerEarningsDataPanel() {
  const { state, val, dispatch } = useStore();
  const d = state.data;
  const FIELDS = [
    ["netIncome", "Utile netto (Net Income)", "es. 97000000000"],
    ["depreciation", "Ammortamenti (D&A)", "es. 11000000000"],
    ["capex", "CapEx (Capital Expenditures)", "es. 10000000000"],
  ];
  const isMissing = (v) => v === undefined || v === null || !isFinite(v);
  const missing = FIELDS.filter(([key]) => isMissing(d[key]));

  return (
    <Panel
      title="Owner Earnings (Buffett) — dati e completamento"
      subtitle={`Serve utile netto, ammortamenti e capex per calcolarlo. Sorgente di riferimento: TradingView per ${d.name || d.ticker}.`}
    >
      <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <AlertTriangle size={13} color={T.amber} style={{ marginTop: 1, flexShrink: 0 }} />
        Il widget si apre sulla scheda "Balance Sheet". Utile netto è nella scheda
        <strong style={{ color: T.text }}> "Income Statement"</strong>, ammortamenti e capex nella scheda
        <strong style={{ color: T.text }}> "Cash Flow"</strong> — usa le schede in alto nel widget per passare dall'una all'altra.
      </div>
      <TradingViewWidget
        scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
        symbol={toTradingViewSymbol(d)}
        height={600}
        config={{ colorTheme: "dark", isTransparent: true, largeChartUrl: "", displayMode: "regular", width: "100%", height: "100%", locale: "en" }}
      />

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
        {!missing.length ? (
          <div style={{ fontSize: 12, color: T.green }}>✓ Tutti i dati necessari (utile netto, ammortamenti, capex) sono presenti.</div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 10, fontWeight: 600 }}>
              Dati mancanti — copiali qui dal widget qui sopra (alimentano direttamente il modello):
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {missing.map(([key, label, ph]) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>{label}</div>
                  <input
                    type="number"
                    placeholder={ph}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : parseFloat(e.target.value);
                      dispatch({ type: "PATCH_DATA", key, value: v });
                    }}
                    style={{ width: "100%", background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", color: T.text, fontSize: 12.5, fontFamily: MONO, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!val.oeValid && (
        <div style={{ marginTop: 12, background: "rgba(245,166,35,.08)", border: `1px solid ${T.amber}44`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: T.amber, display: "flex", gap: 8, alignItems: "center" }}>
          <AlertTriangle size={15} />
          Il valore capitalizzato è ancora zero o non valido — completa i campi sopra per calcolarlo.
        </div>
      )}

      <div style={{ marginTop: 12, background: state.assumptions.includeInComposite?.ownerEarnings ? "rgba(34,199,118,.08)" : "rgba(255,255,255,.03)", border: `1px solid ${state.assumptions.includeInComposite?.ownerEarnings ? T.greenDim : T.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 12, color: T.sub }}>Includi Owner Earnings nella media del Fair Value Composito.</div>
        <button
          disabled={!val.oeValid}
          onClick={() => toggleComposite(dispatch, "ownerEarnings")}
          style={{ ...btnGhost(), opacity: val.oeValid ? 1 : 0.4, cursor: val.oeValid ? "pointer" : "not-allowed", borderColor: state.assumptions.includeInComposite?.ownerEarnings ? T.green : T.border, color: state.assumptions.includeInComposite?.ownerEarnings ? T.green : T.sub, flexShrink: 0 }}
        >
          {state.assumptions.includeInComposite?.ownerEarnings ? "✓ Incluso nella media" : "Aggiungi alla media"}
        </button>
      </div>
    </Panel>
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
