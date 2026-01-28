# ReleaseLens - Setup Checklist

> **⚠️ HIGH RISK POLICY ACTIVE**: All production deployments require TechOps approval. No auto-deploy to production.

## ✅ What's Been Created

### TypeScript Integration (src/jira/) - **AUTOMATION ENGINE**
> **Note**: This is the automation code that CI/CD uses to read deployment.yaml and update Jira automatically

- ✅ `types.ts` - Type definitions for Jira integration
- ✅ `config.ts` - Custom field mappings (IMPORTANT: Update with your field IDs)
- ✅ `client.ts` - Jira API client with full CRUD operations
- ✅ `manifest-parser.ts` - Reads and parses .techops/deployment.yaml
- ✅ `create-change.ts` - Creates Jira Changes from deployment.yaml (used by CI/CD)
- ✅ `transition-change.ts` - Updates Jira workflow states (used by CI/CD)
- ✅ `verify-approval.ts` - Verifies TechOps approval (used by CI/CD)
- ✅ `index.ts` - Main exports

**Flow**: GitHub Actions → Composite Action → Compiles TypeScript → Executes → Reads deployment.yaml → Updates Jira

### GitHub Actions
- ✅ `.github/actions/releaselens-change/action.yml` - Reusable composite action
- ✅ `.github/workflows/releaselens-v2.yml` - Staging deployment (no auto-prod)
- ✅ `.github/workflows/release-prod-v2.yml` - Manual production deployment (always required)

### Configuration Files
- ✅ `package.json` - Dependencies and scripts
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `.gitignore` - Ignore node_modules, dist, etc.
- ✅ `.env.example` - Environment variables template

### Documentation
- ✅ `README.md` - Project overview and quick start
- ✅ `POLICY_SUMMARY.md` - Quick policy reference
- ✅ `docs/HIGH_RISK_POLICY.md` - Complete high risk policy documentation
- ✅ `docs/RELEASELENS_SETUP.md` - Complete step-by-step setup guide
- ✅ `docs/QUICK_REFERENCE.md` - CLI commands and quick reference

---

## 🚀 Next Steps (Do These Now)

### 1. Install Dependencies

```bash
cd /Users/alwayne.bailey/Documents/releaselens-sandbox
npm install
```

This installs:
- `axios` - HTTP client for Jira API
- `js-yaml` - YAML parser
- `typescript` - TypeScript compiler
- Type definitions

### 2. Build TypeScript

```bash
npm run build
```

This compiles `src/jira/*.ts` → `dist/jira/*.js`

### 3. Complete Jira Setup

Follow the detailed guide in `docs/RELEASELENS_SETUP.md`:

#### A. Create Jira Project
- Project type: Business
- Name: ReleaseLens Change Management
- Key: CHGTEST

#### B. Create "Change" Issue Type
- Jira Settings → Issues → Issue Types
- Add "Change" issue type

#### C. Create Custom Fields

Create these 15 custom fields in Jira:

| # | Field Name                 | Type              |
|---|----------------------------|-------------------|
| 1 | Service                    | Text (single)     |
| 2 | Environment                | Select list       |
| 3 | Risk Level                 | Select list       |
| 4 | Blast Radius               | Text (multi-line) |
| 5 | Services Impacted          | Text (multi-line) |
| 6 | Data Migration             | Checkbox          |
| 7 | Backward Compatible        | Checkbox          |
| 8 | Rollback Method            | Text (single)     |
| 9 | Rollback Target Version    | Text (single)     |
| 10| Rollback Est. Time (min)   | Number            |
| 11| Rollback Data Restore Req. | Checkbox          |
| 12| Team                       | Text (single)     |
| 13| Slack Channel              | Text (single)     |
| 14| Git Tag                    | Text (single)     |
| 15| GitHub Run URL             | URL field         |

#### D. Get Custom Field IDs

After creating fields, get their IDs:

```bash
curl -X GET \
  -H "Content-Type: application/json" \
  -u "YOUR_EMAIL@example.com:YOUR_API_TOKEN" \
  "https://your-domain.atlassian.net/rest/api/3/field" | jq '.[] | select(.custom == true) | {name: .name, id: .id}'
```

#### E. Update Field IDs in Code

Edit `src/jira/config.ts` and replace with your actual field IDs:

```typescript
export const JIRA_CUSTOM_FIELDS = {
  SERVICE: 'customfield_XXXXX',  // ← Update these
  ENVIRONMENT: 'customfield_XXXXX',
  RISK_LEVEL: 'customfield_XXXXX',
  // ... etc
};
```

Then rebuild:
```bash
npm run build
```

#### F. Configure Screens
- Jira Settings → Issues → Screens
- Add all custom fields to Create, Edit, View screens

#### G. Create Workflow
- States: Draft → In Staging → Awaiting TechOps Approval → Approved for Prod → Completed
- Add "tech-ops" group and permission conditions

### 4. Configure GitHub Secrets

Go to: **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USER_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_CHANGE_PROJECT_KEY=CHGTEST
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 5. Test Locally (Optional but Recommended)

