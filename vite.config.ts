import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

function pagesBase() {
  const pagesUrl = process.env.CI_PAGES_URL;
  if (!pagesUrl) return "/";

  try {
    const path = new URL(pagesUrl).pathname;
    return path.endsWith("/") ? path : `${path}/`;
  } catch {
    return "/";
  }
}

export default defineConfig({
  base: pagesBase(),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [react()],
});
