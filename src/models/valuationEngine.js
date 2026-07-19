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
  // Guardia di sicurezza: se dividendYield arriva già come % invece che come
  // frazione (es. inserimento manuale errato), un valore >25 qui sarebbe un
  // dividend yield implausibile (>2500%) — probabile errore di unità, tronca.
  let dyRaw = (dividendYield || 0) * 100;
  if (dyRaw > 25) dyRaw = dyRaw / 100;
  const dy = dyRaw;
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
function compositeIntrinsic(...values) {
  const parts = values.filter(v => isFinite(v) && v > 0);
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


/* ==========================================================================
 * DAMODARAN — Bottom-up beta, costo del capitale, FCFF a 3 stadi.
 * Implementazione CONCETTUALMENTE fedele alla metodologia di Aswath
 * Damodaran (NYU Stern) — non replica un file Excel specifico, ma segue
 * gli stessi principi dei suoi modelli "ginzu" (fcffginzu / fcff3st):
 *   - crescita che converge da alta a stabile in 2 fasi (alta + transizione)
 *   - margine operativo che converge verso un target
 *   - costo del capitale che converge verso un valore "maturo"
 *   - reinvestimento stabile = g / ROIC, con vincolo di coerenza ROIC<=WACC
 * ========================================================================== */

/** Rimuove l'effetto leva dal beta osservato (Hamada, con aggiustamento tax). */
function unleverBeta(beta, de, taxRate) {
  return beta / (1 + (1 - taxRate) * de);
}

/** Rilevereggia un beta unlevered di settore con la struttura del capitale del titolo. */
function releverBeta(unleveredBeta, de, taxRate) {
  return unleveredBeta * (1 + (1 - taxRate) * de);
}

/** Costo dell'equity via CAPM: Ke = Rf + beta * ERP. */
function costOfEquity(riskFreeRate, beta, erp) {
  return riskFreeRate + beta * erp;
}

/** WACC pesato su equity/debito a valori di mercato. */
function computeWACC({ costOfEquityV, costOfDebtAfterTax, equityValue, debtValue }) {
  const total = (equityValue || 0) + (debtValue || 0);
  if (!total) return costOfEquityV;
  return costOfEquityV * (equityValue / total) + costOfDebtAfterTax * (debtValue / total);
}

/**
 * FCFF a 3 stadi (alta crescita -> transizione -> stabile), metodo Damodaran.
 *
 * @param revenue0        Ricavi base (anno 0)
 * @param currentMargin   Margine operativo attuale (EBIT/Ricavi)
 * @param targetMargin    Margine operativo target/stabile
 * @param g1              Crescita ricavi in alta crescita
 * @param n1              Anni di alta crescita
 * @param n2              Anni di transizione (crescita e margine convergono)
 * @param gStable         Crescita stabile perpetua (deve essere <= risk-free rate)
 * @param taxRate         Aliquota fiscale (marginale)
 * @param salesToCapital  Rapporto vendite/capitale investito (reinvestment = deltaRicavi / questo rapporto)
 * @param wacc1           Costo del capitale in fase di alta crescita
 * @param waccStable      Costo del capitale stabile/maturo
 * @param riskFreeRate    Tasso risk-free (per diagnostica: gStable non deve superarlo)
 * @param roicStableOverride  ROIC stabile forzato (default = waccStable, no rendimenti in eccesso)
 * @param netDebt         Debito netto (debt - cash)
 * @param shares          Azioni in circolazione
 */
function damodaranFCFF3Stage({
  revenue0, currentMargin, targetMargin,
  g1, n1, n2, gStable,
  taxRate, salesToCapital,
  wacc1, waccStable, riskFreeRate,
  roicStableOverride, netDebt, shares,
}) {
  const totalYears = n1 + n2;
  const rows = [];
  let revenuePrev = revenue0;
  let cumDiscount = 1;

  for (let t = 1; t <= totalYears; t++) {
    // Crescita: costante g1 in alta crescita, poi convergenza lineare verso gStable
    const growth = t <= n1
      ? g1
      : g1 + (gStable - g1) * ((t - n1) / n2);
    // Margine: convergenza lineare dal margine attuale al target lungo TUTTO il periodo
    const margin = currentMargin + (targetMargin - currentMargin) * (t / totalYears);
    // Costo del capitale: costante in alta crescita, poi convergenza lineare verso lo stabile
    const wacc = t <= n1
      ? wacc1
      : wacc1 + (waccStable - wacc1) * ((t - n1) / n2);

    const revenue = revenuePrev * (1 + growth);
    const ebit = revenue * margin;
    const ebitAfterTax = ebit * (1 - taxRate);
    const deltaRevenue = revenue - revenuePrev;
    const reinvestment = salesToCapital > 0 ? deltaRevenue / salesToCapital : 0;
    const fcff = ebitAfterTax - reinvestment;

    cumDiscount *= (1 + wacc);
    const pv = fcff / cumDiscount;

    rows.push({ year: t, growth, margin, revenue, ebit, ebitAfterTax, reinvestment, fcff, wacc, cumDiscount, pv });
    revenuePrev = revenue;
  }

  // --- Terminal value (perpetuita' stabile) ---
  const roicStable = roicStableOverride && roicStableOverride > 0 ? roicStableOverride : waccStable;
  const reinvestRateStable = roicStable > 0 ? gStable / roicStable : 0;
  const revenueStable = revenuePrev * (1 + gStable);
  const ebitStable = revenueStable * targetMargin;
  const ebitAfterTaxStable = ebitStable * (1 - taxRate);
  const fcffStable = ebitAfterTaxStable * (1 - reinvestRateStable);
  const terminalValue = (waccStable - gStable) > 0 ? fcffStable / (waccStable - gStable) : NaN;
  const terminalPV = terminalValue / cumDiscount;

  const sumPV = rows.reduce((a, r) => a + r.pv, 0);
  const enterpriseValue = sumPV + terminalPV;
  const equityValue = enterpriseValue - (netDebt || 0);
  const valuePerShare = shares ? equityValue / shares : NaN;

  // --- Diagnostica di coerenza (stile Damodaran) ---
  const diagnostics = [];
  if (gStable > riskFreeRate) {
    diagnostics.push({ level: "error", msg: `Crescita stabile (${(gStable * 100).toFixed(1)}%) supera il risk-free rate (${(riskFreeRate * 100).toFixed(1)}%): nessuna azienda può crescere più dell'economia per sempre.` });
  }
  if (roicStable > waccStable * 1.0001) {
    diagnostics.push({ level: "warn", msg: `ROIC stabile (${(roicStable * 100).toFixed(1)}%) > WACC stabile (${(waccStable * 100).toFixed(1)}%): implica rendimenti in eccesso all'infinito, ipotesi molto aggressiva.` });
  }
  if (reinvestRateStable < 0 || reinvestRateStable > 1) {
    diagnostics.push({ level: "error", msg: `Reinvestment rate stabile implicito (${(reinvestRateStable * 100).toFixed(0)}%) fuori dal range 0-100%: verifica g stabile e ROIC stabile.` });
  }
  if (salesToCapital > 0 && (salesToCapital < 0.3 || salesToCapital > 8)) {
    diagnostics.push({ level: "warn", msg: `Sales-to-capital ratio (${salesToCapital.toFixed(2)}x) insolito: verifica la plausibilità rispetto al settore.` });
  }
  if (targetMargin < 0 || targetMargin > 0.6) {
    diagnostics.push({ level: "warn", msg: `Margine operativo target (${(targetMargin * 100).toFixed(0)}%) è insolitamente estremo: verifica il dato.` });
  }

  return {
    rows, terminalValue, terminalPV, sumPV, enterpriseValue, equityValue, valuePerShare,
    roicStable, reinvestRateStable, diagnostics,
  };
}

/**
 * FCFF a 3 stadi, versione a 3 SCENARI pesati (Bull/Base/Bear), sullo stesso
 * principio dello schema di Sven Carlin: ogni scenario ha una propria
 * crescita, margine target e sales-to-capital; il costo del capitale (WACC)
 * e l'orizzonte temporale sono condivisi (dipendono dal rischio sistematico
 * e dal profilo di maturazione, non dallo scenario macro).
 *
 * @param shared     { revenue0, currentMargin, n1, n2, taxRate, wacc1,
 *                     waccStable, riskFreeRate, roicStableOverride,
 *                     netDebt, shares }
 * @param scenarios  [{ g1, targetMargin, gStable, salesToCapital }] x3 (Bull, Base, Bear)
 * @param probabilities  [pBull, pBase, pBear]
 */
function damodaranFCFF3StageWeighted(shared, scenarios, probabilities) {
  const results = scenarios.map(sc => damodaranFCFF3Stage({
    revenue0: shared.revenue0, currentMargin: shared.currentMargin, targetMargin: sc.targetMargin,
    g1: sc.g1, n1: shared.n1, n2: shared.n2, gStable: sc.gStable,
    taxRate: shared.taxRate, salesToCapital: sc.salesToCapital,
    wacc1: shared.wacc1, waccStable: shared.waccStable, riskFreeRate: shared.riskFreeRate,
    roicStableOverride: shared.roicStableOverride, netDebt: shared.netDebt, shares: shared.shares,
  }));

  const probSum = probabilities.reduce((a, b) => a + b, 0) || 1;
  const weightedValuePerShare = results.reduce((acc, r, i) => acc + (isFinite(r.valuePerShare) ? r.valuePerShare * probabilities[i] : 0), 0) / probSum;
  const weightedEnterpriseValue = results.reduce((acc, r, i) => acc + r.enterpriseValue * probabilities[i], 0) / probSum;

  const labels = ["Bull", "Base", "Bear"];
  const diagnostics = results.flatMap((r, i) => r.diagnostics.map(d => ({ ...d, msg: `[${labels[i] || `Scenario ${i + 1}`}] ${d.msg}` })));

  return {
    scenarios: results,          // risultato completo per scenario (rows, terminalValue, ecc.)
    valuePerShare: weightedValuePerShare,
    enterpriseValue: weightedEnterpriseValue,
    diagnostics,
    probabilities,
  };
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
  unleverBeta,
  releverBeta,
  costOfEquity,
  computeWACC,
  damodaranFCFF3Stage,
  damodaranFCFF3StageWeighted,
};
