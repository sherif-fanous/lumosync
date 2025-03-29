# LumoSync

LumoSync automatically adjusts your VS Code settings based on the active theme kind (Light, Dark, HighContrast, or HighContrastLight). It detects theme changes and applies your predefined settings to maintain a cohesive visual experience.

## Why LumoSync?

VS Code has excellent support for automatically switching between light and dark themes based on your OS settings, but it doesn't provide a way to change other settings when your theme changes. For example:

- When your theme switches to a light theme, you might want a different icon theme to match
- You might prefer different font settings between light and dark modes for optimal readability
- Certain extensions or interface elements might look better with different configurations in different theme modes

LumoSync bridges this gap by detecting theme changes (whether manual or automatic via OS light/dark mode) and applying your pre-configured settings to ensure a completely cohesive experience.

## Features

- Automatically detects changes between Light, Dark, HighContrast, and HighContrastLight themes
- Allows you to define custom settings to apply for each theme kind
- Perfect for switching icon themes, font settings, or any other VS Code setting based on your current theme

## How It Works

LumoSync monitors your VS Code theme and detects when it changes between:

- Light themes
- Dark themes
- High Contrast themes
- High Contrast Light themes

When a change is detected, LumoSync applies the corresponding settings you've configured.

## Extension Settings

Configure LumoSync by adding a `lumosync.actions` section to your VS Code settings:

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

Each key in the configuration represents a theme kind, and each value is an object containing VS Code settings you want to apply when that theme kind is active.
