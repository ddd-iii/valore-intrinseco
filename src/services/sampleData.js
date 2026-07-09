/**
 * /services — SAMPLE DATA (snapshot reali etichettati, per uso senza API key)
 * Fonte: dati pubblici ~ FY2024/TTM. Valori in valuta nativa, per-share dove
 * indicato. L'utente può modificare tutto nel pannello Assumptions.
 */
const SAMPLE = {
  AAPL: { source:"Sample (FY24)", ticker:"AAPL", name:"Apple Inc.", sector:"Technology", industry:"Consumer Electronics", country:"USA", currency:"USD",
    price:212.5, marketCap:3.25e12, shares:15.2e9, eps:6.13, bvps:4.38, revenue:391.0e9, netIncome:93.7e9, ebit:123.2e9, ebitda:134.7e9, operatingIncome:123.2e9,
    depreciation:11.4e9, capex:9.4e9, operatingCashFlow:118.3e9, fcf:108.8e9, cash:65.2e9, debt:106.6e9,
    pe:34.7, forwardPe:30.1, pb:48.5, ps:8.3, pegRatio:3.1, evEbitda:24.5, roe:1.57, roa:0.28, grossMargin:0.462, operatingMargin:0.315, netMargin:0.24,
    dividendYield:0.0046, beta:1.24, week52High:237.2, week52Low:164.1, epsGrowth:0.08, revenueGrowth:0.02,
    historical:[{year:"2020",revenue:274.5e9,netIncome:57.4e9,eps:3.28,fcf:73.4e9},{year:"2021",revenue:365.8e9,netIncome:94.7e9,eps:5.61,fcf:92.9e9},{year:"2022",revenue:394.3e9,netIncome:99.8e9,eps:6.11,fcf:111.4e9},{year:"2023",revenue:383.3e9,netIncome:97.0e9,eps:6.13,fcf:99.6e9},{year:"2024",revenue:391.0e9,netIncome:93.7e9,eps:6.13,fcf:108.8e9}] },
  MSFT: { source:"Sample (FY24)", ticker:"MSFT", name:"Microsoft Corp.", sector:"Technology", industry:"Software", country:"USA", currency:"USD",
    price:445.0, marketCap:3.31e12, shares:7.43e9, eps:11.8, bvps:36.1, revenue:245.1e9, netIncome:88.1e9, ebit:109.4e9, ebitda:133.6e9, operatingIncome:109.4e9,
    depreciation:22.3e9, capex:44.5e9, operatingCashFlow:118.5e9, fcf:74.1e9, cash:75.5e9, debt:67.1e9,
    pe:37.7, forwardPe:31.5, pb:12.3, ps:13.5, pegRatio:2.4, evEbitda:24.8, roe:0.352, roa:0.176, grossMargin:0.696, operatingMargin:0.446, netMargin:0.36,
    dividendYield:0.0073, beta:0.91, week52High:468.3, week52Low:362.9, epsGrowth:0.20, revenueGrowth:0.16,
    historical:[{year:"2020",revenue:143.0e9,netIncome:44.3e9,eps:5.76,fcf:45.2e9},{year:"2021",revenue:168.1e9,netIncome:61.3e9,eps:8.05,fcf:56.1e9},{year:"2022",revenue:198.3e9,netIncome:72.7e9,eps:9.65,fcf:65.1e9},{year:"2023",revenue:211.9e9,netIncome:72.4e9,eps:9.68,fcf:59.5e9},{year:"2024",revenue:245.1e9,netIncome:88.1e9,eps:11.8,fcf:74.1e9}] },
  NVDA: { source:"Sample (FY25)", ticker:"NVDA", name:"NVIDIA Corp.", sector:"Technology", industry:"Semiconductors", country:"USA", currency:"USD",
    price:128.0, marketCap:3.14e12, shares:24.5e9, eps:2.94, bvps:2.35, revenue:130.5e9, netIncome:72.9e9, ebit:81.5e9, ebitda:83.3e9, operatingIncome:81.5e9,
    depreciation:1.9e9, capex:3.2e9, operatingCashFlow:64.1e9, fcf:60.9e9, cash:38.5e9, debt:10.3e9,
    pe:43.5, forwardPe:33.0, pb:54.5, ps:24.1, pegRatio:1.2, evEbitda:37.8, roe:1.19, roa:0.65, grossMargin:0.75, operatingMargin:0.62, netMargin:0.559,
    dividendYield:0.0003, beta:1.68, week52High:153.1, week52Low:66.3, epsGrowth:0.82, revenueGrowth:1.14,
    historical:[{year:"2021",revenue:16.7e9,netIncome:4.3e9,eps:0.17,fcf:4.7e9},{year:"2022",revenue:26.9e9,netIncome:9.8e9,eps:0.39,fcf:8.1e9},{year:"2023",revenue:27.0e9,netIncome:4.4e9,eps:0.17,fcf:3.8e9},{year:"2024",revenue:60.9e9,netIncome:29.8e9,eps:1.19,fcf:27.0e9},{year:"2025",revenue:130.5e9,netIncome:72.9e9,eps:2.94,fcf:60.9e9}] },
  GOOGL:{ source:"Sample (FY24)", ticker:"GOOGL", name:"Alphabet Inc.", sector:"Communication Services", industry:"Internet", country:"USA", currency:"USD",
    price:178.0, marketCap:2.18e12, shares:12.25e9, eps:8.05, bvps:26.4, revenue:350.0e9, netIncome:100.1e9, ebit:112.4e9, ebitda:139.0e9, operatingIncome:112.4e9,
    depreciation:15.3e9, capex:52.5e9, operatingCashFlow:125.3e9, fcf:72.8e9, cash:95.7e9, debt:28.1e9,
    pe:22.1, forwardPe:20.0, pb:6.7, ps:6.2, pegRatio:1.3, evEbitda:15.1, roe:0.305, roa:0.201, grossMargin:0.58, operatingMargin:0.321, netMargin:0.286,
    dividendYield:0.0045, beta:1.03, week52High:191.8, week52Low:130.7, epsGrowth:0.38, revenueGrowth:0.14,
    historical:[{year:"2020",revenue:182.5e9,netIncome:40.3e9,eps:2.93,fcf:42.8e9},{year:"2021",revenue:257.6e9,netIncome:76.0e9,eps:5.61,fcf:67.0e9},{year:"2022",revenue:282.8e9,netIncome:59.9e9,eps:4.56,fcf:60.0e9},{year:"2023",revenue:307.4e9,netIncome:73.8e9,eps:5.80,fcf:69.5e9},{year:"2024",revenue:350.0e9,netIncome:100.1e9,eps:8.05,fcf:72.8e9}] },
  KO:   { source:"Sample (FY24)", ticker:"KO", name:"Coca-Cola Co.", sector:"Consumer Defensive", industry:"Beverages", country:"USA", currency:"USD",
    price:62.5, marketCap:269e9, shares:4.31e9, eps:2.46, bvps:6.4, revenue:47.1e9, netIncome:10.6e9, ebit:11.5e9, ebitda:13.2e9, operatingIncome:11.5e9,
    depreciation:1.1e9, capex:1.8e9, operatingCashFlow:11.6e9, fcf:9.8e9, cash:12.7e9, debt:44.5e9,
    pe:25.4, forwardPe:22.5, pb:9.8, ps:5.7, pegRatio:3.7, evEbitda:20.3, roe:0.39, roa:0.10, grossMargin:0.61, operatingMargin:0.244, netMargin:0.225,
    dividendYield:0.031, beta:0.58, week52High:73.5, week52Low:57.8, epsGrowth:0.06, revenueGrowth:0.03,
    historical:[{year:"2020",revenue:33.0e9,netIncome:7.7e9,eps:1.79,fcf:8.7e9},{year:"2021",revenue:38.7e9,netIncome:9.8e9,eps:2.25,fcf:11.3e9},{year:"2022",revenue:43.0e9,netIncome:9.5e9,eps:2.19,fcf:9.5e9},{year:"2023",revenue:45.8e9,netIncome:10.7e9,eps:2.47,fcf:9.7e9},{year:"2024",revenue:47.1e9,netIncome:10.6e9,eps:2.46,fcf:9.8e9}] },
};


export { SAMPLE };
