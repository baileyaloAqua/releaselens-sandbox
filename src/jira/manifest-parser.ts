/**
 * ReleaseLens Jira Integration - Deployment Manifest Parser
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { DeploymentManifest, JiraChangeRequest } from './types';

/**
 * Parse deployment manifest from YAML file
 */
export function parseManifest(manifestPath: string): DeploymentManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Deployment manifest not found: ${manifestPath}`);
  }

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = yaml.load(content) as DeploymentManifest;

  // Validate required fields
  validateManifest(manifest);

  return manifest;
}

/**
 * Validate deployment manifest structure
 */
function validateManifest(manifest: DeploymentManifest): void {
  const requiredFields = [
    'service',
    'version',
    'environment',
    'summary',
    'impact',
    'rollback',
    'owner',
  ];

  for (const field of requiredFields) {
    if (!(field in manifest)) {
      throw new Error(`Missing required field in deployment manifest: ${field}`);
    }
  }

  // Validate impact fields
  if (!manifest.impact.risk_level) {
    throw new Error('Missing required field: impact.risk_level');
  }

  const validRiskLevels = ['low', 'medium', 'high'];
  if (!validRiskLevels.includes(manifest.impact.risk_level)) {
    throw new Error(
      `Invalid risk_level: ${manifest.impact.risk_level}. Must be one of: ${validRiskLevels.join(', ')}`
    );
  }
}

/**
 * Convert deployment manifest to Jira change request
 */
export function manifestToChangeRequest(
  manifest: DeploymentManifest,
  gitTag: string,
  githubRunUrl: string,
  environment: 'staging' | 'production' = 'staging'
): JiraChangeRequest {
  const servicesImpacted = Array.isArray(manifest.impact.services_impacted)
    ? manifest.impact.services_impacted.join(', ')
    : String(manifest.impact.services_impacted);

  const summary = `[${manifest.service}] Deploy v${manifest.version} to ${environment}`;
  
  const description = buildDescription(manifest, gitTag, githubRunUrl, environment);

  return {
    summary,
    description,
    service: manifest.service,
    environment,
    riskLevel: manifest.impact.risk_level,
    blastRadius: manifest.impact.blast_radius,
    servicesImpacted,
    dataMigration: manifest.impact.data_migration,
    backwardCompatible: manifest.impact.backward_compatible,
    rollbackMethod: manifest.rollback.method,
    rollbackTargetVersion: manifest.rollback.target_version,
    rollbackEstTimeMinutes: manifest.rollback.est_time_minutes,
    rollbackDataRestoreRequired: manifest.rollback.data_restore_required,
    team: manifest.owner.team,
    slackChannel: manifest.owner.slack_channel,
    gitTag,
    githubRunUrl,
    jiraDevTicket: manifest.jira_ticket,
    testsPassed: manifest.tests
      ? {
          unit: manifest.tests.unit,
          integration: manifest.tests.integration,
          load: manifest.tests.load,
          testReportUrl: manifest.tests.test_report_url,
        }
      : undefined,
  };
}

/**
 * Build detailed description for Jira issue
 */
function buildDescription(
  manifest: DeploymentManifest,
  gitTag: string,
  githubRunUrl: string,
  environment: string
): string {
  return `
Deployment Summary: ${manifest.summary}

Service: ${manifest.service}
Environment: ${environment}
Version/Tag: ${gitTag}

Risk Assessment:
  Risk Level: ${manifest.impact.risk_level}
  Blast Radius: ${manifest.impact.blast_radius}
  Services Impacted: ${manifest.impact.services_impacted.join(', ')}
  Data Migration: ${manifest.impact.data_migration ? 'Yes' : 'No'}
  Backward Compatible: ${manifest.impact.backward_compatible ? 'Yes' : 'No'}
  User Visible: ${manifest.impact.user_visible ? 'Yes' : 'No'}

Tests:
  Unit: ${manifest.tests.unit}
  Integration: ${manifest.tests.integration}
  Load: ${manifest.tests.load}
  ${manifest.tests.test_report_url ? `Test Report: ${manifest.tests.test_report_url}` : ''}

Rollback Plan:
  Method: ${manifest.rollback.method}
  Target Version: ${manifest.rollback.target_version}
  Estimated Time: ${manifest.rollback.est_time_minutes} minutes
  Data Restore Required: ${manifest.rollback.data_restore_required ? 'Yes' : 'No'}

Owner:
  Team: ${manifest.owner.team}
  Slack Channel: ${manifest.owner.slack_channel}

GitHub:
  Workflow Run: ${githubRunUrl}
  ${formatDevTickets(manifest.jira_ticket)}
`.trim();
}

/**
 * Format dev ticket(s) for description
 */
function formatDevTickets(jiraTicket?: string): string {
  if (!jiraTicket) {
    return '';
  }
  
  // Handle multiple tickets (comma-separated)
  const tickets = jiraTicket.split(',').map(t => t.trim()).filter(t => t);
  
  if (tickets.length === 0) {
    return '';
  } else if (tickets.length === 1) {
    return `Related Dev Ticket: ${tickets[0]}`;
  } else {
    return `Related Dev Tickets:\n  ${tickets.map(t => `- ${t}`).join('\n  ')}`;
  }
}

