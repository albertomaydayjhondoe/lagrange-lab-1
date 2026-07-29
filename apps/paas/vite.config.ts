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
    // Desactivar sourcemaps en producción
    sourcemap: false,
    // Tamaño máximo de chunk antes de warning
    chunkSizeWarningLimit: 1500,
    // Minificar con esbuild (default, más rápido)
    minify: 'esbuild',
    // CSS code splitting
    cssCodeSplit: true,
    // Target moderno
    target: 'esnext',
  },
  // Optimizaciones de assets
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg'],
});
