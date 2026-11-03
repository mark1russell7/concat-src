/**
 * The live catalog: the rules, the file list, the output and the load of a folder. Each change makes the catalog
 * again with the module of the CLI.
 */
import { buildCatalog, type Catalog, type FileResult, type SourceFile } from "concat-src/catalog";
import { byId, copyText, h } from "@mark1russell7/site-pages/chrome";
import { CAP_BYTES, fromDrop, fromInput, planRead, readPlan, type Candidate, type SkippedGroup } from "./load.ts";
import { cliCommand, explainFile, formatBytes, groupOf, GROUPS, labelOf, parseField, type Group } from "./reasons.ts";
import { SAMPLE, START_RULES } from "./sample.ts";

/** The extensions and the patterns of the quick chips. */
const INCLUDE_CHIPS = [".ts", ".tsx", ".js", ".jsx", ".json", ".md"];
const EXCLUDE_CHIPS = [".test.ts", ".test.tsx", ".spec.ts", ".d.ts"];
/** The file list shows at most this number of rows. */
const MAX_ROWS = 400;
/** The output box shows at most this number of characters. Copy and Download give all of the output. */
const MAX_PREVIEW = 400_000;

type Filter = Group | "all";

export class App {
  private files: readonly SourceFile[] = SAMPLE;
  private skipped: readonly SkippedGroup[] = [];
  private sourceName = "the sample project";
  private readonly force = new Map<string, "in" | "out">();
  private filter: Filter = "all";
  private catalog: Catalog | undefined;
  private pending = false;

  private readonly include = byId<HTMLInputElement>("include");
  private readonly exclude = byId<HTMLInputElement>("exclude");
  private readonly list = byId<HTMLUListElement>("file-list");
  private readonly status = byId("load-status");

  constructor() {
    this.include.value = START_RULES.include;
    this.exclude.value = START_RULES.exclude;
    this.include.addEventListener("input", () => this.schedule());
    this.exclude.addEventListener("input", () => this.schedule());
    this.chips("include-chips", this.include, INCLUDE_CHIPS);
    this.chips("exclude-chips", this.exclude, EXCLUDE_CHIPS);

    this.list.addEventListener("change", (event) => {
      const box = event.target as HTMLInputElement;
      const path = box.closest<HTMLElement>("li")?.dataset["path"];
      const file = this.catalog?.files.find((f) => f.path === path);
      if (!file) return;
      const ruleKept = file.rule.code === "kept";
      if (box.checked === ruleKept) this.force.delete(file.path);
      else this.force.set(file.path, box.checked ? "in" : "out");
      this.render();
    });
    byId("reset-force").addEventListener("click", () => {
      this.force.clear();
      this.render();
    });
    byId("legend").addEventListener("click", (event) => {
      const chip = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-group]");
      if (!chip) return;
      const group = chip.dataset["group"] as Filter;
      this.filter = this.filter === group ? "all" : group;
      this.render();
    });

    const copyOutput = byId<HTMLButtonElement>("copy-output");
    copyOutput.addEventListener("click", () => void copyText(copyOutput, this.catalog?.markdown ?? ""));
    const copyCommand = byId<HTMLButtonElement>("copy-command");
    copyCommand.addEventListener("click", () => void copyText(copyCommand, byId("command").textContent ?? ""));
    byId("download").addEventListener("click", () => this.download());

