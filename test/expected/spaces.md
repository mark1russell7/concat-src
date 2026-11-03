# Source Catalog

Generated on <time>

**Included extensions:** .ts, .js

**Excluded patterns:** .test.ts

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
│   │   └── math.ts
│   ├── crlf.ts
│   ├── fence.ts
│   ├── index.ts
│   ├── legacy.js
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

### src/legacy.js

``` js
module.exports = function legacy() {};

```

### src/types.d.ts

``` ts
declare const VERSION: string;

```

### src/unicode.ts

``` ts
export const s = "héllo — ☃";

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

