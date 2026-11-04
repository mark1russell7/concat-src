import { siteShell } from "@mark1russell7/site-pages/vite";
import { defineConfig } from "vite";

// The site has one page: the live catalog, how it works, the CLI and the install. The deploy adds `status/` and `releases/`.
export default defineConfig({
  plugins: [siteShell({ themeKey: "concat-src-theme" })],
});