    this.setupLoad();
    this.render();
  }

  /** The quick chips of a list: a click adds the item to the list, or removes it. */
  private chips(id: string, input: HTMLInputElement, items: readonly string[]): void {
    const box = byId(id);
    box.replaceChildren(...items.map((item) => h("button", { type: "button", class: "chip mono", "data-item": item, "aria-pressed": "false" }, item)));
    box.addEventListener("click", (event) => {
      const chip = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-item]");
      if (!chip) return;
      const item = chip.dataset["item"]!;
      const now = parseField(input.value) ?? [];
      const next = now.includes(item) ? now.filter((x) => x !== item) : [...now.filter((x) => x !== ""), item];
      input.value = next.join(", ");
      this.render();
    });
  }

  private schedule(): void {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.render();
    });
  }

  private render(): void {
    const include = parseField(this.include.value);
    const exclude = parseField(this.exclude.value);
    const catalog = buildCatalog(this.files, { include, exclude, force: Object.fromEntries(this.force) });
    this.catalog = catalog;
    const md = catalog.markdown;

    const preview = md.length > MAX_PREVIEW ? `${md.slice(0, MAX_PREVIEW)}\n\n… The preview ends here. Copy and Download give all of the output.\n` : md;
    byId("output").textContent = preview;
    const size = new TextEncoder().encode(md).length;
    byId("stat-kept").textContent = `${catalog.kept.length} of ${catalog.files.length + this.skippedCount()}`;
    byId("stat-size").textContent = formatBytes(size);
    byId("stat-lines").textContent = String(md.split("\n").length - 1);
    byId("command").textContent = cliCommand(include, exclude);
    byId("source-name").textContent = `of ${this.sourceName}`;
    byId("reset-force").hidden = this.force.size === 0;

    for (const [input, id] of [
      [this.include, "include-chips"],
      [this.exclude, "exclude-chips"],
    ] as const) {
      const list = parseField(input.value) ?? [];
      for (const chip of byId(id).querySelectorAll<HTMLButtonElement>("button[data-item]")) chip.setAttribute("aria-pressed", String(list.includes(chip.dataset["item"]!)));
    }

    this.renderBar(catalog.files);
    this.renderList(catalog.files);
  }

  private skippedCount(): number {
    return this.skipped.reduce((n, g) => n + g.count, 0);
  }

  /** The bar and the legend: the number of files of each group. A legend chip filters the file list. */
  private renderBar(files: readonly FileResult[]): void {
    const counts = new Map<Group, number>();
    for (const f of files) counts.set(groupOf(f), (counts.get(groupOf(f)) ?? 0) + 1);
    for (const g of this.skipped) counts.set(g.code, (counts.get(g.code) ?? 0) + g.count);
    const total = files.length + this.skippedCount();
    const shown = GROUPS.filter((g) => (counts.get(g.id) ?? 0) > 0);
    if (this.filter !== "all" && !counts.get(this.filter)) this.filter = "all";

    const bar = byId("bar");
    bar.setAttribute("aria-label", `The files by reason: ${shown.map((g) => `${counts.get(g.id)} ${g.label}`).join(", ")}`);
    bar.replaceChildren(...shown.map((g) => h("span", { class: `seg-${g.id}`, style: `flex-grow: ${counts.get(g.id)}`, title: `${counts.get(g.id)} ${g.label}` })));

    const chip = (id: Filter, label: string, count: number) =>
      h(
        "button",
        { type: "button", class: "chip", "data-group": id, "aria-pressed": String(this.filter === id) },
        id === "all" ? null : h("span", { class: `swatch seg-${id}`, "aria-hidden": "true" }),
        `${label} `,
        h("span", { class: "count" }, String(count)),
      );
    byId("legend").replaceChildren(chip("all", "all", total), ...shown.map((g) => chip(g.id, g.label, counts.get(g.id) ?? 0)));
  }

  private renderList(files: readonly FileResult[]): void {
    const rows: HTMLLIElement[] = [];
    const visible = files.filter((f) => this.filter === "all" || groupOf(f) === this.filter);
    for (const f of visible.slice(0, MAX_ROWS)) {
      const group = groupOf(f);
      const slash = f.path.lastIndexOf("/");
      rows.push(
        h(
          "li",
          { class: "file", "data-path": f.path, "data-kept": String(f.kept), "data-reason": f.reason.code, "data-forced": f.forced ?? "" },
          h(
            "label",
            { class: "pick" },
            h("input", { type: "checkbox", checked: f.kept, "aria-label": `Keep ${f.path}` }),
            h("span", { class: "path mono" }, slash >= 0 ? h("span", { class: "dir" }, f.path.slice(0, slash + 1)) : null, f.path.slice(slash + 1)),
          ),
          h("span", { class: `tag r-${group}` }, labelOf(group)),
          h("span", { class: "why" }, explainFile(f)),
        ),
      );
    }
    const groups = this.skipped.filter((g) => this.filter === "all" || g.code === this.filter);
    for (const g of groups) {
      rows.push(
        h(
          "li",
          { class: "file skipped", "data-path": g.path, "data-kept": "false", "data-reason": g.code },
          h("label", { class: "pick" }, h("input", { type: "checkbox", disabled: true, "aria-label": `${g.path} is not read` }), h("span", { class: "path mono" }, g.path)),
          h("span", { class: `tag r-${g.code}` }, labelOf(g.code)),
          h("span", { class: "why" }, `${g.count} ${g.count === 1 ? "file" : "files"}. The page did not read ${g.count === 1 ? "it" : "them"}, because the walk skips ${g.code === "hidden" ? "hidden entries" : "this folder"}.`),
        ),
      );
    }
    this.list.replaceChildren(...rows);
    byId("list-more").textContent = visible.length > MAX_ROWS ? `The list shows ${MAX_ROWS} of ${visible.length} files. The output has all of them.` : "";
  }

  private download(): void {
    const url = URL.createObjectURL(new Blob([this.catalog?.markdown ?? ""], { type: "text/markdown;charset=utf-8" }));
    const a = h("a", { href: url, download: "src-catalog.md" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** The folder picker, the drop zone and the button of the sample. */
  private setupLoad(): void {
    const input = byId<HTMLInputElement>("folder");
    byId("pick").addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      if (input.files && input.files.length > 0) void this.load(fromInput(input.files));
      input.value = "";
    });

    const drop = byId("drop");
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      drop.classList.remove("over");
      if (event.dataTransfer) void this.load(fromDrop(event.dataTransfer.items));
    });

    byId("use-sample").addEventListener("click", () => {
      this.files = SAMPLE;
      this.skipped = [];
      this.sourceName = "the sample project";
      this.force.clear();
      this.filter = "all";
      this.say("The sample project is back.");
      this.render();
    });
  }

  private say(text: string, warn = false): void {
    this.status.textContent = text;
    this.status.classList.toggle("warn", warn);
  }

  private async load(source: { name: string; candidates: Candidate[] } | Promise<{ name: string; candidates: Candidate[] }>): Promise<void> {
    const buttons = [byId<HTMLButtonElement>("pick"), byId<HTMLButtonElement>("use-sample")];
    buttons.forEach((b) => (b.disabled = true));
    try {
      this.say("Reading the folder…");
      const { name, candidates } = await source;
      if (candidates.length === 0) {
        this.say("The folder has no files.", true);
        return;
      }
      const plan = planRead(candidates, { include: parseField(this.include.value), exclude: parseField(this.exclude.value) });
      const loaded = await readPlan(name, plan, (done, total) => this.say(`Reading ${done} of ${total} files…`));
      this.files = loaded.files;
      this.skipped = loaded.skipped;
      this.sourceName = name;
      this.force.clear();
      this.filter = "all";
      const parts = [`The page read ${loaded.files.length} text ${loaded.files.length === 1 ? "file" : "files"} (${formatBytes(loaded.bytes)}) of ${name}.`];
      const skippedFiles = this.skippedCount();
      if (skippedFiles > 0) parts.push(`It did not read ${skippedFiles} files in hidden or ignored folders.`);
      if (loaded.binary > 0) parts.push(`It skipped ${loaded.binary} binary ${loaded.binary === 1 ? "file" : "files"}.`);
      if (loaded.overCap.length > 0) {
        parts.push(`It stopped at the cap of ${formatBytes(CAP_BYTES)}: ${loaded.overCap.length} more ${loaded.overCap.length === 1 ? "file is" : "files are"} not in the output. Use the CLI for a large folder.`);
      }
      this.say(parts.join(" "), loaded.overCap.length > 0);
      this.render();
    } catch (error) {
      this.say(`The page cannot read the folder: ${error instanceof Error ? error.message : String(error)}`, true);
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  }
}
