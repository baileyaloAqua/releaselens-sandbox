# ReleaseLens - High Risk Policy Summary

> **Quick Reference**: Understanding the TechOps approval requirement

---

## 🔒 Core Policy

**ALL production deployments require explicit TechOps approval.**

There is no auto-deploy to production, regardless of risk level.

---

## 📋 Deployment Flow

### Step 1: Developer Creates Release
```bash
git tag service-v1.0.0
git push origin service-v1.0.0
```

### Step 2: Automated Staging (2-10 minutes)
- ✅ Deploys to staging
- ✅ Creates Jira Change issue
- ✅ Status: "Awaiting TechOps Approval"
- ✅ Sends Slack notification

### Step 3: TechOps Review (15-30 minutes)
TechOps reviews in Jira:
- [ ] Staging deployment successful?
- [ ] Tests passed?
- [ ] Rollback plan clear?
- [ ] Monitoring ready?
- [ ] Change window OK?

### Step 4: TechOps Approval
In Jira: Transition to **"Approved for Prod"**

### Step 5: Production Deployment
Developer runs manual workflow:
- Go to GitHub Actions
- Select "ReleaseLens v2 - Production Deploy"
- Enter `git_tag` and `change_key`
- Run workflow

### Step 6: Completion (2-10 minutes)
- ✅ Workflow verifies approval
- ✅ Deploys to production
- ✅ Updates Jira to "Completed"
- ✅ Sends Slack notification

---

## ⏱️ Timeline

**Total time**: 30-60 minutes from tag push to production

| Phase | Duration | Waiting For |
|-------|----------|-------------|
| Staging deploy | 5-10 min | Automation |
| TechOps review | 15-30 min | Human review |
| Prod deploy | 5-10 min | Automation |

---

## 🚫 What Changed

| Before (Standard ReleaseLens) | After (High Risk Policy) |
|-------------------------------|--------------------------|
| Low risk → Auto-deploy | ❌ Disabled |
| Medium risk → Approval | ✅ Same |
| High risk → Approval | ✅ Same |

**Result**: Every deployment follows the same approval path.

---

## 💡 Why This Policy?

### Benefits
- ✅ Every deployment gets human review
- ✅ Catch issues before production
- ✅ Complete audit trail
- ✅ Operational readiness verification
- ✅ No accidental deployments

### Trade-offs
- ⏱️ Slower deployments (30-60 min vs 15-20 min)
- 👥 Requires TechOps availability
- 📅 Requires coordination for timing

---

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `.techops/deployment.yaml` | Set `risk_level: "high"` |
| `.github/workflows/releaselens-v2.yml` | Staging only (no auto-prod) |
| `.github/workflows/release-prod-v2.yml` | Manual prod deployment |
| `docs/HIGH_RISK_POLICY.md` | Complete policy documentation |

---

## 📞 Quick Help

**Question**: "Why isn't my change deploying to prod?"
**Answer**: All changes require TechOps approval. Check Jira Change status.

**Question**: "How do I speed up deployment?"
**Answer**: Notify TechOps in advance, especially for large changes.

**Question**: "What if this is urgent?"
**Answer**: Tag as `[HOTFIX]`, notify `@techops-oncall` in Slack for expedited review.

**Question**: "Can I bypass approval for tiny changes?"
**Answer**: No. Policy applies to ALL deployments without exception.

---

## 📚 Full Documentation

- **Policy Details**: `docs/HIGH_RISK_POLICY.md`
- **Setup Guide**: `docs/RELEASELENS_SETUP.md`
- **Quick Reference**: `docs/QUICK_REFERENCE.md`

---

**Policy Version**: 1.0  
**Effective**: 2026-01-28
