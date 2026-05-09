// Stub file for upstream features not in Ciutatis
// Agent instructions service

import type { Db } from "@paperclipai/db";

export interface InstructionsBundleConfig {
  filePath?: string;
  content?: string;
}

export interface AgentInstructionsBundle {
  mode: string;
  rootPath: string;
  entryFile: string;
  adapterConfig: Record<string, unknown>;
  files: Array<{ path: string; content: string; size?: number }>;
}

export interface AgentInstructionsFile {
  path: string;
  content: string;
  size?: number;
}

export interface AgentInstructionsWriteResult {
  success: boolean;
  file: AgentInstructionsFile;
  adapterConfig: Record<string, unknown>;
}

export interface AgentInstructionsDeleteResult {
  success: boolean;
  file: { path: string };
  bundle: AgentInstructionsBundle;
}

export function agentInstructionsService(_db: Db) {
  return {
    async materializeManagedBundle(
      _agent: { id: string; companyId: string },
      _files: Record<string, string>,
      _options: { entryFile?: string; replaceExisting?: boolean; clearLegacyPromptTemplate?: boolean } = {},
    ): Promise<AgentInstructionsBundle> {
      return {
        mode: "managed",
        rootPath: ".paperclip/agents",
        entryFile: "AGENTS.md",
        adapterConfig: {},
        files: [],
      };
    },
    async getBundle(
      _agent: { id: string; companyId: string },
    ): Promise<AgentInstructionsBundle> {
      return {
        mode: "managed",
        rootPath: ".paperclip/agents",
        entryFile: "AGENTS.md",
        adapterConfig: {},
        files: [],
      };
    },
    async updateBundle(
      _agent: { id: string; companyId: string },
      _body: { mode?: string; rootPath?: string; entryFile?: string; files?: Array<{ path: string; content: string }>; clearLegacyPromptTemplate?: boolean },
    ): Promise<{ bundle: AgentInstructionsBundle; adapterConfig: Record<string, unknown> }> {
      const bundle: AgentInstructionsBundle = {
        mode: _body.mode ?? "managed",
        rootPath: _body.rootPath ?? ".paperclip/agents",
        entryFile: _body.entryFile ?? "AGENTS.md",
        adapterConfig: {},
        files: _body.files ?? [],
      };
      return { bundle, adapterConfig: {} };
    },
    async readFile(_agent: { id: string; companyId: string }, _relativePath: string): Promise<string> {
      return "";
    },
    async writeFile(
      _agent: { id: string; companyId: string },
      _path: string,
      _content: string,
      _opts?: { executeSandboxLifecycleHooks?: boolean; clearLegacyPromptTemplate?: boolean },
    ): Promise<AgentInstructionsWriteResult> {
      return {
        success: true,
        file: { path: _path, content: _content, size: _content.length },
        adapterConfig: {},
      };
    },
    async deleteFile(
      _agent: { id: string; companyId: string },
      _relativePath: string,
    ): Promise<AgentInstructionsDeleteResult> {
      return {
        success: true,
        file: { path: _relativePath },
        bundle: {
          mode: "managed",
          rootPath: ".paperclip/agents",
          entryFile: "AGENTS.md",
          adapterConfig: {},
          files: [],
        },
      };
    },
  };
}

export function syncInstructionsBundleConfigFromFilePath(
  _agent: { id: string; companyId: string },
  _adapterConfig: Record<string, unknown>,
): Record<string, unknown> {
  return _adapterConfig;
}
