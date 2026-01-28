#!/usr/bin/env node
/**
 * ReleaseLens Jira Integration - CLI for verifying production approval
 * 
 * Usage:
 *   node verify-approval.js --change-key CHGTEST-123
 */

import { JiraClient } from './client';
import { loadJiraConfig } from './config';
import { JIRA_CUSTOM_FIELDS } from './config';

interface VerifyArgs {
  changeKey: string;
  requiredRisk?: 'medium' | 'high';
}

/**
 * Parse command line arguments
 */
function parseArgs(): VerifyArgs {
  const args = process.argv.slice(2);
  
  const changeKey = getArg(args, '--change-key') || process.env.CHANGE_KEY || '';
  const requiredRisk = getArg(args, '--required-risk') as 'medium' | 'high' | undefined;

  if (!changeKey) {
    throw new Error('Change key is required. Use --change-key or set CHANGE_KEY environment variable.');
  }

  return { changeKey, requiredRisk };
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
    console.log('🔒 ReleaseLens - Verifying Production Approval');
    console.log('==============================================\n');

    // Parse arguments
    const args = parseArgs();
    console.log('Configuration:');
    console.log(`  Change Key: ${args.changeKey}`);
    if (args.requiredRisk) {
      console.log(`  Required Risk: ${args.requiredRisk}`);
    }
    console.log();

    // Load Jira config
    const jiraConfig = loadJiraConfig();
    const client = new JiraClient(jiraConfig);

    // Get issue details
    console.log('📋 Fetching change issue details...');
    const issue = await client.getIssue(args.changeKey);
    
    const currentStatus = issue.fields.status.name;
    const riskLevel = issue.fields[JIRA_CUSTOM_FIELDS.RISK_LEVEL];
    
    console.log(`  Current Status: ${currentStatus}`);
    console.log(`  Risk Level: ${riskLevel}`);

    // Verify approval
    console.log('\n🔍 Verifying approval status...');
    
    if (riskLevel === 'low') {
      console.log('  ✓ Low risk change - auto-approval allowed');
      console.log('\n✅ Verification passed! Change can proceed to production.');
    } else if (riskLevel === 'medium' || riskLevel === 'high') {
      if (currentStatus === 'Approved for Prod') {
        console.log(`  ✓ ${riskLevel} risk change is approved by TechOps`);
        console.log('\n✅ Verification passed! Change can proceed to production.');
      } else {
        console.error(`\n❌ Verification failed!`);
        console.error(`   ${riskLevel} risk changes require TechOps approval.`);
        console.error(`   Current status: ${currentStatus}`);
        console.error(`   Expected status: Approved for Prod`);
        process.exit(1);
      }
    } else {
      console.warn(`\n⚠️  Warning: Unknown risk level "${riskLevel}"`);
      console.warn('   Proceeding with caution...');
    }

    // Set output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const fs = require('fs');
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `risk_level=${riskLevel}\n` +
        `status=${currentStatus}\n` +
        `approved=${currentStatus === 'Approved for Prod' || riskLevel === 'low'}\n`
      );
    }

  } catch (error) {
    console.error('\n❌ Error verifying approval:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as verifyApproval };
