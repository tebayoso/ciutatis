import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "ciutatis.fork-compat";
const PLUGIN_VERSION = "0.1.0";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Ciutatis Fork Compatibility",
  description:
    "Documents and surfaces Ciutatis deviations from upstream Paperclip (disabled routines/telemetry, civic branding aliases) so plugin extensions stay merge-safe.",
  author: "Ciutatis",
  categories: ["ui", "automation"],
  capabilities: ["ui.dashboardWidget.register"],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: "ciutatis-fork-compat-widget",
        displayName: "Fork compatibility",
        exportName: "ForkCompatDashboardWidget",
      },
    ],
  },
};

export default manifest;