```bash
# Set environment variables
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_USER_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"
export JIRA_CHANGE_PROJECT_KEY="CHGTEST"

# Test creating a change
node dist/jira/create-change.js \
  --manifest .techops/deployment.yaml \
  --tag sandbox-service-v0.1.0 \
  --environment staging

# You should see:
# ✅ Success! Created Jira Change: CHGTEST-XX
```

### 6. Test End-to-End

#### Test 1: Staging Deployment

```bash
# 1. Ensure deployment.yaml has risk_level: "high"
# 2. Create and push tag
git add .
git commit -m "Setup ReleaseLens automation"
git tag sandbox-service-v0.1.0
git push origin main --tags

# 3. Watch GitHub Actions:
#    - Deploys to staging
#    - Creates Jira Change (e.g., CHGTEST-42)
#    - Status: "Awaiting TechOps Approval"
#    - Sends Slack notification
```

#### Test 2: Production Deployment (Manual - Always Required)

```bash
# 1. In Jira:
#    - Navigate to CHGTEST-42
#    - Review all fields
#    - Add approval comment
#    - Transition to "Approved for Prod"

# 2. In GitHub:
#    - Go to Actions → ReleaseLens v2 - Production Deploy
#    - Run workflow
#    - git_tag: sandbox-service-v0.1.0
#    - change_key: CHGTEST-42

# 3. Watch deployment:
#    - Verifies approval
#    - Deploys to production
#    - Updates Jira to "Completed"
#    - Sends Slack notification
```

---

## 📋 Key Files to Customize

### 1. `src/jira/config.ts`
**CRITICAL**: Update with your actual Jira custom field IDs after creating them in Jira.

### 2. `.techops/deployment.yaml`
Update before each deployment with:
- Service name
- Version
- Risk level
- Rollback plan
- Test results

### 3. `.github/workflows/releaselens-v2.yml`
Update tag pattern if needed:
```yaml
on:
  push:
    tags:
      - 'your-service-v*'  # ← Change this to match your tag format
```

> **Note**: This workflow deploys to staging only. Production deployment always requires manual workflow.

---

## 🎯 Quick Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Create Jira Change (CLI)
node dist/jira/create-change.js \
  --manifest .techops/deployment.yaml \
  --tag v1.0.0 \
  --environment staging

# Transition Jira Change
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "Completed"

# Verify approval
node dist/jira/verify-approval.js \
  --change-key CHGTEST-42

# Deploy (via git tag)
git tag sandbox-service-v1.0.0
git push origin --tags
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview, architecture, quick start |
| `docs/RELEASELENS_SETUP.md` | Complete step-by-step setup guide (Jira + GitHub) |
| `docs/QUICK_REFERENCE.md` | CLI commands, JQL queries, quick reference |
| `SETUP_CHECKLIST.md` | This file - setup checklist |

---

## 🔍 Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript built (`npm run build`)
- [ ] Jira project created
- [ ] "Change" issue type created
- [ ] 15 custom fields created in Jira
- [ ] Custom field IDs updated in `src/jira/config.ts`
- [ ] TypeScript rebuilt after field ID update
- [ ] Screens configured in Jira
- [ ] Workflow created and associated
- [ ] TechOps group created
- [ ] GitHub secrets configured
- [ ] Test staging deployment successful
- [ ] Test Jira Change issue created
- [ ] Test TechOps approval workflow in Jira
- [ ] Test manual production deployment
- [ ] Slack notifications working (if configured)
- [ ] Approval gate enforcement verified

---

## 🆘 Need Help?

### Documentation
- See `docs/RELEASELENS_SETUP.md` for detailed setup instructions
- See `docs/QUICK_REFERENCE.md` for command reference

### Common Issues
1. **"Failed to create Jira Change"** → Check custom field IDs in `src/jira/config.ts`
2. **"No transition available"** → Check Jira workflow has the target state
3. **Composite action not found** → Ensure `.github/actions/` is committed to git
4. **Module not found** → Run `npm install && npm run build`

### Debug Commands

```bash
# Check if TypeScript compiled
ls -la dist/jira/

# Test Jira API connection
curl -X GET \
  -u "email:token" \
  "https://domain.atlassian.net/rest/api/3/project/CHGTEST"

# View GitHub Actions logs
# GitHub → Actions → Select workflow run → View logs
```

---

## ✨ What You Get

✅ **Automatic Jira Change Creation** - No manual ticket creation  
✅ **Risk-Based Approvals** - Low auto-deploys, Med/High require approval  
✅ **Full Audit Trail** - All deployment metadata in structured fields  
✅ **State Transitions** - Jira status updates automatically  
✅ **Slack Notifications** - Real-time updates to your team  
✅ **Type-Safe API Client** - Better error handling and maintenance  
✅ **Reusable Composite Action** - Use in any workflow  
✅ **CLI Tools** - Test locally before running in CI/CD  

---

## 🎉 Ready to Deploy!

Once you've completed the checklist above, you're ready to start using ReleaseLens for automated change management!

**Happy Deploying! 🚀**

---

**Last Updated**: 2026-01-28
