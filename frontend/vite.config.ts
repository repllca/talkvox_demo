import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // 0.0.0.0 で待ち受け
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true, // CHOKIDAR_USEPOLLING=true と合わせて確実に変更検知
    },
  },
});
