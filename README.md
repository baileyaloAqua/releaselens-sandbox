# ReleaseLens Sandbox

Automated Jira Change Management for deployment pipelines.

## Overview

ReleaseLens automates the entire change management workflow:

- 🎯 **Automatic Jira Change Creation** - Generated from deployment manifests
- 🔒 **TechOps Approval Required** - ALL production deployments require explicit approval
- 🔄 **State Transitions** - Jira status updates as deployments progress
- 📊 **Full Audit Trail** - All deployment metadata in structured Jira fields
- 📢 **Slack Notifications** - Real-time updates to your team

> **⚠️ High Risk Policy**: This implementation requires TechOps approval for ALL production deployments. There is no auto-deploy to production. See `docs/HIGH_RISK_POLICY.md` for details.

## How It Works

### Developer Workflow

```
1. Developer updates code + deployment.yaml
   ↓
2. Create PR, get reviewed, merge
   ↓
3. Create git tag, push to remote
   ↓
4. GitHub Actions automatically:
   - Reads deployment.yaml
   - Deploys to staging
   - Creates Jira Change
   - Updates dashboard
```

### Automation Details

**GitHub Actions reads `deployment.yaml` and updates Jira automatically:**

1. Tag push triggers workflow
2. Workflow compiles `src/jira/*.ts` → JavaScript
3. Executes `node dist/jira/create-change.js --manifest .techops/deployment.yaml`
4. TypeScript reads deployment.yaml from filesystem
5. Calls Jira REST API to create Change issue
6. Dashboard automatically updated

**No manual Jira tickets** - GitHub Actions handles everything!

See:
- `docs/DEVELOPER_WORKFLOW.md` - Complete developer guide
- `docs/ARCHITECTURE.md` - Technical architecture
- `docs/FLOW_DIAGRAM.md` - Visual flow diagram

## Quick Start

### For Developers: Standard Workflow

```bash
# 1. Update code AND deployment manifest
vim src/myfeature.js
vim .techops/deployment.yaml  
# Update: version, summary, jira_ticket (can be multiple), risk, rollback

# 2. Create PR, get reviewed, merge
git add .
git commit -m "Add feature + update deployment manifest"
git push origin feature/my-feature

# 3. After merge: Create git tag
git tag service-v1.0.0
git push origin service-v1.0.0

# 4. GitHub Actions automatically:
#    - Reads deployment.yaml ✓
#    - Deploys to staging ✓
#    - Creates Jira Change (links to all your dev tickets) ✓
#    - Updates dashboard ✓
```

See `docs/DEVELOPER_WORKFLOW.md` for complete guide.

### For Setup: Install & Configure

### 1. Install Dependencies

```bash
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Configure GitHub Secrets

In GitHub repository settings, add:

```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USER_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_CHANGE_PROJECT_KEY=CHGTEST
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 4. Deployment Manifest Template

Developers update `.techops/deployment.yaml` for each release:

```yaml
service: my-service
version: "1.0.0"
environment: staging
summary: "Deploy new feature"
jira_ticket: "FO-1234, FO-5678"  # Your dev ticket(s) - supports multiple
impact:
  risk_level: "high"  # ALL deployments are high risk
  blast_radius: "single service"
  services_impacted: ["my-service"]
  data_migration: false
  backward_compatible: true
tests:
  unit: passed
  integration: passed
  load: not_run
rollback:
  method: "rollback_to_version"
  target_version: "0.9.0"
  est_time_minutes: 5
  data_restore_required: false
owner:
  team: "platform-team"
  slack_channel: "#platform-alerts"
```

### 5. Deploy

```bash
# Tag and push to trigger deployment
git tag sandbox-service-v1.0.0
git push origin sandbox-service-v1.0.0
```

## Workflows

### Staging Deployment (Automated)

**Trigger**: Git tag push

**Flow**:
1. Deploy to staging
2. Create Jira Change (status: "Awaiting TechOps Approval")
3. Send Slack notification
4. ⏸️ **PAUSE** - Awaiting TechOps approval

### Production Deployment (Manual - Always Required)

**Trigger**: Manual workflow dispatch

**Flow**:
1. TechOps reviews Jira Change (e.g., `CHGTEST-42`)
2. TechOps approves in Jira (transition to "Approved for Prod")
3. Developer triggers manual prod workflow with `change_key`
4. Workflow verifies approval and deploys
5. Mark Jira as Completed

> **Note**: ALL production deployments require TechOps approval, regardless of risk level. No auto-deploy to production.

## Architecture

