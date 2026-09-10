/**
 * Applies user settings for the active theme kind and reapplies them when actions change.
 */
import * as vscode from "vscode";

let outputChannel: vscode.OutputChannel;

// Store the last detected theme kind
let lastThemeKind: string | undefined = undefined;
let lastAppliedThemeKind: string | undefined;

let themeUpdateQueue = Promise.resolve();

/**
 * Registers theme and action listeners and queues the initial settings update.
 */
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
    }),
  );

  requestThemeUpdate();
}

/**
 * Applies actions for the current theme kind unless already applied successfully.
 * Forced updates reapply actions even when the theme kind is unchanged.
 */
async function handleThemeKindChange(force = false) {
  try {
    const themeKind = {
      [vscode.ColorThemeKind.Light]: "Light",
      [vscode.ColorThemeKind.Dark]: "Dark",
      [vscode.ColorThemeKind.HighContrast]: "HighContrast",
      [vscode.ColorThemeKind.HighContrastLight]: "HighContrastLight",
    }[vscode.window.activeColorTheme.kind];

    // Action edits must reapply settings even when the theme kind is unchanged.
    if (!themeKind || (!force && lastAppliedThemeKind === themeKind)) {
      return;
    }

    // A new attempt may partially overwrite previously applied settings.
    lastAppliedThemeKind = undefined;

    if (!lastThemeKind) {
      outputChannel.appendLine(`Current theme kind: ${themeKind}`);
    } else if (lastThemeKind !== themeKind) {
      outputChannel.appendLine(
        `Theme kind changed from ${lastThemeKind} to ${themeKind}`,
      );
    } else {
      outputChannel.appendLine(`Reapplying settings for ${themeKind}`);
    }

    // Update the last theme kind
    lastThemeKind = themeKind;

    const lumosyncActions = vscode.workspace
      .getConfiguration()
      .get<unknown>("lumosync.actions");

    if (lumosyncActions !== undefined && !isRecord(lumosyncActions)) {
      outputChannel.appendLine(
        "lumosync.actions must be an object containing theme kinds and their settings.",
      );

      return;
    }

    const actions = lumosyncActions?.[themeKind];

    if (actions !== undefined && !isRecord(actions)) {
      outputChannel.appendLine(
        `lumosync.actions.${themeKind} must be an object containing setting names and values.`,
      );

      return;
    }

    if (actions !== undefined) {
      if (Object.keys(actions).length === 0) {
        outputChannel.appendLine(`No settings configured for ${themeKind}`);

        lastAppliedThemeKind = themeKind;

        return;
      }

      outputChannel.appendLine(`Applying settings for ${themeKind}`);

      let failedCount = 0;

      for (const [setting, value] of Object.entries(actions)) {
        try {
          await vscode.workspace
            .getConfiguration()
            .update(setting, value, vscode.ConfigurationTarget.Global);

          outputChannel.appendLine(`Updated setting "${setting}"`);
        } catch (err) {
          failedCount++;
          outputChannel.appendLine(
            `Could not update setting "${setting}": ${String(err)}`,
          );
        }
      }

      if (failedCount === 0) {
        lastAppliedThemeKind = themeKind;
        outputChannel.appendLine(`Applied settings for ${themeKind}`);
      } else {
        outputChannel.appendLine(
          `Could not apply all settings for ${themeKind}. Failed updates: ${failedCount}`,
        );
      }
    } else {
      outputChannel.appendLine(`No settings configured for ${themeKind}`);
      lastAppliedThemeKind = themeKind;
    }
  } catch (error) {
    outputChannel.appendLine(
      `Could not apply theme settings: ${String(error)}`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestThemeUpdate(force = false) {
  themeUpdateQueue = themeUpdateQueue.then(() => handleThemeKindChange(force));
}
