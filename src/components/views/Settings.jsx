"use client";
import { useState } from "react";
import { T, MONO } from "@/lib/theme";
import { useStore, saveStoredKeys } from "@/store/store";
import { Panel } from "../ui/Primitives";
import { btn } from "../ui/styleHelpers";

function Settings() {
  const { state, dispatch } = useStore();
  const [k, setK] = useState(state.keys);
  const [saved, setSaved] = useState(false);
  const save = () => {
    dispatch({ type: "KEYS", keys: k });
    saveStoredKeys(k);
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };
  const providers = [
    ["alphaVantage", "Alpha Vantage", "alphavantage.co/support/#api-key", "Gratuita, istantanea. Consigliata: abilita dati live (overview, income, cash flow, storico)."],
    ["fmp", "Financial Modeling Prep", "site.financialmodelingprep.com/developer", "Free tier con storico e ratios."],
    ["finnhub", "Finnhub", "finnhub.io/register", "Free tier: quote + metriche."],
    ["polygon", "Polygon", "polygon.io/dashboard/signup", "Free tier (limitato)."],
  ];
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 }}>
      <div style={{ background: "rgba(76,141,255,.06)", border: `1px solid ${T.blue}33`, borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: T.sub, lineHeight: 1.6 }}>
        <b style={{ color: T.text }}>Perché serve una key?</b> I browser bloccano (CORS) le API di borsa gratuite chiamate direttamente.
        Con una API key gratuita — <b style={{ color: T.text }}>Alpha Vantage</b> è la più rapida — l'app carica dati live.
        Senza chiave usa dati campione + inserimento manuale. Le chiavi restano solo sul tuo dispositivo.
      </div>
      <Panel title="API Keys (gratuite)">
        {providers.map(([id, name, url, note]) => (
          <div key={id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
              <a href={`https://${url}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: T.blue, textDecoration: "none" }}>Ottieni key ↗</a>
            </div>
            <input value={k[id]} onChange={(e) => setK({ ...k, [id]: e.target.value })} placeholder="Incolla qui la tua API key"
              style={{ width: "100%", background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "9px 12px", color: T.text, fontSize: 12.5, fontFamily: MONO, outline: "none", boxSizing: "border-box" }} />
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{note}</div>
          </div>
        ))}
        <button onClick={save} style={btn(saved ? T.green : T.amber)}>{saved ? "✓ Salvato" : "Salva chiavi"}</button>
      </Panel>
    </div>
  );
}

export { Settings };
