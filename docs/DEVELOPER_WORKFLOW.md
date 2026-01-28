# ReleaseLens - Developer Workflow

> **Complete guide**: How developers update deployment.yaml and trigger automation

---

## 🔄 Standard Development Flow

### Step 1: Developer Updates Code + Deployment Manifest

Developer works on a feature/bugfix:

```bash
# Create feature branch
git checkout -b feature/add-export-button

# Make code changes
vim src/components/ExportButton.tsx

# Update deployment manifest with deployment details
vim .techops/deployment.yaml
```

**Update `deployment.yaml`**:

```yaml
service: admin-site
version: "1.23.0"  # ← Increment version
environment: staging
summary: "Add asset export button with CSV download"
jira_ticket: "FO-1234"  # ← Link to dev ticket
change_type: "feature"

impact:
  user_visible: true
  blast_radius: "Asset management, ~500 users"
  services_impacted:
    - "admin-site"
    - "assets-api"
  data_migration: false
  backward_compatible: true
  risk_level: "high"  # ← Set appropriate risk level

tests:
  unit: passed
  integration: passed
  load: not_run
  test_report_url: "https://github.com/org/repo/actions/runs/123456"

rollback:
  method: "rollback_to_version"
  target_version: "1.22.3"  # ← Last known good version
  est_time_minutes: 10
  data_restore_required: false

owner:
  team: "frontoffice"
  slack_channel: "#frontoffice"
```

**Key fields developers must update**:
- ✅ `version` - New version number
- ✅ `summary` - What's being deployed
- ✅ `jira_ticket` - Link to development ticket
- ✅ `risk_level` - Honest assessment (all are "high" in current policy)
- ✅ `rollback.target_version` - Version to rollback to if needed
- ✅ `tests.*` - Test results

---

### Step 2: Developer Creates PR

```bash
# Commit changes (both code AND deployment.yaml)
git add .
git commit -m "[FO-1234] Add asset export button"

# Push to remote
git push origin feature/add-export-button

# Create PR in GitHub
```

**PR includes**:
- ✅ Code changes
- ✅ Updated `deployment.yaml`
- ✅ Test results
- ✅ Documentation updates (if needed)

**PR Review focuses on**:
- Code quality
- Test coverage
- **Deployment manifest accuracy**
  - Is risk level appropriate?
  - Is rollback plan clear?
  - Are all fields complete?

---

### Step 3: PR Merged to Main

After approval:

```bash
# Teammate or CI/CD merges PR
# Now main branch has:
#   - New code
#   - Updated deployment.yaml
```

**At this point**:
- ❌ Nothing is deployed yet
- ❌ No Jira Change created yet
- ✅ Code + manifest are ready in main

---

### Step 4: Developer Creates Git Tag (Triggers Automation)

```bash
# Ensure you're on latest main
git checkout main
git pull origin main

# Create release tag (format: {service}-v{version})
git tag admin-site-v1.23.0

# Push tag to trigger deployment
git push origin admin-site-v1.23.0
```

**Tag format**: `{service}-v{version}` (must match `deployment.yaml`)

**This triggers GitHub Actions workflow!**

---

### Step 5: GitHub Actions Automation (Fully Automatic)

#### 5a. Workflow Triggered

**File**: `.github/workflows/releaselens-v2.yml`

```yaml
on:
  push:
    tags:
      - 'admin-site-v*'  # ← Tag pattern triggers workflow
```

#### 5b. GitHub Actions Reads deployment.yaml

**Workflow steps**:

1. **Checkout code** (includes `deployment.yaml`)
   ```yaml
   - uses: actions/checkout@v4
   ```

2. **Deploy to staging**
   ```yaml
   - name: Deploy to staging
     run: |
       # Your deployment script
   ```

3. **Create Jira Change** (reads `deployment.yaml` automatically)
   ```yaml
   - name: Create Jira Change issue
     uses: ./.github/actions/releaselens-change
     with:
       action: create
       manifest-path: .techops/deployment.yaml  # ← GitHub Actions reads this
       git-tag: ${{ github.ref_name }}
       environment: staging
   ```

#### 5c. Composite Action Processes deployment.yaml

**File**: `.github/actions/releaselens-change/action.yml`

```yaml
# Build and execute TypeScript automation
- name: Run ReleaseLens action
  run: |
    npm install
    npm run build
    node dist/jira/create-change.js \
      --manifest .techops/deployment.yaml \  # ← Read deployment.yaml
      --tag ${{ inputs.git-tag }} \
      --environment ${{ inputs.environment }}
```

#### 5d. TypeScript Automation Reads & Parses

**File**: `src/jira/create-change.ts`

