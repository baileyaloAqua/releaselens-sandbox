# ReleaseLens CLI Usage Guide

> **Quick reference for the ReleaseLens Jira automation CLI tools**

---

## 📋 Overview

ReleaseLens provides 3 CLI tools for Jira automation:

1. **`create-change.js`** - Creates Jira Change issues
2. **`transition-change.js`** - Transitions Change issues between states
3. **`verify-approval.js`** - Verifies production approval

---

## 🚀 1. Create Jira Change Issue

### Command
```bash
node dist/jira/create-change.js --tag <GIT_TAG> [OPTIONS]
```

### Required Arguments
- `--tag` - Git tag (e.g., `admin-site-v1.5.0`)
  - Or set `GITHUB_REF_NAME` environment variable

### Optional Arguments
| Argument | Default | Description |
|----------|---------|-------------|
| `--manifest` | `.techops/deployment.yaml` | Path to deployment manifest |
| `--environment` | `staging` | Target environment (`staging` or `production`) |
| `--github-run-url` | Auto-constructed | GitHub Actions run URL |

### Required Environment Variables
```bash
JIRA_BASE_URL=https://aquanow.atlassian.net
JIRA_USER_EMAIL=bot@aquanow.com
JIRA_API_TOKEN=your-api-token
JIRA_CHANGE_PROJECT_KEY=CHGTEST
```

### Examples

#### Minimum (uses defaults)
```bash
node dist/jira/create-change.js --tag admin-site-v1.5.0
```

**What it does**:
- ✅ Reads `.techops/deployment.yaml`
- ✅ Creates Change issue for `staging` environment
- ✅ Uses git tag `admin-site-v1.5.0`

#### Full options
```bash
node dist/jira/create-change.js \
  --manifest .techops/deployment.yaml \
  --tag admin-site-v1.5.0 \
  --environment production
```

#### From GitHub Actions (auto-detects context)
```bash
# GitHub Actions automatically provides:
# - GITHUB_REF_NAME (tag)
# - GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID (for URL)

node dist/jira/create-change.js --environment staging
```

### Output
```
🚀 ReleaseLens - Creating Jira Change Issue
===========================================

Configuration:
  Manifest: .techops/deployment.yaml
  Git Tag: admin-site-v1.5.0
  Environment: staging

✓ Loaded Jira config (Project: CHGTEST)
✓ Parsed deployment manifest for admin-site v1.5.0
  Risk Level: high

📝 Creating Jira Change issue...

✅ Success! Created Jira Change: CHGTEST-42
   View at: https://aquanow.atlassian.net/browse/CHGTEST-42

✓ Exported outputs for GitHub Actions

CHANGE_KEY=CHGTEST-42
RISK_LEVEL=high
```

### GitHub Actions Outputs
If `GITHUB_OUTPUT` env var is set, exports:
- `change_key` - Jira issue key (e.g., `CHGTEST-42`)
- `risk_level` - Risk level (`low`, `medium`, `high`)
- `service` - Service name
- `version` - Version number

---

## 🔄 2. Transition Change Issue

### Command
```bash
node dist/jira/transition-change.js --change-key <KEY> --state "<STATE>"
```

### Required Arguments
- `--change-key` - Jira issue key (e.g., `CHGTEST-42`)
- `--state` - Target state (see valid states below)

### Valid States
```
Draft
In Staging
Awaiting TechOps Approval
Approved for Prod
Deploying to Prod
Completed
Rejected
```

### Required Environment Variables
Same as create-change (JIRA_BASE_URL, etc.)

### Examples

#### Mark deployment completed
```bash
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "Completed"
```

#### Approve for production (manual TechOps action)
```bash
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "Approved for Prod"
```

#### Reject deployment
```bash
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "Rejected"
```

#### Move to staging
```bash
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "In Staging"
```

### Output
```
🔄 ReleaseLens - Transitioning Jira Change Issue
================================================

Configuration:
  Change Key: CHGTEST-42
  Target State: Completed

✓ Loaded Jira config (Project: CHGTEST)
✓ Fetched current issue: CHGTEST-42
  Current Status: Approved for Prod

📝 Finding transition to "Completed"...
✓ Found transition ID: 31

🔄 Transitioning issue...

✅ Success! Transitioned CHGTEST-42 to "Completed"
```

---

## ✅ 3. Verify Production Approval

### Command
```bash
node dist/jira/verify-approval.js --change-key <KEY>
```

### Required Arguments
- `--change-key` - Jira issue key (e.g., `CHGTEST-42`)

### Required Environment Variables
Same as create-change (JIRA_BASE_URL, etc.)

### What It Does
1. Fetches the Change issue from Jira
2. Checks risk level
3. For **high risk** deployments:
   - ✅ Passes if status = "Approved for Prod"
   - ❌ Fails if any other status
4. Exit codes:
   - `0` = Approved (safe to deploy)
   - `1` = Not approved (block deployment)

### Examples

#### Verify before production deployment
```bash
node dist/jira/verify-approval.js --change-key CHGTEST-42

# Exit code 0 = approved, proceed
# Exit code 1 = not approved, stop
```

#### Use in shell script
```bash
#!/bin/bash

if node dist/jira/verify-approval.js --change-key CHGTEST-42; then
  echo "✅ Approved! Deploying to production..."
  kubectl apply -f prod/
else
  echo "❌ Not approved! Blocking deployment."
  exit 1
fi
```

