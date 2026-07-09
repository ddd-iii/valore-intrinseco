# Fair Value Terminal

App Next.js (App Router, JavaScript, no TypeScript) per calcolare il **fair
value / valore intrinseco** di un'azione quotata, con 7 modelli di
valutazione — inclusa una **replica fedele** del modello Excel di Sven
Carlin (Stock Market Research Platform).

## Avvio rapido

```bash
npm install
npm run dev
```

Apri `http://localhost:3000`. Nessuna variabile d'ambiente è obbligatoria:
funziona subito con dati campione (`AAPL`, `MSFT`, `NVDA`, `GOOGL`, `META`,
`AMZN`, `TSLA`, `ASML`, `KO`, `JPM`) e con inserimento manuale.

Per dati **live** su qualsiasi ticker, apri **Settings** nell'app e incolla
una API key gratuita (30 secondi):

- [Alpha Vantage](https://www.alphavantage.co/support/#api-key) — consigliata
- [Financial Modeling Prep](https://site.financialmodelingprep.com/developer)
- [Finnhub](https://finnhub.io/register)
- [Polygon](https://polygon.io/dashboard/signup)

Le chiavi sono salvate nel `localStorage` del browser — restano solo sul tuo
dispositivo, non vengono inviate a nessun server tranne il provider scelto.

## Perché serve una API key?

I browser bloccano (CORS) la quasi totalità delle API di borsa gratuite
quando chiamate direttamente dal client. Alpha Vantage, FMP e Finnhub
abilitano il CORS e permettono quindi chiamate dirette dal browser con una
key gratuita. Senza key, l'app usa snapshot campione reali (etichettati con
fonte e data) più un form di inserimento manuale validato — tutti i 7
modelli restano completamente funzionanti e ricalcolano live.

## Architettura

```
src/
├── app/                      Next.js App Router (layout, page, globals.css)
├── models/
│   └── valuationEngine.js    7 modelli di valutazione — funzioni pure, testate
├── providers/
│   └── dataProviders.js      Catena Alpha Vantage → FMP → Finnhub → Yahoo
├── services/
│   ├── sampleData.js         Snapshot dati campione
│   ├── formatters.js         fmtNum / fmtBig / fmtPct / fmtMoney
│   ├── aiAnalysis.js         Analisi "AI" rule-based (deterministica)
│   └── exporters.js          Export Excel (SheetJS) / CSV
├── store/
│   └── store.jsx             Reducer + Context (store globale) + persistenza key
├── hooks/
│   └── useValuations.js      Ricalcolo live di tutti i modelli ad ogni ipotesi
├── lib/
│   └── theme.js               Design tokens (palette, font)
└── components/
    ├── ui/                    Primitivi (Panel, Stat, Row, Badge, Ctrl, ...)
    ├── charts/                FairValueGauge (widget firma)
    ├── layout/                Sidebar, TopBar, Shell (welcome/loading/manuale)
    └── views/                 Overview, Valuation, Intrinsic, DCF, Relative,
                                Financials, Charts, Ratios, Assumptions,
                                Report, AIView, Settings
```

## Il modello Sven Carlin — formule replicate

Il foglio Excel originale (`= (2)`) implementa un DCF a **3 scenari pesati
per probabilità**. Ogni cella è stata decodificata e replicata esattamente
in `src/models/valuationEngine.js` (`svenCarlinScenario` /
`svenCarlinIntrinsicValue`):

| Concetto | Cella Excel | Formula |
|---|---|---|
| Valore base / azione | `C6` | input diretto |
| Proiezione 10 anni | `D6:M6` | `Vₖ = Vₖ₋₁·(1+g)`, g=g1 anni 1-5, g=g2 anni 6-10 |
| Terminal value | `N6 = L6·O8` | valore **anno 9** (non 10!) × multiplo — quirk originale, replicato fedelmente |
| Sconto per anno | `D7:N7` | `PVₖ = Vₖ/(1+d)^k`; terminal scontato a `^10` |
| Valore di scenario | `D8` | `SUM(D7:N7)` |
| Pesi scenari | `D23:D25` | 0.6 Normal / 0.2 Best / 0.2 Worst |
| Intrinsic value finale | `F26` | `Σ(probᵢ · PVᵢ)` |

Verificato contro l'Excel a 6 decimali con i parametri di default
(base=0.9): Normal 18.551838, Best 33.545455, Worst 11.635842 →
**Intrinsic Value = 20.167362**.

## I 7 modelli

1. **Sven Carlin Intrinsic Value** — replica Excel sopra descritta
2. **DCF** — proiezione FCF + terminal value Gordon growth
3. **Relative Valuation** — multipli target: P/E, P/B, P/S, EV/EBITDA,
   EV/EBIT, PEG, P/FCF (media e mediana)
4. **Graham** — formula rivista `EPS·(8.5+2g)·4.4/Y` + Graham Number
   `√(22.5·EPS·BVPS)`
5. **Peter Lynch** — fair P/E = crescita% + dividend yield%
6. **Owner Earnings** — (Net Income + D&A − CapEx) / azione, capitalizzato
   (metodo Buffett)
7. **Margin of Safety** — prezzo massimo d'acquisto a 10/20/30/40/50% di
   sconto sul fair value composito

Il **Composite Intrinsic Value** è la media di Sven Carlin DCF e Relative
Valuation; il rating (Strong Buy → Strong Sell) deriva dall'upside implicito.

## Note oneste

- **Nessun TypeScript**: il progetto è in JavaScript puro (`.js`/`.jsx`)
  come da struttura richiesta; è convertibile in TS aggiungendo tipi se
  preferito.
- **Zustand → useReducer+Context**: stessa API concettuale (store globale,
  azioni, selettori), implementata senza dipendenza esterna.
- **PDF export**: via `window.print()` con CSS `@media print`; per un vero
  PDF headless (es. Puppeteer) servirebbe un endpoint server-side.
- **Storico prezzi/finanziari**: disponibile solo quando i provider (Alpha
  Vantage / FMP) lo restituiscono; con i soli dati campione la vista
  "Charts" mostra un messaggio informativo invece di dati inventati.

## Disclaimer

Strumento a scopo educativo. Non costituisce consulenza finanziaria.
