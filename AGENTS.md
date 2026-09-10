# Agents

## Tasks

[mise](https://mise.jdx.dev/) provisions Node and pnpm and runs project tasks.
Use `mise exec -- pnpm` when mise is not activated in your shell. See
`mise.toml` for tasks and `CONTRIBUTING.md` for setup, testing, and packaging.

Run `mise run check` before committing. Use `mise run format`, then
`mise run lint-fix` to fix formatting and lint issues. Commit
`pnpm-lock.yaml` with dependency changes. Do not introduce npm lockfiles.

Use Conventional Commits. Work on `main` for now unless the user requests a
branch. Keep commits focused. Do not push or publish without permission.

## Code conventions

### Architecture and settings safety

- Keep the extension small. Use VS Code APIs and the standard library before
  adding dependencies or abstractions. LumoSync has no runtime npm dependencies.
- Keep settings updates serialized through the existing queue. Theme changes
  and edits to `lumosync.actions` must use the same update path.
- Keep the last observed theme separate from the last successfully applied
  theme. A partially failed batch must remain eligible for a later retry.
- Read the current actions for each update attempt. Do not cache configuration
  across events or remove the forced reapplication after action edits.
- Actions write global user settings. Keep `lumosync.actions` application-scoped
  and do not add workspace or folder actions without an explicit design change.
- Validate configuration and action-group containers before iterating them.
  Individual setting names and values pass through to VS Code. Do not claim
  that VS Code rejects every invalid setting or value.
- Log failures in the LumoSync output channel and continue other writes in the
  batch. Do not log configured setting values or duplicate output-channel
  errors in the console. Register event listeners and the channel for disposal.
- Keep the four supported theme kinds consistent across runtime handling,
  the configuration schema, and tests.
- Use the existing mocked VS Code tests for regression coverage. Do not add a
  dependency-injection framework or replace Mocha with Vitest.

### Comments

Every source file opens with a module JSDoc of one or two sentences describing
what it does. Every exported function, type, and constant carries a short
JSDoc. Do not list what a module is not responsible for.

Skip `@param`, `@returns`, and `@throws` tags that restate the signature.
Add detail only when the caller needs an invariant, a non-obvious return
contract, or a host quirk.

Use inline comments for reasons the code cannot show, such as an ordering
constraint or a workaround for host behavior. Delete comments that narrate
the next line.

Describe the current code. Keep historical explanations in Git and
`CHANGELOG.md`. Comment prose follows the user-facing text rules below.

## Compatibility and testing

The minimum supported VS Code version is 1.108.0. Keep the VS Code typings on
that API line and Node typings compatible with its Node 22 runtime. Development
tools use the Node version pinned in mise. See `CONTRIBUTING.md` for dependency
pins and their constraints.

`mise run check` runs formatting checks, type checks, lint, and mocked tests.
When changing theme synchronization, configuration handling, or compatibility
requirements, also run `mise run test-vscode`. It tests the minimum supported
host and current stable. Build success and mocked tests do not prove host
compatibility. Report download and launch failures separately from test results.

Real-host tests must use the isolated profiles under `.vscode-test/`, retain
the environment guard, and restore settings they change. Never run automated
settings-writing tests against the user's normal VS Code profile.

TypeScript compiles to `out/`. Do not edit generated JavaScript. Keep tests,
source maps, development files, and this file out of the VSIX. Run
`mise run pack-check` when changing package contents. Revisit packaging with
`--no-dependencies` if runtime dependencies are added.

## User-facing text

Apply the `humanizer` and `unslop` skills to documentation, comments, and
user-facing strings. If the skills are unavailable, apply these rules manually.

Use plain words, active voice, sentence case, and complete sentences. Avoid
em and en dashes, AI stock vocabulary, and bold-label lists. Notifications
and warning sentences end with periods. Short labels do not need periods.
Keep setting names and theme-kind keys literal, such as `lumosync.actions`
and `HighContrastLight`.

Write `README.md` and `CHANGELOG.md` for extension users. Explain what they can
configure or expect without internal function names or implementation details.
Write `CONTRIBUTING.md` for contributors, where technical terms belong.
