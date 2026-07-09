"use client";
import { useStore } from "@/store/store";
import { Overview } from "./Overview";
import { Valuation } from "./Valuation";
import { IntrinsicView } from "./IntrinsicView";
import { DCFView } from "./DCFView";
import { RelativeView } from "./RelativeView";
import { DamodaranView } from "./DamodaranView";
import { Financials } from "./Financials";
import { Charts } from "./Charts";
import { Ratios } from "./Ratios";
import { Assumptions } from "./Assumptions";
import { Report } from "./Report";
import { AIView } from "./AIView";
import { Settings } from "./Settings";

function Views() {
  const { state } = useStore();
  const map = { overview: Overview, valuation: Valuation, intrinsic: IntrinsicView, dcf: DCFView, relative: RelativeView, damodaran: DamodaranView, financials: Financials, charts: Charts, ratios: Ratios, assumptions: Assumptions, report: Report, ai: AIView, settings: Settings };
  const V = map[state.view] || Overview;
  return <V />;
}

export { Views };
