/**
 * Shared inline-style helper functions used across layout & view components.
 */
import { T, MONO } from "@/lib/theme";

export const btn = (c) => ({ background: c, color: "#0A0B0E", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" });
export const btnGhost = () => ({ background: T.panel2, color: T.text, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 });
export const chip = () => ({ background: T.panel, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 12px", fontSize: 11.5, fontFamily: MONO, cursor: "pointer", fontWeight: 600 });
