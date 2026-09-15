import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: "dist/server",
    rollupOptions: {
      output: {
        entryFileNames: "render-document.js"
      }
    },
    ssr: "app/render-document.jsx"
  }
});
