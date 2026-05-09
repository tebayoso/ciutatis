#!/usr/bin/env node
/**
 * Ensure workspace package links are properly set up
 * This script verifies that workspace dependencies are linked correctly
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const rootDir = resolve(import.meta.dirname, '..');

function checkWorkspaceLinks() {
  // Check that pnpm workspace is properly configured
  const workspaceYamlPath = resolve(rootDir, 'pnpm-workspace.yaml');
  if (!existsSync(workspaceYamlPath)) {
    console.error('❌ pnpm-workspace.yaml not found');
    process.exit(1);
  }

  // Verify pnpm can list workspace packages
  try {
    const result = execSync('pnpm recursive list --depth=-1', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log('✅ Workspace packages properly linked');
    return true;
  } catch (error) {
    console.error('⚠️  Workspace link check failed, attempting to fix...');
    
    // Try to reinstall workspace dependencies
    try {
      execSync('pnpm install', {
        cwd: rootDir,
        stdio: 'inherit',
      });
      console.log('✅ Workspace dependencies reinstalled');
      return true;
    } catch (installError) {
      console.error('❌ Failed to setup workspace links');
      process.exit(1);
    }
  }
}

// Main execution
console.log('🔧 Ensuring workspace package links...');
checkWorkspaceLinks();
console.log('✅ Preflight checks complete');
