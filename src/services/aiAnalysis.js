/**
 * /services — AI ANALYSIS (rule-based, deterministico)
 */
import { fmtNum } from "@/services/formatters";
import { svenCarlinIntrinsicValue } from "@/models/valuationEngine";

function generateAIAnalysis(ctx) {
  const { data, price, composite, upside, rating, sven, dcf, rel, assumptions } = ctx;
  const cur = data.currency || "USD";
  const pct = (v) => (v == null || !isFinite(v)) ? "n/d" : (v * 100).toFixed(1) + "%";
  const strengths = [], weaknesses = [], risks = [];

  // Qualita' business
  if (data.roe != null) (data.roe > 0.18 ? strengths : (data.roe < 0.08 ? weaknesses : []))
    .push(`ROE ${pct(data.roe)}`);
  if (data.netMargin != null) (data.netMargin > 0.15 ? strengths : (data.netMargin < 0.05 ? weaknesses : []))
    .push(`margine netto ${pct(data.netMargin)}`);
  if (data.grossMargin != null && data.grossMargin > 0.5) strengths.push(`margine lordo elevato ${pct(data.grossMargin)}`);
  const netDebt = (data.debt || 0) - (data.cash || 0);
  const nd2ebitda = data.ebitda ? netDebt / data.ebitda : null;
  if (nd2ebitda != null) {
    if (nd2ebitda < 0) strengths.push("posizione di cassa netta positiva");
    else if (nd2ebitda > 3) { weaknesses.push(`debito netto elevato (${nd2ebitda.toFixed(1)}x EBITDA)`); risks.push("leva finanziaria e sensibilita' ai tassi"); }
  }
  if (data.revenueGrowth != null && data.revenueGrowth > 0.15) strengths.push(`crescita ricavi ${pct(data.revenueGrowth)}`);
  if (data.revenueGrowth != null && data.revenueGrowth < 0) weaknesses.push("ricavi in contrazione");
  if (data.beta != null && data.beta > 1.3) risks.push(`alta volatilita' (beta ${data.beta.toFixed(2)})`);
  if (data.pe != null && data.pe > 35) risks.push("multiplo P/E elevato: sensibile a delusioni sulla crescita");

  // Business quality score (0-100)
  let q = 50;
  if (data.roe) q += Math.min(20, data.roe * 60);
  if (data.netMargin) q += Math.min(15, data.netMargin * 60);
  if (nd2ebitda != null) q += nd2ebitda < 1 ? 10 : (nd2ebitda > 3 ? -15 : 0);
  if (data.revenueGrowth) q += Math.min(10, data.revenueGrowth * 40);
  q = Math.max(0, Math.min(100, Math.round(q)));
  const quality = q > 75 ? "eccellente" : q > 60 ? "buona" : q > 45 ? "nella media" : "debole";

  // Sensitivita': quale leva muove di piu' il fair value
  const sensitivities = [];
  const baseIV = sven.intrinsicValue;
  const bump = (mut) => {
    const a = JSON.parse(JSON.stringify(assumptions));
    mut(a);
    const iv = svenCarlinIntrinsicValue(a.base, a.scenarios, a.probabilities).intrinsicValue;
    return (iv - baseIV) / baseIV;
  };
  sensitivities.push({ k: "Tasso di sconto (+1%)", d: bump(a => a.scenarios.forEach(s => s.discount += 0.01)) });
  sensitivities.push({ k: "Crescita 5 anni (+1%)", d: bump(a => a.scenarios.forEach(s => s.g1 += 0.01)) });
  sensitivities.push({ k: "Terminal multiple (+2x)", d: bump(a => a.scenarios.forEach(s => s.terminalMultiple += 2)) });
  sensitivities.sort((x, y) => Math.abs(y.d) - Math.abs(x.d));

  const verdict = upside >= 0.15
    ? `appare SOTTOVALUTATA: il fair value composito di ${fmtNum(composite)} ${cur} implica un potenziale di rialzo del ${(upside * 100).toFixed(0)}% rispetto al prezzo di ${fmtNum(price)} ${cur}.`
    : upside <= -0.15
    ? `appare SOPRAVVALUTATA: il fair value composito di ${fmtNum(composite)} ${cur} e' inferiore al prezzo di ${fmtNum(price)} ${cur} (downside ${(upside * 100).toFixed(0)}%).`
    : `appare VICINA AL FAIR VALUE: fair value ${fmtNum(composite)} ${cur} contro prezzo ${fmtNum(price)} ${cur}, scostamento ${(upside * 100).toFixed(0)}%.`;

  const summary =
    `${data.name || data.ticker} ${verdict} La qualita' del business e' ${quality} ` +
    `(quality score ${q}/100). Il modello a scenari di Sven Carlin restituisce un valore ` +
    `intrinseco di ${fmtNum(sven.intrinsicValue)} ${cur}; il DCF Gordon indica ` +
    `${fmtNum(dcf.fairValue)} ${cur} e la valutazione relativa (media multipli target) ` +
    `${fmtNum(rel.average)} ${cur}. La variabile piu' influente sul fair value e' ` +
    `"${sensitivities[0].k}" (impatto ${(sensitivities[0].d * 100).toFixed(0)}%), tipico dei modelli ` +
    `dominati dal terminal value: piccole variazioni nelle ipotesi di lungo termine spostano ` +
    `sensibilmente la stima. Rating complessivo: ${rating.label}.`;

  return { summary, strengths, weaknesses, risks, quality, qualityScore: q, sensitivities, verdict };
}


export { generateAIAnalysis };
