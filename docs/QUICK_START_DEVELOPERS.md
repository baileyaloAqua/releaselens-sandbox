# ReleaseLens - Quick Start for Developers

> **TL;DR**: Update `deployment.yaml` in your PR, create git tag, GitHub Actions handles the rest

---

## 🚀 5-Minute Developer Guide

### Step 1: Update Code + Deployment Manifest

```bash
# Make your code changes
vim src/myfeature.js

# Update deployment manifest
vim .techops/deployment.yaml
```

**Update these fields in `deployment.yaml`**:

```yaml
service: my-service
version: "1.1.0"  # ← Increment version
summary: "Add my awesome feature"  # ← What you're deploying
jira_ticket: "FO-1234, FO-5678"  # ← Link to your EXISTING dev ticket(s)

impact:
  risk_level: "high"  # ← All are high in current policy
  blast_radius: "single service"
  services_impacted: ["my-service"]

rollback:
  target_version: "1.0.5"  # ← Last known good version
  est_time_minutes: 10
```

**Important**: 
- `jira_ticket` refers to your **existing development ticket(s)** (the feature/bug you worked on)
- **Supports multiple tickets**: Use comma-separated format: `"FO-1234, FO-5678, BE-9012"`
- ReleaseLens will create a **new Change ticket** (e.g., `CHGTEST-42`) that **links to all** your dev tickets
- Multiple tickets tracked: Dev ticket(s) (your work) + Change ticket (deployment tracking)

---

### Step 2: Create PR

```bash
git add .
git commit -m "[DEV-123] Add feature + update manifest"
git push origin feature/my-feature
```

**PR must include BOTH**:
- ✅ Code changes
- ✅ Updated `deployment.yaml`

---

### Step 3: After PR Merged → Create Tag

```bash
# Get latest main
git checkout main
git pull origin main

# Create release tag (format: {service}-v{version})
git tag my-service-v1.1.0

# Push tag → triggers automation
git push origin my-service-v1.1.0
```

**Tag format**: Must match service name in `deployment.yaml`

---

### Step 4: Watch GitHub Actions (Automatic)

GitHub Actions automatically:

1. ✅ **Reads your `deployment.yaml`**
2. ✅ Deploys to staging
3. ✅ Creates Jira Change (e.g., CHGTEST-42)
4. ✅ Updates Jira dashboard with all fields
5. ✅ Sends Slack notification

**You receive Slack notification**:
```
📋 Staging Deployment SUCCESS
⚠️ TechOps approval required for production

Change: CHGTEST-42 - View in Jira
```

---

### Step 5: Wait for TechOps Approval

**TechOps reviews your change in Jira**:
- Reviews deployment manifest
- Checks test results
- Verifies rollback plan
- Approves or rejects

**You'll see status change in Jira**: "Approved for Prod"

---

### Step 6: Deploy to Production

**After TechOps approval**:

1. Go to GitHub → **Actions**
2. Select: **"ReleaseLens v2 - Production Deploy"**
3. Click: **"Run workflow"**
4. Enter:
   - `git_tag`: `my-service-v1.1.0`
   - `change_key`: `CHGTEST-42` (from Slack notification)
5. Click: **"Run workflow"**

**GitHub Actions automatically**:
- ✅ Verifies approval
- ✅ Deploys to production
- ✅ Updates Jira to "Completed"

---

## 🎯 What You Need to Know

### ✅ What Developers Do

1. Update code
2. **Update `deployment.yaml`** (in same PR)
3. Create git tag
4. Wait for TechOps approval
5. Run manual prod workflow

### ✅ What GitHub Actions Does Automatically

1. **Reads `deployment.yaml`**
2. Creates Jira Change
3. Populates all Jira fields
4. Updates dashboard
5. No manual ticket creation!

### ❌ What You DON'T Do

- ❌ Manually create Jira tickets
- ❌ Copy/paste deployment info
- ❌ Update Jira fields manually
- ❌ Update dashboards manually

---

## 📋 Checklist: Before Pushing Tag

Before you run `git push origin {tag}`:

- [ ] PR merged to main
- [ ] `deployment.yaml` updated with:
  - [ ] New version number
  - [ ] Deployment summary
  - [ ] Rollback target version
  - [ ] Risk level
  - [ ] Test results
- [ ] Tag matches version in `deployment.yaml`
- [ ] Service name matches in tag

---

## 🚨 Common Mistakes

### ❌ Mistake: Forgot to Update deployment.yaml

```bash
# BAD: Only code changes in PR
git add src/
git commit -m "Add feature"
```

```bash
# GOOD: Code + manifest in PR
git add src/ .techops/deployment.yaml
git commit -m "Add feature + update deployment manifest"
```

### ❌ Mistake: Version Mismatch

```yaml
# deployment.yaml
version: "1.1.0"
```

```bash
# Tag doesn't match
git tag my-service-v1.2.0  # ← WRONG!
```

**Fix**: Make sure tag version matches `deployment.yaml` version

### ❌ Mistake: No Rollback Target

```yaml
# BAD
rollback:
  target_version: "previous"
```

```yaml
# GOOD
rollback:
  target_version: "1.0.5"  # ← Specific version
```

---

## 📚 Full Documentation

- **This guide**: Quick start (you are here)
- **`docs/JIRA_TICKETS_EXPLAINED.md`**: Understanding dev vs change tickets
- **`docs/ARCHITECTURE.md`**: How automation works
- **README.md**: See "Risk Assessment" section for TechOps approval policy

---

## ❓ FAQ

**Q: Do I need to create Jira tickets manually?**  
A: No! GitHub Actions reads `deployment.yaml` and creates tickets automatically.

**Q: What if I forget to update deployment.yaml?**  
A: The workflow will fail. Always update it in your PR.

**Q: Can I deploy to prod without approval?**  
A: No. ALL deployments require TechOps approval in current policy.

**Q: How long does approval take?**  
A: Usually 15-30 minutes. Notify TechOps in advance for faster turnaround.

**Q: What if my deployment fails?**  
A: Use the rollback plan you documented in `deployment.yaml`.

---

**Last Updated**: 2026-01-28  
**Questions?** See full docs in `docs/` folder
