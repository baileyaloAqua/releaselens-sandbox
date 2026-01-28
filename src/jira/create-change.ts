#!/usr/bin/env node
/**
 * ReleaseLens Jira Integration - CLI for creating Jira Change issues
 * 
 * Usage:
 *   node create-change.js --manifest .techops/deployment.yaml --tag v1.0.0 --environment staging
 */

import { JiraClient } from './client';
import { loadJiraConfig } from './config';
import { parseManifest, manifestToChangeRequest } from './manifest-parser';

interface CreateChangeArgs {
  manifestPath: string;
  gitTag: string;
  environment: 'staging' | 'production';
  githubRunUrl?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CreateChangeArgs {
  const args = process.argv.slice(2);
  
  const manifestPath = getArg(args, '--manifest') || '.techops/deployment.yaml';
  const gitTag = getArg(args, '--tag') || process.env.GITHUB_REF_NAME || '';
  const environment = (getArg(args, '--environment') || 'staging') as 'staging' | 'production';
  
  // GitHub Actions context
  const githubRunUrl =
    getArg(args, '--github-run-url') ||
    (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined);

  if (!gitTag) {
    throw new Error('Git tag is required. Use --tag or set GITHUB_REF_NAME environment variable.');
  }

  return {
    manifestPath,
    gitTag,
    environment,
    githubRunUrl,
  };
}

/**
 * Get command line argument value
 */
function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 ReleaseLens - Creating Jira Change Issue');
    console.log('===========================================\n');

    // Parse arguments
    const args = parseArgs();
    console.log('Configuration:');
    console.log(`  Manifest: ${args.manifestPath}`);
    console.log(`  Git Tag: ${args.gitTag}`);
    console.log(`  Environment: ${args.environment}`);
    if (args.githubRunUrl) {
      console.log(`  GitHub Run: ${args.githubRunUrl}`);
    }
    console.log();

    // Load Jira config
    const jiraConfig = loadJiraConfig();
    console.log(`✓ Loaded Jira config (Project: ${jiraConfig.projectKey})`);

    // Parse deployment manifest
    const manifest = parseManifest(args.manifestPath);
    console.log(`✓ Parsed deployment manifest for ${manifest.service} v${manifest.version}`);
    console.log(`  Risk Level: ${manifest.impact.risk_level}`);

    // Convert to Jira change request
    const changeRequest = manifestToChangeRequest(
      manifest,
      args.gitTag,
      args.githubRunUrl || 'N/A',
      args.environment
    );

    // Create Jira client
    const client = new JiraClient(jiraConfig);

    // Create the change issue
    console.log('\n📝 Creating Jira Change issue...');
    const issue = await client.createChange(changeRequest);

    console.log(`\n✅ Success! Created Jira Change: ${issue.key}`);
    console.log(`   View at: ${jiraConfig.baseUrl}/browse/${issue.key}`);

    // Set output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const fs = require('fs');
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `change_key=${issue.key}\n` +
        `risk_level=${manifest.impact.risk_level}\n` +
        `service=${manifest.service}\n` +
        `version=${manifest.version}\n`
      );
      console.log('\n✓ Exported outputs for GitHub Actions');
    }

    // Also log to stdout for shell capture
    console.log(`\nCHANGE_KEY=${issue.key}`);
    console.log(`RISK_LEVEL=${manifest.impact.risk_level}`);

  } catch (error) {
    console.error('\n❌ Error creating Jira Change issue:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as createChange };
