# ReleaseLens - Documentation Index

> **Quick Navigation**: Find the right document for your role

---

## 🚀 Getting Started

### New to ReleaseLens?

Start here:

1. **`HOW_IT_WORKS.md`** - Simple explanation (2 min read)
2. **`QUICK_START_DEVELOPERS.md`** - For developers (5 min read)
3. **`POLICY_SUMMARY.md`** - For TechOps (2 min read)

---

## 👨‍💻 For Developers

### Essential Reading

| Priority | Document | Purpose | Read Time |
|----------|----------|---------|-----------|
| 🔴 **Must Read** | `QUICK_START_DEVELOPERS.md` | 5-minute quick start | 5 min |
| 🔴 **Must Read** | `HOW_IT_WORKS.md` | How the system works | 2 min |
| 🟡 Recommended | `docs/JIRA_TICKETS_EXPLAINED.md` | Dev vs Change tickets | 5 min |
| 🟡 Recommended | `docs/DEVELOPER_WORKFLOW.md` | Complete workflow guide | 10 min |
| ⚪ Reference | `.techops/deployment.yaml` | Manifest template | 2 min |

### Key Points for Developers

✅ **Dev tickets (FO-1234) already exist** - keep using them as normal  
✅ **You update `deployment.yaml`** - reference your dev ticket  
✅ **GitHub Actions creates Change tickets (CHGTEST-42) automatically**  
✅ **Change tickets link to your dev tickets**  
✅ **No manual Change ticket creation needed**  
✅ **TechOps approves Change tickets, you deploy**

---

## 🔒 For TechOps

### Essential Reading

| Priority | Document | Purpose | Read Time |
|----------|----------|---------|-----------|
| 🔴 **Must Read** | `POLICY_SUMMARY.md` | Quick policy overview | 2 min |
| 🔴 **Must Read** | `docs/HIGH_RISK_POLICY.md` | Complete approval policy | 15 min |
| 🟡 Recommended | `HOW_IT_WORKS.md` | System overview | 2 min |
| ⚪ Reference | `docs/QUICK_REFERENCE.md` | CLI & JQL queries | 5 min |

### Key Points for TechOps

✅ **All production deployments require your approval**  
✅ **Jira Changes appear automatically with all fields populated**  
✅ **Review in Jira, approve or reject**  
✅ **No manual data entry needed**

---

## ⚙️ For DevOps/Setup

### Essential Reading

| Priority | Document | Purpose | Read Time |
|----------|----------|---------|-----------|
| 🔴 **Must Read** | `SETUP_CHECKLIST.md` | Step-by-step setup | 30 min |
| 🔴 **Must Read** | `docs/RELEASELENS_SETUP.md` | Complete Jira setup | 45 min |
| 🟡 Recommended | `docs/ARCHITECTURE.md` | How automation works | 20 min |
| 🟡 Recommended | `docs/FLOW_DIAGRAM.md` | Visual flow diagram | 10 min |
| ⚪ Reference | `docs/IMPLEMENTATION_ALIGNMENT.md` | Alignment verification | 10 min |

### Key Points for Setup

✅ **One-time Jira setup required (project, fields, workflow)**  
✅ **TypeScript automation already built**  
✅ **GitHub Actions read deployment.yaml automatically**  
✅ **Per-service rollout after initial setup**

---

## 📊 For Leadership/PM

### Essential Reading

| Priority | Document | Purpose | Read Time |
|----------|----------|---------|-----------|
| 🔴 **Must Read** | `docs/DELIVERY_SUMMARY.md` | Project delivery summary | 10 min |
| 🟡 Recommended | `docs/CONFLUENCE_IMPLEMENTATION.md` | Confluence-ready docs | 20 min |
| ⚪ Reference | `docs/IMPLEMENTATION_ALIGNMENT.md` | Requirements alignment | 10 min |

### Key Points for Leadership

✅ **100% automated Jira change management**  
✅ **All production deployments require TechOps approval**  
✅ **Complete audit trail and compliance**  
✅ **Ready for immediate pilot deployment**

---

## 📖 Complete Document List

### Root Level

| Document | For | Purpose |
|----------|-----|---------|
| `README.md` | Everyone | Project overview |
| `HOW_IT_WORKS.md` | Everyone | Simple explanation |
| `QUICK_START_DEVELOPERS.md` | Developers | 5-min quick start |
| `POLICY_SUMMARY.md` | Everyone | Quick policy reference |
| `SETUP_CHECKLIST.md` | DevOps | Setup checklist |
| `INDEX.md` | Everyone | This file - documentation index |