```
┌─────────────┐
│  Git Tag    │
└──────┬──────┘
       │
       v
┌──────────────────┐
│   Staging        │
│ + Create Jira    │
│ + Set Status:    │
│   "Awaiting      │
│    Approval"     │
└──────┬───────────┘
       │
       v
┌──────────────────┐
│ ⏸️  PAUSE        │
│ TechOps Review   │
│ & Approval       │
│ (REQUIRED)       │
└──────┬───────────┘
       │
       v
┌──────────────────┐
│ Manual Prod      │
│ Workflow         │
│ + Verify Approval│
│ + Deploy         │
│ + Mark Complete  │
└──────────────────┘
```

## Project Structure

```
releaselens-sandbox/
├── src/
│   ├── jira/                     # ⭐ AUTOMATION ENGINE (used by CI/CD)
│   │   ├── types.ts              # TypeScript type definitions
│   │   ├── config.ts             # Jira custom field mappings
│   │   ├── client.ts             # Jira API client (calls Jira REST API)
│   │   ├── manifest-parser.ts    # Reads & parses deployment.yaml
│   │   ├── create-change.ts      # Creates Jira Changes from deployment.yaml
│   │   ├── transition-change.ts  # Updates Jira workflow states
│   │   ├── verify-approval.ts    # Verifies TechOps approval
│   │   └── index.ts              # Main exports
│   └── app.js                    # Legacy app (not used)
├── .github/
│   ├── actions/
│   │   └── releaselens-change/   # Composite action (calls src/jira/)
│   │       └── action.yml        # Builds & executes TypeScript automation
│   └── workflows/
│       ├── releaselens-v2.yml         # Staging deployment (uses composite action)
│       ├── release-prod-v2.yml        # Production deployment (uses composite action)
│       ├── releaselens.yml            # [OLD] Original bash version
│       └── release-prod.yml           # [OLD] Original bash version
├── .techops/
│   └── deployment.yaml           # Deployment manifest
├── docs/
│   └── RELEASELENS_SETUP.md     # Complete setup guide
├── package.json
├── tsconfig.json
└── README.md
```

## CLI Usage

The Jira integration can be used directly from the command line:

### Create Jira Change

```bash
node dist/jira/create-change.js \
  --manifest .techops/deployment.yaml \
  --tag sandbox-service-v1.0.0 \
  --environment staging
```

**Output**:
```
✅ Success! Created Jira Change: CHGTEST-42
   View at: https://your-domain.atlassian.net/browse/CHGTEST-42

CHANGE_KEY=CHGTEST-42
RISK_LEVEL=low
```

### Transition Jira Change

```bash
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "Completed"
```

### Verify Production Approval

```bash
node dist/jira/verify-approval.js \
  --change-key CHGTEST-42
```

**Output**:
```
✅ Verification passed! Change can proceed to production.
```

## GitHub Action Usage

The composite action can be used in any workflow:

### Create Change

```yaml
- name: Create Jira Change
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
```

### Transition Change

```yaml
- name: Mark as Completed
  uses: ./.github/actions/releaselens-change
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
- name: Verify TechOps Approval
  uses: ./.github/actions/releaselens-change
  with:
    action: verify
    change-key: CHGTEST-42
    jira-base-url: ${{ secrets.JIRA_BASE_URL }}
    jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
    jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
```

## Configuration

### Update Custom Field IDs

After creating custom fields in Jira, update `src/jira/config.ts`:

```typescript
export const JIRA_CUSTOM_FIELDS = {
  SERVICE: 'customfield_10001',  // Update with your actual IDs
  ENVIRONMENT: 'customfield_10002',
  RISK_LEVEL: 'customfield_10003',
  // ... etc
};
```

Get field IDs using Jira API:

```bash
curl -X GET \
  -H "Content-Type: application/json" \
  -u "your-email@example.com:YOUR_API_TOKEN" \
  "https://your-domain.atlassian.net/rest/api/3/field"
```

## Risk Levels

> **⚠️ High Risk Policy Active**: ALL deployments require TechOps approval regardless of risk level.

| Risk  | Description                     | Auto-Deploy to Prod | TechOps Approval |
|-------|---------------------------------|---------------------|------------------|
| low   | Minor changes, no user impact   | ❌ No               | ✅ Yes (Required)|
| medium| Moderate impact, reversible     | ❌ No               | ✅ Yes (Required)|
| high  | Major changes, data migrations  | ❌ No               | ✅ Yes (Required)|

**Current Policy**: All production deployments require explicit TechOps approval. No exceptions.

## Documentation Guide

### 📖 For Developers

