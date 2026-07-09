/**
 * /services — FORMATTERS
 */
const fmtNum = (v, d = 2) => (v == null || !isFinite(v)) ? "—" :
  Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtBig = (v) => {
  if (v == null || !isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e12) return (v / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (v / 1e3).toFixed(2) + "K";
  return v.toFixed(2);
};
const fmtPct = (v, d = 1) => (v == null || !isFinite(v)) ? "—" : (v * 100).toFixed(d) + "%";
const fmtMoney = (v, cur = "USD") => (v == null || !isFinite(v)) ? "—" :
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", maximumFractionDigits: 2 }).format(v);


export { fmtNum, fmtBig, fmtPct, fmtMoney };
