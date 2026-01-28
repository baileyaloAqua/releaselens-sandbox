/**
 * ReleaseLens Jira Integration - Configuration
 */

import { JiraConfig } from './types';

/**
 * Custom field IDs mapping for Jira Change issues
 * Update these IDs based on your actual Jira instance configuration
 */
export const JIRA_CUSTOM_FIELDS = {
  SERVICE: 'customfield_10001',
  ENVIRONMENT: 'customfield_10002',
  RISK_LEVEL: 'customfield_10003',
  BLAST_RADIUS: 'customfield_10004',
  SERVICES_IMPACTED: 'customfield_10005',
  DATA_MIGRATION: 'customfield_10006',
  BACKWARD_COMPATIBLE: 'customfield_10007',
  ROLLBACK_METHOD: 'customfield_10008',
  ROLLBACK_TARGET_VERSION: 'customfield_10009',
  ROLLBACK_EST_TIME: 'customfield_10010',
  ROLLBACK_DATA_RESTORE: 'customfield_10011',
  TEAM: 'customfield_10012',
  SLACK_CHANNEL: 'customfield_10013',
  GIT_TAG: 'customfield_10014',
  GITHUB_RUN_URL: 'customfield_10015',
} as const;

/**
 * Load Jira configuration from environment variables
 */
export function loadJiraConfig(): JiraConfig {
  const baseUrl = process.env.JIRA_BASE_URL;
  const userEmail = process.env.JIRA_USER_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_CHANGE_PROJECT_KEY || 'CHGTEST';

  if (!baseUrl || !userEmail || !apiToken) {
    throw new Error(
      'Missing required Jira configuration. Ensure JIRA_BASE_URL, JIRA_USER_EMAIL, and JIRA_API_TOKEN are set.'
    );
  }

  return {
    baseUrl,
    userEmail,
    apiToken,
    projectKey,
  };
}
