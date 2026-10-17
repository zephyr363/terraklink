import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        assetFileNames: (asset) =>
          asset.names?.some((name) => name.endsWith(".css"))
            ? "assets/app.css"
            : "assets/[name]-[hash][extname]",
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/media": "http://127.0.0.1:8000",
      "/django-admin": "http://127.0.0.1:8000",
      "/static": "http://127.0.0.1:8000",
      "/robots.txt": "http://127.0.0.1:8000",
      "/sitemap.xml": "http://127.0.0.1:8000",
      "/llms.txt": "http://127.0.0.1:8000",
    },
  },
});
