/**
 * /models — VALUATION ENGINE (funzioni pure, indipendenti, testate).
 * Ogni funzione documenta la cella/foglio Excel di provenienza.
 */

/**
 * SVEN CARLIN INTRINSIC VALUE — replica del foglio "= (2)".
 * DCF a 3 scenari pesati per probabilita'.
 *
 * @param base   valore di partenza per azione (Excel C6, "input per share")
 * @param scen   [{g1,g2,discount,terminalMultiple}] x3  (righe 5-8,11-14,17-20)
 * @param probs  [pNormal,pBest,pWorst]  (Excel D23:D25 = 0.6/0.2/0.2)
 *
 * Formule replicate:
 *   Proiezione (D6:M6):  Vk = Vk-1*(1+g)      g=g1 anni1-5, g=g2 anni6-10
 *   Terminal   (N6):     TV = V(anno9) * mult  <-- Excel N6 = L6*O8 (2030!)
 *   Sconto     (D7:N7):  PVk = Vk/(1+d)^k ;  PV(term)=TV/(1+d)^10
 *   Scenario   (D8):     = SUM(D7:N7)
 *   Finale     (F26):    = SUM(prob_i * PV_i)
 */
function svenCarlinScenario(base, g1, g2, discount, terminalMultiple) {
  const values = [];
  let v = base;
  for (let yr = 1; yr <= 10; yr++) {
    const g = yr <= 5 ? g1 : g2;
    v = v * (1 + g);
    values.push(v);                       // values[0]=anno1 ... values[9]=anno10
  }
  // Terminal: Excel N6 = L6*O8 -> valore ANNO 9 (2030) x multiplo (fedele all'Excel)
  const terminal = values[8] * terminalMultiple;
  const discounted = values.map((val, i) => val / Math.pow(1 + discount, i + 1));
  const termPV = terminal / Math.pow(1 + discount, 10);
  const pv = discounted.reduce((a, b) => a + b, 0) + termPV;
  return { values, discounted, terminal, termPV, pv };
}

function svenCarlinIntrinsicValue(base, scen, probs) {
  const s = scen.map(x =>
    svenCarlinScenario(base, x.g1, x.g2, x.discount, x.terminalMultiple)
  );
  const weighted = s.reduce((acc, sc, i) => acc + sc.pv * probs[i], 0);
  const probSum = probs.reduce((a, b) => a + b, 0) || 1;
  return {
    scenarios: s,
    intrinsicValue: weighted / probSum,   // normalizza se prob != 1
    weightedRaw: weighted,
    perScenarioPV: s.map(x => x.pv),
  };
}

/**
 * DISCOUNTED CASH FLOW (modello #2) — DCF standard con Gordon terminal.
 * EV = Σ FCFk/(1+d)^k + TV/(1+d)^N ,  TV = FCF_N*(1+tg)/(d-tg)
 * Equity = EV - NetDebt ; FairValue/share = Equity / Shares
 */
function dcfValuation({ fcf, growth, discount, terminalGrowth, years, netDebt, shares }) {
  if (!(discount > terminalGrowth)) return { fairValue: NaN, rows: [], ev: NaN };
  const rows = [];
  let f = fcf, evOperating = 0;
  for (let k = 1; k <= years; k++) {
    f = f * (1 + growth);
    const pv = f / Math.pow(1 + discount, k);
    evOperating += pv;
    rows.push({ year: k, fcf: f, pv });
  }
  const tv = (f * (1 + terminalGrowth)) / (discount - terminalGrowth);
  const tvPV = tv / Math.pow(1 + discount, years);
  const ev = evOperating + tvPV;
  const equity = ev - (netDebt || 0);
  const fairValue = shares > 0 ? equity / shares : NaN;
  return { fairValue, ev, equity, tv, tvPV, rows, sumOpPV: evOperating };
}

/**
 * RELATIVE VALUATION (modello #3) — multipli target vs settore.
 * Ogni multiplo produce un fair value/azione; media = valutazione relativa.
 */
