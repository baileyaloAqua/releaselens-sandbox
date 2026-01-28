# ReleaseLens - Implementation Guide (Confluence Format)

> **Status**: ✅ Implemented  
> **Version**: 2.0  
> **Last Updated**: 2026-01-28  
> **Repository**: releaselens-sandbox

---

## 1. Summary

ReleaseLens is a standardized, end-to-end framework to track, review, and govern all deployment changes (application code, configuration, and infrastructure) across our services. It connects **GitHub** (PRs, tags, GitHub Actions), **Jira** (Change issues and dashboards), and **Slack** (automated deployment notifications) to provide a single, auditable view of what is being deployed, when, by whom, and with what risk.

### Core Components

- **GitHub**: PRs, tags, GitHub Actions
- **Jira**: Change issues, dashboard
- **Slack**: Deployment notifications

### Core Principles

1. **Machine-Readable Change Manifest**: Each deployable change has a `.techops/deployment.yaml` file in the repository
2. **Git Tag Releases**: Every release is marked by a Git tag (e.g., `service-v1.23.0`)
3. **Automated CD Pipeline**: GitHub Actions workflow triggered on tags that:
   - Deploys to staging automatically
   - Creates/updates a Jira "Change" issue
   - Sends Slack notifications
   - Pauses before production for TechOps approval (medium/high risk)
4. **Single Pane of Glass**: TechOps dashboard in Jira showing all upcoming, in-progress, and recent changes

---

## 2. Why We Need This

### 2.1 Current Problems

Our deployment process currently suffers from:

#### Fragmented Visibility
- Changes scattered across PRs, chat, ad-hoc release notes, and individual pipeline runs
- Hard to answer "What changed recently in service X?" or "What is going out today in production?"

#### Poor Traceability
- Not always obvious which Jira issues, PRs, and commits are in a specific production deployment
- Difficult to correlate incidents with recent changes

#### Inconsistent Communication
- No consistent place for TechOps/on-call to look before or during an incident

#### Rollback Uncertainty
- Rollback plans are often tribal knowledge
- Not clear which version to roll back to or how long it will take

### 2.2 What ReleaseLens Solves

ReleaseLens addresses these issues by:

- ✅ **Single Artifact**: Consistent `.techops/deployment.yaml` describing each deployable change
- ✅ **Version Tracking**: All deployments versioned by Git tags and traceable in Jira
- ✅ **Dashboard**: TechOps dashboard for upcoming and recent changes
- ✅ **Metadata**: Embedded deployment metadata (risk, impact, rollback plan)
- ✅ **Gating**: TechOps-controlled gate for production deployments
- ✅ **Verification**: TechOps can verify deployment and rollback plan before prod rollout

---

## 3. Architecture

### High-Level Flow

```
┌─────────────────────┐
│  Developer          │
│  - Updates code     │
│  - Updates manifest │
│  - Creates git tag  │
└──────────┬──────────┘
           │
           v
┌─────────────────────────────────────┐
│  GitHub Actions (Staging)           │
│  1. Deploy to staging               │
│  2. Parse .techops/deployment.yaml  │
│  3. Create Jira Change issue        │
│  4. Send Slack notification         │
└──────────┬──────────────────────────┘
           │
           v
    ┌──────┴───────┐
    │              │
    v              v
┌─────────┐   ┌────────────────────┐
│ Low     │   │ Medium/High Risk   │
│ Risk    │   │ Awaiting TechOps   │
│         │   │ Approval           │
└────┬────┘   └─────────┬──────────┘
     │                  │
     │                  v
     │        ┌──────────────────┐
     │        │ TechOps Reviews  │
     │        │ - Manifest       │
     │        │ - Test results   │
     │        │ - Rollback plan  │
     │        │ - Blast radius   │
     │        └─────────┬────────┘
     │                  │
     │                  v
     │        ┌──────────────────┐
     │        │ TechOps Approves │
     │        │ in Jira          │
     │        └─────────┬────────┘
     │                  │
     │                  v
     │        ┌──────────────────┐
     │        │ Developer Runs   │
     │        │ Manual Prod      │
     │        │ Workflow         │
     │        └─────────┬────────┘
     │                  │
     v                  v
┌──────────────────────────────────┐
│  GitHub Actions (Production)     │
│  1. Verify approval              │
│  2. Deploy to production         │
│  3. Update Jira to "Completed"   │
│  4. Send Slack notification      │
└──────────────────────────────────┘
```

