# Changelog

## [0.1.0] - 2026-09-10

### Changed

- **Breaking:** Require VS Code 1.108.0 or later ([`d66dbc1`](https://github.com/sherif-fanous/lumosync/commit/d66dbc1))
- **Breaking:** Restrict `lumosync.actions` to user settings; move any workspace or folder actions into your user settings ([`ce4a190`](https://github.com/sherif-fanous/lumosync/commit/ce4a190))
- Simplify theme-kind lookup without changing the supported theme kinds ([`f04be93`](https://github.com/sherif-fanous/lumosync/commit/f04be93))

### Fixed

- Apply settings when the theme kind changes without requiring a window focus change ([`e67f575`](https://github.com/sherif-fanous/lumosync/commit/e67f575))
- Prevent overlapping settings updates during rapid theme changes ([`b9e5d7f`](https://github.com/sherif-fanous/lumosync/commit/b9e5d7f))
- Apply edited actions without requiring a theme change ([`c698ca6`](https://github.com/sherif-fanous/lumosync/commit/c698ca6))
- Report partial failures, continue applying other settings, and allow failed actions to retry on a later theme change or action edit ([`feea10d`](https://github.com/sherif-fanous/lumosync/commit/feea10d))
- Reject malformed action groups and flag unsupported theme-kind keys in settings ([`4374fd3`](https://github.com/sherif-fanous/lumosync/commit/4374fd3), [`febf40f`](https://github.com/sherif-fanous/lumosync/commit/febf40f))
- Omit configured setting values from logs and clarify configuration guidance ([`5a5efae`](https://github.com/sherif-fanous/lumosync/commit/5a5efae))
- Dispose of the LumoSync output channel when the extension unloads ([`bee3078`](https://github.com/sherif-fanous/lumosync/commit/bee3078))

## [0.0.1]

_Initial release._

[0.1.0]: https://github.com/sherif-fanous/lumosync/releases/tag/v0.1.0
[0.0.1]: https://github.com/sherif-fanous/lumosync/releases/tag/v0.0.1
