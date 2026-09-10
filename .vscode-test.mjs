import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "@vscode/test-cli";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(
  ["1.108.0", "stable"].map((version) => ({
    label: version,
    version,
    files: "out/test/**/*.test.js",
    mocha: { timeout: 60_000, failZero: true },
    env: { LUMOSYNC_INTEGRATION_TEST: "1" },
    launchArgs: [
      "--disable-extensions",
      "--disable-workspace-trust",
      "--skip-welcome",
      "--skip-release-notes",
      `--user-data-dir=${join(root, ".vscode-test", version, "user-data")}`,
      `--extensions-dir=${join(root, ".vscode-test", version, "extensions")}`,
    ],
  })),
);
