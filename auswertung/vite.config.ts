import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative Pfade: Die Seite funktioniert so unter /vokabeltrainer/auswertung/ auf
  // GitHub Pages, lokal und im E2E-Test gleichermaßen.
  base: "./",
  plugins: [react()],
  server: {
    // Erlaubt den Zugriff auf js/logic.js und lists/ der App, eine Ebene höher
    fs: { allow: [".."] },
  },
  build: {
    // Plotly ist mehrere MB groß; für eine Seite am Computer ist das in Ordnung
    chunkSizeWarningLimit: 6000,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
