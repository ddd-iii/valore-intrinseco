/**
 * /services — DAMODARAN INDUSTRY DATA (beta, margine operativo tipico,
 * sales-to-capital tipico per settore)
 *
 * IMPORTANTE: questi NON sono i numeri esatti dell'ultimo dataset pubblicato
 * da Aswath Damodaran (NYU Stern). Sono valori ILLUSTRATIVI/rappresentativi
 * — l'ordine di grandezza relativo tra settori è ragionevole (es. software
 * margini alti/beta alto, utility margini stabili/beta basso, retail
 * margini sottili/alto turnover), ma i valori assoluti NON vanno citati
 * come dato Damodaran ufficiale. Pensati per far funzionare subito il
 * bottom-up beta e i default di margine/reinvestimento senza dover
 * scaricare un file Excel.
 *
 * Per il dato ESATTO e aggiornato (rilasciato ogni gennaio), scarica il file
 * ufficiale e sostituisci i valori qui sotto:
 *   https://pages.stern.nyu.edu/~adamodar/pc/datasets/betas.xls
 *   (indice completo: https://pages.stern.nyu.edu/~adamodar/New_Home_Page/data.html)
 *
 * Campi per settore:
 *   unleveredBeta          — beta unlevered di riferimento (rilevereggiato
 *                            poi con D/E e tax rate del titolo analizzato)
 *   typicalOperatingMargin — margine EBIT/Ricavi "a regime" per un'azienda
 *                            matura del settore (default per targetMargin)
 *   typicalSalesToCapital  — vendite incrementali / capitale reinvestito
 *                            (default per il reinvestimento del modello FCFF)
 */

