"use client";
import { Gauge } from "lucide-react";
import { T } from "@/lib/theme";
import { useStore } from "@/store/store";
import { NAV } from "./FairValueTerminal";

function Sidebar() {
  const { state, dispatch } = useStore();
  return (
    <div style={{ width: 216, background: "#0C0D11", borderRight: `1px solid ${T.border}`, padding: "18px 12px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
      <div style={{ padding: "4px 8px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${T.amber}, ${T.green})`, display: "grid", placeItems: "center" }}>
          <Gauge size={17} color="#0A0B0E" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: .3 }}>Fair Value</div>
          <div style={{ fontSize: 9.5, color: T.muted, letterSpacing: 2, textTransform: "uppercase" }}>Terminal</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {NAV.map(n => {
          const on = state.view === n.id, Icon = n.icon;
          const disabled = !state.data && !["settings"].includes(n.id);
          return (
            <button key={n.id} disabled={disabled} onClick={() => dispatch({ type: "VIEW", view: n.id })}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", marginBottom: 2, borderRadius: 8, border: "none", cursor: disabled ? "default" : "pointer", textAlign: "left",
                background: on ? T.panel2 : "transparent", color: disabled ? T.muted : on ? T.text : T.sub, opacity: disabled ? .4 : 1, fontSize: 13, fontWeight: on ? 600 : 500, transition: "all .15s" }}>
              <Icon size={16} color={on ? T.amber : "currentColor"} />{n.label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 9.5, color: T.muted, padding: "10px 8px 0", lineHeight: 1.5, borderTop: `1px solid ${T.border}` }}>
        Modello Intrinsic Value<br />Sven Carlin · educational only
      </div>
    </div>
  );
}

export { Sidebar };
