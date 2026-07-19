/**
 * /providers — DATA PROVIDER LAYER (catena a priorità + fallback + merge).
 * Interfaccia comune: getCompany / getFinancials / getHistorical / getRatios.
 * NOTA: la maggior parte delle API gratuite blocca il CORS lato browser.
 * Alpha Vantage, FMP e Finnhub abilitano CORS con una API key gratuita.
 *
 * IMPORTANTE: ogni funzione di fetch è scritta per essere RESILIENTE a
 * fallimenti parziali (rate-limit su un singolo endpoint, 403 su un piano
 * gratuito troppo limitato, ecc.) — un singolo endpoint che fallisce non fa
 * più fallire l'intero provider: i campi mancanti restano `null` invece di
 * far lanciare un'eccezione che scarta tutti i dati già ottenuti.
 */

const num = (x) => { const n = parseFloat(x); return isFinite(n) ? n : null; };
const arr = (x) => Array.isArray(x) ? x : [];

/**
 * Alcuni provider (in particolare Finnhub, a seconda dell'endpoint) restituiscono
 * il dividend yield come punti percentuali (es. 0.48 per "0.48%") invece che
 * come frazione decimale (0.0048). Un vero dividend yield reale non supera
 * praticamente mai il 25% (anche nei rari casi di rendimenti da titoli in forte
 * stress prima di un taglio della cedola): se il valore grezzo, interpretato
 * come frazione decimale, implicherebbe un rendimento sopra il 25% (es. 0.48
 * → 48%), è quasi certamente in punti percentuali e va diviso per 100. Senza
 * questa normalizzazione, formule come Peter Lynch (fairPE = growth% + yield%)
 * ricevono uno yield fino a 100x più grande del reale, gonfiando il risultato.
 */
function normalizeYield(v) {
  if (v === null || v === undefined || !isFinite(v)) return v;
  return Math.abs(v) > 0.25 ? v / 100 : v;
}

// ---- Alpha Vantage (CORS ok con key gratuita) ------------------------------
// Limite gratuito: 5 richieste/minuto, 25/giorno — molto facile da esaurire
// con le 5 chiamate parallele qui sotto. Ogni chiamata è isolata: se una va
// in rate-limit, le altre (se già arrivate) restano valide.
async function fetchAlphaVantage(ticker, key) {
  if (!key) throw new Error("no-key");
  const base = "https://www.alphavantage.co/query";
  const j = async (fn) => {
    try {
      const r = await fetch(`${base}?function=${fn}&symbol=${ticker}&apikey=${key}`);
      const d = await r.json();
      if (d.Note || d.Information || d["Error Message"]) return null; // rate-limit / errore -> campo mancante, non fatale
      return d;
    } catch { return null; }
  };
  const [ov, q, cf, is, bs] = await Promise.all([
    j("OVERVIEW"), j("GLOBAL_QUOTE"), j("CASH_FLOW"), j("INCOME_STATEMENT"), j("BALANCE_SHEET"),
  ]);
  if (!ov || !ov.Symbol) throw new Error("empty-or-rate-limited");
  const price = num(q?.["Global Quote"]?.["05. price"]);
  const shares = num(ov.SharesOutstanding);
  const incReports = arr(is?.annualReports);
  const cflReports = arr(cf?.annualReports);
  const inc = incReports[0] || {};
  const cfl = cflReports[0] || {};
  const bal = arr(bs?.annualReports)[0] || {};
  const fcf = (num(cfl.operatingCashflow) || 0) - Math.abs(num(cfl.capitalExpenditures) || 0);
  const hist = incReports.slice(0, 6).reverse().map((r, i) => {
    const cfr = cflReports[(incReports.length - 1) - i] || {};
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
    dividendYield: normalizeYield(num(ov.DividendYield)), beta: num(ov.Beta),
    week52High: num(ov["52WeekHigh"]), week52Low: num(ov["52WeekLow"]),
    epsGrowth: num(ov.QuarterlyEarningsGrowthYOY),
    revenueGrowth: num(ov.QuarterlyRevenueGrowthYOY),
    historical: hist,
  };
}

// ---- Financial Modeling Prep (CORS ok con key) -----------------------------
// Su alcuni piani gratuiti/legacy alcuni endpoint (statements, ratios-ttm)
// possono rispondere 403 mentre "profile" resta accessibile: ogni chiamata è
// isolata e un fallimento produce []/null invece di far cadere tutto il resto.
async function fetchFMP(ticker, key) {
  if (!key) throw new Error("no-key");
  const b = "https://financialmodelingprep.com/api/v3";
  const g = async (p) => {
    try {
      const r = await fetch(`${b}/${p}${p.includes("?") ? "&" : "?"}apikey=${key}`);
      if (!r.ok) return null; // 401/403/429 -> campo mancante, non fatale
      const d = await r.json();
      if (d && d["Error Message"]) return null;
      return d;
    } catch { return null; }
  };
  const [prof, ratios, cfl, inc, bal] = await Promise.all([
    g(`profile/${ticker}`), g(`ratios-ttm/${ticker}`),
    g(`cash-flow-statement/${ticker}?limit=6`), g(`income-statement/${ticker}?limit=6`),
    g(`balance-sheet-statement/${ticker}?limit=1`),
  ]);
  const p = arr(prof)[0]; if (!p) throw new Error("empty-or-forbidden");
  const r = arr(ratios)[0] || {};
  const incReports = arr(inc), cflReports = arr(cfl);
  const i0 = incReports[0] || {}, c0 = cflReports[0] || {}, b0 = arr(bal)[0] || {};
  const hist = incReports.slice(0, 6).reverse().map((row, idx) => {
    const cf = cflReports[(incReports.length - 1) - idx] || {};
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
    netMargin: r.netProfitMarginTTM, dividendYield: normalizeYield(r.dividendYieldTTM), beta: p.beta,
    week52High: num((p.range || "").split("-")[1]), week52Low: num((p.range || "").split("-")[0]),
    historical: hist,
  };
}

// ---- Finnhub (CORS ok con key) --------------------------------------------
// Copertura fondamentali molto più limitata (niente conto economico
// completo/storico): utile soprattutto come fallback per prezzo/multipli,
// da COMPLETARE con un altro provider per ricavi/storico/EBITDA.
async function fetchFinnhub(ticker, key) {
  if (!key) throw new Error("no-key");
  const b = "https://finnhub.io/api/v1";
  const g = async (p) => {
    try {
      const r = await fetch(`${b}/${p}&token=${key}`);
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  };
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
    price: quote?.c, marketCap: prof.marketCapitalization,
    shares: prof.shareOutstanding, eps: m.epsInclExtraItemsTTM || m.epsTTM,
    bvps: m.bookValuePerShareQuarterly, pe: m.peTTM, pb: m.pbQuarterly,
    ps: m.psTTM, roe: m.roeTTM, roa: m.roaTTM,
    grossMargin: m.grossMarginTTM, netMargin: m.netProfitMarginTTM,
    dividendYield: normalizeYield(m.dividendYieldIndicatedAnnual), beta: m.beta,
    week52High: m["52WeekHigh"], week52Low: m["52WeekLow"], historical: [],
  };
}

// ---- Yahoo (best-effort; tipicamente bloccato da CORS senza proxy) --------
// Include utilmente revenue/ebitda/fcf anche senza key: prezioso come
// "riempitivo" quando Finnhub vince la corsa ma non ha questi campi.
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
    dividendYield: normalizeYield(sd?.dividendYield?.raw), fcf: fd?.freeCashflow?.raw,
    operatingCashFlow: fd?.operatingCashflow?.raw, ebitda: fd?.ebitda?.raw,
    revenue: fd?.totalRevenue?.raw, roe: fd?.returnOnEquity?.raw,
    debt: fd?.totalDebt?.raw, cash: fd?.totalCash?.raw,
    week52High: sd?.fiftyTwoWeekHigh?.raw, week52Low: sd?.fiftyTwoWeekLow?.raw,
    historical: [],
  };
}

