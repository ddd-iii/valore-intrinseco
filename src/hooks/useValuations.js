"use client";
/**
 * COMPUTE HOOK — ricalcola TUTTI i modelli ad ogni cambio ipotesi (live).
 */
import { useMemo } from "react";
import { deriveBase } from "@/store/store";
import {
  svenCarlinIntrinsicValue, dcfValuation, relativeValuation,
  grahamValuation, lynchValuation, ownerEarnings,
  compositeIntrinsic, ratingFromUpside, marginOfSafetyLevels,
  releverBeta, costOfEquity, computeWACC, damodaranFCFF3StageWeighted,
} from "@/models/valuationEngine";
import { DAMODARAN_SECTORS } from "@/services/damodaranIndustryData";

/* ==========================================================================
 * COMPUTE HOOK — ricalcola TUTTI i modelli ad ogni cambio ipotesi (live)
 * ========================================================================== */
function useValuations(data, a) {
  return useMemo(() => {
    if (!data || !a) return null;
    const sh = data.shares || (data.marketCap && data.price ? data.marketCap / data.price : 1);
    const netDebt = (data.debt || 0) - (data.cash || 0);
    const fcfps = data.fcf && sh ? data.fcf / sh : deriveBase(data, "fcfps");

    const sven = svenCarlinIntrinsicValue(a.base, a.scenarios, a.probabilities);
    const dcf = dcfValuation({
      fcf: data.fcf || fcfps * sh, growth: a.dcf.growth, discount: a.dcf.discount,
      terminalGrowth: a.dcf.terminalGrowth, years: a.dcf.years, netDebt, shares: sh,
    });
    const rel = relativeValuation({
      eps: data.eps, bvps: data.bvps, revenue: data.revenue, ebitda: data.ebitda,
      ebit: data.ebit, fcfps, epsGrowth: a.dcf.growth, shares: sh, netDebt,
    }, a.targets);
    const graham = grahamValuation({ eps: data.eps, epsGrowth: a.dcf.growth, bvps: data.bvps, aaaYield: a.aaaYield });
    const lynch = lynchValuation({ eps: data.eps, epsGrowth: a.dcf.growth, dividendYield: data.dividendYield });
    const oe = ownerEarnings({ netIncome: data.netIncome, depreciation: data.depreciation, capex: data.capex, shares: sh, discount: a.scenarios[0].discount, growth: a.ownerGrowth });

    // --- Damodaran FCFF a 3 stadi (#8) -------------------------------------
    const dm = a.damodaran;
    const equityValue = data.marketCap || sh * data.price;
    const debtValue = data.debt || 0;
    const de = equityValue > 0 ? debtValue / equityValue : 0;

    let beta;
    let sectorUnleveredBeta = null;
    if (dm.betaMode === "manual") {
      beta = dm.manualBeta;
    } else {
      const entry = DAMODARAN_SECTORS.find(s => s.sector === dm.sector);
      sectorUnleveredBeta = entry ? entry.unleveredBeta : 1;
      beta = releverBeta(sectorUnleveredBeta, de, a.taxRate);
    }
    const costOfDebtPreTax = dm.riskFreeRate + 0.015; // spread di credito indicativo
    const costOfDebtAfterTax = costOfDebtPreTax * (1 - a.taxRate);

    const ke1 = costOfEquity(dm.riskFreeRate, beta, dm.erp);
    const wacc1 = computeWACC({ costOfEquityV: ke1, costOfDebtAfterTax, equityValue, debtValue });

    const keStable = costOfEquity(dm.riskFreeRate, 1.0, dm.erp); // beta -> 1 (mercato) in stable growth
    const waccStable = dm.waccStableOverride && dm.waccStableOverride > 0
      ? dm.waccStableOverride
      : computeWACC({ costOfEquityV: keStable, costOfDebtAfterTax, equityValue, debtValue });

    const damodaran = damodaranFCFF3StageWeighted({
      revenue0: data.revenue || 0,
      currentMargin: dm.currentMargin, n1: dm.n1, n2: dm.n2,
      taxRate: a.taxRate, wacc1, waccStable, riskFreeRate: dm.riskFreeRate,
      roicStableOverride: dm.roicStableOverride, netDebt, shares: sh,
    }, dm.scenarios, dm.probabilities);
    damodaran.beta = beta;
    damodaran.sectorUnleveredBeta = sectorUnleveredBeta;
    damodaran.wacc1 = wacc1;
    damodaran.waccStable = waccStable;
    damodaran.costOfDebtAfterTax = costOfDebtAfterTax;

    // Composito base = Sven Carlin + Relative (sempre). Damodaran e Owner
    // Earnings entrano SOLO se l'utente li abilita esplicitamente (toggle) E
    // il valore calcolato è valido (altrimenti un modello a zero per dati
    // mancanti abbasserebbe artificialmente la media).
    const damodaranValid = isFinite(damodaran.valuePerShare) && damodaran.valuePerShare > 0;
    const oeValid = isFinite(oe.capitalized) && oe.capitalized > 0;
    const includeC = a.includeInComposite || { damodaran: false, ownerEarnings: false };
    const compositeExtras = [];
    if (includeC.damodaran && damodaranValid) compositeExtras.push(damodaran.valuePerShare);
    if (includeC.ownerEarnings && oeValid) compositeExtras.push(oe.capitalized);
    const composite = compositeIntrinsic(sven.intrinsicValue, rel.average, ...compositeExtras);
    const price = data.price;
    const upside = isFinite(composite) && price ? (composite - price) / price : NaN;
    const rating = ratingFromUpside(upside);
    const mos = marginOfSafetyLevels(composite);

    return { sven, dcf, rel, graham, lynch, oe, damodaran, composite, price, upside, rating, mos, netDebt, fcfps, shares: sh, damodaranValid, oeValid };
  }, [data, a]);
}


export { useValuations };

