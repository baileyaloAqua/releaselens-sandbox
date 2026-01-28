# ReleaseLens - Jira Tickets Explained

> **Key Concept**: There are TWO types of Jira tickets - Development tickets (already exist) and Change tickets (created automatically)

---

## 🎫 Two Types of Jira Tickets

### Type 1: Development Tickets (Already Exist)

**Purpose**: Track feature development work

**Created by**: Product Manager / Project Manager

**Examples**:
- `FO-1234: Add asset export button`
- `FO-5678: Fix login bug`
- `FO-9012: Update user profile UI`

**Project**: Your dev project (e.g., "FrontOffice", "Backend", etc.)

**Lifecycle**:
```
Created by PM
    ↓
Assigned to developer
    ↓
Developer works on it
    ↓
Code review
    ↓
Merged to main
    ↓
Status: Done/Deployed
```

**These already exist before ReleaseLens!**

---

### Type 2: Change Tickets (Created by ReleaseLens)

**Purpose**: Track deployment and get TechOps approval

**Created by**: GitHub Actions (automatically)

**Examples**:
- `CHGTEST-42: [admin-site] Deploy v1.23.0 to staging`
- `CHGTEST-43: [api-gateway] Deploy v2.5.1 to staging`

**Project**: ReleaseLens Change Management project (e.g., "CHGTEST")

**Lifecycle**:
```
Created automatically by GitHub Actions
    ↓
Status: Awaiting TechOps Approval
    ↓
TechOps reviews
    ↓
Status: Approved for Prod
    ↓
Developer deploys to production
    ↓
Status: Completed
```

**These are created automatically when you push a git tag!**

---

## 🔗 How They're Connected

### In deployment.yaml

```yaml
service: admin-site
version: "1.23.0"
summary: "Add asset export button"
jira_ticket: "FO-1234"  # ← Link to EXISTING dev ticket
```

### What Happens

1. **You work on dev ticket**: `FO-1234`
2. **You update deployment.yaml**: Include `jira_ticket: "FO-1234"`
3. **GitHub Actions creates Change ticket**: `CHGTEST-42`
4. **Change ticket links to dev ticket**: 
   - Description includes: "Related dev ticket: FO-1234"
   - Creates traceability

### Result in Jira

**Dev Ticket (FO-1234)**:
```
Title: Add asset export button
Status: Done
Links: 
  - Change: CHGTEST-42 (deployment tracking)
```

**Change Ticket (CHGTEST-42)**:
```
Title: [admin-site] Deploy v1.23.0 to staging
Status: Awaiting TechOps Approval
Related Dev Ticket: FO-1234
Fields:
  - Service: admin-site
  - Version: 1.23.0
  - Risk: high
  - Rollback: → v1.22.3
  - All deployment metadata...
```

---

## 📊 Comparison Table

| Aspect | Development Ticket | Change Ticket |
|--------|-------------------|---------------|
| **Purpose** | Track feature work | Track deployment |
| **Project** | Dev project (FO, BE, etc.) | CHGTEST (Change Mgmt) |
| **Created By** | PM/Product | GitHub Actions (auto) |
| **When Created** | Planning phase | Deployment (tag push) |
| **Example** | FO-1234 | CHGTEST-42 |
| **Contains** | User story, acceptance criteria | Deployment metadata, risk, rollback |
| **Developer Updates** | Yes (work progress) | No (auto-populated) |
| **TechOps Approves** | No | Yes (for production) |
| **Closed When** | Feature merged | Deployment completed |

---

## 🔄 Complete Example

### Step 1: PM Creates Dev Ticket

```
Jira Project: FrontOffice (FO)
Ticket: FO-1234
Title: Add asset export button
Description: Users need to export assets as CSV
Status: To Do
```

### Step 2: Developer Works on Feature

```bash
# Developer starts work
git checkout -b feature/FO-1234-export

# Makes changes
vim src/components/ExportButton.tsx

# Updates deployment manifest
vim .techops/deployment.yaml
# jira_ticket: "FO-1234"  ← Links to dev ticket

# Creates PR
git commit -m "[FO-1234] Add export button + manifest"
git push origin feature/FO-1234-export
```

### Step 3: PR Merged, Dev Ticket Updated

```
Jira Ticket: FO-1234
Status: Done (automatically via GitHub integration)
```

### Step 4: Developer Creates Release Tag

```bash
git tag admin-site-v1.23.0
git push origin admin-site-v1.23.0
```

### Step 5: ReleaseLens Creates Change Ticket

```
GitHub Actions reads deployment.yaml:
  - service: admin-site
  - version: 1.23.0
  - jira_ticket: "FO-1234"  ← Dev ticket reference

Creates new Change ticket:
  Jira Project: CHGTEST
  Ticket: CHGTEST-42
  Title: [admin-site] Deploy v1.23.0 to staging
  Description: "Related dev ticket: FO-1234"
  Status: Awaiting TechOps Approval
```

### Result: Two Tickets Linked

```
Dev Ticket (FO-1234):
  Status: Done
  Links: CHGTEST-42 (deployment)

Change Ticket (CHGTEST-42):
  Status: Awaiting TechOps Approval
  Related: FO-1234 (dev work)
```

---

## 💡 Why Two Tickets?

