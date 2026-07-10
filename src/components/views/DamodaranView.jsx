"use client";
import {
  Bar, Line, BarChart, ComposedChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AlertTriangle, XCircle, GraduationCap, RefreshCw } from "lucide-react";
import { T, MONO } from "@/lib/theme";
import { useStore, damodaranScenarioDefaults } from "@/store/store";
import { Panel, Ctrl, TT } from "../ui/Primitives";
import { btnGhost } from "../ui/styleHelpers";
import { fmtNum, fmtBig, fmtPct } from "@/services/formatters";
import { DAMODARAN_SECTORS, DAMODARAN_META } from "@/services/damodaranIndustryData";

const SCENARIO_LABELS = ["Bull", "Base", "Bear"];

function setDam(dispatch, k, v) {
  dispatch({ type: "ASSUME", updater: (as) => ({ ...as, damodaran: { ...as.damodaran, [k]: v } }) });
}
function setScenario(dispatch, i, k, v) {
  dispatch({
    type: "ASSUME",
    updater: (as) => {
      const scenarios = as.damodaran.scenarios.map((sc, idx) => idx === i ? { ...sc, [k]: v } : sc);
      return { ...as, damodaran: { ...as.damodaran, scenarios } };
    },
  });
}
function setProb(dispatch, i, v) {
  dispatch({
    type: "ASSUME",
    updater: (as) => {
      const probabilities = as.damodaran.probabilities.map((p, idx) => idx === i ? v : p);
      return { ...as, damodaran: { ...as.damodaran, probabilities } };
    },
  });
}