### docs/ Folder

| Document | For | Purpose |
|----------|-----|---------|
| `docs/DEVELOPER_WORKFLOW.md` | Developers | Complete workflow |
| `docs/JIRA_TICKETS_EXPLAINED.md` | Developers | Dev vs Change tickets |
| `docs/MULTIPLE_DEV_TICKETS.md` | Developers | Multiple tickets per deployment |
| `docs/HIGH_RISK_POLICY.md` | TechOps | Complete policy |
| `docs/RELEASELENS_SETUP.md` | DevOps | Jira setup (7 phases) |
| `docs/ARCHITECTURE.md` | Tech leads | Technical architecture |
| `docs/FLOW_DIAGRAM.md` | Everyone | Visual flow diagram |
| `docs/QUICK_REFERENCE.md` | TechOps/Dev | CLI & JQL reference |
| `docs/DELIVERY_SUMMARY.md` | Leadership | Project delivery |
| `docs/CONFLUENCE_IMPLEMENTATION.md` | PM | Confluence docs |
| `docs/IMPLEMENTATION_ALIGNMENT.md` | Leadership | Alignment proof |

---

## 🎯 Quick Navigation by Task

### "I want to make my first deployment"
→ `QUICK_START_DEVELOPERS.md`

### "I want to understand how it works"
→ `HOW_IT_WORKS.md`

### "I need to review a deployment (TechOps)"
→ `POLICY_SUMMARY.md` → Jira dashboard

### "I need to set up ReleaseLens"
→ `SETUP_CHECKLIST.md` → `docs/RELEASELENS_SETUP.md`

### "I want to understand the architecture"
→ `docs/ARCHITECTURE.md` → `docs/FLOW_DIAGRAM.md`

### "I need to see deployment metrics"
→ `docs/QUICK_REFERENCE.md` (JQL queries section)

### "I want proof it matches requirements"
→ `docs/IMPLEMENTATION_ALIGNMENT.md`

### "I need Confluence documentation"
→ `docs/CONFLUENCE_IMPLEMENTATION.md`

---

## ❓ FAQ Navigation

**Q: How does GitHub Actions read deployment.yaml?**  
A: See `docs/ARCHITECTURE.md` → "Complete Flow" section

**Q: What do I update in deployment.yaml?**  
A: See `QUICK_START_DEVELOPERS.md` → "Step 1" section

**Q: Why do all deployments need approval?**  
A: See `POLICY_SUMMARY.md` → "Why This Policy" section

**Q: How do I set up Jira?**  
A: See `docs/RELEASELENS_SETUP.md` → "Step 1-7" sections

**Q: What if deployment fails?**  
A: See `docs/DEVELOPER_WORKFLOW.md` → "Rollback" section

**Q: How long does TechOps approval take?**  
A: See `POLICY_SUMMARY.md` → "Timeline" section

---

## 📊 Document Statistics

- **Total documents**: 15
- **For developers**: 4 essential docs
- **For TechOps**: 3 essential docs
- **For DevOps**: 4 essential docs
- **For leadership**: 3 docs
- **Total pages**: ~65 pages of documentation

---

## 🎓 Recommended Reading Order

### For Developers (30 minutes)

1. `HOW_IT_WORKS.md` (2 min)
2. `QUICK_START_DEVELOPERS.md` (5 min)
3. `docs/DEVELOPER_WORKFLOW.md` (10 min)
4. `POLICY_SUMMARY.md` (2 min)
5. Try a test deployment (10 min)

### For TechOps (30 minutes)

1. `HOW_IT_WORKS.md` (2 min)
2. `POLICY_SUMMARY.md` (2 min)
3. `docs/HIGH_RISK_POLICY.md` (15 min)
4. `docs/QUICK_REFERENCE.md` (5 min)
5. Review a test Change in Jira (5 min)

### For DevOps (2 hours)

1. `HOW_IT_WORKS.md` (2 min)
2. `docs/ARCHITECTURE.md` (20 min)
3. `SETUP_CHECKLIST.md` (30 min)
4. `docs/RELEASELENS_SETUP.md` (45 min)
5. Complete setup (varies)

---

**Last Updated**: 2026-01-28  
**Need help?** Start with `HOW_IT_WORKS.md`