```typescript
// Read deployment.yaml from filesystem
const manifest = parseManifest('.techops/deployment.yaml');

// Parse all fields
console.log(`Parsed: ${manifest.service} v${manifest.version}`);
console.log(`Risk Level: ${manifest.impact.risk_level}`);

// Convert to Jira format
const changeRequest = manifestToChangeRequest(
  manifest,
  gitTag,
  githubRunUrl,
  environment
);

// Create Jira issue via REST API
const issue = await client.createChange(changeRequest);

console.log(`✅ Created Jira Change: ${issue.key}`);
```

#### 5e. Jira Updated Automatically

**Result**:
- ✅ Jira Change issue created (e.g., `CHGTEST-42`)
- ✅ All fields populated from `deployment.yaml`
- ✅ Status: "Awaiting TechOps Approval"
- ✅ Dashboard updated automatically

#### 5f. Slack Notification Sent

```
📋 Staging Deployment SUCCESS
⚠️ Next Step: TechOps approval required for production

Service: admin-site
Version: admin-site-v1.23.0
Risk: high
Change: CHGTEST-42 - View in Jira

⚠️ Action Required: TechOps must approve CHGTEST-42 before production
```

---

### Step 6: TechOps Reviews in Jira

**TechOps sees in dashboard**:
- New Change: CHGTEST-42
- All fields from `deployment.yaml`:
  - Service: admin-site
  - Version: 1.23.0
  - Risk Level: high
  - Rollback Plan: rollback_to_version → v1.22.3
  - Test Results: unit/integration passed
  - Owner: frontoffice team
  - GitHub Run: [link]

**TechOps reviews and approves** → Transitions to "Approved for Prod"

---

### Step 7: Developer Runs Production Deployment

After TechOps approval:

```bash
# In GitHub UI:
# 1. Go to: Actions → "ReleaseLens v2 - Production Deploy"
# 2. Click: "Run workflow"
# 3. Enter:
#    - git_tag: admin-site-v1.23.0
#    - change_key: CHGTEST-42
# 4. Click: "Run workflow"
```

**GitHub Actions**:
- ✅ Verifies approval in Jira
- ✅ Deploys to production
- ✅ Updates Jira to "Completed"
- ✅ Sends Slack notification

---

## 📋 Developer Checklist

### Before Creating PR

- [ ] Code changes complete
- [ ] Tests passing locally
- [ ] **Updated `deployment.yaml`**:
  - [ ] Incremented version
  - [ ] Updated summary
  - [ ] Set risk_level appropriately
  - [ ] Documented rollback.target_version
  - [ ] Verified all required fields

### Before Merging PR

- [ ] Code review approved
- [ ] CI/CD passing
- [ ] **Deployment manifest reviewed**:
  - [ ] Risk level appropriate?
  - [ ] Rollback plan clear?
  - [ ] All fields complete?

### After PR Merged

- [ ] Pull latest main
- [ ] Create git tag: `{service}-v{version}`
- [ ] Push tag: `git push origin {tag}`
- [ ] **Watch automation**:
  - [ ] Staging deployment succeeds
  - [ ] Jira Change created
  - [ ] Slack notification received

### For Production (High Risk)

- [ ] Note Jira Change key (e.g., CHGTEST-42)
- [ ] Notify TechOps of pending approval
- [ ] Wait for TechOps approval in Jira
- [ ] Run manual production workflow
- [ ] Monitor deployment
- [ ] Verify in production

---

## 🎯 Key Points for Developers

### 1. **deployment.yaml is Part of Your PR**

✅ Update it alongside your code  
✅ Get it reviewed in PR  
✅ Merge it together  

**DO NOT**:
- ❌ Skip updating deployment.yaml
- ❌ Update it after merging
- ❌ Forget to commit it

### 2. **GitHub Actions Reads It Automatically**

✅ You push tag → workflow reads file  
✅ No manual Jira ticket creation  
✅ No copy/paste of deployment info  

**You DO NOT need to**:
- ❌ Manually create Jira tickets
- ❌ Manually populate Jira fields
- ❌ Manually update dashboards

### 3. **Be Honest About Risk Level**

Even though all deployments require approval:

✅ Document actual risk honestly  
✅ Helps TechOps prioritize reviews  
✅ Used for metrics and retrospectives  

### 4. **Rollback Plan is Critical**

✅ Always specify `rollback.target_version`  
✅ Must be a valid previous version  
✅ TechOps will check this during approval  

---

## 🚨 Common Mistakes to Avoid

### ❌ Mistake 1: Forgetting to Update deployment.yaml

```bash
# BAD: Only push code changes
git add src/
git commit -m "Add feature"
git push

# GOOD: Push code AND deployment manifest
git add src/ .techops/deployment.yaml
git commit -m "Add feature + update deployment manifest"
git push
```

### ❌ Mistake 2: Version Mismatch

```yaml
# deployment.yaml
version: "1.23.0"
```

