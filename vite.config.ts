import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 3003,
    allowedHosts: ["frquiz.duckdns.org"],
    origin: "https://frquiz.duckdns.org",
    hmr: {
      host: "frquiz.duckdns.org",
      protocol: "wss",
      clientPort: 443,
    },
  },
});
