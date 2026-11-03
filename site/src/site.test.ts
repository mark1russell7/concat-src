import { buildCatalog } from "concat-src/catalog";
import { describe, expect, it } from "vitest";
import { isText, planRead, readPlan, stripRoot, type Candidate } from "./load.ts";
import { cliCommand, explainFile, formatBytes, groupOf, parseField } from "./reasons.ts";
import { SAMPLE, START_RULES } from "./sample.ts";

const startRules = { include: parseField(START_RULES.include), exclude: parseField(START_RULES.exclude) };

describe("the sample project", () => {
  it("has a file for each reason at the start rules", () => {
    const { files } = buildCatalog(SAMPLE, { ...startRules, generatedAt: "T" });
    const codes = new Set(files.map((f) => f.reason.code));
    expect([...codes].sort()).toEqual(["excluded", "extension", "hidden", "ignored", "kept"]);
  });

  it("gives the Markdown of the CLI for the start rules", () => {
    const md = buildCatalog(SAMPLE, { ...startRules, generatedAt: "T" }).markdown;
    expect(md.startsWith("# Source Catalog\n\nGenerated on T\n\n**Included extensions:** .ts, .tsx\n\n**Excluded patterns:** .test.ts, .test.tsx\n\n")).toBe(true);
    expect(md).toContain("### src/App.tsx\n\n``` tsx\n");
    expect(md).not.toContain("### src/utils/format.test.ts");
  });
});

describe("the words of the page", () => {
  it("reads an empty field as no option", () => {
    expect(parseField("  ")).toBeNull();
    expect(parseField(".ts, .js")).toEqual([".ts", ".js"]);
  });

  it("writes the CLI command, with quotes when a value has a space", () => {
    expect(cliCommand([".ts", ".js"], null)).toBe("node concat-src.ts --include=.ts,.js");
    expect(cliCommand(null, [".test.ts"])).toBe("node concat-src.ts --exclude=.test.ts");
    expect(cliCommand(null, null)).toBe("node concat-src.ts");
    expect(cliCommand([".a b"], null)).toBe('node concat-src.ts "--include=.a b"');
  });

  it("tells a toggle of the visitor and the reason of the rules", () => {
    const { files } = buildCatalog(SAMPLE, { generatedAt: "T", force: { "scripts/build.js": "in" } });
    const file = files.find((f) => f.path === "scripts/build.js")!;
    expect(groupOf(file)).toBe("forced-in");
    expect(explainFile(file)).toBe("You turned it in. The rules put it out: the extension .js is not in the include list.");
  });

  it("formats a size", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});

describe("the load of a folder", () => {
  const candidate = (path: string, text: string): Candidate => ({
    path,
    size: new TextEncoder().encode(text).length,
    read: async () => new TextEncoder().encode(text).buffer as ArrayBuffer,
  });

  it("removes the name of the chosen folder", () => {
    expect(stripRoot(["app/src/a.ts", "app/b.ts"])).toEqual({ root: "app", paths: ["src/a.ts", "b.ts"] });
    expect(stripRoot(["a.ts", "b/c.ts"])).toEqual({ root: "", paths: ["a.ts", "b/c.ts"] });
  });

  it("finds a binary file by its zero byte", () => {
    expect(isText(new TextEncoder().encode("plain text"))).toBe(true);
    expect(isText(new Uint8Array([0x89, 0x50, 0x00, 0x47]))).toBe(false);
  });

  it("puts the hidden and ignored folders into groups, and reads the kept files first", () => {
    const plan = planRead(
      [
        candidate("z.js", "z"),
        candidate("a.ts", "a"),
        candidate("node_modules/x/index.js", "x"),
        candidate("node_modules/y/index.js", "y"),
        candidate("pkg/dist/out.ts", "o"),
        candidate(".git/HEAD", "ref"),
        candidate(".env", "A=1"),
      ],
      { include: [".ts"], exclude: null },
    );
    expect(plan.toRead.map((c) => c.path)).toEqual(["a.ts", "z.js"]);
    expect(plan.skipped).toEqual([
      { path: ".env", code: "hidden", count: 1 },
      { path: ".git/", code: "hidden", count: 1 },
      { path: "node_modules/", code: "ignored", count: 2 },
      { path: "pkg/dist/", code: "ignored", count: 1 },
    ]);
  });

  it("stops at the cap, and skips binary files", async () => {
    const plan = planRead([candidate("a.ts", "aaaa"), candidate("b.ts", "b\u0000b"), candidate("c.ts", "cccc")], {});
    const loaded = await readPlan("demo", plan, () => {}, 7);
    expect(loaded.files.map((f) => f.path)).toEqual(["a.ts"]);
    expect(loaded.overCap).toEqual(["c.ts"]);
    expect(loaded.binary).toBe(1);
    expect(loaded.bytes).toBe(4);
  });
});
