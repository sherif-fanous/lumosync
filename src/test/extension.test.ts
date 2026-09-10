import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { setImmediate } from "node:timers/promises";
import { runInNewContext } from "node:vm";

function createHarness(
  actions: Record<string, Record<string, unknown>>,
  update: (setting: string, value: unknown, target: number) => Promise<void>
) {
  let onThemeChange: ((theme: { kind: number }) => void) | undefined;
  let onConfigurationChange:
    | ((event: { affectsConfiguration(section: string): boolean }) => void)
    | undefined;
  const configurationSubscription = { dispose() {} };
  const subscription = { dispose() {} };
  const context = { subscriptions: [] as unknown[] };
  const vscode = {
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
    ConfigurationTarget: { Global: 1 },
    window: {
      activeColorTheme: { kind: 1 },
      createOutputChannel: () => ({ appendLine() {} }),
      onDidChangeActiveColorTheme: (listener: NonNullable<typeof onThemeChange>) => {
        onThemeChange = listener;
        return subscription;
      },
      // Available to the old implementation, but never fired by these tests.
      onDidChangeWindowState: () => subscription,
    },
    workspace: {
      onDidChangeConfiguration: (listener: NonNullable<typeof onConfigurationChange>) => {
        onConfigurationChange = listener;
        return configurationSubscription;
      },
      getConfiguration: () => ({ get: () => actions, update }),
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

  return {
    activate: () => extension.activate(context),
    context,
    subscription,
    configurationSubscription,
    changeTheme: (kind: number) => {
      assert.ok(onThemeChange, "must subscribe to active theme changes");
      vscode.window.activeColorTheme.kind = kind;
      onThemeChange(vscode.window.activeColorTheme);
    },
    changeConfiguration: (section: string) => {
      assert.ok(onConfigurationChange, "must subscribe to configuration changes");
      onConfigurationChange({ affectsConfiguration: (candidate) => candidate === section });
    },
  };
}

suite("LumoSync", () => {
  test("restricts actions to user settings", () => {
    const manifest = JSON.parse(
      readFileSync(join(__dirname, "..", "..", "package.json"), "utf8")
    );

    assert.equal(
      manifest.contributes.configuration.properties["lumosync.actions"].scope,
      "application"
    );
  });

  test("applies theme changes without window-state events", async () => {
    const writes: Array<[string, unknown, number]> = [];
    const harness = createHarness(
      {
        Light: { "editor.fontSize": 12 },
        Dark: { "editor.fontSize": 16 },
      },
      async (setting, value, target) => {
        writes.push([setting, value, target]);
      }
    );

    harness.activate();
    await setImmediate();
    assert.deepEqual(writes, [["editor.fontSize", 12, 1]]);
    assert.ok(harness.context.subscriptions.includes(harness.subscription));

    harness.changeTheme(2);
    await setImmediate();
    assert.deepEqual(writes, [
      ["editor.fontSize", 12, 1],
      ["editor.fontSize", 16, 1],
    ]);

    // Changes within the same theme kind must still be ignored.
    harness.changeTheme(2);
    await setImmediate();
    assert.equal(writes.length, 2);
  });

  test("reapplies edited actions without changing theme kind", async () => {
    const actions = { Light: { "editor.fontSize": 12 } };
    const writes: unknown[] = [];
    const harness = createHarness(actions, async (_setting, value) => {
      writes.push(value);
    });

    harness.activate();
    await setImmediate();
    assert.deepEqual(writes, [12]);
    assert.ok(harness.context.subscriptions.includes(harness.configurationSubscription));

    actions.Light["editor.fontSize"] = 18;
    harness.changeConfiguration("lumosync.actions");
    await setImmediate();
    assert.deepEqual(writes, [12, 18]);
  });

  test("ignores unrelated configuration changes, including its own setting writes", async () => {
    const writes: unknown[] = [];
    const harness = createHarness(
      { Light: { "editor.fontSize": 12 } },
      async (setting, value) => {
        writes.push(value);
        harness.changeConfiguration(setting);
      }
    );

    harness.activate();
    await setImmediate();
    harness.changeConfiguration("editor.lineHeight");
    await setImmediate();
    assert.deepEqual(writes, [12]);
  });

  test("finishes the current batch before applying the latest theme", async () => {
    let releaseLight!: () => void;
    const lightWrite = new Promise<void>((resolve) => {
      releaseLight = resolve;
    });
    const started: Array<[string, unknown]> = [];
    const settings: Record<string, unknown> = {};
    const harness = createHarness(
      {
        Light: { "editor.fontSize": 12, "editor.lineHeight": 20 },
        Dark: { "editor.fontSize": 16, "editor.lineHeight": 24 },
      },
      async (setting, value) => {
        started.push([setting, value]);
        if (setting === "editor.fontSize" && value === 12) {
          await lightWrite;
        }
        settings[setting] = value;
      }
    );

    harness.activate();
    await setImmediate();
    try {
      assert.deepEqual(started, [["editor.fontSize", 12]]);
      harness.changeTheme(2);
      harness.changeTheme(1);
      harness.changeTheme(2);
      await setImmediate();
      assert.deepEqual(started, [["editor.fontSize", 12]], "new batches must wait");
    } finally {
      releaseLight();
      await setImmediate();
    }

    // Queued passes read the latest theme rather than replaying intermediate ones.
    assert.deepEqual(started, [
      ["editor.fontSize", 12],
      ["editor.lineHeight", 20],
      ["editor.fontSize", 16],
      ["editor.lineHeight", 24],
    ]);
    assert.deepEqual(settings, { "editor.fontSize": 16, "editor.lineHeight": 24 });
  });
});