#### Use in GitHub Actions
```yaml
- name: Verify TechOps Approval
  run: |
    node dist/jira/verify-approval.js --change-key ${{ steps.create.outputs.change_key }}
```

### Output (Success)
```
🔐 ReleaseLens - Verifying Production Approval
==============================================

Configuration:
  Change Key: CHGTEST-42

✓ Loaded Jira config (Project: CHGTEST)
✓ Fetched issue: CHGTEST-42
  Current Status: Approved for Prod
  Risk Level: high

✅ Production deployment approved!
```

### Output (Failure)
```
🔐 ReleaseLens - Verifying Production Approval
==============================================

Configuration:
  Change Key: CHGTEST-42

✓ Loaded Jira config (Project: CHGTEST)
✓ Fetched issue: CHGTEST-42
  Current Status: Awaiting TechOps Approval
  Risk Level: high

❌ Production deployment NOT approved
   Current status: Awaiting TechOps Approval
   Required status: Approved for Prod

Exit code: 1
```

---

## 🔧 Environment Variables

All three CLI tools require these environment variables:

```bash
# Jira Configuration
JIRA_BASE_URL=https://aquanow.atlassian.net
JIRA_USER_EMAIL=your-email@aquanow.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_CHANGE_PROJECT_KEY=CHGTEST

# Optional: For local testing
GITHUB_REF_NAME=admin-site-v1.5.0
GITHUB_SERVER_URL=https://github.com
GITHUB_REPOSITORY=your-org/your-repo
GITHUB_RUN_ID=123456789
```

### How to Set

#### Local Development (.env file)
```bash
# Copy template
cp .env.example .env

# Edit with your values
vim .env
```

#### GitHub Actions (Secrets)
```
Repository Settings → Secrets → Actions
Add: JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN, etc.
```

#### Shell Export
```bash
export JIRA_BASE_URL="https://aquanow.atlassian.net"
export JIRA_USER_EMAIL="bot@aquanow.com"
export JIRA_API_TOKEN="your-token"
export JIRA_CHANGE_PROJECT_KEY="CHGTEST"

node dist/jira/create-change.js --tag admin-site-v1.0.0
```

---

## 📊 Complete Workflow Example testing

### Staging Deployment
```bash
# 1. Build TypeScript
npm run build

# 2. Create Jira Change for staging
node dist/jira/create-change.js \
  --tag admin-site-v1.5.0 \
  --environment staging

# Output: CHGTEST-42

# 3. Deploy to staging
kubectl apply -f staging/

# 4. Mark as deployed
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "In Staging"
```

### Production Deployment (after TechOps approval)
```bash
# 1. Verify TechOps approved it
node dist/jira/verify-approval.js --change-key CHGTEST-42

# If approved (exit code 0), continue...

# 2. Deploy to production
kubectl apply -f production/

# 3. Mark as completed
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "Completed"
```

---

## 🐛 Troubleshooting

### Error: "Git tag is required"
```bash
# Solution: Provide --tag argument
node dist/jira/create-change.js --tag admin-site-v1.0.0
```

### Error: "JIRA_BASE_URL is required"
```bash
# Solution: Set environment variables
export JIRA_BASE_URL="https://your-domain.atlassian.net"
# ... or create .env file
```

### Error: "Manifest file not found"
```bash
# Solution: Verify path to deployment.yaml
node dist/jira/create-change.js \
  --tag admin-site-v1.0.0 \
  --manifest path/to/deployment.yaml
```

### Error: "Transition not found"
```bash
# Solution: Check valid states in Jira workflow
# Valid: "Completed", "Approved for Prod", "In Staging", etc.
# Invalid: "Complete" (missing 'd'), "approved" (wrong case)
```

### Error: "Authentication failed"
```bash
# Solution: Verify Jira credentials
# - Check JIRA_USER_EMAIL is correct
# - Generate new API token if needed
# - Verify JIRA_BASE_URL format: https://domain.atlassian.net
```

---

## Test Tips

### 1. Test Locally First
```bash
# Build
npm run build

# Test with dummy data
node dist/jira/create-change.js --tag test-v1.0.0

# Delete test ticket in Jira after verification
```

### 2. Capture Output in Scripts
```bash
#!/bin/bash

OUTPUT=$(node dist/jira/create-change.js --tag admin-site-v1.0.0)
CHANGE_KEY=$(echo "$OUTPUT" | grep "CHANGE_KEY=" | cut -d= -f2)

echo "Created: $CHANGE_KEY"
```

### 3. Use npm Scripts
Add to `package.json`:
```json
{
  "scripts": {
    "jira:create": "node dist/jira/create-change.js",
    "jira:transition": "node dist/jira/transition-change.js",
    "jira:verify": "node dist/jira/verify-approval.js"
  }
}
```

Then use:
```bash
npm run jira:create -- --tag admin-site-v1.0.0
npm run jira:verify -- --change-key CHGTEST-42
```

---

## 📚 Related Documentation

- **`docs/QUICK_REFERENCE.md`** - Quick reference guide
- **`docs/ARCHITECTURE.md`** - How automation works
- **`README.md`** - Project overview

---

**Last Updated**: 2026-01-29