---

## 4. Change Manifest (.techops/deployment.yaml)

### Complete Schema

```yaml
# Service Information
service: admin-site
version: "1.23.0"
environment: staging  # staging | production | dev | cert
summary: "Add asset export button with CSV download"
jira_ticket: "FO-1234"  # Optional: Link to dev ticket
change_type: "feature"  # feature | bugfix | hotfix | config

# Impact Assessment
impact:
  user_visible: true
  blast_radius: "Asset management system, affects ~500 users"
  services_impacted:
    - "assets-api"
    - "admin-site"
  data_migration: false
  backward_compatible: true
  risk_level: "medium"  # low | medium | high

# Testing Evidence
tests:
  unit: passed
  integration: passed
  load: not_run
  test_report_url: "https://github.com/org/repo/actions/runs/123456"

# Rollback Plan
rollback:
  method: "rollback_to_version"  # or "restore_from_backup", "manual"
  target_version: "1.22.3"
  est_time_minutes: 10
  data_restore_required: false

# Ownership
owner:
  team: "frontoffice"
  slack_channel: "#frontoffice"  # Optional
```

### Risk Level Guidelines

| Risk Level | Criteria | Auto-Deploy to Prod | TechOps Approval |
|------------|----------|---------------------|------------------|
| **low** | • No user-visible changes<br>• Single service<br>• Easy rollback<br>• No data migration | ✅ Yes | ❌ Not required |
| **medium** | • Some user impact<br>• Multiple services<br>• Reversible changes<br>• No critical data | ❌ No | ✅ Required |
| **high** | • Major user impact<br>• Data migration<br>• Irreversible changes<br>• Complex rollback | ❌ No | ✅ Required |

---

## 5. GitHub Actions Workflows

### 5.1 Unified Workflow: Staging + Auto Prod (Low Risk)

**File**: `.github/workflows/releaselens-v2.yml`

**Trigger**: Git tag push (e.g., `admin-site-v1.23.0`)

**Jobs**:

#### Job 1: deploy-staging
- Runs on all tag pushes
- Deploys to staging
- Parses deployment manifest
- Creates Jira Change issue
- Sends Slack notification
- Outputs: `change_key`, `risk_level`, `service`, `version`

#### Job 2: deploy-prod
- Only runs if `risk_level == 'low'`
- Verifies tag exists
- Deploys to production
- Transitions Jira Change to "Completed"
- Sends Slack notification

**Example**:

```yaml
name: ReleaseLens v2 - Staging + (Auto Prod for Low Risk)

on:
  push:
    tags:
      - 'admin-site-v*'

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    outputs:
      change_key: ${{ steps.create-change.outputs.change-key }}
      risk_level: ${{ steps.create-change.outputs.risk-level }}
      service: ${{ steps.create-change.outputs.service }}
      version: ${{ steps.create-change.outputs.version }}
      tag: ${{ github.ref_name }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to staging
        run: |
          # Your deployment logic here
          echo "Deploying to staging..."

      - name: Create Jira Change issue
        id: create-change
        uses: ./.github/actions/releaselens-change
        with:
          action: create
          manifest-path: .techops/deployment.yaml
          git-tag: ${{ github.ref_name }}
          environment: staging
          jira-base-url: ${{ secrets.JIRA_BASE_URL }}
          jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
          jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
          jira-project-key: ${{ secrets.JIRA_CHANGE_PROJECT_KEY }}

      - name: Slack notification
        run: |
          # Slack notification logic

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: needs.deploy-staging.outputs.risk_level == 'low'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to production
        run: |
          # Your deployment logic here
          echo "Deploying to production..."

      - name: Mark Jira Change as Completed
        uses: ./.github/actions/releaselens-change
        with:
          action: transition
          change-key: ${{ needs.deploy-staging.outputs.change_key }}
          target-state: Completed
          jira-base-url: ${{ secrets.JIRA_BASE_URL }}
          jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
          jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
```

### 5.2 Manual Production Workflow (Medium/High Risk)

**File**: `.github/workflows/release-prod-v2.yml`

**Trigger**: Manual `workflow_dispatch`