```bash
# Tag doesn't match!
git tag admin-site-v1.24.0  # ← WRONG! Should be v1.23.0
```

**Result**: Confusing version numbers in Jira

### ❌ Mistake 3: Vague Rollback Plan

```yaml
# BAD
rollback:
  method: "rollback"
  target_version: "previous"
```

```yaml
# GOOD
rollback:
  method: "rollback_to_version"
  target_version: "1.22.3"  # ← Specific version
  est_time_minutes: 10
```

### ❌ Mistake 4: Incomplete Test Results

```yaml
# BAD
tests:
  unit: passed
```

```yaml
# GOOD
tests:
  unit: passed
  integration: passed
  load: not_run
  test_report_url: "https://github.com/org/repo/actions/runs/123456"
```

---

## 📊 Example: Complete Flow

### Monday 10:00 AM - Development

```bash
# Developer starts work
git checkout -b feature/FO-1234-export

# Make changes
vim src/components/ExportButton.tsx

# Update deployment manifest
vim .techops/deployment.yaml
# - version: "1.23.0"
# - summary: "Add asset export button"
# - risk_level: "high"
# - rollback.target_version: "1.22.3"

# Commit
git add .
git commit -m "[FO-1234] Add export button + update manifest"
git push origin feature/FO-1234-export
```

### Monday 2:00 PM - PR Review

```
PR #456: [FO-1234] Add asset export button

Code changes: ✓
Tests passing: ✓
Deployment manifest updated: ✓
  - Version: 1.23.0
  - Risk: high
  - Rollback: → v1.22.3 ✓
  
Approved by: @teammate
Merged to main
```

### Monday 3:00 PM - Release

```bash
# Developer creates release
git checkout main
git pull origin main
git tag admin-site-v1.23.0
git push origin admin-site-v1.23.0
```

### Monday 3:02 PM - Automation (Automatic)

```
[GitHub Actions] Tag detected: admin-site-v1.23.0
[GitHub Actions] Reading: .techops/deployment.yaml
[GitHub Actions] Deploying to staging...
[GitHub Actions] ✓ Staging deployment complete
[GitHub Actions] Creating Jira Change...
[TypeScript] Reading .techops/deployment.yaml
[TypeScript] Parsed: admin-site v1.23.0, risk: high
[TypeScript] Creating Jira issue...
[Jira API] Created: CHGTEST-42
[GitHub Actions] ✓ Jira Change created: CHGTEST-42
[Slack] 📋 Staging deployment SUCCESS
        ⚠️ TechOps approval required for prod
        Change: CHGTEST-42
```

### Monday 3:30 PM - TechOps Review

```
TechOps reviews CHGTEST-42 in Jira:
✓ Risk level appropriate
✓ Tests passed
✓ Rollback plan clear
✓ Monitoring ready

TechOps approves → "Approved for Prod"
```

### Monday 4:00 PM - Production Deployment

```
Developer runs manual prod workflow:
  git_tag: admin-site-v1.23.0
  change_key: CHGTEST-42

[GitHub Actions] Verifying approval...
[GitHub Actions] ✓ CHGTEST-42 is approved
[GitHub Actions] Deploying to production...
[GitHub Actions] ✓ Production deployment complete
[GitHub Actions] Updating Jira to Completed...
[Slack] ✅ Production deployment SUCCESS
```

### Monday 4:15 PM - Complete

```
✅ Feature deployed to production
✅ Jira Change CHGTEST-42: Completed
✅ Full audit trail in Jira
✅ Monitoring alerts active
```

---

## 🎓 Training Summary

### What Developers Do

1. ✅ Update code
2. ✅ **Update `deployment.yaml`**
3. ✅ Create PR (includes both)
4. ✅ Get PR reviewed and merged
5. ✅ Create git tag
6. ✅ Push tag

### What GitHub Actions Does Automatically

1. ✅ **Reads `deployment.yaml`**
2. ✅ Deploys to staging
3. ✅ Creates Jira Change
4. ✅ Populates all Jira fields
5. ✅ Updates dashboard
6. ✅ Sends notifications

### What TechOps Does

1. ✅ Reviews Jira Change
2. ✅ Approves or rejects
3. ✅ Monitors deployment

### What Happens Automatically

1. ✅ **Deployment manifest read by GitHub Actions**
2. ✅ Jira updated automatically
3. ✅ Dashboard updated automatically
4. ✅ No manual ticket creation
5. ✅ No manual field population

---

## 📞 Need Help?

- **deployment.yaml format**: See `.techops/deployment.yaml` example
- **Field descriptions**: See `docs/RELEASELENS_SETUP.md`
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Flow diagram**: See `docs/FLOW_DIAGRAM.md`

---

**Last Updated**: 2026-01-28
