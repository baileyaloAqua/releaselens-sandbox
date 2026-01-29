# ReleaseLens - Complete Setup Guide

Complete guide for implementing automated Jira Change Management in your deployment pipelines.

## Table of Contents

1. [Overview](#overview)
2. [Jira Setup](#jira-setup)
3. [GitHub Configuration](#github-configuration)
4. [Deployment Manifest](#deployment-manifest)
5. [Workflow Integration](#workflow-integration)
6. [Usage Examples](#usage-examples)
7. [Troubleshooting](#troubleshooting)

---

## Overview

ReleaseLens automates Jira Change Management by:

- **Creating Jira Change issues** automatically when deployments start
- **Risk-based approval gates** - Low risk auto-deploys, Medium/High require TechOps approval
- **Workflow state transitions** - Automatically updates Jira status as deployments progress
- **Full audit trail** - All deployment metadata captured in structured Jira fields

### Architecture

```
┌─────────────────┐
│  Git Tag Push   │
│  (release)      │
└────────┬────────┘
         │
         v
┌─────────────────────┐
│  Staging Deploy     │
│  ┌───────────────┐  │
│  │ Parse Manifest│  │
│  │ Create Jira   │  │
│  │ Deploy        │  │
│  └───────────────┘  │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    v         v
┌────────┐  ┌──────────────────┐
│Low Risk│  │Medium/High Risk  │
│Auto    │  │Await Approval    │
│Deploy  │  │(TechOps Gate)    │
└───┬────┘  └────────┬─────────┘
    │                │
    │         Manual workflow_dispatch
    │                │
    v                v
┌─────────────────────────┐
│  Production Deploy      │
│  ┌──────────────────┐   │
│  │ Verify Approval  │   │
│  │ Deploy           │   │
│  │ Mark Completed   │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

---

## Jira Setup

### Step 1: Create Jira Project

1. Navigate to **Jira Cloud** → **Projects** → **Create project**
2. Choose:
   - **Project type**: Business
   - **Template**: Kanban or Change Management
3. Configure:
   - **Name**: ReleaseLens Change Management
   - **Key**: `CHGTEST` (or your preferred key)
4. Click **Create**

### Step 2: Create "Change" Issue Type

1. Go to **Jira Settings** → **Issues** → **Issue Types**
2. Click **Add issue type**
   - **Name**: Change
   - **Type**: Standard
3. Associate with your project:
   - Navigate to **Issue Type Schemes**
   - Find scheme for `CHGTEST`
   - Add "Change" issue type
   - Remove unused issue types (optional)

### Step 3: Create Custom Fields

Navigate to **Jira Settings** → **Issues** → **Custom Fields** → **Create custom field**

Create the following fields:

| Field Name                 | Field Type          | Options/Details                          | Field ID (example) |
|----------------------------|---------------------|------------------------------------------|--------------------|
| Service                    | Text (single line)  |                                          | customfield_10001  |
| Environment                | Select list         | staging, production, dev, cert           | customfield_10002  |
| Risk Level                 | Select list         | low, medium, high                        | customfield_10003  |
| Blast Radius               | Text (multi-line)   |                                          | customfield_10004  |
| Services Impacted          | Text (multi-line)   |                                          | customfield_10005  |
| Data Migration             | Checkbox            | yes, no                                  | customfield_10006  |
| Backward Compatible        | Checkbox            | yes, no                                  | customfield_10007  |
| Rollback Method            | Text (single line)  |                                          | customfield_10008  |
| Rollback Target Version    | Text (single line)  |                                          | customfield_10009  |
| Rollback Est. Time (min)   | Number              |                                          | customfield_10010  |
| Rollback Data Restore Req. | Checkbox            |                                          | customfield_10011  |
| Team                       | Text (single line)  |                                          | customfield_10012  |
| Slack Channel              | Text (single line)  |                                          | customfield_10013  |
| Git Tag                    | Text (single line)  |                                          | customfield_10014  |
| GitHub Run URL             | URL field           |                                          | customfield_10015  |

**Important**: Note the actual custom field IDs assigned by Jira (e.g., `customfield_10001`). You'll need to update these in `src/jira/config.ts`.

### Step 4: Configure Screens

1. Go to **Jira Settings** → **Issues** → **Screens**
2. Find the screen scheme for `CHGTEST` "Change" issue type
3. Add all custom fields to:
   - **Create Screen**
   - **Edit Screen**
   - **View Screen**

### Step 5: Create Workflow

1. Navigate to **Jira Settings** → **Issues** → **Workflows**
2. Click **Create workflow**
   - **Name**: ReleaseLens Change Workflow

#### Workflow States

```
Draft
  ↓
In Staging
  ↓
  ├─→ [Low Risk] Approved for Prod
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

#### Transitions

Configure these transitions:

1. **Draft → In Staging** (when staging deployment starts)
2. **In Staging → Awaiting TechOps Approval** (for medium/high risk)
3. **In Staging → Approved for Prod** (for low risk auto-approval)
4. **Awaiting TechOps Approval → Approved for Prod** (TechOps manual action)
5. **Awaiting TechOps Approval → Rejected** (TechOps decline)
6. **Approved for Prod → Deploying to Prod** (optional)
7. **Deploying to Prod → Completed** (or direct: Approved for Prod → Completed)

3. **Publish** the workflow
4. **Associate** it with the `CHGTEST` project and "Change" issue type

### Step 6: TechOps Approval Gate

#### Create TechOps Group

1. Go to **Jira Settings** → **User Management** → **Groups**
2. Click **Create group**
   - **Name**: `tech-ops`
3. Add TechOps team members

#### Add Workflow Conditions

1. Edit the workflow transitions:
   - **Awaiting TechOps Approval → Approved for Prod**
   - **Awaiting TechOps Approval → Rejected**
2. Add **Condition**: "User is in group" = `tech-ops`

This ensures only TechOps members can approve/reject changes.

### Step 7: Update Custom Field IDs

After creating custom fields, update `src/jira/config.ts` with actual field IDs:

```typescript
export const JIRA_CUSTOM_FIELDS = {
  SERVICE: 'customfield_10001',  // Update with your actual IDs
  ENVIRONMENT: 'customfield_10002',
  RISK_LEVEL: 'customfield_10003',
  // ... etc
};
```

---

## GitHub Configuration

### Step 1: Generate Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Give it a name: "ReleaseLens GitHub Actions"
4. Copy the token (you won't see it again)

### Step 2: Configure GitHub Secrets

Navigate to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name                | Value                                      | Example                                |
|----------------------------|--------------------------------------------|----------------------------------------|
| `JIRA_BASE_URL`            | Your Jira instance URL                     | `https://your-domain.atlassian.net`    |
| `JIRA_USER_EMAIL`          | Your Jira user email                       | `techops@yourcompany.com`              |
| `JIRA_API_TOKEN`           | API token from Step 1                      | `ATATT3xFfG...`                        |
| `JIRA_CHANGE_PROJECT_KEY`  | Jira project key                           | `CHGTEST`                              |
| `SLACK_WEBHOOK_URL`        | Slack webhook for notifications (optional) | `https://hooks.slack.com/services/...` |

### Step 3: Install Dependencies

In your repository root:

```bash
npm install
```

This installs:
- `axios` - HTTP client for Jira API
- `js-yaml` - YAML parser for deployment manifests
- `typescript` - TypeScript compiler
- Type definitions

### Step 4: Build TypeScript

```bash
npm run build
```

This compiles TypeScript sources in `src/jira/` to JavaScript in `dist/jira/`.

---

## Deployment Manifest

### Structure

Create `.techops/deployment.yaml` in your repository:

```yaml
service: my-service
version: "1.0.0"
environment: staging
summary: "Add user authentication feature"
jira_ticket: "DEV-123"  # Optional: link to dev ticket
change_type: "feature"

impact:
  user_visible: true
  blast_radius: "user authentication system"
  services_impacted:
    - "api-gateway"
    - "auth-service"
    - "user-database"
  data_migration: false
  backward_compatible: true
  risk_level: "medium"  # low | medium | high

tests:
  unit: passed
  integration: passed
  load: passed
  test_report_url: "https://jenkins.example.com/job/my-service/123/testReport"

rollback:
  method: "rollback_to_version"
  target_version: "0.9.5"
  est_time_minutes: 10
  data_restore_required: false

owner:
  team: "platform-team"
  slack_channel: "#platform-alerts"
```

### Risk Level Guidelines

| Risk Level | Description                            | Approval Required | Auto-Deploy to Prod |
|------------|----------------------------------------|-------------------|---------------------|
| **low**    | Minor changes, no user impact          | ❌ No             | ✅ Yes              |
| **medium** | Moderate impact, reversible            | ✅ TechOps        | ❌ No               |
| **high**   | Major changes, data migrations, irreversible | ✅ TechOps  | ❌ No               |

---

## Workflow Integration

### Workflow 1: Staging + Auto Prod (Low Risk)

**File**: `.github/workflows/releaselens-v2.yml`

**Trigger**: Git tag push (e.g., `sandbox-service-v1.0.0`)

**Steps**:
1. Deploy to staging
2. Create Jira Change issue
3. If low risk → Auto-deploy to production
4. Transition Jira to "Completed"

**Usage**:

```bash
# Create a release tag
git tag sandbox-service-v1.0.0
git push origin sandbox-service-v1.0.0
```

### Workflow 2: Manual Prod Deploy (Medium/High Risk)

**File**: `.github/workflows/release-prod-v2.yml`

**Trigger**: Manual `workflow_dispatch`

**Inputs**:
- `git_tag`: Tag to deploy
- `change_key`: Jira Change issue key (from staging workflow)

**Steps**:
1. Verify Jira Change is "Approved for Prod"
2. Deploy to production
3. Transition Jira to "Completed"

**Usage**:

1. After staging deployment, TechOps reviews the Jira Change (e.g., `CHGTEST-42`)
2. TechOps transitions issue to "Approved for Prod" in Jira
3. Developer runs manual workflow:
   - Go to **Actions** → **ReleaseLens v2 - Prod Deploy**
   - Click **Run workflow**
   - Enter `git_tag`: `sandbox-service-v1.0.0`
   - Enter `change_key`: `CHGTEST-42`

---

## Usage Examples

### Example 1: Low Risk Deployment (Full Auto)

```bash
# 1. Update deployment manifest
cat > .techops/deployment.yaml <<EOF
service: my-api
version: "1.2.3"
environment: staging
summary: "Fix typo in error message"
impact:
  risk_level: "low"
  blast_radius: "single error message"
  services_impacted: ["my-api"]
  data_migration: false
  backward_compatible: true
tests:
  unit: passed
  integration: passed
  load: not_run
rollback:
  method: "rollback_to_version"
  target_version: "1.2.2"
  est_time_minutes: 5
  data_restore_required: false
owner:
  team: "backend-team"
  slack_channel: "#backend-alerts"
EOF

# 2. Commit and tag
git add .techops/deployment.yaml
git commit -m "Prepare v1.2.3 release"
git tag sandbox-service-v1.2.3
git push origin main --tags

# 3. Watch automation:
#    - Deploys to staging
#    - Creates Jira Change (e.g., CHGTEST-50)
#    - Auto-deploys to production (low risk)
#    - Marks Jira as Completed
```

### Example 2: High Risk Deployment (Manual Gate)

```bash
# 1. Update deployment manifest
cat > .techops/deployment.yaml <<EOF
service: my-database
version: "2.0.0"
environment: staging
summary: "Database schema migration - add user preferences table"
impact:
  risk_level: "high"
  blast_radius: "all users"
  services_impacted: ["my-database", "my-api", "my-frontend"]
  data_migration: true
  backward_compatible: false
tests:
  unit: passed
  integration: passed
  load: passed
  test_report_url: "https://jenkins.example.com/job/my-db/456/testReport"
rollback:
  method: "restore_from_backup"
  target_version: "1.9.5"
  est_time_minutes: 30
  data_restore_required: true
owner:
  team: "database-team"
  slack_channel: "#database-ops"
EOF

# 2. Commit and tag
git add .techops/deployment.yaml
git commit -m "Prepare v2.0.0 release - schema migration"
git tag sandbox-service-v2.0.0
git push origin main --tags

# 3. Watch staging deployment:
#    - Deploys to staging
#    - Creates Jira Change (e.g., CHGTEST-51)
#    - Stops (high risk, requires approval)

# 4. TechOps reviews in Jira:
#    - Navigate to CHGTEST-51
#    - Review all fields: risk, rollback plan, blast radius
#    - Test in staging
#    - Transition to "Approved for Prod"

# 5. Developer runs manual prod workflow:
#    - GitHub → Actions → ReleaseLens v2 - Prod Deploy
#    - Run workflow
#    - git_tag: sandbox-service-v2.0.0
#    - change_key: CHGTEST-51

# 6. Workflow verifies approval and deploys
```

---

## CLI Usage (Advanced)

You can also use the Jira integration CLI directly:

### Create Change Issue

```bash
npm run build

node dist/jira/create-change.js \
  --manifest .techops/deployment.yaml \
  --tag sandbox-service-v1.0.0 \
  --environment staging
```

### Transition Change

```bash
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "Completed"
```

### Verify Approval

```bash
node dist/jira/verify-approval.js \
  --change-key CHGTEST-42
```

---

## Troubleshooting

### Issue: "Failed to create Jira Change issue"

**Cause**: Custom field IDs mismatch or missing fields

**Solution**:
1. Get actual custom field IDs:
   ```bash
   curl -X GET \
     -H "Content-Type: application/json" \
     -u "your-email@example.com:YOUR_API_TOKEN" \
     "https://your-domain.atlassian.net/rest/api/3/field"
   ```
2. Update `src/jira/config.ts` with actual IDs
3. Rebuild: `npm run build`

### Issue: "No transition available to state"

**Cause**: Workflow doesn't have the requested transition

**Solution**:
1. Check available transitions in Jira workflow
2. Ensure state names match exactly (case-sensitive)
3. Verify workflow is associated with "Change" issue type

### Issue: "User is not in group tech-ops"

**Cause**: User trying to approve doesn't have permission

**Solution**:
1. Add user to `tech-ops` group in Jira
2. Or remove the condition from workflow transition (not recommended)

### Issue: Composite action not found

**Cause**: GitHub can't find `.github/actions/releaselens-change`

**Solution**:
1. Ensure action path exists in repository
2. Check `uses: ./.github/actions/releaselens-change` path is correct
3. Commit the action directory to git

### Issue: "Module not found" during workflow

**Cause**: Dependencies not installed or built

**Solution**:
Add build step in composite action (already included):
```yaml
- name: Install dependencies
  run: npm install --production
  
- name: Build TypeScript
  run: npm run build
```

---

## Dashboard Setup (Optional)

### Create Jira Dashboard

1. Go to **Dashboards** → **Create dashboard**
2. **Name**: ReleaseLens - Change Overview
3. Add gadgets:
   - **Filter Results**: All changes
   - **Pie Chart**: Changes by Status
   - **Pie Chart**: Changes by Risk Level
   - **Filter Results**: Changes Awaiting Approval (filter: status = "Awaiting TechOps Approval")
   - **Activity Stream**: Recent Changes

### Example JQL Queries

**All open changes**:
```
project = CHGTEST AND status != Completed AND status != Rejected
```

**Changes awaiting approval**:
```
project = CHGTEST AND status = "Awaiting TechOps Approval"
```

**High risk changes in last 7 days**:
```
project = CHGTEST AND "Risk Level" = high AND created >= -7d
```

**Changes by service**:
```
project = CHGTEST AND Service ~ "my-service" ORDER BY created DESC
```

---

## Best Practices

1. **Always update deployment manifest** before creating release tags
2. **Use semantic versioning** for tags (e.g., `service-v1.2.3`)
3. **Review Jira Change issues** in staging before approving for prod
4. **Test rollback procedures** in staging
5. **Keep manifest accurate** - it's your audit trail
6. **Monitor Slack notifications** for deployment status
7. **Document incidents** in Jira Change issues (use comments)

---

## Next Steps

- [ ] Complete Jira setup (Steps 1-7)
- [ ] Configure GitHub secrets
- [ ] Test low-risk deployment end-to-end
- [ ] Test medium/high-risk approval workflow
- [ ] Create Jira dashboard
- [ ] Train team on new process
- [ ] Document runbooks for rollback procedures

---

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review GitHub Actions logs
- Check Jira API response in workflow logs
- Verify custom field IDs in `src/jira/config.ts`

---

**Version**: 0.1  
**Last Updated**: 2026-01-29
