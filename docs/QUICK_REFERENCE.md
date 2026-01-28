# ReleaseLens - Quick Reference

## CLI Commands

### Create Jira Change

```bash
node dist/jira/create-change.js \
  --manifest .techops/deployment.yaml \
  --tag sandbox-service-v1.0.0 \
  --environment staging
```

**Environment Variables Required**:
- `JIRA_BASE_URL`
- `JIRA_USER_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_CHANGE_PROJECT_KEY`

### Transition Jira Change

```bash
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "Completed"
```

**Available States**:
- `Draft`
- `In Staging`
- `Awaiting TechOps Approval`
- `Approved for Prod`
- `Deploying to Prod`
- `Completed`
- `Rejected`

### Verify Production Approval

```bash
node dist/jira/verify-approval.js \
  --change-key CHGTEST-42
```

Exit code:
- `0` = Approved or low risk
- `1` = Not approved or error

---

## GitHub Action Usage

### Create Change

```yaml
- uses: ./.github/actions/releaselens-change
  with:
    action: create
    manifest-path: .techops/deployment.yaml
    git-tag: v1.0.0
    environment: staging
    jira-base-url: ${{ secrets.JIRA_BASE_URL }}
    jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
    jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
    jira-project-key: ${{ secrets.JIRA_CHANGE_PROJECT_KEY }}
```

**Outputs**:
- `change-key`: Created Jira issue key
- `risk-level`: Risk level from manifest
- `service`: Service name
- `version`: Version number

### Transition Change

```yaml
- uses: ./.github/actions/releaselens-change
  with:
    action: transition
    change-key: CHGTEST-42
    target-state: Completed
    jira-base-url: ${{ secrets.JIRA_BASE_URL }}
    jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
    jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
```

### Verify Approval

```yaml
- uses: ./.github/actions/releaselens-change
  with:
    action: verify
    change-key: CHGTEST-42
    jira-base-url: ${{ secrets.JIRA_BASE_URL }}
    jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
    jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
```

**Outputs**:
- `risk-level`: Risk level
- `status`: Current Jira status
- `approved`: true/false

---

## Deployment Manifest Template

```yaml
service: my-service
version: "1.0.0"
environment: staging
summary: "Brief description of changes"
jira_ticket: "DEV-123"  # Optional
change_type: "feature"  # feature | bugfix | hotfix | config

impact:
  user_visible: true      # true | false
  blast_radius: "description of impact scope"
  services_impacted:
    - "service-1"
    - "service-2"
  data_migration: false   # true | false
  backward_compatible: true  # true | false
  risk_level: "low"       # low | medium | high

tests:
  unit: passed            # passed | failed | not_run
  integration: passed
  load: not_run
  test_report_url: "https://..."  # Optional

rollback:
  method: "rollback_to_version"  # or "restore_from_backup", "manual", etc.
  target_version: "0.9.0"
  est_time_minutes: 5
  data_restore_required: false

owner:
  team: "team-name"
  slack_channel: "#team-channel"
```

---

## Risk Level Guidelines

| Risk   | Criteria                                     | Auto-Deploy | Approval     |
|--------|----------------------------------------------|-------------|--------------|
| low    | • No user-visible changes<br>• Single service<br>• Easy rollback<br>• No data migration | ✅ Yes      | ❌ Not needed |
| medium | • Some user impact<br>• Multiple services<br>• Reversible changes<br>• No critical data | ❌ No       | ✅ TechOps    |
| high   | • Major user impact<br>• Data migration<br>• Irreversible changes<br>• Complex rollback | ❌ No       | ✅ TechOps    |

---

## Workflow Triggers

### Staging + Auto Prod (Low Risk)

**File**: `.github/workflows/releaselens-v2.yml`

**Trigger**:
```bash
git tag sandbox-service-v1.0.0
git push origin --tags
```

