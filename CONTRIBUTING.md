# Development

Install [mise](https://mise.jdx.dev/), then run these commands in the repository:

```sh
mise trust
mise install
mise exec -- pnpm install --frozen-lockfile
mise run check
```

`mise.toml` pins Node and pnpm. `package.json` contains the commands that mise tasks run. Use `mise exec -- pnpm` if mise is not activated in your shell.

## Build and test

```sh
mise run compile
mise run test
mise run type-check
mise run lint
```

TypeScript compiles the extension and tests into `out/`. The tests use Mocha with a mocked VS Code API and do not change your user settings.

For continuous testing, run `mise run watch` in one terminal and `mise run test-watch` in another. The compiler watches TypeScript files, and Mocha watches the compiled JavaScript.

`mise run test-vscode` runs the tests inside a downloaded VS Code installation. The mocked tests alone do not establish compatibility with every supported VS Code version.

## Debug

Make sure VS Code can find `mise` on its PATH, then press F5. The build task uses the pinned tools and compiles once before launching the development host. The task terminal shows the build output. The development host loads `out/extension.js`; source maps support breakpoints in `src/extension.ts`.

To compile edits while debugging, run `mise run watch` separately. Reload the development host to load the updated extension.

Disable the installed copy of LumoSync while testing. The development copy writes user settings, so restore any temporary settings after testing.

## Package

```sh
mise run pack-check
mise run package
```

`pack-check` runs the checks and lists the files to include. `package` runs the checks and creates a local VSIX. Neither command publishes the extension.

The package excludes tests, source maps, source files, and development dependencies. Packaging uses `--no-dependencies` because LumoSync has no runtime npm dependencies. Revisit that flag if runtime dependencies are added.

VSCE's optional credential-storage and signing install scripts are disabled in `pnpm-workspace.yaml`. They are not needed to build an unsigned local VSIX. Publishing or signing may need a different setup.

## Dependencies

Use `mise exec -- pnpm add -D <package>` to add a development dependency, or `mise exec -- pnpm remove <package>` to remove one. `mise run update-deps` updates within the declared version ranges. Commit `pnpm-lock.yaml` with dependency changes.
