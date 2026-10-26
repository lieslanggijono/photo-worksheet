import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE is set by the GitHub Pages workflow (the site lives at /photo-worksheet/).
export default defineConfig({
  base: process.env.BASE ?? "/",
  plugins: [react()],
});
