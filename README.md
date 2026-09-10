# LumoSync

LumoSync applies your configured VS Code settings when the active theme kind changes. It supports Light, Dark, HighContrast, and HighContrastLight.

You can choose a different icon theme for light and dark modes, adjust fonts for readability, or change other extension and editor settings to suit each theme kind.

## How it works

VS Code can switch themes when the OS appearance changes. LumoSync follows the active VS Code theme, so it responds to manual theme changes and to OS appearance changes when VS Code follows the OS.

LumoSync applies the settings for the current theme kind when it starts. It also reapplies them when you edit `lumosync.actions`.

## Configuration

Add `lumosync.actions` to your User Settings. Workspace-defined actions are not supported. If you have actions in Workspace Settings, move them to User Settings.

Actions permanently update user settings and can affect other projects. Disabling LumoSync does not restore previous values.

Example User Settings configuration:

```json
"lumosync.actions": {
  "Light": {
    "workbench.iconTheme": "catppuccin-latte",
  },
  "Dark": {
    "workbench.iconTheme": "catppuccin-macchiato",
  },
  "HighContrast": {
    // settings for high contrast mode
  },
  "HighContrastLight": {
    // settings for high contrast light mode
  }
}
```

Each theme kind contains the setting names and values to apply when it is active.
