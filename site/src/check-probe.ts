/**
 * The probe of the live catalog. The site check of the Pages workflow starts it in a browser at each width, before
 * the deploy. A failed check stops the deploy.
 *
 * The site check reads this TypeScript file directly. It removes the types and the `export` line, and it starts the
 * result as the body of an async function.
 */

// The site check gives these helpers to the probe. Each element of this page is an HTML element.
declare const check: (name: string, ok: unknown, detail?: unknown) => boolean;
declare const until: <T>(fn: () => T | Promise<T>, ms?: number) => Promise<T>;
declare const $: (selector: string) => HTMLElement | null;
declare const $$: (selector: string) => HTMLElement[];
declare const type: (target: string | Element, text: string) => void;
declare const click: (target: string | Element) => void;

const output = () => $("#output")?.textContent ?? "";
const kept = () => $("#stat-kept")?.textContent ?? "";
const row = (path: string) => $(`#file-list li[data-path="${path}"]`);
const reason = (path: string) => row(path)?.dataset["reason"];

check("the sample gives a catalog with src/index.ts", await until(() => output().includes("### src/index.ts")), output().slice(0, 200));
check("the output starts as the CLI output starts", output().startsWith("# Source Catalog\n\nGenerated on "), output().slice(0, 60));
check(
  "each rule has a file in the sample",
  reason("src/index.ts") === "kept" &&
    reason("src/utils/format.test.ts") === "excluded" &&
    reason("scripts/build.js") === "extension" &&
    reason("node_modules/left-pad/index.js") === "ignored" &&
    reason(".env") === "hidden",
  $$("#file-list li").map((li) => `${li.dataset["path"]}=${li.dataset["reason"]}`).join(" "),
);
const keptBefore = kept();
check("the page shows the file count and the size", /^\d+ of \d+$/.test(keptBefore) && /\d/.test($("#stat-size")?.textContent ?? ""), `${keptBefore} ${$("#stat-size")?.textContent}`);

type("#include", ".ts, .tsx, .js");
check("a new include list changes the output", await until(() => output().includes("### scripts/build.js")), output().slice(0, 300));
check("a new include list changes the file count", kept() !== keptBefore, `${keptBefore} -> ${kept()}`);
check("the CLI command follows the rules", ($("#command")?.textContent ?? "").includes("--include=.ts,.tsx,.js"), $("#command")?.textContent);
check("the include list does not open an ignored folder", !output().includes("### node_modules/"), "node_modules is in the output");

click('#exclude-chips [data-item=".test.ts"]');
check("a chip removes .test.ts from the exclude list", await until(() => output().includes("### src/utils/format.test.ts")), ($("#exclude") as HTMLInputElement | null)?.value);

const box = row("src/App.tsx")?.querySelector("input");
if (box) click(box);
check("a toggle turns a kept file out", await until(() => !output().includes("### src/App.tsx") && row("src/App.tsx")?.dataset["forced"] === "out"), row("src/App.tsx")?.dataset["forced"]);
check("the button to undo the toggles shows", !($("#reset-force") as HTMLButtonElement | null)?.hidden);
click("#reset-force");
check("the undo button brings the file back", await until(() => output().includes("### src/App.tsx")));

click('#legend [data-group="excluded"]');
check("a legend chip filters the list", await until(() => $$("#file-list li").every((li) => li.dataset["reason"] === "excluded")), $$("#file-list li").length);
click('#legend [data-group="all"]');

check("the output has a copy button and a download button", $("#copy-output") !== null && $("#download") !== null);
check("the folder picker reads a folder", $("#folder")?.hasAttribute("webkitdirectory"));
check("the page tells that the files stay in the browser", /stay in your browser/.test($(".privacy")?.textContent ?? ""));

export {};
