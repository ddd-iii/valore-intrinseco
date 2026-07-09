import "./globals.css";

export const metadata = {
  title: "Fair Value Terminal — Intrinsic Value & Fundamental Analysis",
  description:
    "Calcola il fair value / valore intrinseco di qualsiasi azione con 7 modelli di valutazione, inclusa la replica fedele del modello Excel di Sven Carlin.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
