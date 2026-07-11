import { definePlugin, runWorker, type PaperclipPlugin } from "@paperclipai/plugin-sdk";
import { CIUTATIS_DISABLED_UPSTREAM_FEATURES } from "./compat/index.js";

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("ciutatis fork-compat plugin ready", {
      disabledFeatureCount: CIUTATIS_DISABLED_UPSTREAM_FEATURES.length,
    });
  },

  async onHealth() {
    return {
      status: "ok",
      message: `Ciutatis fork-compat online (${CIUTATIS_DISABLED_UPSTREAM_FEATURES.length} deferred upstream features)`,
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
