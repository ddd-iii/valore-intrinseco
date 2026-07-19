"use client";
import { useEffect, useRef } from "react";

/**
 * Mappa un ticker "grezzo" (es. AAPL) al formato TradingView EXCHANGE:TICKER
 * (es. NASDAQ:AAPL). Se l'exchange è già presente ("NASDAQ:AAPL") lo lascia.
 * Euristica leggera per i casi più comuni; l'utente può comunque leggere il
 * widget e correggere a mano nel modello.
 */
function toTradingViewSymbol(data) {
  if (!data) return "NASDAQ:AAPL";
  const raw = (data.ticker || "").toUpperCase().trim();
  if (!raw) return "NASDAQ:AAPL";
  if (raw.includes(":")) return raw; // già EXCHANGE:TICKER

  // Suffissi borsa europei/asiatici comuni -> prefisso TradingView
  const suffixMap = {
    ".MI": "MIL", ".PA": "EURONEXT", ".AS": "EURONEXT", ".BR": "EURONEXT",
    ".DE": "XETR", ".F": "FWB", ".L": "LSE", ".MC": "BME", ".SW": "SIX",
    ".TO": "TSX", ".HK": "HKEX", ".T": "TSE", ".AX": "ASX", ".ST": "OMXSTO",
  };
  for (const suf of Object.keys(suffixMap)) {
    if (raw.endsWith(suf)) return `${suffixMap[suf]}:${raw.slice(0, -suf.length)}`;
  }

  // Titoli USA: prova a dedurre l'exchange dal campo se disponibile, altrimenti NASDAQ
  const ex = (data.exchange || "").toUpperCase();
  if (ex.includes("NYSE")) return `NYSE:${raw}`;
  if (ex.includes("NASDAQ") || ex.includes("NMS")) return `NASDAQ:${raw}`;
  if (ex.includes("AMEX") || ex.includes("ARCA")) return `AMEX:${raw}`;
  return `NASDAQ:${raw}`;
}

/**
 * Widget TradingView generico (formato iframe/script classico).
 * Ricrea lo script quando cambia symbol/scriptSrc/config, così il simbolo
 * mostrato segue sempre il titolo selezionato nell'app.
 *
 * NOTA: i dati mostrati provengono in live da TradingView e NON sono
 * accessibili via codice (sandbox iframe cross-origin) — servono all'utente
 * come riferimento da leggere/copiare a mano nei campi del modello.
 */
function TradingViewWidget({ scriptSrc, config, symbol, height = 500, minWidth = 600 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pulisci eventuale contenuto precedente (cambio simbolo)
    container.innerHTML = "";
    const widgetHost = document.createElement("div");
    widgetHost.className = "tradingview-widget-container__widget";
    // Altezza/larghezza esplicite in linea: senza il foglio di stile ufficiale
    // di TradingView (che non carichiamo), la classe da sola non basta a far
    // riempire il contenitore e l'iframe iniettato può eccedere in altezza,
    // sovrapponendosi al contenuto sottostante.
    widgetHost.style.height = "100%";
    widgetHost.style.width = "100%";
    container.appendChild(widgetHost);

    // React non esegue gli script iniettati via innerHTML: creo un vero nodo <script>
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = scriptSrc;
    script.async = true;
    script.innerHTML = JSON.stringify({ ...config, symbol });
    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, [scriptSrc, symbol, JSON.stringify(config)]);

  return (
    // Sfondo bianco pieno: i widget TradingView in tema "light" (il più
    // testato/compatibile per la visibilità di schede e testo) presuppongono
    // un fondo chiaro pieno — su sfondo scuro trasparente le schede secondarie
    // possono risultare a contrasto troppo basso per essere visibili.
    <div style={{ background: "#ffffff", borderRadius: 10, padding: 4 }}>
      <div
        className="tradingview-widget-container"
        ref={containerRef}
        style={{
          height, width: "100%", minWidth,
          // Clip rigido: qualsiasi overflow dell'iframe TradingView resta
          // dentro questo box invece di sovrapporsi al contenuto sotto.
          overflow: "hidden", position: "relative",
          borderRadius: 8,
        }}
      />
    </div>
  );
}

export { TradingViewWidget, toTradingViewSymbol };
