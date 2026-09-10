import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { setImmediate } from "node:timers/promises";
import { runInNewContext } from "node:vm";

suite("LumoSync", () => {
  test("applies theme changes without window-state events", async () => {
    let onThemeChange: (() => void) | undefined;
    const writes: Array<[string, unknown, number]> = [];
    const subscription = { dispose() {} };
    const context = { subscriptions: [] as unknown[] };
    const vscode = {
      ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
      ConfigurationTarget: { Global: 1 },
      window: {
        activeColorTheme: { kind: 1 },
        createOutputChannel: () => ({ appendLine() {} }),
        onDidChangeActiveColorTheme: (listener: () => void) => {
          onThemeChange = listener;
          return subscription;
        },
        // Available to the old implementation, but never fired by this test.
        onDidChangeWindowState: () => subscription,
      },
      workspace: {
        getConfiguration: () => ({
          get: () => ({
            Light: { "editor.fontSize": 12 },
            Dark: { "editor.fontSize": 16 },
          }),
          update: async (setting: string, value: unknown, target: number) => {
            writes.push([setting, value, target]);
          },
        }),
      },
    };
    const extension = {} as { activate(extensionContext: typeof context): void };

    // Load fresh module state with a mocked VS Code API; never write real settings.
    runInNewContext(
      readFileSync(join(__dirname, "..", "extension.js"), "utf8"),
      {
        exports: extension,
        require: (name: string) => {
          assert.equal(name, "vscode");
          return vscode;
        },
        console,
      }
    );

    extension.activate(context);
    await setImmediate();
    assert.deepEqual(writes, [["editor.fontSize", 12, 1]]);
    assert.ok(onThemeChange, "must subscribe to active theme changes");
    assert.ok(context.subscriptions.includes(subscription));

    vscode.window.activeColorTheme.kind = vscode.ColorThemeKind.Dark;
    onThemeChange();
    await setImmediate();
    assert.deepEqual(writes, [
      ["editor.fontSize", 12, 1],
      ["editor.fontSize", 16, 1],
    ]);

    // Changes within the same theme kind must still be ignored.
    onThemeChange();
    await setImmediate();
    assert.equal(writes.length, 2);
  });
});
