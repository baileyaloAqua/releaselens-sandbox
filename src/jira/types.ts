/**
 * ReleaseLens Jira Integration - Type Definitions
 */

export interface JiraConfig {
  baseUrl: string;
  userEmail: string;
  apiToken: string;
  projectKey: string;
}

export interface DeploymentManifest {
  service: string;
  version: string;
  environment: string;
  summary: string;
  jira_ticket?: string;  // Supports single or comma-separated: "FO-1234" or "FO-1234, FO-5678"
  change_type: string;
  impact: {
    user_visible: boolean;
    blast_radius: string;
    services_impacted: string[];
    data_migration: boolean;
    backward_compatible: boolean;
    risk_level: 'low' | 'medium' | 'high';
  };
  tests: {
    unit: string;
    integration: string;
    load: string;
    test_report_url?: string;
  };
  rollback: {
    method: string;
    target_version: string;
    est_time_minutes: number;
    data_restore_required: boolean;
  };
  owner: {
    team: string;
    slack_channel: string;
  };
}

export interface JiraChangeRequest {
  summary: string;
  description: string;
  service: string;
  environment: string;
  riskLevel: 'low' | 'medium' | 'high';
  blastRadius: string;
  servicesImpacted: string;
  dataMigration: boolean;
  backwardCompatible: boolean;
  rollbackMethod: string;
  rollbackTargetVersion: string;
  rollbackEstTimeMinutes?: number;
  rollbackDataRestoreRequired?: boolean;
  team: string;
  slackChannel: string;
  gitTag: string;
  githubRunUrl: string;
  jiraDevTicket?: string;
  testsPassed?: {
    unit: string;
    integration: string;
    load: string;
    testReportUrl?: string;
  };
}

export interface JiraCustomFieldMapping {
  service: string;              // customfield_10001
  environment: string;           // customfield_10002
  riskLevel: string;             // customfield_10003
  blastRadius: string;           // customfield_10004
  servicesImpacted: string;      // customfield_10005
  dataMigration: string;         // customfield_10006
  backwardCompatible: string;    // customfield_10007
  rollbackMethod: string;        // customfield_10008
  rollbackTargetVersion: string; // customfield_10009
  rollbackEstTime?: string;      // customfield_10010
  rollbackDataRestore?: string;  // customfield_10011
  team: string;                  // customfield_10012
  slackChannel: string;          // customfield_10013
  gitTag: string;                // customfield_10014
  githubRunUrl: string;          // customfield_10015
}

export interface JiraIssueResponse {
  id: string;
  key: string;
  self: string;
}

export interface JiraIssueDetails {
  key: string;
  fields: {
    status: {
      name: string;
      id: string;
    };
    [key: string]: any;
  };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
    id: string;
  };
}

export interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

export type JiraWorkflowState = 
  | 'Draft'
  | 'In Staging'
  | 'Awaiting TechOps Approval'
  | 'Approved for Prod'
  | 'Deploying to Prod'
  | 'Completed'
  | 'Rejected';