| Document | Purpose |
|----------|---------|
| **`QUICK_START_DEVELOPERS.md`** | 5-minute quick start guide |
| **`HOW_IT_WORKS.md`** | Simple explanation of the system |
| **`JIRA_TICKETS_QUICK_GUIDE.md`** | Dev vs Change tickets explained |
| **`docs/DEVELOPER_WORKFLOW.md`** | Complete developer workflow |
| **`docs/JIRA_TICKETS_EXPLAINED.md`** | Detailed Jira tickets guide |
| `.techops/deployment.yaml` | Manifest template to update |

**Key points**: 
- Dev tickets (FO-1234) already exist - keep using them
- You reference your dev ticket in `deployment.yaml`
- GitHub Actions creates Change tickets (CHGTEST-42) automatically
- Change tickets link to your dev tickets

### ⚙️ For DevOps/Setup

| Document | Purpose |
|----------|---------|
| **`SETUP_CHECKLIST.md`** | Step-by-step setup checklist |
| **`docs/RELEASELENS_SETUP.md`** | Complete Jira setup (7 phases) |
| **`docs/ARCHITECTURE.md`** | Technical architecture |
| **`docs/FLOW_DIAGRAM.md`** | Visual flow with execution logs |

### 🔒 For TechOps

| Document | Purpose |
|----------|---------|
| **`POLICY_SUMMARY.md`** | Quick policy reference |
| **`docs/HIGH_RISK_POLICY.md`** | Complete approval policy |
| **`docs/QUICK_REFERENCE.md`** | CLI commands and JQL queries |

### 📊 For Leadership

| Document | Purpose |
|----------|---------|
| **`docs/DELIVERY_SUMMARY.md`** | Project delivery summary |
| **`docs/CONFLUENCE_IMPLEMENTATION.md`** | Confluence-ready documentation |
| **`docs/IMPLEMENTATION_ALIGNMENT.md`** | Alignment with requirements |

## Scripts

```bash
# Build TypeScript
npm run build

# Create Jira Change (CLI)
npm run jira:create-change

# Run tests (not implemented yet)
npm test
```

## Dependencies

- **axios**: HTTP client for Jira REST API
- **js-yaml**: YAML parser for deployment manifests
- **typescript**: TypeScript compiler

## Migrating from v1 to v2

The v2 workflows (`releaselens-v2.yml`, `release-prod-v2.yml`) use the new TypeScript client and composite action instead of inline bash/curl:

**Benefits**:
- ✅ Type-safe API client
- ✅ Reusable composite action
- ✅ Better error handling
- ✅ Easier to test and maintain
- ✅ CLI available for local testing

**Migration**:
1. Build TypeScript: `npm run build`
2. Update custom field IDs in `src/jira/config.ts`
3. Switch to v2 workflows or update existing workflows to use the composite action

## Examples

### Example 1: Standard Deployment

```yaml
# .techops/deployment.yaml
service: api-gateway
version: "1.2.3"
summary: "Fix typo in error message"
impact:
  risk_level: "high"
  blast_radius: "single error message"
  services_impacted: ["api-gateway"]
  backward_compatible: true
```

**Result**: Deploys to staging, creates Jira Change, waits for TechOps approval before production.

### Example 2: High Impact Deployment

```yaml
# .techops/deployment.yaml
service: user-database
version: "2.0.0"
summary: "Database schema migration"
impact:
  risk_level: "high"
  blast_radius: "all users"
  data_migration: true
  services_impacted: ["user-database", "api-gateway", "frontend"]
  backward_compatible: false
rollback:
  method: "restore_from_backup"
  est_time_minutes: 30
  data_restore_required: true
```

**Result**: Deploys to staging, creates Jira Change, TechOps performs deep review before approving for production.

## Troubleshooting

### "Failed to create Jira Change issue"

- Check custom field IDs in `src/jira/config.ts`
- Verify Jira API credentials
- Ensure "Change" issue type exists in project

### "No transition available to state"

- Check Jira workflow has the target state
- Verify state name matches exactly (case-sensitive)

### Composite action not found

- Ensure `.github/actions/releaselens-change/` is committed to git
- Check `uses: ./.github/actions/releaselens-change` path is correct

See [docs/RELEASELENS_SETUP.md](docs/RELEASELENS_SETUP.md) for more troubleshooting.

## License

MIT

## Support

For issues or questions, see:
- [Complete Setup Guide](docs/RELEASELENS_SETUP.md)
- GitHub Actions logs for detailed error messages
- Jira API documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

---

**Happy Deploying! 🚀**