**Inputs**:
- `git_tag`: Tag to deploy (e.g., `admin-site-v1.23.0`)
- `change_key`: Jira Change key from staging deployment (e.g., `CHG-123`)

**Steps**:
1. Verify tag exists
2. **Verify TechOps approval** (Jira status must be "Approved for Prod")
3. Deploy to production
4. Transition Jira Change to "Completed"
5. Send Slack notification

**Example**:

```yaml
name: ReleaseLens v2 - Prod Deploy (Manual, Med/High)

on:
  workflow_dispatch:
    inputs:
      git_tag:
        description: 'Tag to deploy (e.g., admin-site-v1.23.0)'
        required: true
      change_key:
        description: 'Jira Change key (e.g., CHG-123)'
        required: true

jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Verify tag exists
        run: |
          git fetch --tags
          if ! git rev-parse "${{ github.event.inputs.git_tag }}" >/dev/null 2>&1; then
            echo "❌ Tag not found: ${{ github.event.inputs.git_tag }}"
            exit 1
          fi

      - name: Verify TechOps approval
        id: verify
        uses: ./.github/actions/releaselens-change
        with:
          action: verify
          change-key: ${{ github.event.inputs.change_key }}
          jira-base-url: ${{ secrets.JIRA_BASE_URL }}
          jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
          jira-api-token: ${{ secrets.JIRA_API_TOKEN }}

      - name: Deploy to production
        run: |
          # Your deployment logic here
          echo "Deploying ${{ github.event.inputs.git_tag }} to production..."

      - name: Mark as Completed
        uses: ./.github/actions/releaselens-change
        with:
          action: transition
          change-key: ${{ github.event.inputs.change_key }}
          target-state: Completed
          jira-base-url: ${{ secrets.JIRA_BASE_URL }}
          jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
          jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
```

---

## 6. Roles & Responsibilities

### 6.1 Developers

**Responsibilities**:

1. **Work from Jira issues** and ensure Jira keys are present in:
   - Branch names (e.g., `feature/FO-1234-add-export`)
   - PR titles (e.g., `[FO-1234] Add asset export button`)

2. **Maintain `.techops/deployment.yaml`**:
   - Update before each release
   - Ensure all required fields are accurate
   - Document rollback plan
   - Set appropriate risk level

3. **Ensure CI passes before merge**:
   - Fix test failures
   - Fix manifest validation errors

4. **Create Git tags** following naming convention:
   - Format: `{service}-v{version}`
   - Example: `admin-site-v1.23.0`

5. **For medium/high risk changes**:
   - After staging deployment, notify TechOps of Jira Change key
   - Wait for TechOps approval in Jira
   - Run manual production workflow with approved Change key

**Workflow**:
```
1. Create feature branch from Jira ticket
2. Develop & test
3. Update .techops/deployment.yaml
4. Create PR, get code review
5. Merge to main
6. Create git tag: {service}-v{version}
7. Push tag → triggers staging deployment
8. If low risk: done (auto-deploys to prod)
9. If med/high risk: wait for TechOps approval, then run manual prod workflow
```

### 6.2 TechOps

**Responsibilities**:

1. **Define and maintain ReleaseLens standards**:
   - Manifest schema
   - Tagging conventions
   - CD pipeline patterns
   - Jira workflow and dashboard

2. **Gatekeeper for production**:
   - Review all production changes (especially medium/high risk)
   - Review changes in "Awaiting TechOps Approval" status
   - Approve or reject based on:
     - Risk level and blast radius
     - Test results and coverage
     - Observability coverage (dashboards/alerts)
     - Clarity and feasibility of rollback plan
     - Change window compliance

3. **During approval review**:
   
   **Check Manifest**:
   - ✅ Clear `rollback.target_version`?
   - ✅ Reasonable `rollback.est_time_minutes`?
   - ✅ Accurate `impact.blast_radius`?
   - ✅ All impacted services listed?
   
   **Check CI/CD**:
   - ✅ Staging deployment successful?
   - ✅ Tests passed?
   - ✅ Test coverage adequate?
   
   **Check Observability**:
   - ✅ Dashboards exist for impacted services?
   - ✅ Alerts configured?
   - ✅ Monitoring ready?

4. **Use Jira dashboard to**:
   - Monitor all current and upcoming changes
   - Correlate incidents with recent changes
   - Track deployment success rates
   - Identify patterns in failures