/** Un campo si considera "mancante" se null/undefined o array vuoto. */
function isMissing(v) {
  return v === undefined || v === null || (Array.isArray(v) && v.length === 0);
}

/**
 * DataProvider — orchestratore a priorità CON MERGE tra provider.
 * Ordine: AlphaVantage -> FMP -> Finnhub -> Yahoo.
 * A differenza di un semplice "primo che risponde", qui ogni provider
 * successivo RIEMPIE SOLO i campi mancanti del risultato già ottenuto — così
 * se il primo provider a rispondere (es. Finnhub) non ha ricavi/storico/
 * EBITDA, questi vengono completati dal provider successivo che li ha,
 * invece di lasciare l'intera app con dati fondamentali vuoti.
 * dataStatus.sourcesUsed elenca i provider che hanno effettivamente
 * contribuito con almeno un campo (mostrato in UI per trasparenza).
 */
async function fetchCompany(ticker, keys) {
  const chain = [
    () => fetchAlphaVantage(ticker, keys.alphaVantage),
    () => fetchFMP(ticker, keys.fmp),
    () => fetchFinnhub(ticker, keys.finnhub),
    () => fetchYahoo(ticker),
  ];
  const errors = [];
  let merged = null;
  const sourcesUsed = [];

  for (const step of chain) {
    let data;
    try {
      data = await step();
    } catch (e) {
      errors.push(e.message);
      continue;
    }
    if (!data || !data.price) continue;

    if (!merged) {
      merged = { ...data };
      sourcesUsed.push(data.source);
    } else {
      let filledAny = false;
      for (const k of Object.keys(data)) {
        if (k === "source") continue;
        if (isMissing(merged[k]) && !isMissing(data[k])) {
          merged[k] = data[k];
          filledAny = true;
        }
      }
      if (filledAny) sourcesUsed.push(data.source);
    }

    // Fermati appena hai i campi "core" (ricavi + storico) — evita chiamate
    // extra inutili quando i dati sono già completi.
    if (!isMissing(merged.revenue) && !isMissing(merged.historical)) break;
  }

  if (!merged) throw new Error("Nessun provider ha risposto (" + errors.join(", ") + ")");
  merged.sourcesUsed = sourcesUsed;
  merged.missingCore = isMissing(merged.revenue) || isMissing(merged.historical);
  return merged;
}


export { fetchAlphaVantage, fetchFMP, fetchFinnhub, fetchYahoo, fetchCompany };
