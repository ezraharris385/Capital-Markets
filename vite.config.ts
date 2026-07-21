import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base is set to "./" so the built app works when opened from any path
// (static host, subfolder, or file preview) without server rewrites.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    host: true,
  },
});
