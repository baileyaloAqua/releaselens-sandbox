# Jira Tickets - Quick Guide

> **TL;DR**: Dev tickets already exist (your feature work). Change tickets are created automatically (deployment tracking).

---

## 🎫 Two Types of Tickets

### Type 1: Development Tickets (Already Exist)

```
Project: FrontOffice (FO) / Backend (BE) / etc.
Example: FO-1234: Add export button

Created by: Product Manager
Used by: Developers
Purpose: Track feature development
```

**You already have these!** Nothing changes.

---

### Type 2: Change Tickets (Created Automatically)

```
Project: CHGTEST (Change Management)
Example: CHGTEST-42: [admin-site] Deploy v1.23.0

Created by: GitHub Actions (automatic)
Used by: TechOps
Purpose: Track deployment & approval
```

**ReleaseLens creates these!** You don't make them manually.

---

## 🔗 How They Connect

```
Step 1: PM creates dev ticket
┌─────────────────────────┐
│ FO-1234                 │
│ Add export button       │
│ Status: To Do           │
└─────────────────────────┘

Step 2: You work on it
        ↓
┌─────────────────────────┐
│ FO-1234                 │
│ Status: In Progress     │
└─────────────────────────┘

Step 3: You update deployment.yaml
┌────────────────────────────────────────┐
│ deployment.yaml:                       │
│   jira_ticket: "FO-1234, FO-5678"      │ ← Link to dev tickets (can be multiple)
└────────────────────────────────────────┘

Step 4: You push git tag
        ↓
┌─────────────────────────────────┐
│ GitHub Actions reads yaml       │
│ Creates Change ticket (auto)    │
└─────────────────────────────────┘
        ↓
┌────────────────────────────────────────┐
│ CHGTEST-42                             │
│ [admin-site] Deploy v1.23.0            │
│ Status: Awaiting Approval              │
│ Related dev tickets: ←─────────────────┼─── Links back to all
│   - FO-1234                            │
│   - FO-5678                            │
└────────────────────────────────────────┘

Result: Two tickets, linked
┌─────────────────┐       ┌──────────────────┐
│ FO-1234         │←─────→│ CHGTEST-42       │
│ (Dev work)      │ Linked│ (Deployment)     │
│ Status: Done    │       │ Status: Pending  │
└─────────────────┘       └──────────────────┘
```

---

## ✅ What You Do

1. ✅ Work on **existing dev ticket** (FO-1234)
2. ✅ Update `deployment.yaml` with `jira_ticket: "FO-1234"`
3. ✅ Push git tag
4. ✅ **Done!** Change ticket (CHGTEST-42) created automatically

---

## ❌ What You DON'T Do

- ❌ Create Change tickets manually
- ❌ Fill out Change ticket fields
- ❌ Update dashboards

---

## 📊 Side-by-Side Comparison

| | Dev Ticket | Change Ticket |
|---|------------|---------------|
| **Example** | FO-1234 | CHGTEST-42 |
| **Purpose** | Track feature work | Track deployment |
| **Created by** | PM | GitHub Actions |
| **You create?** | No (PM does) | No (automated) |
| **You work on?** | Yes | No |
| **TechOps approves?** | No | Yes |
| **Project** | FO/BE/etc | CHGTEST |

---

## 💡 Key Points

### Dev Tickets (FO-1234)
- ✅ Already exist in your projects
- ✅ You're already working with these
- ✅ **Nothing changes!**

### Change Tickets (CHGTEST-42)
- ✅ Created automatically when you deploy
- ✅ You reference your dev ticket in deployment.yaml
- ✅ ReleaseLens links them together
- ✅ **Fully automated!**

---

## 🎯 Example

### Monday: PM creates dev ticket
```
FO-1234: Add export button
Status: To Do
```

### Tuesday: You work on it
```
FO-1234
Status: In Progress
```

### Wednesday: PR merged
```
FO-1234
Status: Done
```

### Thursday: You deploy
```
# deployment.yaml
jira_ticket: "FO-1234"

# Push tag
git tag admin-site-v1.23.0
git push origin tag
```

### Thursday (2 mins later): Change ticket created automatically
```
CHGTEST-42: [admin-site] Deploy v1.23.0
Status: Awaiting TechOps Approval
Related: FO-1234

Now you have TWO tickets:
- FO-1234 (your dev work) ← already existed
- CHGTEST-42 (deployment) ← just created
```

---

## ❓ Quick FAQ

**Q: Do I create Change tickets?**  
A: No! GitHub Actions creates them automatically.

**Q: What about dev tickets?**  
A: Keep using them as normal. Nothing changes.

**Q: What's `jira_ticket` in deployment.yaml?**  
A: Reference to your **existing dev ticket** (FO-1234).

**Q: Will I see two tickets?**  
A: Yes! Dev ticket (your work) + Change ticket (deployment).

---

**Read more**: `docs/JIRA_TICKETS_EXPLAINED.md` (complete guide)

**Last Updated**: 2026-01-28
