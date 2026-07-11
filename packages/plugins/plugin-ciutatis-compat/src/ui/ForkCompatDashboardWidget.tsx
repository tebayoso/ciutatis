import type { PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";
import {
  CIUTATIS_DISABLED_UPSTREAM_FEATURES,
  CIUTATIS_CIVIC_ALIASES,
  CIUTATIS_SDK_ALIASES,
} from "../compat/index.js";

export function ForkCompatDashboardWidget(_props: PluginWidgetProps) {
  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", lineHeight: 1.45 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Ciutatis ↔ Paperclip compatibility</h3>
      <p style={{ margin: "0 0 12px", color: "#555", fontSize: 13 }}>
        Custom fork fixes extracted here so plugin extensions can track upstream without reintroducing
        removed runtime surfaces.
      </p>
      <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Civic aliases</h4>
      <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13 }}>
        {CIUTATIS_CIVIC_ALIASES.map((row) => (
          <li key={row.upstream}>
            <code>{row.upstream}</code> → <code>{row.ciutatis}</code>
          </li>
        ))}
      </ul>
      <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>SDK aliases</h4>
      <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13 }}>
        {CIUTATIS_SDK_ALIASES.map((row) => (
          <li key={row.upstream}>
            <code>{row.upstream}</code> → <code>{row.ciutatis}</code>
          </li>
        ))}
      </ul>
      <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Deferred upstream features</h4>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        {CIUTATIS_DISABLED_UPSTREAM_FEATURES.map((feature) => (
          <li key={feature.id} style={{ marginBottom: 6 }}>
            <strong>{feature.title}</strong>
            <div style={{ color: "#555" }}>{feature.reason}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
