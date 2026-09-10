import * as assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";

import * as vscode from "vscode";

async function waitFor(description: string, predicate: () => boolean) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await setTimeout(50);
  }

  const configuration = vscode.workspace.getConfiguration();
  const details = JSON.stringify({
    configuredTheme: configuration.get<unknown>("workbench.colorTheme"),
    activeThemeKind: vscode.ColorThemeKind[vscode.window.activeColorTheme.kind],
    autoDetectColorScheme: configuration.get<unknown>(
      "window.autoDetectColorScheme",
    ),
    autoDetectHighContrast: configuration.get<unknown>(
      "window.autoDetectHighContrast",
    ),
    defaultThemesAvailable:
      vscode.extensions.getExtension("vscode.theme-defaults") !== undefined,
  });

  assert.fail(`Timed out waiting for ${description}. Theme state: ${details}`);
}

suite("VS Code integration", () => {
  test("activates and applies settings after theme and action changes", async () => {
    // Refuse settings writes outside the isolated test configurations.
    assert.equal(process.env.LUMOSYNC_INTEGRATION_TEST, "1");

    const configuration = vscode.workspace.getConfiguration();
    const originalSettings = [
      "workbench.colorTheme",
      "window.autoDetectColorScheme",
      "window.autoDetectHighContrast",
      "editor.fontSize",
      "lumosync.actions",
    ].map((name) => ({
      name,
      value: configuration.inspect<unknown>(name)?.globalValue,
    }));
    const target = vscode.ConfigurationTarget.Global;

    try {
      await configuration.update("window.autoDetectColorScheme", false, target);
      await configuration.update(
        "window.autoDetectHighContrast",
        false,
        target,
      );

      await configuration.update(
        "workbench.colorTheme",
        "Visual Studio Light",
        target,
      );

      await waitFor(
        "a Light theme",
        () =>
          vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light,
      );

      const extension = vscode.extensions.getExtension<unknown>(
        "sherif-fanous.lumosync",
      );

      assert.ok(extension, "LumoSync must be installed in the test host");
      await extension.activate();
      assert.equal(extension.isActive, true);

      const actions = {
        Light: { "editor.fontSize": 15 },
        Dark: { "editor.fontSize": 19 },
      };

      await configuration.update("lumosync.actions", actions, target);
      await waitFor(
        "Light settings",
        () =>
          vscode.workspace.getConfiguration("editor").get("fontSize") === 15,
      );

      await configuration.update(
        "workbench.colorTheme",
        "Visual Studio Dark",
        target,
      );

      await waitFor(
        "Dark settings",
        () =>
          vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark &&
          vscode.workspace.getConfiguration("editor").get("fontSize") === 19,
      );

      actions.Dark["editor.fontSize"] = 21;
      await configuration.update("lumosync.actions", actions, target);
      await waitFor(
        "edited Dark settings",
        () =>
          vscode.workspace.getConfiguration("editor").get("fontSize") === 21,
      );
    } finally {
      // Disable actions while restoring the isolated profile's settings.
      await configuration.update("lumosync.actions", {}, target);

      for (const { name, value } of originalSettings) {
        await configuration.update(name, value, target);
      }
    }
  });
});
