import * as vscode from "vscode";

let outputChannel: vscode.OutputChannel;

// Store the last detected theme kind
let lastThemeKind: string | undefined = undefined;
let lastAppliedThemeKind: string | undefined;

let themeUpdateQueue = Promise.resolve();

function requestThemeUpdate(force = false) {
  themeUpdateQueue = themeUpdateQueue.then(() => handleThemeKindChange(force));
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("LumoSync");

  // Register the channel for cleanup and serialize settings updates.
  context.subscriptions.push(
    outputChannel,
    vscode.window.onDidChangeActiveColorTheme(() => requestThemeUpdate()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("lumosync.actions")) {
        requestThemeUpdate(true);
      }
    })
  );

  requestThemeUpdate();
}

/**
 * Handles theme changes by detecting the current theme kind and applying appropriate settings
 */
async function handleThemeKindChange(force = false) {
  try {
    // Get the current theme kind (Light, Dark, HighContrast, HighContrastLight)
    const activeColorTheme = vscode.window.activeColorTheme;
    let themeKind: string | undefined = undefined;

    switch (activeColorTheme.kind) {
      case vscode.ColorThemeKind.Light:
        themeKind = "Light";
        break;
      case vscode.ColorThemeKind.Dark:
        themeKind = "Dark";
        break;
      case vscode.ColorThemeKind.HighContrast:
        themeKind = "HighContrast";
        break;
      case vscode.ColorThemeKind.HighContrastLight:
        themeKind = "HighContrastLight";
        break;
    }

    // Action edits must reapply settings even when the theme kind is unchanged.
    if (!themeKind || (!force && lastAppliedThemeKind === themeKind)) {
      return;
    }

    // A new attempt may partially overwrite previously applied settings.
    lastAppliedThemeKind = undefined;

    if (!lastThemeKind) {
      outputChannel.appendLine(`Detected initial theme kind is ${themeKind}`);
    } else {
      outputChannel.appendLine(
        `Detected theme kind change from ${lastThemeKind} to ${themeKind}`
      );
    }

    // Update the last theme kind
    lastThemeKind = themeKind;

    const lumosyncActions = vscode.workspace
      .getConfiguration()
      .get<Record<string, any>>("lumosync.actions");

    if (lumosyncActions && lumosyncActions[themeKind]) {
      const actions = lumosyncActions[themeKind];

      if (Object.keys(actions).length === 0) {
        outputChannel.appendLine(
          `No actions configured for ${themeKind} theme kind`
        );

        lastAppliedThemeKind = themeKind;
        return;
      }

      outputChannel.appendLine(
        `Applying LumoSync actions for ${themeKind} theme kind`
      );

      let failedCount = 0;
      for (const [setting, value] of Object.entries(actions)) {
        try {
          await vscode.workspace
            .getConfiguration()
            .update(setting, value, vscode.ConfigurationTarget.Global);

          outputChannel.appendLine(
            `Updated setting "${setting}" to "${value}"`
          );
        } catch (err) {
          failedCount++;
          console.error(
            `Failed to update setting "${setting}" to "${value}": ${err}`
          );
          outputChannel.appendLine(
            `Failed to update setting "${setting}" to "${value}": ${err}`
          );
        }
      }

      if (failedCount === 0) {
        lastAppliedThemeKind = themeKind;
        outputChannel.appendLine(
          `Applied LumoSync actions for theme kind: ${themeKind}`
        );
      } else {
        outputChannel.appendLine(
          `LumoSync actions incomplete for ${themeKind}: ${failedCount} setting(s) failed`
        );
      }
    } else {
      outputChannel.appendLine(
        `No LumoSync actions found for theme kind: ${themeKind}`
      );
      lastAppliedThemeKind = themeKind;
    }
  } catch (error) {
    console.error(`Error in handleThemeKindChange: ${error}`);
    outputChannel.appendLine(`Error in handleThemeKindChange: ${error}`);
  }
}
