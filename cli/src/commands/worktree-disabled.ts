import type { Command } from "commander";

function unavailable() {
  throw new Error(
    "The legacy Paperclip worktree commands are not available in the Ciutatis V1 CLI. Use isolated data directories with --data-dir for local instance isolation.",
  );
}

export function registerWorktreeCommands(program: Command): void {
  const worktree = program.command("worktree").description("Legacy Paperclip worktree helpers");
  worktree.action(unavailable);

  for (const name of [
    "worktree:make",
    "worktree:list",
    "worktree:merge-history",
    "worktree:cleanup",
  ]) {
    program.command(name).description("Legacy Paperclip worktree helper").action(unavailable);
  }
}
