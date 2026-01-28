# Quick Start: Add ReleaseLens to Your Repository

> **5-minute guide to add ReleaseLens to a new service repository**

---

## 🎯 Goal

Add ReleaseLens automation to your service repository so all deployments are tracked in the centralized Jira dashboard.

---

## ✅ Prerequisites

- [ ] Jira project CHGTEST already set up (ask DevOps team)
- [ ] GitHub Organization secrets configured (or you'll add per-repo)
- [ ] Access to your service repository

---

## 🚀 Steps

### 1. Copy ReleaseLens Files (2 min)

```bash
cd /path/to/your-service-repo

# Copy from the template/sandbox repo
TEMPLATE_REPO="/path/to/releaselens-sandbox"

# Create directories
mkdir -p .techops
mkdir -p src/jira
mkdir -p .github/workflows
mkdir -p .github/actions/releaselens-change

# Copy files
cp -r $TEMPLATE_REPO/src/jira/* src/jira/
cp -r $TEMPLATE_REPO/.github/actions/releaselens-change/* .github/actions/releaselens-change/
cp $TEMPLATE_REPO/.github/workflows/releaselens-v2.yml .github/workflows/
cp $TEMPLATE_REPO/.github/workflows/release-prod-v2.yml .github/workflows/
cp $TEMPLATE_REPO/tsconfig.json .
cp $TEMPLATE_REPO/.env.example .

# Merge package.json dependencies (or copy if you don't have one)
# Add these to your package.json:
# "axios": "^1.6.0"
# "js-yaml": "^4.1.0"
# "@types/js-yaml": "^4.0.5"
# "@types/node": "^20.0.0"
# "typescript": "^5.3.0"
```

### 2. Create deployment.yaml for Your Service (1 min)

```bash
vim .techops/deployment.yaml
```

```yaml
service: my-service-name  # ← CHANGE THIS
version: "1.0.0"
environment: staging
summary: "Initial ReleaseLens setup"
jira_ticket: "PROJ-123"  # ← Your dev ticket
change_type: "feature"

impact:
  user_visible: false
  blast_radius: "single service"
  services_impacted:
    - "my-service-name"  # ← CHANGE THIS
  data_migration: false
  backward_compatible: true
  risk_level: "high"

tests:
  unit: passed
  integration: passed
  load: not_run
  test_report_url: ""

rollback:
  method: "rollback_to_version"
  target_version: "0.9.9"
  est_time_minutes: 10
  data_restore_required: false

owner:
  team: "my-team"  # ← CHANGE THIS
  slack_channel: "#my-team-deploys"  # ← CHANGE THIS
```

### 3. Update Workflow Tag Pattern (30 sec)

```bash
vim .github/workflows/releaselens-v2.yml
```

Change line 5:

```yaml
on:
  push:
    tags:
      - 'my-service-name-v*'  # ← CHANGE THIS to match your service
```

Do the same in `release-prod-v2.yml`.

### 4. Add GitHub Secrets (1 min - skip if using org secrets)

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

```
JIRA_BASE_URL: https://your-domain.atlassian.net
JIRA_USER_EMAIL: bot@yourcompany.com
JIRA_API_TOKEN: your-token-here
JIRA_CHANGE_PROJECT_KEY: CHGTEST
SLACK_WEBHOOK_URL: https://hooks.slack.com/...
```

### 5. Install Dependencies & Test (30 sec)

```bash
npm install
npm run build  # Should compile successfully
```

### 6. Commit & Test! (1 min)

```bash
git add .
git commit -m "Add ReleaseLens automation"
git push origin main

# Create a test tag
git tag my-service-name-v1.0.0
git push origin my-service-name-v1.0.0
```

### 7. Verify (1 min)

1. **GitHub**: Check Actions tab - workflow should run
2. **Jira**: Search for new Change ticket (CHGTEST-XXX)
3. **Slack**: Check your channel for notification

---

## ✅ You're Done!

Your service now has automated change management:

- ✅ Every deployment creates a Jira Change ticket
- ✅ All metadata tracked automatically
- ✅ TechOps sees your changes in central dashboard
- ✅ Production deployments require approval

---

## 🎯 What to Change for Each Repo

| File | What to Change |
|------|----------------|
| `.techops/deployment.yaml` | `service`, `team`, `slack_channel` |
| `.github/workflows/releaselens-v2.yml` | Tag pattern (line 5) |
| `.github/workflows/release-prod-v2.yml` | Tag pattern (line 6) |

**Everything else stays the same!**

---

## 🏷️ Git Tag Pattern

**Format**: `{service-name}-v{version}`

```bash
# Examples:
admin-site-v1.5.0
payments-service-v2.3.1
api-gateway-v3.0.0
user-service-v1.2.5
```

---

## 📊 Result in Jira

All your deployments appear in the **CHGTEST** dashboard alongside other services:

```
CHGTEST Dashboard

┌──────────────┬──────────────────┬──────────┬────────────┐
│ Change Key   │ Service          │ Version  │ Status     │
├──────────────┼──────────────────┼──────────┼────────────┤
│ CHGTEST-45   │ admin-site       │ v1.5.0   │ Completed  │
│ CHGTEST-46   │ payments-service │ v2.3.1   │ Awaiting   │
│ CHGTEST-47   │ YOUR-SERVICE     │ v1.0.0   │ In Staging │← You!
│ CHGTEST-48   │ api-gateway      │ v3.0.0   │ Awaiting   │
└──────────────┴──────────────────┴──────────┴────────────┘
```

---

## 🆘 Troubleshooting

### Workflow doesn't trigger
- Check tag pattern matches workflow config
- Verify tag pushed: `git push origin --tags`

### Jira ticket not created
- Check GitHub Actions logs
- Verify Jira secrets are correct
- Check `npm run build` succeeds locally

### Build fails
- Run `npm install` first
- Check TypeScript compiles: `npm run build`
- Verify all files copied correctly

---

## 📚 Learn More

- **Complete Guide**: See `docs/MULTI_REPO_SETUP.md`
- **Developer Workflow**: See `QUICK_START_DEVELOPERS.md`
- **Architecture**: See `docs/ARCHITECTURE.md`

---

**Questions?** Ask the DevOps team or check existing repos for examples.

**Last Updated**: 2026-01-28
