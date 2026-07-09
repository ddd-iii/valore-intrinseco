"use client";
import { useStore } from "@/store/store";
import { Panel, Row } from "../ui/Primitives";
import { fmtNum, fmtBig } from "@/services/formatters";

function Financials() {
  const { state } = useStore();
  const d = state.data, cur = d.currency;
  const groups = [
    ["Income Statement", [["Revenue", d.revenue], ["Operating Income", d.operatingIncome], ["EBIT", d.ebit], ["EBITDA", d.ebitda], ["Net Income", d.netIncome]]],
    ["Cash Flow", [["Operating Cash Flow", d.operatingCashFlow], ["CapEx", d.capex], ["Free Cash Flow", d.fcf], ["Depreciation & Amort.", d.depreciation]]],
    ["Balance Sheet", [["Cash", d.cash], ["Debt", d.debt], ["Net Debt", (d.debt || 0) - (d.cash || 0)], ["Book Value / share", d.bvps]]],
    ["Per Share", [["EPS", d.eps], ["Book Value / share", d.bvps], ["FCF / share", d.fcf && d.shares ? d.fcf / d.shares : null], ["Shares Outstanding", d.shares]]],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {groups.map(([title, rows], i) => (
        <Panel key={i} title={title} subtitle={`Valori in ${cur}`}>
          {rows.map(([k, v]) => <Row key={k} k={k} v={k.includes("share") && !k.includes("Shares") ? fmtNum(v) : fmtBig(v)} tone={k === "Net Debt" && v < 0 ? "green" : undefined} />)}
        </Panel>
      ))}
    </div>
  );
}

export { Financials };
