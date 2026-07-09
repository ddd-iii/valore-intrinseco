/**
 * /services — EXPORT (Excel via SheetJS, CSV, Print)
 */
import * as XLSX from "xlsx";
function exportExcel(ctx) {
  const { data, price, composite, sven, dcf, rel, graham, lynch, oe, mos, assumptions } = ctx;
  const wb = XLSX.utils.book_new();
  const summary = [
    ["FAIR VALUE TERMINAL — Report", ""],
    ["Company", data.name || data.ticker], ["Ticker", data.ticker],
    ["Sector", data.sector || "—"], ["Currency", data.currency || "USD"],
    ["Current Price", price], ["", ""],
    ["VALUATION", "Fair Value / share"],
    ["Sven Carlin Intrinsic Value", sven.intrinsicValue],
    ["DCF (Gordon)", dcf.fairValue],
    ["Relative (avg multiples)", rel.average],
    ["Graham (revised)", graham.revised],
    ["Graham Number", graham.grahamNumber],
    ["Peter Lynch", lynch.fairValue],
    ["Owner Earnings (capitalized)", oe.capitalized],
    ["COMPOSITE INTRINSIC VALUE", composite],
    ["Upside vs price", (composite - price) / price],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
  // Sven scenarios
  const scRows = [["Scenario", "Prob", "g1", "g2", "Discount", "Term.Mult", "PV/share"]];
  assumptions.scenarios.forEach((s, i) => scRows.push([
    ["Normal", "Best", "Worst"][i], assumptions.probabilities[i], s.g1, s.g2, s.discount, s.terminalMultiple, sven.perScenarioPV[i],
  ]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scRows), "Sven Scenarios");
  // MOS
  const mosRows = [["Margin of Safety", "Buy Below"], ...mos.map(m => [m.mos, m.buyBelow])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mosRows), "Margin of Safety");
  XLSX.writeFile(wb, `${data.ticker}_fair_value.xlsx`);
}
function exportCSV(ctx) {
  const { data, price, composite, sven, dcf, rel } = ctx;
  const rows = [
    ["metric", "value"], ["ticker", data.ticker], ["price", price],
    ["sven_intrinsic", sven.intrinsicValue], ["dcf", dcf.fairValue],
    ["relative_avg", rel.average], ["composite", composite],
    ["upside", (composite - price) / price],
  ];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `${data.ticker}_fair_value.csv`; a.click();
}


export { exportExcel, exportCSV };
