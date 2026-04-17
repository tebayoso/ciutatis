import { afterEach, describe, expect, it, vi } from "vitest";
import { paperclipConfigSchema } from "@paperclipai/shared";
import * as configFileModule from "../config-file.js";
import { loadConfig } from "../config.js";

const ORIGINAL_PAPERCLIP_AUTH_PUBLIC_BASE_URL =
  process.env.PAPERCLIP_AUTH_PUBLIC_BASE_URL;
const ORIGINAL_BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
const ORIGINAL_BETTER_AUTH_BASE_URL = process.env.BETTER_AUTH_BASE_URL;
const ORIGINAL_PAPERCLIP_PUBLIC_URL = process.env.PAPERCLIP_PUBLIC_URL;
const ORIGINAL_PAPERCLIP_AUTH_BASE_URL_MODE =
  process.env.PAPERCLIP_AUTH_BASE_URL_MODE;

afterEach(() => {
  vi.restoreAllMocks();

  if (ORIGINAL_PAPERCLIP_AUTH_PUBLIC_BASE_URL === undefined) {
    delete process.env.PAPERCLIP_AUTH_PUBLIC_BASE_URL;
  } else {
    process.env.PAPERCLIP_AUTH_PUBLIC_BASE_URL =
      ORIGINAL_PAPERCLIP_AUTH_PUBLIC_BASE_URL;
  }

  if (ORIGINAL_BETTER_AUTH_URL === undefined) {
    delete process.env.BETTER_AUTH_URL;
  } else {
    process.env.BETTER_AUTH_URL = ORIGINAL_BETTER_AUTH_URL;
  }

  if (ORIGINAL_BETTER_AUTH_BASE_URL === undefined) {
    delete process.env.BETTER_AUTH_BASE_URL;
  } else {
    process.env.BETTER_AUTH_BASE_URL = ORIGINAL_BETTER_AUTH_BASE_URL;
  }

  if (ORIGINAL_PAPERCLIP_PUBLIC_URL === undefined) {
    delete process.env.PAPERCLIP_PUBLIC_URL;
  } else {
    process.env.PAPERCLIP_PUBLIC_URL = ORIGINAL_PAPERCLIP_PUBLIC_URL;
  }

  if (ORIGINAL_PAPERCLIP_AUTH_BASE_URL_MODE === undefined) {
    delete process.env.PAPERCLIP_AUTH_BASE_URL_MODE;
  } else {
    process.env.PAPERCLIP_AUTH_BASE_URL_MODE =
      ORIGINAL_PAPERCLIP_AUTH_BASE_URL_MODE;
  }
});

describe("loadConfig auth base URL resolution", () => {
  it("treats an env-provided auth base URL as explicit even when the file config is auto", () => {
    vi.spyOn(configFileModule, "readConfigFile").mockReturnValue(
      paperclipConfigSchema.parse({
        $meta: {
          version: 1,
          updatedAt: new Date().toISOString(),
          source: "doctor",
        },
        database: {
          mode: "embedded-postgres",
        },
        logging: {
          mode: "file",
        },
        server: {
          deploymentMode: "authenticated",
          exposure: "private",
        },
        auth: {
          baseUrlMode: "auto",
          disableSignUp: false,
        },
      }),
    );

    process.env.BETTER_AUTH_BASE_URL = "http://127.0.0.1:3100";

    const config = loadConfig();

    expect(config.authPublicBaseUrl).toBe("http://127.0.0.1:3100");
    expect(config.authBaseUrlMode).toBe("explicit");
  });

  it("still honors an explicitly overridden auth base URL mode from env", () => {
    vi.spyOn(configFileModule, "readConfigFile").mockReturnValue(
      paperclipConfigSchema.parse({
        $meta: {
          version: 1,
          updatedAt: new Date().toISOString(),
          source: "doctor",
        },
        database: {
          mode: "embedded-postgres",
        },
        logging: {
          mode: "file",
        },
        server: {
          deploymentMode: "authenticated",
          exposure: "private",
        },
        auth: {
          baseUrlMode: "explicit",
          publicBaseUrl: "https://file.example.com",
          disableSignUp: false,
        },
      }),
    );

    process.env.BETTER_AUTH_BASE_URL = "http://127.0.0.1:3100";
    process.env.PAPERCLIP_AUTH_BASE_URL_MODE = "auto";

    const config = loadConfig();

    expect(config.authPublicBaseUrl).toBe("http://127.0.0.1:3100");
    expect(config.authBaseUrlMode).toBe("auto");
  });
});
