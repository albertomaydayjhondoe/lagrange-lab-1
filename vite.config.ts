import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/lagrange-lab-1/",
  plugins: [react()],
});
