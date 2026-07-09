/**
 * /providers — DATA PROVIDER LAYER (catena a priorità + fallback).
 * Interfaccia comune: getCompany / getFinancials / getHistorical / getRatios.
 * NOTA: la maggior parte delle API gratuite blocca il CORS lato browser.
 * Alpha Vantage, FMP e Finnhub abilitano CORS con una API key gratuita.
 */

const num = (x) => { const n = parseFloat(x); return isFinite(n) ? n : null; };

// ---- Alpha Vantage (CORS ok con key gratuita) ------------------------------
async function fetchAlphaVantage(ticker, key) {
  if (!key) throw new Error("no-key");
  const base = "https://www.alphavantage.co/query";
  const j = async (fn) => {
    const r = await fetch(`${base}?function=${fn}&symbol=${ticker}&apikey=${key}`);
    const d = await r.json();
    if (d.Note || d.Information) throw new Error("rate-limit");
    return d;
  };
  const [ov, q, cf, is, bs] = await Promise.all([
    j("OVERVIEW"), j("GLOBAL_QUOTE"), j("CASH_FLOW"), j("INCOME_STATEMENT"), j("BALANCE_SHEET"),
  ]);
  if (!ov || !ov.Symbol) throw new Error("empty");
  const price = num(q?.["Global Quote"]?.["05. price"]);
  const shares = num(ov.SharesOutstanding);
  const inc = is?.annualReports?.[0] || {};
  const cfl = cf?.annualReports?.[0] || {};
  const bal = bs?.annualReports?.[0] || {};
  const fcf = (num(cfl.operatingCashflow) || 0) - Math.abs(num(cfl.capitalExpenditures) || 0);
  const hist = (is?.annualReports || []).slice(0, 6).reverse().map((r, i) => {
    const cfr = (cf?.annualReports || [])[(is.annualReports.length - 1) - i] || {};
    return {
      year: (r.fiscalDateEnding || "").slice(0, 4),
      revenue: num(r.totalRevenue),
      netIncome: num(r.netIncome),
      eps: shares ? (num(r.netIncome) || 0) / shares : null,
      fcf: (num(cfr.operatingCashflow) || 0) - Math.abs(num(cfr.capitalExpenditures) || 0),
    };
  });
  return {
    source: "Alpha Vantage",
    ticker: ov.Symbol, name: ov.Name, sector: ov.Sector, industry: ov.Industry,
    country: ov.Country, currency: ov.Currency,
    price, marketCap: num(ov.MarketCapitalization), shares,
    eps: num(ov.EPS), bvps: num(ov.BookValue),
    revenue: num(inc.totalRevenue), netIncome: num(inc.netIncome),
    ebit: num(inc.ebit), ebitda: num(inc.ebitda),
    operatingIncome: num(inc.operatingIncome),
    depreciation: num(cfl.depreciationDepletionAndAmortization),
    capex: num(cfl.capitalExpenditures),
    operatingCashFlow: num(cfl.operatingCashflow), fcf,
    cash: num(bal.cashAndCashEquivalentsAtCarryingValue),
    debt: (num(bal.shortLongTermDebtTotal) || num(bal.longTermDebt) || 0),
    pe: num(ov.PERatio), forwardPe: num(ov.ForwardPE), pb: num(ov.PriceToBookRatio),
    ps: num(ov.PriceToSalesRatioTTM), pegRatio: num(ov.PEGRatio),
    evEbitda: num(ov.EVToEBITDA), roe: num(ov.ReturnOnEquityTTM),
    roa: num(ov.ReturnOnAssetsTTM), grossMargin: num(ov.GrossProfitTTM),
    operatingMargin: num(ov.OperatingMarginTTM), netMargin: num(ov.ProfitMargin),
    dividendYield: num(ov.DividendYield), beta: num(ov.Beta),
    week52High: num(ov["52WeekHigh"]), week52Low: num(ov["52WeekLow"]),
    epsGrowth: num(ov.QuarterlyEarningsGrowthYOY),
    revenueGrowth: num(ov.QuarterlyRevenueGrowthYOY),
    historical: hist,
  };
}

