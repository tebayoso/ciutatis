// Stub file for upstream features not in Ciutatis
// Default agent instructions service

export interface AgentInstructionsBundle {
  files: Array<{ path: string; content: string }>;
  entryFile: string;
}

export function getDefaultAgentInstructions(): string {
  return "";
}

export async function loadDefaultAgentInstructionsBundle(
  role: string,
): Promise<AgentInstructionsBundle> {
  // Ciutatis: no default bundles - agents bring their own instructions
  return { files: [], entryFile: "AGENTS.md" };
}

export function resolveDefaultAgentInstructionsBundleRole(agentRole: string): string {
  // Ciutatis: map agent role to bundle role (simplified)
  return agentRole;
}
