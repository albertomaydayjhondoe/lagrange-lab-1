import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { copyFileSync, mkdirSync, existsSync, readdirSync } from "fs";

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
      name: "copy-static-files",
      closeBundle() {
        // Copy all files from static/ to dist/ for GitHub Pages support
        const staticDir = path.resolve(__dirname, "static");
        const distDir = path.resolve(__dirname, "dist");
        
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }
        
        if (existsSync(staticDir)) {
          const files = readdirSync(staticDir);
          for (const file of files) {
            const src = path.join(staticDir, file);
            const dest = path.join(distDir, file);
            copyFileSync(src, dest);
            console.log(`✓ Copied static/${file} to dist/${file}`);
          }
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
