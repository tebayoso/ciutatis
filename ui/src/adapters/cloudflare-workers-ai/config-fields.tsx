import type { AdapterConfigFieldsProps } from "../types";
import { DraftInput, Field } from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function CloudflareWorkersAiConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  return (
    <div className="space-y-3">
      <Field
        label="Agent instructions file"
        hint="Optional absolute path to a markdown file (for example AGENTS.md) that is prepended to the Cloudflare Workers AI system prompt."
      >
        <div className="flex items-center gap-2">
          <DraftInput
            value={
              isCreate
                ? values!.instructionsFilePath ?? ""
                : eff(
                    "adapterConfig",
                    "instructionsFilePath",
                    String(config.instructionsFilePath ?? ""),
                  )
            }
            onCommit={(value) =>
              isCreate
                ? set!({ instructionsFilePath: value })
                : mark("adapterConfig", "instructionsFilePath", value || undefined)
            }
            immediate
            className={inputClass}
            placeholder="/absolute/path/to/AGENTS.md"
          />
          <ChoosePathButton />
        </div>
      </Field>
      <p className="text-[11px] text-muted-foreground">
        Credentials are read from server environment or Ciutatis config using{" "}
        <span className="font-mono">CLOUDFLARE_ACCOUNT_ID</span> and{" "}
        <span className="font-mono">CLOUDFLARE_API_TOKEN</span>.
      </p>
    </div>
  );
}
