import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext-on-Cloudflare config. Caching/queue overrides can be added
// here later (R2 incremental cache, D1 tag cache, etc.) as the admin grows.
export default defineCloudflareConfig();
