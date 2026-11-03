// The start of the page: the theme, the live catalog, the copy buttons and the build line.
import { byId, copyText, h, setupTheme } from "@mark1russell7/site-pages/chrome";
import "@mark1russell7/site-pages/scroll-cue.css";
import { App } from "./app.ts";
import "./style.css";

setupTheme(byId<HTMLButtonElement>("theme"), "concat-src-theme");
new App();

for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-copy]")) {
  button.addEventListener("click", () => void copyText(button, byId(button.dataset["copy"]!).textContent ?? ""));
}

byId("build").append(
  `Version ${__BUILD__.version}, build `,
  __BUILD__.sha === "local" ? "local" : h("a", { href: `https://github.com/mark1russell7/concat-src/commit/${__BUILD__.sha}` }, __BUILD__.sha),
  ` of ${__BUILD__.date}`,
);
