import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/influencers": {
        target: "https://api-dashboard.influencers.club",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/influencers/, ""),
      },
      "/api/enrich": {
        target: "https://api-dashboard.influencers.club",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/enrich/, ""),
      },
      "/api/serp": {
        target: "https://serpapi.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/serp/, ""),
      },
      "/api/firecrawl": {
        target: "https://api.firecrawl.dev",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/firecrawl/, ""),
      },
      "/api/pdl": {
        target: "https://api.peopledatalabs.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pdl/, ""),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