function relativeValuation(m, tgt) {
  const nd = m.netDebt || 0, sh = m.shares || 1;
  const out = {};
  if (m.eps != null && tgt.pe)         out.PE       = m.eps * tgt.pe;
  if (m.bvps != null && tgt.pb)        out.PB       = m.bvps * tgt.pb;
  if (m.revenue != null && tgt.ps)     out.PS       = (m.revenue / sh) * tgt.ps;
  if (m.ebitda != null && tgt.evEbitda) out["EV/EBITDA"] = (m.ebitda * tgt.evEbitda - nd) / sh;
  if (m.ebit != null && tgt.evEbit)    out["EV/EBIT"] = (m.ebit * tgt.evEbit - nd) / sh;
  if (m.eps != null && tgt.peg && m.epsGrowth) out.PEG = m.eps * (m.epsGrowth * 100 * tgt.peg);
  if (m.fcfps != null && tgt.pFcf)     out["P/FCF"] = m.fcfps * tgt.pFcf;
  const vals = Object.values(out).filter(v => isFinite(v) && v > 0);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN;
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : NaN;
  return { perMultiple: out, average: avg, median };
}

/** GRAHAM (modello #4). Revised: V = EPS*(8.5+2g)*4.4/Y. + Graham Number. */
function grahamValuation({ eps, epsGrowth, bvps, aaaYield }) {
  const g = (epsGrowth || 0) * 100;
  const Y = aaaYield || 4.4;
  const revised = eps > 0 ? (eps * (8.5 + 2 * g) * 4.4) / Y : NaN;
  const number = (eps > 0 && bvps > 0) ? Math.sqrt(22.5 * eps * bvps) : NaN;
  return { revised, grahamNumber: number };
}

/** PETER LYNCH (modello #5). Fair PE = growth% (+div yield). FV = EPS*fairPE. */
function lynchValuation({ eps, epsGrowth, dividendYield }) {
  const g = (epsGrowth || 0) * 100;
  const dy = (dividendYield || 0) * 100;
  const fairPE = g + dy;                       // PEG(+yield)=1
  return { fairValue: eps > 0 ? eps * fairPE : NaN, fairPE };
}

/** OWNER EARNINGS (modello #6, Buffett). OE = NI + D&A - maintenance capex. */
function ownerEarnings({ netIncome, depreciation, capex, shares, discount, growth }) {
  const oe = (netIncome || 0) + (depreciation || 0) - Math.abs(capex || 0);
  const oeps = shares > 0 ? oe / shares : NaN;
  // Capitalized owner earnings (perpetuita' con crescita): OEps*(1+g)/(d-g)
  const g = growth || 0, d = discount || 0.10;
  const capitalized = d > g ? (oeps * (1 + g)) / (d - g) : NaN;
  return { ownerEarnings: oe, oeps, capitalized };
}

/** MARGIN OF SAFETY (modello #7). Prezzi d'acquisto a 10/20/30/40/50%. */
function marginOfSafetyLevels(fairValue) {
  return [0.10, 0.20, 0.30, 0.40, 0.50].map(m => ({
    mos: m, buyBelow: fairValue * (1 - m),
  }));
}

/** COMPOSITE INTRINSIC VALUE (Alpha Spread style): media DCF & Relative. */
function compositeIntrinsic(dcfIV, relIV) {
  const parts = [dcfIV, relIV].filter(v => isFinite(v) && v > 0);
  if (!parts.length) return NaN;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

/** RATING da upside % (composite fair value vs prezzo). */
function ratingFromUpside(up) {
  if (!isFinite(up)) return { label: "N/A", tone: "muted" };
  if (up >= 0.35) return { label: "Strong Buy", tone: "green" };
  if (up >= 0.15) return { label: "Buy", tone: "green" };
  if (up > -0.15) return { label: "Hold", tone: "amber" };
  if (up > -0.35) return { label: "Sell", tone: "red" };
  return { label: "Strong Sell", tone: "red" };
}


export {
  svenCarlinScenario,
  svenCarlinIntrinsicValue,
  dcfValuation,
  relativeValuation,
  grahamValuation,
  lynchValuation,
  ownerEarnings,
  marginOfSafetyLevels,
  compositeIntrinsic,
  ratingFromUpside,
};
