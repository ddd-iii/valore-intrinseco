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
} from "@/models/valuationEngine";

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
      ebit: data.ebit, fcfps, epsGrowth: data.epsGrowth || a.dcf.growth, shares: sh, netDebt,
    }, a.targets);
    const graham = grahamValuation({ eps: data.eps, epsGrowth: data.epsGrowth || a.dcf.growth, bvps: data.bvps, aaaYield: a.aaaYield });
    const lynch = lynchValuation({ eps: data.eps, epsGrowth: data.epsGrowth || a.dcf.growth, dividendYield: data.dividendYield });
    const oe = ownerEarnings({ netIncome: data.netIncome, depreciation: data.depreciation, capex: data.capex, shares: sh, discount: a.scenarios[0].discount, growth: a.ownerGrowth });

    const composite = compositeIntrinsic(sven.intrinsicValue, rel.average);
    const price = data.price;
    const upside = isFinite(composite) && price ? (composite - price) / price : NaN;
    const rating = ratingFromUpside(upside);
    const mos = marginOfSafetyLevels(composite);

    return { sven, dcf, rel, graham, lynch, oe, composite, price, upside, rating, mos, netDebt, fcfps, shares: sh };
  }, [data, a]);
}


export { useValuations };
