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
  const logs: string[] = [];
  const vscode = {
    ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
    ConfigurationTarget: { Global: 1 },
    window: {
      activeColorTheme: { kind: 1 },
      createOutputChannel: () => ({ appendLine: (message: string) => logs.push(message) }),
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
    logs,
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

  test("reports partial failure, continues writes, and retries on a later same-kind event", async () => {
    let failFontWrite = true;
    const writes: string[] = [];
    const settings: Record<string, unknown> = {};
    const harness = createHarness(
      { Light: { "editor.fontSize": 12, "editor.lineHeight": 20 } },
      async (setting, value) => {
        writes.push(setting);
        if (setting === "editor.fontSize" && failFontWrite) {
          throw new Error("simulated write failure");
        }
        settings[setting] = value;
      }
    );

    harness.activate();
    await setImmediate();
    assert.deepEqual(writes, ["editor.fontSize", "editor.lineHeight"]);
    assert.deepEqual(settings, { "editor.lineHeight": 20 });
    assert.ok(harness.logs.includes("LumoSync actions incomplete for Light: 1 setting(s) failed"));
    assert.ok(!harness.logs.some((line) => line.startsWith("Applied LumoSync actions")));

    failFontWrite = false;
    harness.changeTheme(1);
    await setImmediate();
    assert.deepEqual(writes, [
      "editor.fontSize", "editor.lineHeight", "editor.fontSize", "editor.lineHeight",
    ]);
    assert.deepEqual(settings, { "editor.fontSize": 12, "editor.lineHeight": 20 });
    assert.ok(harness.logs.includes("Applied LumoSync actions for theme kind: Light"));

    harness.changeTheme(1);
    await setImmediate();
    assert.equal(writes.length, 4, "successful batches must still skip redundant events");
  });

  test("reapplies a previously successful theme after another theme partially fails", async () => {
    const settings: Record<string, unknown> = {};
    const harness = createHarness(
      {
        Light: { "editor.fontSize": 12, "editor.lineHeight": 20 },
        Dark: { "editor.fontSize": 16, "editor.lineHeight": 24 },
      },
      async (setting, value) => {
        if (setting === "editor.lineHeight" && value === 24) {
          throw new Error("simulated write failure");
        }
        settings[setting] = value;
      }
    );

    harness.activate();
    await setImmediate();
    harness.changeTheme(2);
    await setImmediate();
    assert.deepEqual(settings, { "editor.fontSize": 16, "editor.lineHeight": 20 });

    harness.changeTheme(1);
    await setImmediate();
    assert.deepEqual(settings, { "editor.fontSize": 12, "editor.lineHeight": 20 });
  });

  test("treats absent and empty action groups as successful no-ops", async () => {
    const writes: string[] = [];
    const harness = createHarness({ Light: {} }, async (setting) => {
      writes.push(setting);
    });

    harness.activate();
    await setImmediate();
    const lightLogCount = harness.logs.length;
    harness.changeTheme(1);
    await setImmediate();
    assert.equal(harness.logs.length, lightLogCount);

    harness.changeTheme(2);
    await setImmediate();
    const darkLogCount = harness.logs.length;
    harness.changeTheme(2);
    await setImmediate();
    assert.equal(harness.logs.length, darkLogCount);
    assert.deepEqual(writes, []);
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
