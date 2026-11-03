# Source Catalog

Generated on <time>

**Included extensions:** .ts, .tsx

## Directory structure

```
├── .cache/
│   └── cached.ts
├── docs/

├── empty/

├── lib/
│   └── core.ts
├── src/
│   ├── util/
│   │   ├── math.test.ts
│   │   └── math.ts
│   ├── App.tsx
│   ├── crlf.ts
│   ├── fence.ts
│   ├── index.ts
│   ├── types.d.ts
│   ├── unicode.ts
│   └── utils.ts
├── .hidden.ts
├── a.ts
└── Z.ts
```

## Files

### a.ts

``` ts
export const a = 1;

```

### lib/core.ts

``` ts
export const core = true;

```

### src/App.tsx

``` tsx
export function App() {
  return <h1>Hello</h1>;
}

```

### src/crlf.ts

``` ts
export const a = 1;
export const b = 2;

```

### src/fence.ts

```` ts
export const md = `
```ts
const x = 1;
```
`;

````

### src/index.ts

``` ts
export * from "./util/math";
export { App } from "./App";

```

### src/types.d.ts

``` ts
declare const VERSION: string;

```

### src/unicode.ts

``` ts
export const s = "héllo — ☃";

```

### src/util/math.test.ts

``` ts
import { add } from "./math";
if (add(1, 2) !== 3) throw new Error("add");

```

### src/util/math.ts

``` ts
export function add(a: number, b: number): number {
  return a + b;
}

```

### src/utils.ts

``` ts
export const id = <T>(x: T): T => x;

```

### Z.ts

``` ts
export const z = 26;

```

