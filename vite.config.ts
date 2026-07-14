import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

const repoName = "lagrange-lab-1";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? `/${repoName}/` : "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    {
      name: "copy-redirects",
      closeBundle() {
        // Copy _redirects from static/ to dist/ for GitHub Pages SPA support
        const staticRedirects = path.resolve(__dirname, "static/_redirects");
        const distRedirects = path.resolve(__dirname, "dist/_redirects");
        
        if (existsSync(staticRedirects)) {
          if (!existsSync(path.resolve(__dirname, "dist"))) {
            mkdirSync(path.resolve(__dirname, "dist"), { recursive: true });
          }
          copyFileSync(staticRedirects, distRedirects);
          console.log("✓ Copied static/_redirects to dist/_redirects");
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
