import pc from "picocolors";

const CIUTATIS_ART = [
  " ██████╗██╗██╗   ██╗████████╗ █████╗ ████████╗██╗███████╗",
  "██╔════╝██║██║   ██║╚══██╔══╝██╔══██╗╚══██╔══╝██║██╔════╝",
  "██║     ██║██║   ██║   ██║   ███████║   ██║   ██║███████╗",
  "██║     ██║██║   ██║   ██║   ██╔══██║   ██║   ██║╚════██║",
  "╚██████╗██║╚██████╔╝   ██║   ██║  ██║   ██║   ██║███████║",
  " ╚═════╝╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚═╝╚══════╝",
] as const;

const TAGLINE = "Civic Operations Platform — AI-powered governance";

export function printCiutatisCliBanner(): void {
  const lines = [
    "",
    ...CIUTATIS_ART.map((line) => pc.cyan(line)),
    pc.blue("  ───────────────────────────────────────────────────────"),
    pc.bold(pc.white(`  ${TAGLINE}`)),
    "",
  ];

  console.log(lines.join("\n"));
}
