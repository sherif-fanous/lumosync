import * as vscode from "vscode";

// Create an output channel for logging
const outputChannel = vscode.window.createOutputChannel("LumoSync");

// Store the last detected theme kind
let lastThemeKind: string | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
  // Listen for window state changes which can detect OS color scheme changes
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState(() => {
      handleThemeKindChange();
    })
  );

  // Initial check for the current theme
  handleThemeKindChange();
}

/**
 * Handles theme changes by detecting the current theme kind and applying appropriate settings
 */
async function handleThemeKindChange() {
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

    // Check if the theme kind has changed
    if (!themeKind || lastThemeKind === themeKind) {
      return; // Exit early if theme hasn't changed
    }

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

        return;
      }

      outputChannel.appendLine(
        `Applying LumoSync actions for ${themeKind} theme kind`
      );

      for (const [setting, value] of Object.entries(actions)) {
        try {
          await vscode.workspace
            .getConfiguration()
            .update(setting, value, vscode.ConfigurationTarget.Global);

          outputChannel.appendLine(
            `Updated setting "${setting}" to "${value}"`
          );
        } catch (err) {
          console.error(
            `Failed to update setting "${setting}" to "${value}": ${err}`
          );
          outputChannel.appendLine(
            `Failed to update setting "${setting}" to "${value}": ${err}`
          );
        }
      }

      outputChannel.appendLine(
        `Applied LumoSync actions for theme kind: ${themeKind}`
      );
    } else {
      outputChannel.appendLine(
        `No LumoSync actions found for theme kind: ${themeKind}`
      );
    }
  } catch (error) {
    console.error(`Error in handleThemeKindChange: ${error}`);
    outputChannel.appendLine(`Error in handleThemeKindChange: ${error}`);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
