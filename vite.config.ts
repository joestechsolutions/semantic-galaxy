import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/semantic-galaxy/",
  server: {
    host: true,
    port: 3456,
    proxy: {
      "/api/embed": {
        target: "http://localhost:11434",
        changeOrigin: true,
      },
    },
  },
});