5. **In incident response**:
   - Use Change issues + git tags to identify suspect deployments
   - Reference rollback plans from Change issues
   - Update Change issues with incident details

**Approval Decision Tree**:
```
Is risk_level = low?
  → Auto-approved (no action needed)

Is risk_level = medium or high?
  → Review required:
    
    ✅ All checks pass?
      → Transition to "Approved for Prod"
    
    ❌ Issues found?
      → Add comment in Jira
      → Transition to "Rejected"
      → Notify developer team
```

---

## 7. Jira Configuration

### 7.1 Custom Fields

| Field Name | Field Type | Options | Field ID (example) |
|------------|------------|---------|-------------------|
| Service | Text (single line) | - | customfield_10001 |
| Environment | Select list | staging, production, dev, cert | customfield_10002 |
| Risk Level | Select list | low, medium, high | customfield_10003 |
| Blast Radius | Text (multi-line) | - | customfield_10004 |
| Services Impacted | Text (multi-line) | - | customfield_10005 |
| Data Migration | Checkbox | yes, no | customfield_10006 |
| Backward Compatible | Checkbox | yes, no | customfield_10007 |
| Rollback Method | Text (single line) | - | customfield_10008 |
| Rollback Target Version | Text (single line) | - | customfield_10009 |
| Rollback Est. Time (min) | Number | - | customfield_10010 |
| Rollback Data Restore Req. | Checkbox | - | customfield_10011 |
| Team | Text (single line) | - | customfield_10012 |
| Slack Channel | Text (single line) | - | customfield_10013 |
| Git Tag | Text (single line) | - | customfield_10014 |
| GitHub Run URL | URL field | - | customfield_10015 |

### 7.2 Workflow States

```
Draft
  ↓
In Staging
  ↓
  ├─→ [Low Risk] Approved for Prod → Deploying to Prod → Completed
  │
  └─→ [Med/High Risk] Awaiting TechOps Approval
                          ↓
                  ┌───────┴────────┐
                  │                │
            Approved for Prod   Rejected
                  ↓
          Deploying to Prod
                  ↓
              Completed
```

### 7.3 Dashboard Widgets

**ReleaseLens - Change Overview** dashboard includes:

1. **Filter Results**: All open changes
   - JQL: `project = CHGTEST AND status != Completed AND status != Rejected`

2. **Pie Chart**: Changes by Status
   - Shows distribution across workflow states

3. **Pie Chart**: Changes by Risk Level
   - Breakdown: Low, Medium, High

4. **Filter Results**: Awaiting Approval
   - JQL: `project = CHGTEST AND status = "Awaiting TechOps Approval"`

5. **Activity Stream**: Recent Changes
   - Last 7 days of activity

6. **Filter Results**: Completed Deployments (Last 7 Days)
   - JQL: `project = CHGTEST AND status = Completed AND resolved >= -7d ORDER BY resolved DESC`

---

## 8. Benefits

### 8.1 For TechOps

✅ **Single Pane of Glass**
- One Jira dashboard instead of hunting through logs, PRs, and Slack
- Quick overview of all upcoming and in-progress changes

✅ **Faster Incident Triage**
- Quickly answer "What changed?" for any service in any environment
- Direct links to git tags, PRs, and GitHub Actions runs

✅ **More Reliable Rollbacks**
- Clear git tags and documented rollback plans for each deployment
- Estimated rollback time helps incident response planning

✅ **Consistent Change Records**
- All deployments create/update standardized Change issues
- Historical record for audits and retrospectives

✅ **Reduced Production Risk**
- High-impact changes receive explicit operational review before rollout
- Enforce monitoring/alerting readiness
- Verify rollback feasibility
- Manage scheduling within agreed change windows

### 8.2 For Developers

✅ **Clear Expectations**
- Simple, repeatable checklist: update `deployment.yaml`, link Jira, let CI/CD do the rest
- No ambiguity about what's required

✅ **Less Manual Status Updating**
- Jira Change issues and Slack messages automated from CI/CD
- More time for development

✅ **Better Context**
- Colleagues can easily see what's going out and why
- Reduces repeated questions ("Did X deploy yet?")

✅ **Faster Approvals**
- TechOps has all needed information upfront
- No back-and-forth requests for details

### 8.3 For the Organization

✅ **Improved Reliability and Auditability**
- Clear history of what was deployed, when, by whom, and why
- Compliance-ready change records