### Different Purposes

**Dev Ticket (FO-1234)**:
- ✅ Tracks **what** work is being done
- ✅ User story and acceptance criteria
- ✅ Development progress
- ✅ Code review status

**Change Ticket (CHGTEST-42)**:
- ✅ Tracks **deployment** of that work
- ✅ Risk assessment
- ✅ TechOps approval
- ✅ Rollback plan
- ✅ Production readiness

### Different Audiences

**Dev Ticket**: Product, Developers, QA  
**Change Ticket**: TechOps, SRE, Operations

### Different Lifecycles

**Dev Ticket**: Open → In Progress → Done (when merged)  
**Change Ticket**: Created → Awaiting Approval → Approved → Completed (when deployed)

---

## 🎯 What Developers Need to Know

### You Already Have Dev Tickets

✅ These exist in your current Jira projects (FO, BE, etc.)  
✅ You're already working with these  
✅ **Nothing changes about dev tickets**

### Change Tickets Are New (Created Automatically)

✅ You **don't create** these manually  
✅ ReleaseLens creates them automatically  
✅ You just **reference** your dev ticket in `deployment.yaml`  
✅ GitHub Actions handles the rest

### Your Workflow

```
1. Work on dev ticket (FO-1234)
2. Update deployment.yaml:
   jira_ticket: "FO-1234"  ← Link to existing dev ticket
3. Create git tag
4. GitHub Actions creates Change ticket (CHGTEST-42)
5. Wait for TechOps approval
6. Deploy
```

---

## 🔍 Finding Your Tickets

### Dev Tickets (Your Current Workflow)

**Location**: Your regular Jira project  
**JQL**: `project = FO AND assignee = currentUser()`  
**Dashboard**: Your team's dev dashboard

**Example**:
```
FO-1234: Add export button (In Progress)
FO-5678: Fix login bug (To Do)
```

### Change Tickets (New - Created Automatically)

**Location**: CHGTEST project (Change Management)  
**JQL**: `project = CHGTEST AND "Git Tag" ~ "admin-site-v1.23.0"`  
**Dashboard**: TechOps Change Dashboard

**Example**:
```
CHGTEST-42: [admin-site] Deploy v1.23.0 (Awaiting Approval)
CHGTEST-43: [api-gateway] Deploy v2.5.1 (Completed)
```

### Linking Between Them

In Change ticket description:
```
Related dev ticket: FO-1234
```

You can click the link to see the original development work.

---

## ❓ FAQ

**Q: Do I still create dev tickets like before?**  
A: Yes! Nothing changes. Your PM creates them, you work on them.

**Q: Do I need to create Change tickets?**  
A: No! ReleaseLens creates them automatically when you deploy.

**Q: What's the `jira_ticket` field in deployment.yaml?**  
A: It's the dev ticket you worked on (e.g., FO-1234). ReleaseLens uses this to link the Change ticket to your dev work.

**Q: Can one Change ticket have multiple dev tickets?**  
A: Currently one-to-one. If you deploy multiple features, list all dev tickets in the summary.

**Q: What if I forget to set jira_ticket in deployment.yaml?**  
A: Change ticket still gets created, just without the dev ticket link. Best practice: always link them.

**Q: Do Change tickets replace dev tickets?**  
A: No! They serve different purposes. Dev tickets track work, Change tickets track deployment.

**Q: Who closes the Change ticket?**  
A: GitHub Actions automatically when deployment completes.

**Q: Who closes the dev ticket?**  
A: You or your PM, when the feature is done (usually when PR merges).

---

## 📋 Best Practices

### 1. Always Link Dev Ticket

```yaml
# GOOD
jira_ticket: "FO-1234"

# BAD (missing link)
jira_ticket: ""
```

### 2. Reference Multiple Tickets If Needed

```yaml
# If deploying multiple features
summary: "Deploy user profile updates (FO-1234, FO-5678)"
jira_ticket: "FO-1234"  # Primary ticket
```

### 3. Keep Dev Ticket Updated

When you push a tag:
```
Dev Ticket Comment:
"Deployed in CHGTEST-42 (staging), pending prod approval"
```

### 4. Check Change Status Before Following Up

Don't ask "Why isn't my feature in prod?" 

Check the Change ticket:
- Awaiting Approval → TechOps reviewing
- Approved → Ready to deploy
- Completed → Already deployed

---

## 🎓 Summary

### Two Types of Tickets

1. **Dev Tickets** (FO-1234):
   - Already exist
   - Track feature work
   - You work on these

2. **Change Tickets** (CHGTEST-42):
   - Created automatically
   - Track deployment
   - TechOps uses these

### How They Connect

```
Dev Ticket (FO-1234)
      ↓
  (referenced in)
      ↓
deployment.yaml
      ↓
  (GitHub Actions reads)
      ↓
Change Ticket (CHGTEST-42)
      ↓
  (links back to)
      ↓
Dev Ticket (FO-1234)
```

### Key Takeaway

✅ **You already have dev tickets** - keep using them  
✅ **Change tickets are new** - created automatically  
✅ **Link them together** via `deployment.yaml`  
✅ **No manual Change ticket creation** needed

---

**Last Updated**: 2026-01-28  
**Questions?** See `QUICK_START_DEVELOPERS.md`