// ---- Financial Modeling Prep (CORS ok con key) -----------------------------
async function fetchFMP(ticker, key) {
  if (!key) throw new Error("no-key");
  const b = "https://financialmodelingprep.com/api/v3";
  const g = async (p) => (await fetch(`${b}/${p}${p.includes("?") ? "&" : "?"}apikey=${key}`)).json();
  const [prof, ratios, cfl, inc, bal] = await Promise.all([
    g(`profile/${ticker}`), g(`ratios-ttm/${ticker}`),
    g(`cash-flow-statement/${ticker}?limit=6`), g(`income-statement/${ticker}?limit=6`),
    g(`balance-sheet-statement/${ticker}?limit=1`),
  ]);
  const p = prof?.[0]; if (!p) throw new Error("empty");
  const r = ratios?.[0] || {}, i0 = inc?.[0] || {}, c0 = cfl?.[0] || {}, b0 = bal?.[0] || {};
  const hist = (inc || []).slice(0, 6).reverse().map((row, idx) => {
    const cf = (cfl || [])[(inc.length - 1) - idx] || {};
    return {
      year: (row.date || "").slice(0, 4), revenue: row.revenue, netIncome: row.netIncome,
      eps: row.eps, fcf: (cf.operatingCashFlow || 0) - Math.abs(cf.capitalExpenditure || 0),
    };
  });
  return {
    source: "Financial Modeling Prep",
    ticker: p.symbol, name: p.companyName, sector: p.sector, industry: p.industry,
    country: p.country, currency: p.currency, price: p.price, marketCap: p.mktCap,
    shares: p.mktCap && p.price ? p.mktCap / p.price : null,
    eps: i0.eps, bvps: r.bookValuePerShareTTM,
    revenue: i0.revenue, netIncome: i0.netIncome, ebit: i0.operatingIncome,
    ebitda: i0.ebitda, operatingIncome: i0.operatingIncome,
    depreciation: c0.depreciationAndAmortization, capex: c0.capitalExpenditure,
    operatingCashFlow: c0.operatingCashFlow,
    fcf: (c0.operatingCashFlow || 0) - Math.abs(c0.capitalExpenditure || 0),
    cash: b0.cashAndCashEquivalents, debt: b0.totalDebt,
    pe: r.peRatioTTM, pb: r.priceToBookRatioTTM, ps: r.priceToSalesRatioTTM,
    pegRatio: r.pegRatioTTM, roe: r.returnOnEquityTTM, roa: r.returnOnAssetsTTM,
    grossMargin: r.grossProfitMarginTTM, operatingMargin: r.operatingProfitMarginTTM,
    netMargin: r.netProfitMarginTTM, dividendYield: r.dividendYieldTTM, beta: p.beta,
    week52High: num((p.range || "").split("-")[1]), week52Low: num((p.range || "").split("-")[0]),
    historical: hist,
  };
}

// ---- Finnhub (CORS ok con key) --------------------------------------------
async function fetchFinnhub(ticker, key) {
  if (!key) throw new Error("no-key");
  const b = "https://finnhub.io/api/v1";
  const g = async (p) => (await fetch(`${b}/${p}&token=${key}`)).json();
  const [prof, quote, metric] = await Promise.all([
    g(`stock/profile2?symbol=${ticker}`), g(`quote?symbol=${ticker}`),
    g(`stock/metric?symbol=${ticker}&metric=all`),
  ]);
  if (!prof || !prof.ticker) throw new Error("empty");
  const m = metric?.metric || {};
  return {
    source: "Finnhub",
    ticker: prof.ticker, name: prof.name, sector: prof.finnhubIndustry,
    industry: prof.finnhubIndustry, country: prof.country, currency: prof.currency,
    price: quote.c, marketCap: prof.marketCapitalization,
    shares: prof.shareOutstanding, eps: m.epsInclExtraItemsTTM || m.epsTTM,
    bvps: m.bookValuePerShareQuarterly, pe: m.peTTM, pb: m.pbQuarterly,
    ps: m.psTTM, roe: m.roeTTM, roa: m.roaTTM,
    grossMargin: m.grossMarginTTM, netMargin: m.netProfitMarginTTM,
    dividendYield: m.dividendYieldIndicatedAnnual, beta: m.beta,
    week52High: m["52WeekHigh"], week52Low: m["52WeekLow"], historical: [],
  };
}

// ---- Yahoo (best-effort; tipicamente bloccato da CORS senza proxy) --------
async function fetchYahoo(ticker) {
  const r = await fetch(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}` +
    `?modules=price,summaryDetail,defaultKeyStatistics,financialData`
  );
  const d = await r.json();
  const res = d?.quoteSummary?.result?.[0];
  if (!res) throw new Error("empty");
  const price = res.price, sd = res.summaryDetail, ks = res.defaultKeyStatistics, fd = res.financialData;
  return {
    source: "Yahoo Finance",
    ticker: price.symbol, name: price.longName || price.shortName,
    currency: price.currency, price: price.regularMarketPrice?.raw,
    marketCap: price.marketCap?.raw, shares: ks?.sharesOutstanding?.raw,
    eps: ks?.trailingEps?.raw, pe: sd?.trailingPE?.raw, pb: ks?.priceToBook?.raw,
    ps: sd?.priceToSalesTrailing12Months?.raw, beta: sd?.beta?.raw,
    dividendYield: sd?.dividendYield?.raw, fcf: fd?.freeCashflow?.raw,
    operatingCashFlow: fd?.operatingCashflow?.raw, ebitda: fd?.ebitda?.raw,
    revenue: fd?.totalRevenue?.raw, roe: fd?.returnOnEquity?.raw,
    week52High: sd?.fiftyTwoWeekHigh?.raw, week52Low: sd?.fiftyTwoWeekLow?.raw,
    historical: [],
  };
}

/**
 * DataProvider — orchestratore a priorita'.
 * Ordine: AlphaVantage -> FMP -> Finnhub -> Polygon -> Stooq -> Yahoo.
 * Ritorna il primo che risponde, altrimenti lancia (-> fallback UI).
 */
async function fetchCompany(ticker, keys) {
  const chain = [
    () => fetchAlphaVantage(ticker, keys.alphaVantage),
    () => fetchFMP(ticker, keys.fmp),
    () => fetchFinnhub(ticker, keys.finnhub),
    () => fetchYahoo(ticker),
  ];
  const errors = [];
  for (const step of chain) {
    try {
      const data = await step();
      if (data && data.price) return data;
    } catch (e) { errors.push(e.message); }
  }
  throw new Error("Nessun provider ha risposto (" + errors.join(", ") + ")");
}


export { fetchAlphaVantage, fetchFMP, fetchFinnhub, fetchYahoo, fetchCompany };
