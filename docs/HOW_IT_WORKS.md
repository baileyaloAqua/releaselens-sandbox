# ReleaseLens - How It Works (Simple Explanation)

> **One sentence**: Developers update `deployment.yaml` in their PR, GitHub Actions reads it and creates Jira tickets automatically.

---

## 🎯 The Core Concept

```
Developer updates deployment.yaml
        ↓
    Creates PR
        ↓
     Merges PR
        ↓
   Creates git tag
        ↓
GitHub Actions automatically:
  - Reads deployment.yaml
  - Creates Jira Change
  - Updates dashboard
```

**No manual Jira tickets. No manual field population. Everything is automated.**

---

## 👨‍💻 Developer Perspective

### What You Do

1. **Update `deployment.yaml` in your PR**
   ```yaml
   version: "1.1.0"
   summary: "Add my feature"
   jira_ticket: "FO-1234, FO-5678"  # ← Your existing dev ticket(s)
   rollback:
     target_version: "1.0.5"
   ```
   
   **Note**: `jira_ticket` references your **existing development ticket(s)** (created by PM). Supports **multiple tickets** (comma-separated). ReleaseLens will create a **new Change ticket** that links to all of them.

2. **Get PR reviewed and merged**
   - Code review
   - Manifest review
   - Both merge together

3. **Create git tag**
   ```bash
   git tag service-v1.1.0
   git push origin service-v1.1.0
   ```

4. **Done!**
   - GitHub Actions reads your `deployment.yaml`
   - **New Jira Change ticket** created automatically (e.g., CHGTEST-42)
   - Change ticket **links to all your dev tickets** (FO-1234, FO-5678)
   - Dashboard updated automatically
   
   **Multiple tickets now connected**:
   - Dev tickets (FO-1234, FO-5678): Your feature work - already existed
   - Change ticket (CHGTEST-42): Deployment tracking - just created, links to all dev tickets

### What You DON'T Do

- ❌ Create **Change tickets** manually (ReleaseLens creates them)
- ❌ Copy/paste deployment info into Jira
- ❌ Fill out Jira Change fields manually
- ❌ Update dashboards

**Note**: You still create/use **dev tickets** (FO-1234) as normal. ReleaseLens creates **Change tickets** (CHGTEST-42) automatically.

---

## 🤖 GitHub Actions Perspective

### What GitHub Actions Does Automatically

When you push a tag:

1. **Reads `deployment.yaml` from repository**
   ```typescript
   const manifest = parseManifest('.techops/deployment.yaml');
   ```

2. **Deploys to staging**
   ```bash
   # Your deployment script runs
   ```

3. **Creates Jira Change**
   ```typescript
   const issue = await client.createChange({
     service: manifest.service,
     version: manifest.version,
     riskLevel: manifest.impact.risk_level,
     rollbackMethod: manifest.rollback.method,
     // ... all fields from deployment.yaml
   });
   ```

4. **Updates Jira dashboard**
   - All fields populated from `deployment.yaml`
   - Status: "Awaiting TechOps Approval"
   - Ready for TechOps review

5. **Sends Slack notification**
   ```
   Staging deployment SUCCESS
   Change: CHGTEST-42
   ⚠️ TechOps approval required
   ```

---

## 🔧 TechOps Perspective

### What TechOps Sees

**In Jira dashboard**:
- New Change: CHGTEST-42
- All fields automatically populated:
  - Service: my-service
  - Version: 1.1.0
  - Risk: high
  - Rollback: → v1.0.5
  - Tests: passed
  - Owner: platform-team

**No manual data entry needed** - everything from `deployment.yaml`

### What TechOps Does

1. Reviews Change in Jira
2. Approves or rejects
3. That's it!

---

## 📁 Key Files

| File | Purpose | Who Updates |
|------|---------|-------------|
| `.techops/deployment.yaml` | Deployment metadata | Developer in PR |
| `.github/workflows/releaselens-v2.yml` | Orchestrates automation | DevOps (one-time setup) |
| `src/jira/*.ts` | Reads yaml, calls Jira API | DevOps (one-time setup) |

---

## 🔄 Complete Example

### Monday 10 AM: Developer Works

```bash
# Update code
vim src/feature.js

# Update deployment manifest (in same PR!)
vim .techops/deployment.yaml
# version: "1.1.0"
# summary: "Add feature"
# rollback.target_version: "1.0.5"

# Create PR
git commit -am "Add feature + update manifest"
git push origin feature/add-feature
```

### Monday 2 PM: PR Merged

```
PR #123 merged to main
✓ Code changes
✓ deployment.yaml updated
```

### Monday 3 PM: Release Tag

```bash
git tag service-v1.1.0
git push origin service-v1.1.0
```

### Monday 3:02 PM: Automation (Automatic!)

```
[GitHub Actions] Tag detected
[GitHub Actions] Reading .techops/deployment.yaml
[GitHub Actions] Deploying to staging... ✓
[GitHub Actions] Creating Jira Change...
[TypeScript] Reading deployment.yaml from filesystem
[TypeScript] Parsed: service v1.1.0, risk: high
[TypeScript] Calling Jira API...
[Jira API] Created: CHGTEST-42 ✓
[Slack] 📋 Staging SUCCESS, Change: CHGTEST-42
```

### Monday 3:30 PM: TechOps Approval

```
TechOps reviews CHGTEST-42 in Jira
All fields already populated (from deployment.yaml)
TechOps approves → "Approved for Prod"
```

### Monday 4 PM: Production

```
Developer runs manual prod workflow
GitHub Actions verifies approval ✓
Deploys to production ✓
Updates Jira to Completed ✓
```

---

## ✅ Key Takeaways

### For Developers

1. ✅ **Update `deployment.yaml` in your PR**
2. ✅ GitHub Actions reads it automatically
3. ✅ Jira tickets created automatically
4. ✅ No manual Jira work

### For TechOps

1. ✅ Jira tickets appear automatically
2. ✅ All fields pre-populated
3. ✅ Review and approve
4. ✅ No manual data entry

### For Everyone

1. ✅ Single source of truth: `deployment.yaml`
2. ✅ Version controlled with code
3. ✅ Full automation
4. ✅ Complete audit trail

---

## 🎓 Want to Learn More?

| Document | For Who | What It Covers |
|----------|---------|----------------|
| `QUICK_START_DEVELOPERS.md` | Developers | Quick 5-minute guide |
| `docs/DEVELOPER_WORKFLOW.md` | Developers | Complete workflow |
| `docs/ARCHITECTURE.md` | Tech leads | How automation works |
| `docs/FLOW_DIAGRAM.md` | Everyone | Visual flow diagram |
| `docs/HIGH_RISK_POLICY.md` | Everyone | TechOps approval policy |

---

## ❓ Common Questions

**Q: Who creates Jira tickets?**  
A: GitHub Actions, automatically. Developers just update `deployment.yaml`.

**Q: When does GitHub Actions read deployment.yaml?**  
A: When you push a git tag. It reads it from the repository.

**Q: What if I don't update deployment.yaml?**  
A: The workflow will fail. Always update it in your PR.

**Q: Do I need to learn Jira?**  
A: For creating tickets? No. GitHub Actions does that. You just need to wait for TechOps approval.

**Q: Is this manual or automatic?**  
A: **100% automatic**. Developer updates yaml → pushes tag → GitHub Actions does everything else.

---

**Last Updated**: 2026-01-28  
**Summary**: Developer updates `deployment.yaml`, GitHub Actions reads it and automates everything.
