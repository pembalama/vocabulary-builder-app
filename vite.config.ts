import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` matters for GitHub Pages: the deployed URL is
//   https://<user>.github.io/vocabulary-builder-app/
// so production assets must resolve under that subpath.
//
// We key off `mode`, NOT `command`, because:
//   `vite`         → command="serve",  mode="development"
//   `vite build`   → command="build",  mode="production"
//   `vite preview` → command="serve",  mode="production"
//
// `vite preview` serves the built dist as-is, so it needs the same base as
// `vite build`. Using `command` would give preview the dev base ("/") and
// every asset would 404. Using `mode` correctly groups build + preview.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/vocabulary-builder-app/" : "/",
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
}));
