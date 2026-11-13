# concat-src

The CLI `concat-src` walks a folder and keeps the source files by extension and by end pattern. Then it writes all of them into one Markdown file.

Try it in your browser: https://mark1russell7.github.io/concat-src/. The page shows the catalog of a sample project or of your own folder. The files stay in your browser.

## Install

The package is not on npm. Get the repository, and start the script with Node.js 22.18 or later. It needs no dependencies.

```sh
git clone https://github.com/mark1russell7/concat-src.git ~/concat-src
cd path/to/your-project
node ~/concat-src/concat-src.ts --exclude=.test.ts
```

## Usage

```sh
node concat-src.ts [output.md] [--include=.ts,.tsx] [--exclude=.spec.ts,.test.ts]
```

| Argument | What it sets | Default |
| --- | --- | --- |
| `output.md` | The name of the output file | `src-catalog.md` |
| `--include=` | The extensions to keep, separated by commas | `.ts,.tsx` |
| `--exclude=` | The name endings to remove, separated by commas | none |

## The rules

The CLI applies these rules to each entry, in this sequence:

1. An entry with a name that starts with a dot is out.
2. The walk does not enter `node_modules`, `dist` and `build`.
3. A file with an extension that is not in the include list is out.
4. A file with a name that ends with a pattern of the exclude list is out.
5. The CLI keeps each other file.

The output has the rules, a directory tree, and a section with a code fence for each kept file.

## The code

- `src/catalog.ts` has the rules and the Markdown, with no file system. The CLI and the site use it.
- `concat-src.ts` is the CLI. It reads the folder and writes the output of the module.
- `test/` has the tests. The CLI test starts the CLI on a fixture folder, and compares the output with `test/expected/`.
- `site/` is the site of GitHub Pages.

Start `pnpm install`, then `pnpm test` and `pnpm typecheck`.

## License

MIT
