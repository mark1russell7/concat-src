/**
 * The sample project of the page. It has a file for each rule: kept files, test files for the exclude list and files
 * with other extensions. It also has files in `node_modules` and `dist`, and hidden files.
 */
import type { SourceFile } from "concat-src/catalog";

/** The include list and the exclude list at the start of the page. */
export const START_RULES = { include: ".ts, .tsx", exclude: ".test.ts, .test.tsx" } as const;

/** The files of the sample project. */
export const SAMPLE: readonly SourceFile[] = [
  {
    path: "src/index.ts",
    text: `export { App } from "./App";
export { formatBytes } from "./utils/format";
`,
  },
  {
    path: "src/App.tsx",
    text: `import { Button } from "./components/Button";
import { formatBytes } from "./utils/format";

export function App({ size }: { size: number }) {
  return (
    <main>
      <h1>Catalog: {formatBytes(size)}</h1>
      <Button label="Copy" />
    </main>
  );
}
`,
  },
  {
    path: "src/components/Button.tsx",
    text: `export interface ButtonProps {
  readonly label: string;
  readonly onClick?: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return <button type="button" onClick={onClick}>{label}</button>;
}
`,
  },
  {
    path: "src/components/Button.test.tsx",
    text: `import { Button } from "./Button";

test("the button shows its label", () => {
  expect(Button({ label: "Copy" }).props.children).toBe("Copy");
});
`,
  },
  {
    path: "src/utils/format.ts",
    text: `/** This function gives a size in bytes as text: 1536 gives "1.5 KB". */
export function formatBytes(n: number): string {
  if (n < 1024) return \`\${n} B\`;
  const units = ["KB", "MB", "GB"];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return \`\${value.toFixed(1)} \${units[unit]}\`;
}
`,
  },
  {
    path: "src/utils/format.test.ts",
    text: `import { formatBytes } from "./format";

test("formatBytes", () => {
  expect(formatBytes(512)).toBe("512 B");
  expect(formatBytes(1536)).toBe("1.5 KB");
});
`,
  },
  {
    path: "src/types.d.ts",
    text: `declare const __VERSION__: string;
`,
  },
  {
    path: "src/legacy/polyfill.js",
    text: `if (!Array.prototype.at) {
  Array.prototype.at = function at(i) {
    return this[i < 0 ? this.length + i : i];
  };
}
`,
  },
  {
    path: "scripts/build.js",
    text: `import { build } from "esbuild";

await build({ entryPoints: ["src/index.ts"], bundle: true, outdir: "dist" });
`,
  },
  {
    path: "README.md",
    text: `# sample-app

A small app for the demo of concat-src.
`,
  },
  {
    path: "package.json",
    text: `{
  "name": "sample-app",
  "type": "module",
  "scripts": { "build": "node scripts/build.js" }
}
`,
  },
  {
    path: "node_modules/left-pad/index.js",
    text: `module.exports = (s, n, c = " ") => String(s).padStart(n, c);
`,
  },
  {
    path: "node_modules/@types/react/index.d.ts",
    text: `export type ReactNode = unknown;
`,
  },
  {
    path: "dist/index.js",
    text: `export{App}from"./App.js";
`,
  },
  {
    path: "dist/index.d.ts",
    text: `export { App } from "./App";
`,
  },
  {
    path: ".env",
    text: `API_TOKEN=not-a-real-token
`,
  },
  {
    path: ".vscode/settings.json",
    text: `{ "editor.tabSize": 2 }
`,
  },
];