function DiagnosticsPanel({ diagnostics }) {
  if (!diagnostics || !diagnostics.length) {
    return (
      <div style={{ background: "rgba(34,199,118,.08)", border: `1px solid ${T.greenDim}`, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: T.green }}>
        ✓ Nessuna incoerenza rilevata in nessuno dei 3 scenari: crescita, ROIC e reinvestment rate stabili sono internamente coerenti.
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {diagnostics.map((d, i) => {
        const isError = d.level === "error";
        const color = isError ? T.red : T.amber;
        const Icon = isError ? XCircle : AlertTriangle;
        return (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: isError ? "rgba(239,75,91,.08)" : "rgba(245,166,35,.08)", border: `1px solid ${isError ? T.redDim : T.amber}44`, borderRadius: 10, padding: "10px 14px" }}>
            <Icon size={15} color={color} style={{ marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: T.sub }}>{d.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

function DamodaranView() {
  const { state, val, dispatch } = useStore();
  const a = state.assumptions, dm = a.damodaran, d = state.data, cur = d.currency;
  const dam = val.damodaran; // { scenarios:[bull,base,bear] risultati, valuePerShare pesato, diagnostics, ... }

  const applySectorDefaults = () => {
    const defs = damodaranScenarioDefaults(dm.sector, d);
    dispatch({
      type: "ASSUME",
      updater: (as) => ({
        ...as,
        damodaran: {
          ...as.damodaran,
          currentMargin: defs.currentMargin,
          scenarios: defs.scenarios,
          probabilities: defs.probabilities,
        },
      }),
    });
  };

  const contrib = dam.scenarios.map((r, i) => ({
    name: SCENARIO_LABELS[i],
    value: r.valuePerShare,
    part: (isFinite(r.valuePerShare) ? r.valuePerShare : 0) * dm.probabilities[i],
  }));

  const scenarioColors = [T.green, T.blue, T.red];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ background: "rgba(76,141,255,.06)", border: `1px solid ${T.blue}33`, borderRadius: 10, padding: "10px 14px", fontSize: 11.5, color: T.sub, display: "flex", gap: 8 }}>
        <GraduationCap size={15} color={T.blue} />
        Modello FCFF a 3 stadi ispirato alla metodologia di Aswath Damodaran (NYU Stern), con 3 scenari
        Bull/Base/Bear pesati (0.2/0.6/0.2) — implementazione concettualmente fedele, non replica un file
        Excel specifico. Beta bottom-up da dataset di settore illustrativo (nota in fondo alla vista).
      </div>

      {(!d.revenue || d.revenue <= 0) && (
        <div style={{ background: "rgba(239,75,91,.08)", border: `1px solid ${T.redDim}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: T.red, display: "flex", gap: 8, alignItems: "center" }}>
          <AlertTriangle size={15} />
          Ricavi (revenue) non disponibili dal provider dati attuale — questo modello è basato su FCFF a
          partire dai ricavi, quindi il fair value resta a zero. Usa "Modifica dati" (in alto) per
          inserire il valore dei ricavi e ricalcolare.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel title="Costo del capitale" subtitle="Beta bottom-up (settore rilevereggiato) o manuale">
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[["sector", "Bottom-up (settore)"], ["manual", "Beta manuale"]].map(([m, l]) => (
              <button key={m} onClick={() => setDam(dispatch, "betaMode", m)}
                style={{ flex: 1, padding: "7px 4px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${dm.betaMode === m ? T.amber : T.border}`, background: dm.betaMode === m ? "rgba(245,166,35,.12)" : T.panel2, color: dm.betaMode === m ? T.amber : T.sub }}>
                {l}
              </button>
            ))}
          </div>

          {dm.betaMode === "sector" ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: T.sub }}>Settore (beta unlevered + default margine/reinvestimento)</span>
                <button onClick={applySectorDefaults} style={{ ...btnGhost(), padding: "4px 10px", fontSize: 10.5 }}><RefreshCw size={11} />Applica default di settore</button>
              </div>
              <select value={dm.sector} onChange={(e) => setDam(dispatch, "sector", e.target.value)}
                style={{ width: "100%", background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", color: T.text, fontSize: 12.5, outline: "none" }}>
                {DAMODARAN_SECTORS.map(s => <option key={s.sector} value={s.sector}>{s.sector} (β unlev. {s.unleveredBeta.toFixed(2)})</option>)}
              </select>
              <div style={{ fontSize: 10.5, color: T.muted, marginTop: 4 }}>Rilevereggiato con D/E e tax rate del titolo → beta bottom-up {fmtNum(dam.beta, 2)}. "Applica default" sovrascrive margine target e sales-to-capital dei 3 scenari con i tipici del settore.</div>
            </div>
          ) : (
            <Ctrl label="Beta manuale" value={dm.manualBeta} min={0.2} max={2.5} step={0.05} onChange={(v) => setDam(dispatch, "manualBeta", v)} format={(v) => v.toFixed(2)} />
          )}

          <Ctrl label="Risk-free rate" value={dm.riskFreeRate} min={0.005} max={0.08} step={0.001} onChange={(v) => setDam(dispatch, "riskFreeRate", v)} format={(v) => (v * 100).toFixed(2)} unit="%" />
          <Ctrl label="Equity Risk Premium" value={dm.erp} min={0.02} max={0.08} step={0.001} onChange={(v) => setDam(dispatch, "erp", v)} format={(v) => (v * 100).toFixed(2)} unit="%" />
          <Ctrl label="Margine operativo ATTUALE (comune ai 3 scenari)" value={dm.currentMargin} min={-0.1} max={0.6} step={0.005} onChange={(v) => setDam(dispatch, "currentMargin", v)} format={(v) => (v * 100).toFixed(1)} unit="%" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <div style={{ background: T.panel2, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase" }}>WACC alta crescita</div>
              <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, marginTop: 3 }}>{fmtPct(dam.wacc1)}</div>
            </div>
            <div style={{ background: T.panel2, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase" }}>WACC stabile</div>
              <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, marginTop: 3 }}>{fmtPct(dam.waccStable)}</div>
            </div>
          </div>
        </Panel>

        <Panel title="Contributo pesato per scenario" subtitle="Fair value di scenario × probabilità = parte del valore finale">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={contrib} margin={{ top: 10 }}>
              <CartesianGrid vertical={false} stroke={T.border} />
              <XAxis dataKey="name" stroke={T.muted} tick={{ fontSize: 11 }} />
              <YAxis stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} />
              <Tooltip content={<TT />} cursor={{ fill: "rgba(255,255,255,.03)" }} />
              <Bar dataKey="value" name="Fair value scenario" fill={T.panel3} radius={[4, 4, 0, 0]} />
              <Bar dataKey="part" name="Contributo pesato" fill={T.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ padding: "14px 12px", background: "rgba(34,199,118,.06)", border: `1px solid ${T.greenDim}`, borderRadius: 10, textAlign: "center", marginTop: 8 }}>
            <div style={{ fontSize: 10.5, color: T.muted, textTransform: "uppercase", letterSpacing: .8 }}>Damodaran Fair Value / Azione (pesato)</div>
            <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: T.green, marginTop: 4 }}>{fmtNum(dam.valuePerShare)} {cur}</div>
          </div>
        </Panel>
      </div>

      {/* --- Un pannello per scenario --- */}
      {SCENARIO_LABELS.map((label, i) => {
        const sc = dm.scenarios[i];
        const r = dam.scenarios[i];
        const proj = r.rows.map(row => ({ year: row.year, fcff: row.fcff, pv: row.pv }));
        const color = scenarioColors[i];
        return (
          <Panel key={i} title={`Scenario ${i + 1} — ${label}`} subtitle={`Fair value ${fmtNum(r.valuePerShare)} ${cur} · EV ${fmtBig(r.enterpriseValue)} · probabilità ${(dm.probabilities[i] * 100).toFixed(0)}%`}>
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
              <div>
                <Ctrl label="Probabilità" value={dm.probabilities[i]} min={0} max={1} step={0.05} onChange={(v) => setProb(dispatch, i, v)} format={(v) => (v * 100).toFixed(0)} unit="%" />
                <Ctrl label="Crescita ricavi (alta crescita)" value={sc.g1} min={-0.05} max={0.5} step={0.005} onChange={(v) => setScenario(dispatch, i, "g1", v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
                <Ctrl label="Margine operativo target" value={sc.targetMargin} min={-0.1} max={0.6} step={0.005} onChange={(v) => setScenario(dispatch, i, "targetMargin", v)} format={(v) => (v * 100).toFixed(1)} unit="%" />
                <Ctrl label="Crescita stabile perpetua" value={sc.gStable} min={0} max={0.06} step={0.0025} onChange={(v) => setScenario(dispatch, i, "gStable", v)} format={(v) => (v * 100).toFixed(2)} unit="%" />
                <Ctrl label="Sales-to-capital ratio" value={sc.salesToCapital} min={0.3} max={8} step={0.1} onChange={(v) => setScenario(dispatch, i, "salesToCapital", v)} format={(v) => v.toFixed(1)} unit="x" />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={proj}>
                  <CartesianGrid vertical={false} stroke={T.border} />
                  <XAxis dataKey="year" stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} tickFormatter={(y) => "Y" + y} />
                  <YAxis stroke={T.muted} tick={{ fontSize: 10, fontFamily: MONO }} tickFormatter={fmtBig} />
                  <Tooltip content={<TT />} />
                  <Bar dataKey="fcff" name="FCFF nominale" fill={T.panel3} radius={[3, 3, 0, 0]} />
                  <Line dataKey="pv" name="FCFF attualizzato" stroke={color} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        );
      })}

      <Panel title="Anni di proiezione (comuni ai 3 scenari)" subtitle="Alta crescita + transizione">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Ctrl label="Anni di alta crescita" value={dm.n1} min={1} max={10} step={1} onChange={(v) => setDam(dispatch, "n1", v)} format={(v) => v.toFixed(0)} unit=" anni" />
          <Ctrl label="Anni di transizione" value={dm.n2} min={1} max={10} step={1} onChange={(v) => setDam(dispatch, "n2", v)} format={(v) => v.toFixed(0)} unit=" anni" />
        </div>
      </Panel>

      <Panel title="Diagnostica di coerenza" subtitle="Vincoli tipici del metodo Damodaran su crescita, ROIC e reinvestimento stabile — per ciascuno dei 3 scenari">
        <DiagnosticsPanel diagnostics={dam.diagnostics} />
      </Panel>

      <div style={{ fontSize: 10.5, color: T.muted, textAlign: "center" }}>
        {DAMODARAN_META.note} Fonte ufficiale aggiornata: <a href={DAMODARAN_META.officialSourceUrl} target="_blank" rel="noreferrer" style={{ color: T.blue }}>betas.xls ↗</a>
      </div>
    </div>
  );
}

export { DamodaranView };