**Flow**:
1. Deploy to staging
2. Create Jira Change
3. If `risk_level: low` → Auto-deploy to prod
4. Mark Jira as Completed

### Manual Prod (Med/High Risk)

**File**: `.github/workflows/release-prod-v2.yml`

**Trigger**: Manual via GitHub UI

**Steps**:
1. Go to **Actions** → **ReleaseLens v2 - Prod Deploy**
2. Click **Run workflow**
3. Enter:
   - `git_tag`: Tag to deploy
   - `change_key`: Jira Change key from staging
4. Click **Run workflow**

**Flow**:
1. Verify Jira is "Approved for Prod"
2. Deploy to production
3. Mark Jira as Completed

---

## Jira Custom Fields

Update these in `src/jira/config.ts` after Jira setup:

```typescript
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
};
```

Get actual IDs:
```bash
curl -X GET \
  -H "Content-Type: application/json" \
  -u "email@example.com:API_TOKEN" \
  "https://your-domain.atlassian.net/rest/api/3/field" | jq '.[] | select(.name | contains("Service"))'
```

---

## GitHub Secrets Setup

Navigate to: **Repository Settings** → **Secrets and variables** → **Actions**

Required secrets:

| Secret Name                 | Example Value                           |
|-----------------------------|-----------------------------------------|
| `JIRA_BASE_URL`             | `https://your-domain.atlassian.net`     |
| `JIRA_USER_EMAIL`           | `techops@yourcompany.com`               |
| `JIRA_API_TOKEN`            | `ATATT3xFfG...`                         |
| `JIRA_CHANGE_PROJECT_KEY`   | `CHGTEST`                               |
| `SLACK_WEBHOOK_URL`         | `https://hooks.slack.com/services/...`  |

---

## Common JQL Queries

**All open changes**:
```
project = CHGTEST AND status != Completed AND status != Rejected
```

**Awaiting approval**:
```
project = CHGTEST AND status = "Awaiting TechOps Approval"
```

**High risk changes (last 7 days)**:
```
project = CHGTEST AND "Risk Level" = high AND created >= -7d
```

**Changes by service**:
```
project = CHGTEST AND Service ~ "my-service" ORDER BY created DESC
```

**Completed deployments today**:
```
project = CHGTEST AND status = Completed AND resolved >= startOfDay()
```

---

## Troubleshooting Quick Fixes

### Custom field ID mismatch

```bash
# Get all custom fields
curl -X GET \
  -u "email:token" \
  "https://domain.atlassian.net/rest/api/3/field" > fields.json

# Update src/jira/config.ts with actual IDs
# Rebuild
npm run build
```

### Transition not available

```bash
# Check available transitions for an issue
curl -X GET \
  -u "email:token" \
  "https://domain.atlassian.net/rest/api/3/issue/CHGTEST-42/transitions"
```

### Test CLI locally

```bash
# Source environment
export JIRA_BASE_URL="https://..."
export JIRA_USER_EMAIL="..."
export JIRA_API_TOKEN="..."
export JIRA_CHANGE_PROJECT_KEY="CHGTEST"

# Test create
node dist/jira/create-change.js \
  --manifest .techops/deployment.yaml \
  --tag test-v1.0.0 \
  --environment staging

# Test transition
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "In Staging"
```

---

## Build & Deploy Checklist

- [ ] Update `src/jira/config.ts` with actual custom field IDs
- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Commit built files or ensure CI builds them
- [ ] Set GitHub secrets
- [ ] Update `.techops/deployment.yaml`
- [ ] Create and push tag
- [ ] Monitor GitHub Actions
- [ ] Verify Jira Change created
- [ ] (If med/high risk) Approve in Jira
- [ ] (If med/high risk) Run manual prod workflow

---

## Links

- [Full Setup Guide](RELEASELENS_SETUP.md)
- [Jira REST API Docs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [YAML Spec](https://yaml.org/spec/1.2/spec.html)

---

**Last Updated**: 2026-01-28
