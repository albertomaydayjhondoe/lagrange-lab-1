import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vercel inyecta VERCEL=1 durante el build
const isVercel = process.env.VERCEL === "1";
// GitHub Pages usa un subdirectorio
const isGitHubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  // Base path: / para Vercel, /lagrange-lab-1/ para GitHub Pages
  base: isGitHubPages ? "/lagrange-lab-1/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimizaciones para producción
  build: {
    // Carpeta de salida
    outDir: "dist",
    // Generar sourcemaps para debugging
    sourcemap: !isVercel,
    // Tamaño máximo de chunk
    chunkSizeWarningLimit: 1000,
  },
});