✅ **Better Coordination**
- Product, Support, and other stakeholders can see change schedules
- Proactive communication about user-visible changes

✅ **Foundation for Future Improvements**
- Easy to add policy on top of this data:
  - Risk-based approvals ✅ (already implemented)
  - Change windows
  - Automated rollbacks
  - Deployment frequency metrics
  - MTTR tracking

✅ **Reduced MTTR (Mean Time To Recovery)**
- Faster identification of problem deployments
- Clear rollback procedures
- Better incident documentation

---

## 9. Implementation Status

### ✅ Completed Components

| Component | Status | Location |
|-----------|--------|----------|
| TypeScript Jira Client | ✅ Complete | `src/jira/client.ts` |
| Manifest Parser | ✅ Complete | `src/jira/manifest-parser.ts` |
| CLI Tools (create/transition/verify) | ✅ Complete | `src/jira/*.ts` |
| Composite GitHub Action | ✅ Complete | `.github/actions/releaselens-change/` |
| Staging + Auto Prod Workflow | ✅ Complete | `.github/workflows/releaselens-v2.yml` |
| Manual Prod Workflow | ✅ Complete | `.github/workflows/release-prod-v2.yml` |
| Documentation | ✅ Complete | `README.md`, `docs/` |

### 📋 Pending Actions (Per Service)

- [ ] Complete Jira setup (project, custom fields, workflow)
- [ ] Update `src/jira/config.ts` with actual custom field IDs
- [ ] Configure GitHub secrets
- [ ] Test end-to-end with staging deployment
- [ ] Test medium/high risk approval workflow
- [ ] Create TechOps dashboard in Jira
- [ ] Train team on new process
- [ ] Update per-service workflows to use ReleaseLens patterns

---

## 10. Quick Start Guide

### For Developers

1. **Update deployment manifest** before each release:
   ```bash
   vi .techops/deployment.yaml
   # Update version, summary, risk_level, rollback plan
   ```

2. **Create and push git tag**:
   ```bash
   git tag admin-site-v1.23.0
   git push origin admin-site-v1.23.0
   ```

3. **Monitor GitHub Actions**:
   - Staging deployment runs automatically
   - Jira Change issue created automatically
   - Check Slack for notifications

4. **For low risk**: Done! (auto-deploys to prod)

5. **For medium/high risk**:
   - Note the Jira Change key (e.g., CHG-123)
   - Notify TechOps team
   - Wait for approval in Jira
   - Run manual prod workflow with Change key

### For TechOps

1. **Monitor Jira dashboard** for new changes

2. **Review changes in "Awaiting TechOps Approval"**:
   - Check manifest fields
   - Verify staging deployment success
   - Review test results
   - Verify observability coverage
   - Check rollback plan

3. **Approve or reject**:
   - Transition to "Approved for Prod" (approved)
   - Transition to "Rejected" with comment (rejected)

4. **After approval**, developer will trigger manual prod deployment

---

## 11. Troubleshooting

### "Failed to create Jira Change issue"

**Cause**: Custom field IDs mismatch

**Solution**:
1. Get actual field IDs from Jira API
2. Update `src/jira/config.ts`
3. Rebuild: `npm run build`

### "No transition available to state"

**Cause**: Workflow doesn't have the requested transition

**Solution**:
1. Check Jira workflow configuration
2. Ensure state names match exactly (case-sensitive)

### "Deployment approved but workflow fails"

**Cause**: Jira status not "Approved for Prod"

**Solution**:
1. Check current Jira status
2. Ensure TechOps transitioned issue correctly
3. Re-run workflow after fixing status

---

## 12. Links & Resources

- **Setup Guide**: `docs/RELEASELENS_SETUP.md`
- **Quick Reference**: `docs/QUICK_REFERENCE.md`
- **Setup Checklist**: `SETUP_CHECKLIST.md`
- **Repository**: releaselens-sandbox
- **Jira Project**: CHGTEST
- **Jira REST API**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

---

## 13. Support & Questions

For questions or issues:

1. Check documentation in `docs/` folder
2. Review GitHub Actions logs for detailed error messages
3. Contact TechOps team
4. Check Jira API response in workflow logs

---

**Status**: ✅ Implementation Complete  
**Next**: Per-service rollout and team training

