# ReleaseLens: Multi-Repository Setup Guide

> **How to deploy ReleaseLens across multiple applications and repositories**

---

## 🎯 Overview

ReleaseLens is designed to work across **multiple repositories** with a **single Jira project** as the central tracking point.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Jira Project: CHGTEST                    │
│              (Single Pane of Glass for ALL apps)            │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ All changes tracked here
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ Repo 1  │          │ Repo 2  │          │ Repo 3  │
   │ admin   │          │ payments│          │  api    │
   │ -site   │          │ -service│          │-gateway │
   └─────────┘          └─────────┘          └─────────┘
```

**Key Concept**: Each repo has its own workflows, but ALL deployments create Change tickets in the SAME Jira project.

---

## 📋 What's Shared vs. Per-Repo

### ✅ Shared (One-Time Setup)

| Item | Location | Description |
|------|----------|-------------|
| **Jira Project** | Jira Cloud | Single project (e.g., CHGTEST) for ALL apps |
| **Jira Custom Fields** | Jira Settings | Field definitions apply to all Change tickets |
| **Jira Workflow** | Jira Settings | Same workflow for all Change tickets |
| **TechOps Group** | Jira Settings | Same approval team for all apps |
| **GitHub Secrets** | GitHub Org* | Can be org-level or per-repo |

*Optional: Use GitHub Organization secrets for shared credentials

### 🔄 Per-Repository

| Item | Location | Description |
|------|----------|-------------|
| **`src/jira/` code** | Each repo | Copy the TypeScript automation code |
| **`.github/workflows/`** | Each repo | Workflows customized per app |
| **`.github/actions/`** | Each repo | Composite action (or use shared action) |
| **`.techops/deployment.yaml`** | Each repo | Manifest specific to that service |
| **`package.json`** | Each repo | Dependencies for automation |
| **Git tags** | Each repo | Service-specific tag pattern |

---

## 🚀 Setup Strategy

### Option 1: Copy Files to Each Repo (Recommended)

**Pros**: 
- ✅ Each repo is self-contained
- ✅ Teams can customize independently
- ✅ No external dependencies

**Cons**:
- ⚠️ Updates require syncing across repos

### Option 2: Shared GitHub Action

**Pros**:
- ✅ Single source of truth
- ✅ Easy updates (one place)

**Cons**:
- ⚠️ Requires separate repo for shared action
- ⚠️ More complex setup

---

## 📝 Step-by-Step: Add ReleaseLens to New Repository

### Step 1: Copy Core Files

```bash
# In your NEW repository (e.g., payments-service)
cd /path/to/payments-service

# Create directory structure
mkdir -p .techops
mkdir -p src/jira
mkdir -p .github/workflows
mkdir -p .github/actions/releaselens-change

