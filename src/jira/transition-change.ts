#!/usr/bin/env node
/**
 * ReleaseLens Jira Integration - CLI for transitioning Jira Change issues
 * 
 * Usage:
 *   node dist/jira/transition-change.js --change-key CHGTEST-123 --state "Completed"
 * 
 * Required:
 *   --change-key       Jira issue key (e.g., CHGTEST-123)
 *   --state            Target state (e.g., "Completed", "Approved for Prod", "Rejected")
 * 
 * Environment Variables:
 *   JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN, JIRA_CHANGE_PROJECT_KEY
 * 
 * Examples:
 *   # Mark deployment completed
 *   node dist/jira/transition-change.js --change-key CHGTEST-42 --state "Completed"
 * 
 *   # Approve for production
 *   node dist/jira/transition-change.js --change-key CHGTEST-42 --state "Approved for Prod"
 */

import { JiraClient } from './client';
import { loadJiraConfig } from './config';
import { JiraWorkflowState } from './types';

interface TransitionArgs {
  changeKey: string;
  targetState: JiraWorkflowState;
}

/**
 * Parse command line arguments
 */
function parseArgs(): TransitionArgs {
  const args = process.argv.slice(2);
  
  const changeKey = getArg(args, '--change-key') || process.env.CHANGE_KEY || '';
  const targetState = (getArg(args, '--state') || 'Completed') as JiraWorkflowState;

  if (!changeKey) {
    throw new Error('Change key is required. Use --change-key or set CHANGE_KEY environment variable.');
  }

  return { changeKey, targetState };
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
    console.log('🔄 ReleaseLens - Transitioning Jira Change Issue');
    console.log('===============================================\n');

    // Parse arguments
    const args = parseArgs();
    console.log('Configuration:');
    console.log(`  Change Key: ${args.changeKey}`);
    console.log(`  Target State: ${args.targetState}`);
    console.log();

    // Load Jira config
    const jiraConfig = loadJiraConfig();
    const client = new JiraClient(jiraConfig);

    // Get current issue state
    console.log('📋 Fetching current issue state...');
    const issue = await client.getIssue(args.changeKey);
    console.log(`  Current Status: ${issue.fields.status.name}`);

    // Transition to target state
    if (issue.fields.status.name === args.targetState) {
      console.log(`\n✓ Issue is already in state: ${args.targetState}`);
    } else {
      console.log(`\n🔄 Transitioning to: ${args.targetState}`);
      await client.transitionIssue(args.changeKey, args.targetState);
      console.log(`\n✅ Success! Transitioned ${args.changeKey} to ${args.targetState}`);
    }

  } catch (error) {
    console.error('\n❌ Error transitioning Jira Change issue:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as transitionChange };
