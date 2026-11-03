// The fixture folder of the CLI test, and its cases. Each rule of the walk has a file here.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Each path of the fixture and its text. The value null makes an empty folder. */
export const FIXTURE = {
  "a.ts": "export const a = 1;\n",
  "Z.ts": "export const z = 26;\n",
  "src/index.ts": 'export * from "./util/math";\nexport { App } from "./App";\n',
  "src/App.tsx": "export function App() {\n  return <h1>Hello</h1>;\n}\n",
  "src/utils.ts": "export const id = <T>(x: T): T => x;\n",
  "src/util/math.ts": "export function add(a: number, b: number): number {\n  return a + b;\n}\n",
  "src/util/math.test.ts": 'import { add } from "./math";\nif (add(1, 2) !== 3) throw new Error("add");\n',
  "src/types.d.ts": "declare const VERSION: string;\n",
  "src/legacy.js": "module.exports = function legacy() {};\n",
  "src/fence.ts": "export const md = `\n```ts\nconst x = 1;\n```\n`;\n",
  "src/crlf.ts": "export const a = 1;\r\nexport const b = 2;\r\n",
  "src/unicode.ts": 'export const s = "héllo — ☃";\n',
  "src/notes.md": "# Notes\n\nSome `code` here.\n",
  "src/Makefile": "all:\n\techo make\n",
  "docs/guide.txt": "A text file with no kept extension.\n",
  "empty": null,
  "node_modules/pkg/index.ts": "export const fromPackage = true;\n",
  "dist/out.ts": "export const built = true;\n",
  "build/gen.ts": "export const generated = true;\n",
  "lib/build/deep.ts": "export const deep = true;\n",
  "lib/core.ts": "export const core = true;\n",
  ".hidden.ts": "export const hidden = true;\n",
  ".cache/cached.ts": "export const cached = true;\n",
};

/** The cases of the CLI test: a name and the arguments. */
export const CASES = [
  { name: "default", args: [] },
  { name: "include-js", args: ["out.md", "--include=.ts,.tsx,.js"] },
  { name: "exclude", args: ["--exclude=.test.ts,.d.ts"] },
  { name: "duplicate-and-md", args: ["out.md", "--include=.ts,.ts,.md", "--exclude=.test.ts"] },
  { name: "no-extension", args: ["out.md", "--include=,.js"] },
  { name: "empty-exclude", args: ["out.md", "--exclude="] },
  { name: "spaces", args: ["out.md", "--include= .ts , .js ", "--exclude= .test.ts"] },
];

/** This function writes the fixture into a new temporary folder and gives its path. */
export function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "concat-src-"));
  for (const [rel, text] of Object.entries(FIXTURE)) {
    const full = path.join(root, ...rel.split("/"));
    if (text === null) {
      fs.mkdirSync(full, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, text, "utf8");
    }
  }
  return root;
}

/** This function replaces the time of the line "Generated on", because it changes at each run. */
export function withoutTime(markdown) {
  return markdown.replace(/^Generated on .*$/m, "Generated on <time>");
}