const DAMODARAN_SECTORS = [
  { sector: "Software (Application)", unleveredBeta: 1.15, typicalOperatingMargin: 0.25, typicalSalesToCapital: 1.8 },
  { sector: "Software (System & Infrastructure)", unleveredBeta: 1.10, typicalOperatingMargin: 0.28, typicalSalesToCapital: 1.6 },
  { sector: "Semiconductors", unleveredBeta: 1.35, typicalOperatingMargin: 0.22, typicalSalesToCapital: 1.0 },
  { sector: "Computers/Hardware", unleveredBeta: 1.10, typicalOperatingMargin: 0.10, typicalSalesToCapital: 1.5 },
  { sector: "Internet/Online Services", unleveredBeta: 1.20, typicalOperatingMargin: 0.20, typicalSalesToCapital: 1.6 },
  { sector: "E-commerce", unleveredBeta: 1.30, typicalOperatingMargin: 0.08, typicalSalesToCapital: 2.0 },
  { sector: "Telecom (Wireless)", unleveredBeta: 0.65, typicalOperatingMargin: 0.20, typicalSalesToCapital: 0.7 },
  { sector: "Telecom Equipment", unleveredBeta: 0.90, typicalOperatingMargin: 0.14, typicalSalesToCapital: 1.3 },
  { sector: "Retail (General)", unleveredBeta: 0.90, typicalOperatingMargin: 0.07, typicalSalesToCapital: 3.0 },
  { sector: "Retail (Online)", unleveredBeta: 1.15, typicalOperatingMargin: 0.06, typicalSalesToCapital: 2.5 },
  { sector: "Retail (Grocery & Food)", unleveredBeta: 0.55, typicalOperatingMargin: 0.04, typicalSalesToCapital: 4.0 },
  { sector: "Restaurants", unleveredBeta: 0.80, typicalOperatingMargin: 0.14, typicalSalesToCapital: 1.8 },
  { sector: "Apparel & Footwear", unleveredBeta: 0.90, typicalOperatingMargin: 0.12, typicalSalesToCapital: 1.8 },
  { sector: "Consumer Goods (Household)", unleveredBeta: 0.65, typicalOperatingMargin: 0.15, typicalSalesToCapital: 1.5 },
  { sector: "Beverages (Non-Alcoholic)", unleveredBeta: 0.55, typicalOperatingMargin: 0.20, typicalSalesToCapital: 1.2 },
  { sector: "Beverages (Alcoholic)", unleveredBeta: 0.60, typicalOperatingMargin: 0.22, typicalSalesToCapital: 1.0 },
  { sector: "Bank (Money Center)", unleveredBeta: 0.40, typicalOperatingMargin: 0.30, typicalSalesToCapital: 8.0 },
  { sector: "Bank (Regional)", unleveredBeta: 0.35, typicalOperatingMargin: 0.30, typicalSalesToCapital: 8.0 },
  { sector: "Insurance (Life)", unleveredBeta: 0.75, typicalOperatingMargin: 0.15, typicalSalesToCapital: 6.0 },
  { sector: "Insurance (Property/Casualty)", unleveredBeta: 0.70, typicalOperatingMargin: 0.12, typicalSalesToCapital: 6.0 },
  { sector: "Brokerage & Investment Banking", unleveredBeta: 0.95, typicalOperatingMargin: 0.25, typicalSalesToCapital: 4.0 },
  { sector: "REIT (Diversified)", unleveredBeta: 0.55, typicalOperatingMargin: 0.45, typicalSalesToCapital: 0.6 },
  { sector: "Real Estate (Development)", unleveredBeta: 0.85, typicalOperatingMargin: 0.15, typicalSalesToCapital: 0.8 },
  { sector: "Pharmaceutical", unleveredBeta: 1.00, typicalOperatingMargin: 0.25, typicalSalesToCapital: 1.3 },
  { sector: "Biotechnology", unleveredBeta: 1.30, typicalOperatingMargin: 0.10, typicalSalesToCapital: 1.0 },
  { sector: "Healthcare Facilities", unleveredBeta: 0.75, typicalOperatingMargin: 0.10, typicalSalesToCapital: 1.5 },
  { sector: "Medical Devices", unleveredBeta: 1.05, typicalOperatingMargin: 0.20, typicalSalesToCapital: 1.4 },
  { sector: "Automobile (OEM)", unleveredBeta: 0.95, typicalOperatingMargin: 0.08, typicalSalesToCapital: 1.7 },
  { sector: "Auto Parts", unleveredBeta: 1.00, typicalOperatingMargin: 0.09, typicalSalesToCapital: 1.8 },
  { sector: "Aerospace/Defense", unleveredBeta: 1.05, typicalOperatingMargin: 0.12, typicalSalesToCapital: 1.3 },
  { sector: "Airlines", unleveredBeta: 0.90, typicalOperatingMargin: 0.10, typicalSalesToCapital: 1.5 },
  { sector: "Transportation & Logistics", unleveredBeta: 0.85, typicalOperatingMargin: 0.10, typicalSalesToCapital: 1.6 },
  { sector: "Machinery/Industrial", unleveredBeta: 1.05, typicalOperatingMargin: 0.13, typicalSalesToCapital: 1.4 },
  { sector: "Chemicals (Basic)", unleveredBeta: 0.90, typicalOperatingMargin: 0.12, typicalSalesToCapital: 1.2 },
  { sector: "Chemicals (Specialty)", unleveredBeta: 1.00, typicalOperatingMargin: 0.16, typicalSalesToCapital: 1.3 },
  { sector: "Metals & Mining", unleveredBeta: 1.10, typicalOperatingMargin: 0.15, typicalSalesToCapital: 0.9 },
  { sector: "Steel", unleveredBeta: 1.00, typicalOperatingMargin: 0.10, typicalSalesToCapital: 1.0 },
  { sector: "Oil & Gas (Integrated)", unleveredBeta: 0.90, typicalOperatingMargin: 0.15, typicalSalesToCapital: 0.7 },
  { sector: "Oil & Gas (E&P)", unleveredBeta: 1.15, typicalOperatingMargin: 0.30, typicalSalesToCapital: 0.6 },
  { sector: "Utility (Electric, Regulated)", unleveredBeta: 0.40, typicalOperatingMargin: 0.20, typicalSalesToCapital: 0.5 },
  { sector: "Utility (Water)", unleveredBeta: 0.35, typicalOperatingMargin: 0.25, typicalSalesToCapital: 0.5 },
  { sector: "Homebuilding", unleveredBeta: 1.00, typicalOperatingMargin: 0.13, typicalSalesToCapital: 1.4 },
  { sector: "Building Materials", unleveredBeta: 0.90, typicalOperatingMargin: 0.15, typicalSalesToCapital: 1.3 },
  { sector: "Media & Entertainment", unleveredBeta: 1.05, typicalOperatingMargin: 0.18, typicalSalesToCapital: 1.3 },
  { sector: "Advertising", unleveredBeta: 0.85, typicalOperatingMargin: 0.12, typicalSalesToCapital: 1.8 },
  { sector: "Education Services", unleveredBeta: 0.70, typicalOperatingMargin: 0.14, typicalSalesToCapital: 1.6 },
  { sector: "Business & Consumer Services", unleveredBeta: 0.90, typicalOperatingMargin: 0.14, typicalSalesToCapital: 1.7 },
  { sector: "Diversified / Conglomerate", unleveredBeta: 0.95, typicalOperatingMargin: 0.13, typicalSalesToCapital: 1.3 },
];

const DAMODARAN_META = {
  note: "Dataset illustrativo ispirato alla metodologia Damodaran (ordine di grandezza relativo ragionevole, valori assoluti non ufficiali) — vedi commento in cima al file per la fonte ufficiale aggiornata.",
  officialSourceUrl: "https://pages.stern.nyu.edu/~adamodar/pc/datasets/betas.xls",
  officialIndexUrl: "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/data.html",
};

/** Trova la scheda di settore per nome (usato per applicare i default). */
function findSector(sectorName) {
  return DAMODARAN_SECTORS.find(s => s.sector === sectorName) || DAMODARAN_SECTORS[DAMODARAN_SECTORS.length - 1];
}

export { DAMODARAN_SECTORS, DAMODARAN_META, findSector };
