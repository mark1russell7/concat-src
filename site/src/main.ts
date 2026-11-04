// The start of the page: the theme, the live catalog, the copy buttons and the build line.
import { byId, copyText, setupTheme, showBuild } from "@mark1russell7/site-pages/chrome";
import "@mark1russell7/site-pages/shell.css";
import "@mark1russell7/site-pages/scroll-cue.css";
import { App } from "./app.ts";
import "./style.css";

setupTheme(byId<HTMLButtonElement>("theme"), "concat-src-theme");
new App();

for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-copy]")) {
  button.addEventListener("click", () => void copyText(button, byId(button.dataset["copy"]!).textContent ?? ""));
}

showBuild(byId("build"), __BUILD__, "mark1russell7/concat-src");