# Copy ReleaseLens files from sandbox/template
cp -r /path/to/releaselens-sandbox/src/jira/* src/jira/
cp -r /path/to/releaselens-sandbox/.github/actions/releaselens-change/* .github/actions/releaselens-change/
cp /path/to/releaselens-sandbox/.github/workflows/releaselens-v2.yml .github/workflows/
cp /path/to/releaselens-sandbox/.github/workflows/release-prod-v2.yml .github/workflows/
cp /path/to/releaselens-sandbox/package.json .  # Merge if you have existing one
cp /path/to/releaselens-sandbox/tsconfig.json .
cp /path/to/releaselens-sandbox/.env.example .
```

### Step 2: Customize deployment.yaml for Your Service

```bash
vim .techops/deployment.yaml
```

```yaml
# .techops/deployment.yaml for payments-service
service: payments-service  # ← Change to your service name
version: "1.0.0"
environment: staging
summary: "Initial ReleaseLens setup for payments service"
jira_ticket: "PAY-1234"  # ← Your service's dev tickets
change_type: "feature"

impact:
  user_visible: true
  blast_radius: "payments processing"  # ← Service-specific
  services_impacted:
    - "payments-service"
    - "payment-gateway"  # ← Dependencies
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
  target_version: "0.9.5"
  est_time_minutes: 10
  data_restore_required: false

owner:
  team: "payments-team"  # ← Your team
  slack_channel: "#payments-alerts"  # ← Your Slack channel
```

### Step 3: Update Workflow Trigger Pattern

```bash
vim .github/workflows/releaselens-v2.yml
```

```yaml
name: ReleaseLens v2 - Staging Deploy

on:
  push:
    tags:
      - 'payments-service-v*'  # ← Change tag pattern for your service
      # Examples:
      # - 'admin-site-v*'
      # - 'api-gateway-v*'
      # - 'user-service-v*'
```

### Step 4: Add GitHub Secrets (If Not Using Org Secrets)

Go to your repo: **Settings** → **Secrets and variables** → **Actions**

Add these secrets:
```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USER_EMAIL=bot@yourcompany.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_CHANGE_PROJECT_KEY=CHGTEST  # ← SAME for all repos
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Step 5: Install Dependencies

```bash
npm install
npm run build  # Verify TypeScript compiles
```

### Step 6: Test It!

```bash
# Update deployment.yaml with test data
vim .techops/deployment.yaml

# Commit and tag
git add .
git commit -m "Add ReleaseLens automation"
git tag payments-service-v1.0.0
git push origin main --tags

# Watch GitHub Actions run!
# Check Jira for new Change ticket
```

---

## 🏢 Multi-Repo Example

### Organization: ACME Corp

```
GitHub Organization: acme-corp
Jira Project: CHGTEST (Change Management)

Repositories:
├── admin-site/
│   ├── .techops/deployment.yaml
│   │   service: admin-site
│   │   jira_ticket: "FO-1234"
│   ├── src/jira/          (ReleaseLens code)
│   └── .github/workflows/
│       └── releaselens-v2.yml
│           tags: 'admin-site-v*'
│
├── payments-service/
│   ├── .techops/deployment.yaml
│   │   service: payments-service
│   │   jira_ticket: "PAY-5678"
│   ├── src/jira/          (ReleaseLens code - same)
│   └── .github/workflows/
│       └── releaselens-v2.yml
│           tags: 'payments-service-v*'
│
├── api-gateway/
│   ├── .techops/deployment.yaml
│   │   service: api-gateway
│   │   jira_ticket: "BE-9012"
│   ├── src/jira/          (ReleaseLens code - same)
│   └── .github/workflows/
│       └── releaselens-v2.yml
│           tags: 'api-gateway-v*'
│
└── user-service/
    ├── .techops/deployment.yaml
    │   service: user-service
    │   jira_ticket: "BE-3456"
    ├── src/jira/          (ReleaseLens code - same)
    └── .github/workflows/
        └── releaselens-v2.yml
            tags: 'user-service-v*'
```

### Result in Jira: Single Dashboard

```
CHGTEST Dashboard - All Changes

Recent Changes:
┌──────────────┬─────────────────┬──────────┬────────────┐
│ Change Key   │ Service         │ Version  │ Status     │
├──────────────┼─────────────────┼──────────┼────────────┤
│ CHGTEST-101  │ admin-site      │ v1.5.0   │ In Staging │
│ CHGTEST-102  │ payments-svc    │ v2.3.1   │ Approved   │
│ CHGTEST-103  │ api-gateway     │ v3.0.0   │ Awaiting   │
│ CHGTEST-104  │ user-service    │ v1.2.5   │ Completed  │
│ CHGTEST-105  │ admin-site      │ v1.5.1   │ Awaiting   │
└──────────────┴─────────────────┴──────────┴────────────┘

All services → One dashboard → Single pane of glass ✓
```

---

## 🔍 Jira Queries for Multi-Repo

### View All Changes by Service

```jql
project = CHGTEST AND Service = "payments-service" ORDER BY created DESC
```

### View All Changes in Staging (All Services)

```jql
project = CHGTEST AND status = "In Staging" ORDER BY created DESC
```

### View All Changes Awaiting Approval (All Services)

```jql
project = CHGTEST AND status = "Awaiting TechOps Approval" ORDER BY created DESC
```

### View Changes for Specific Version Pattern

```jql
project = CHGTEST AND "Git tag / Version" ~ "admin-site-v1.5*" ORDER BY created DESC
```

### View All Production Deployments This Week

```jql
project = CHGTEST 
  AND Environment = "production" 
  AND created >= -7d 
  ORDER BY created DESC
```

---

## 🎨 Customization Per Repository

### Different Deployment Methods

Each repo can use different deployment tools:

```yaml
# admin-site: Uses kubectl
- name: Deploy to Staging
  run: |
    kubectl apply -f k8s/staging/
    kubectl rollout status deployment/admin-site

# payments-service: Uses Terraform
- name: Deploy to Staging
  run: |
    cd terraform/staging
    terraform apply -auto-approve

# api-gateway: Uses AWS CDK
- name: Deploy to Staging
  run: |
    cd cdk
    cdk deploy --require-approval never
```

**Key Point**: ReleaseLens works with ANY deployment method. It only needs `deployment.yaml` to create Jira tickets.

### Different Test Requirements

```yaml
# Mission-critical service: Requires load testing
tests:
  unit: passed
  integration: passed
  load: passed  # ← Required
  test_report_url: "..."

# Low-traffic admin tool: Skip load testing
tests:
  unit: passed
  integration: passed
  load: not_applicable  # ← OK
  test_report_url: "..."
```

### Different Slack Channels

```yaml
# Frontend team
owner:
  team: "frontend"
  slack_channel: "#frontend-deploys"

# Backend team
owner:
  team: "backend"
  slack_channel: "#backend-deploys"

# Payments team
owner:
  team: "payments"
  slack_channel: "#payments-critical"
```

---

## 🔐 GitHub Secrets Strategy

### Option 1: Organization-Level Secrets (Recommended)

**Setup**: GitHub Organization → Settings → Secrets → Actions

```
JIRA_BASE_URL          (shared by all repos)
JIRA_USER_EMAIL        (shared by all repos)
JIRA_API_TOKEN         (shared by all repos)
JIRA_CHANGE_PROJECT_KEY (shared by all repos)
```

**Pros**:
- ✅ One-time setup
- ✅ Consistent across repos
- ✅ Easy to rotate credentials

**Cons**:
- ⚠️ Requires GitHub Enterprise or org admin access

### Option 2: Repository-Level Secrets

**Setup**: Each repo → Settings → Secrets → Actions

**Pros**:
- ✅ Works with any GitHub plan
- ✅ Per-repo isolation

**Cons**:
- ⚠️ Must configure for each repo
- ⚠️ Manual secret rotation

### Hybrid Approach

```
Organization secrets (shared):
├── JIRA_BASE_URL
├── JIRA_USER_EMAIL
├── JIRA_API_TOKEN
└── JIRA_CHANGE_PROJECT_KEY

Repository secrets (per-repo):
└── SLACK_WEBHOOK_URL  # Different per team
```

---

## 📦 Shared Action Approach (Advanced)

Instead of copying files, create a **shared GitHub Action** that all repos use.

### Step 1: Create Shared Action Repository

```
github.com/acme-corp/releaselens-action/

releaselens-action/
├── action.yml
├── src/
│   └── jira/
│       ├── client.ts
│       ├── create-change.ts
│       └── ...
├── dist/
│   └── ... (compiled)
└── README.md
```

### Step 2: Use in Other Repos

```yaml
# .github/workflows/releaselens-v2.yml in admin-site repo

- name: Create Jira Change
  uses: acme-corp/releaselens-action@v1
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

**Pros**:
- ✅ Single source of truth
- ✅ Update once, affects all repos
- ✅ Cleaner repo structure

**Cons**:
- ⚠️ Requires separate repo
- ⚠️ Need to version/release action
- ⚠️ Extra complexity

---

## 🎯 Best Practices

### 1. Consistent Service Naming

```yaml
# GOOD: Clear, consistent naming
service: admin-site
service: payments-service
service: api-gateway

# AVOID: Inconsistent naming
service: adminSite
service: PaymentsService
service: APIGateway
```

### 2. Git Tag Patterns

```bash
# Pattern: {service-name}-v{version}

admin-site-v1.5.0
payments-service-v2.3.1
api-gateway-v3.0.0
user-service-v1.2.5

# NOT:
v1.5.0  # Which service?
admin-site-1.5.0  # Missing 'v'
admin-site-release-1.5.0  # Too verbose
```

### 3. Team Ownership

```yaml
# Each service has clear ownership
owner:
  team: "payments-team"  # Matches Jira team
  slack_channel: "#payments-alerts"
```

### 4. Service Dependencies

```yaml
# Document cross-service dependencies
impact:
  services_impacted:
    - "payments-service"  # Primary
    - "payment-gateway"   # Dependency
    - "fraud-detection"   # Dependency
```

### 5. Risk Level Guidelines

```yaml
# High risk: Payment/auth/data
service: payments-service
risk_level: "high"

# High risk: User-facing frontend
service: admin-site
risk_level: "high"

# High risk: Core API
service: api-gateway
risk_level: "high"
```

**Remember**: ALL are treated as high risk (current policy), but document actual risk in manifest.

---

## 🔄 Rollout Strategy

### Phase 1: Pilot (1-2 repos)

1. Pick 1-2 non-critical services
2. Set up ReleaseLens
3. Test end-to-end flow
4. Gather feedback from teams

### Phase 2: Gradual Expansion

1. Add 3-5 more repos per sprint
2. Document any customizations
3. Refine processes based on learnings

### Phase 3: Full Adoption

1. Mandate for all new services
2. Migrate remaining services
3. Deprecate old change processes

---

## 📊 Example: Multi-Service Deployment

### Scenario: Coordinated Feature Launch

**Feature**: New payment flow affecting 3 services

#### Service 1: API Gateway

```yaml
# api-gateway/.techops/deployment.yaml
service: api-gateway
version: "3.1.0"
jira_ticket: "BE-1001, BE-1002"
summary: "Add new payment endpoints"
```

```bash
git tag api-gateway-v3.1.0
git push origin --tags
```

→ Creates `CHGTEST-201` in Jira

#### Service 2: Payments Service

```yaml
# payments-service/.techops/deployment.yaml
service: payments-service
version: "2.5.0"
jira_ticket: "PAY-2001, PAY-2002"
summary: "Implement new payment flow"
```

```bash
git tag payments-service-v2.5.0
git push origin --tags
```

→ Creates `CHGTEST-202` in Jira

#### Service 3: Frontend

```yaml
# admin-site/.techops/deployment.yaml
service: admin-site
version: "1.8.0"
jira_ticket: "FO-3001, FO-3002"
summary: "New payment UI"
```

```bash
git tag admin-site-v1.8.0
git push origin --tags
```

→ Creates `CHGTEST-203` in Jira

### TechOps View: Single Dashboard

```
CHGTEST Dashboard - Coordinated Payment Feature

┌──────────────┬─────────────────┬──────────┬────────────┬─────────────┐
│ Change Key   │ Service         │ Version  │ Status     │ Related     │
├──────────────┼─────────────────┼──────────┼────────────┼─────────────┤
│ CHGTEST-201  │ api-gateway     │ v3.1.0   │ Awaiting   │ BE-1001/02  │
│ CHGTEST-202  │ payments-svc    │ v2.5.0   │ Awaiting   │ PAY-2001/02 │
│ CHGTEST-203  │ admin-site      │ v1.8.0   │ Awaiting   │ FO-3001/02  │
└──────────────┴─────────────────┴──────────┴────────────┴─────────────┘

TechOps can:
✓ See all related changes in one view
✓ Approve all three together
✓ Coordinate production deployment
✓ Track as a coordinated release
```

---

## 📋 Checklist: Adding ReleaseLens to New Repo

- [ ] Copy `src/jira/` code
- [ ] Copy `.github/workflows/` files
- [ ] Copy `.github/actions/releaselens-change/`
- [ ] Copy or merge `package.json`, `tsconfig.json`
- [ ] Create `.techops/deployment.yaml` for your service
- [ ] Update workflow tag trigger pattern
- [ ] Add GitHub secrets (or verify org secrets)
- [ ] Update service name in deployment.yaml
- [ ] Update team/slack channel in deployment.yaml
- [ ] Install dependencies: `npm install`
- [ ] Test build: `npm run build`
- [ ] Create test tag and verify workflow
- [ ] Check Jira for Change ticket
- [ ] Verify Slack notification
- [ ] Document any service-specific customizations

---

## 🎓 Summary

### Key Points

1. **One Jira Project**: All services report to CHGTEST
2. **Per-Repo Code**: Copy ReleaseLens files to each repo
3. **Unique Service Names**: Each service has unique identifier
4. **Unique Tag Patterns**: Service-specific git tags
5. **Same Workflow**: All use same approval process
6. **Customizable**: Each service can customize deployment steps

### Benefits

✅ **Centralized Visibility**: TechOps sees all changes in one dashboard  
✅ **Distributed Ownership**: Each team manages their own deployments  
✅ **Consistent Process**: Same workflow across all services  
✅ **Flexible Deployment**: Each service uses its own deployment method  
✅ **Complete Audit Trail**: Every deployment tracked in Jira  
✅ **Cross-Service Coordination**: Easy to coordinate multi-service releases  

---

**Last Updated**: 2026-01-28  
**See Also**: `README.md`, `docs/RELEASELENS_SETUP.md`, `docs/ARCHITECTURE.md`
