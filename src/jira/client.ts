/**
 * ReleaseLens Jira Integration - API Client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  JiraConfig,
  JiraChangeRequest,
  JiraIssueResponse,
  JiraIssueDetails,
  JiraTransitionsResponse,
  JiraWorkflowState,
} from './types';
import { JIRA_CUSTOM_FIELDS } from './config';

export class JiraClient {
  private client: AxiosInstance;
  private projectKey: string;

  constructor(config: JiraConfig) {
    this.projectKey = config.projectKey;
    
    this.client = axios.create({
      baseURL: `${config.baseUrl}/rest/api/3`,
      auth: {
        username: config.userEmail,
        password: config.apiToken,
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Create a new Jira Change issue
   */
  async createChange(request: JiraChangeRequest): Promise<JiraIssueResponse> {
    try {
      const payload = {
        fields: {
          project: { key: this.projectKey },
          summary: request.summary,
          issuetype: { name: 'Change' },
          description: this.formatDescription(request),
          
          // Custom fields
          [JIRA_CUSTOM_FIELDS.SERVICE]: request.service,
          [JIRA_CUSTOM_FIELDS.ENVIRONMENT]: request.environment,
          [JIRA_CUSTOM_FIELDS.RISK_LEVEL]: request.riskLevel,
          [JIRA_CUSTOM_FIELDS.BLAST_RADIUS]: request.blastRadius,
          [JIRA_CUSTOM_FIELDS.SERVICES_IMPACTED]: request.servicesImpacted,
          [JIRA_CUSTOM_FIELDS.DATA_MIGRATION]: request.dataMigration,
          [JIRA_CUSTOM_FIELDS.BACKWARD_COMPATIBLE]: request.backwardCompatible,
          [JIRA_CUSTOM_FIELDS.ROLLBACK_METHOD]: request.rollbackMethod,
          [JIRA_CUSTOM_FIELDS.ROLLBACK_TARGET_VERSION]: request.rollbackTargetVersion,
          [JIRA_CUSTOM_FIELDS.TEAM]: request.team,
          [JIRA_CUSTOM_FIELDS.SLACK_CHANNEL]: request.slackChannel,
          [JIRA_CUSTOM_FIELDS.GIT_TAG]: request.gitTag,
          [JIRA_CUSTOM_FIELDS.GITHUB_RUN_URL]: request.githubRunUrl,
        },
      };

      const response = await this.client.post<JiraIssueResponse>('/issue', payload);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to create Jira Change issue');
      throw error;
    }
  }

  /**
   * Get issue details including current status
   */
  async getIssue(issueKey: string): Promise<JiraIssueDetails> {
    try {
      const response = await this.client.get<JiraIssueDetails>(
        `/issue/${issueKey}`,
        {
          params: {
            fields: `status,${Object.values(JIRA_CUSTOM_FIELDS).join(',')}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get issue ${issueKey}`);
      throw error;
    }
  }

  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueKey: string): Promise<JiraTransitionsResponse> {
    try {
      const response = await this.client.get<JiraTransitionsResponse>(
        `/issue/${issueKey}/transitions`
      );
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get transitions for ${issueKey}`);
      throw error;
    }
  }

  /**
   * Transition an issue to a new state
   */
  async transitionIssue(issueKey: string, targetState: JiraWorkflowState): Promise<void> {
    try {
      // Get available transitions
      const transitionsResponse = await this.getTransitions(issueKey);
      const transition = transitionsResponse.transitions.find(
        (t) => t.to.name === targetState
      );

      if (!transition) {
        throw new Error(
          `No transition available to state "${targetState}" for issue ${issueKey}. ` +
          `Available transitions: ${transitionsResponse.transitions.map((t) => t.to.name).join(', ')}`
        );
      }

      await this.client.post(`/issue/${issueKey}/transitions`, {
        transition: { id: transition.id },
      });
    } catch (error) {
      this.handleError(error, `Failed to transition ${issueKey} to ${targetState}`);
      throw error;
    }
  }

  /**
   * Format the description field with all deployment metadata
   */
  private formatDescription(request: JiraChangeRequest): string {
    let description = request.description;

    if (request.testsPassed) {
      description += `\n\nTests:\n`;
      description += `  Unit: ${request.testsPassed.unit}\n`;
      description += `  Integration: ${request.testsPassed.integration}\n`;
      description += `  Load: ${request.testsPassed.load}\n`;
      if (request.testsPassed.testReportUrl) {
        description += `  Test report: ${request.testsPassed.testReportUrl}\n`;
      }
    }

    if (request.jiraDevTicket) {
      description += `\n\nRelated dev ticket: ${request.jiraDevTicket}`;
    }

    return description;
  }

  /**
   * Handle API errors with detailed logging
   */
  private handleError(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error(`${context}:`, {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        message: axiosError.message,
      });
    } else {
      console.error(`${context}:`, error);
    }
  }
}
