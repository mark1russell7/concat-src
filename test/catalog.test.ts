// The tests of the module src/catalog.ts: the reason of each file, the overrides and the parts of the Markdown.
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { buildCatalog, classify, extname, fenceFor, languageOf, parseList, type SourceFile } from "../src/catalog.ts";
import { FIXTURE } from "./fixture.ts";

const files: SourceFile[] = Object.entries(FIXTURE).flatMap(([p, text]) => (text === null ? [] : [{ path: p, text }]));

test("extname is the extname of node:path", () => {
  for (const name of ["a.ts", ".env", ".eslintrc.cjs", "a.", ".", "..", "...", "..ts", "...ts", "a..b", "Makefile", "x.test.ts", ".a.b.", "..a."]) {
    assert.equal(extname(name), path.posix.extname(name), name);
  }
});

test("parseList splits at commas and trims each part", () => {
  assert.deepEqual(parseList(" .ts , .js "), [".ts", ".js"]);
  assert.deepEqual(parseList(""), [""]);
});

test("the reason of each rule, in the sequence of the walk", () => {
  const rules = { include: [".ts", ".tsx"], exclude: [".test.ts"] };
  assert.deepEqual(classify(".hidden.ts", rules).reason, { code: "hidden", detail: ".hidden.ts" });
  assert.deepEqual(classify(".cache/cached.ts", rules).reason, { code: "hidden", detail: ".cache/" });
  assert.deepEqual(classify("node_modules/pkg/index.ts", rules).reason, { code: "ignored", detail: "node_modules/" });
  assert.deepEqual(classify("lib/build/deep.ts", rules).reason, { code: "ignored", detail: "build/" });
  assert.deepEqual(classify("src/legacy.js", rules).reason, { code: "extension", detail: ".js" });
  assert.deepEqual(classify("src/util/math.test.ts", rules).reason, { code: "excluded", detail: ".test.ts" });
  assert.deepEqual(classify("src/index.ts", rules).reason, { code: "kept", detail: ".ts" });
  // A file named dist is not a folder, so the rule of the ignored folders does not apply.
  assert.equal(classify("src/dist", { include: [""] }).kept, true);
});

test("the tree shows a hidden file that passes the other rules, as the CLI does", () => {
  assert.equal(classify(".hidden.ts").inTree, true);
  assert.equal(classify(".hidden.ts").kept, false);
  assert.equal(classify("dist/out.ts").inTree, false);
});

test("force turns a file in or out, and keeps the reason of the rules", () => {
  const plain = buildCatalog(files, { generatedAt: "T" });
  const forced = buildCatalog(files, { generatedAt: "T", force: { "src/legacy.js": "in", "src/index.ts": "out" } });
  assert.ok(!plain.markdown.includes("### src/legacy.js"));
  assert.ok(forced.markdown.includes("### src/legacy.js\n\n``` js\n"));
  assert.ok(plain.markdown.includes("### src/index.ts"));
  assert.ok(!forced.markdown.includes("### src/index.ts"));
  const legacy = forced.files.find((f) => f.path === "src/legacy.js");
  assert.equal(legacy?.forced, "in");
  assert.deepEqual(legacy?.rule, { code: "extension", detail: ".js" });
  assert.equal(forced.kept.length, plain.kept.length);
});

test("a forced file in an ignored folder brings its folders into the tree", () => {
  const md = buildCatalog(files, { generatedAt: "T", force: { "node_modules/pkg/index.ts": "in" } }).markdown;
  assert.match(md, /├── node_modules\/\n│ {3}└── pkg\/\n│ {7}└── index\.ts/);
});

test("the fence is longer than each run of backticks, and the language comes from the extension", () => {
  assert.equal(fenceFor("no ticks"), "```");
  assert.equal(fenceFor("````"), "`````");
  assert.equal(languageOf("a/b.mjs"), "js");
  assert.equal(languageOf("a/b.vue"), "vue");
  assert.equal(languageOf("Makefile"), "");
});

test("the catalog reads only the kept files", () => {
  const read: string[] = [];
  const lazy = files.map((f) => ({ path: f.path, text: () => (read.push(f.path), String(f.text)) }));
  const catalog = buildCatalog(lazy, { generatedAt: "T" });
  assert.deepEqual(read.sort(), catalog.kept.map((k) => k.path).sort());
});
