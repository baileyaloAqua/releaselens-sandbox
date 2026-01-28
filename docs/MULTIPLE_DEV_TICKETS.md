# ReleaseLens - Multiple Dev Tickets per Deployment

> **Common Scenario**: One deployment often includes multiple features/bugfixes from different dev tickets

---

## 🎯 The Problem

A single deployment often includes:
- ✅ Multiple features
- ✅ Multiple bugfixes
- ✅ Work from multiple developers
- ✅ Multiple Jira tickets

**Example**:
```
Deployment v1.5.0 includes:
- FO-1234: Add export button
- FO-5678: Fix login bug
- BE-9012: Update API endpoint
```

---

## ✅ The Solution

ReleaseLens supports **multiple dev tickets** in `deployment.yaml`:

### Option 1: Comma-Separated (Recommended)

```yaml
service: admin-site
version: "1.5.0"
summary: "Multiple features and bugfixes"
jira_ticket: "FO-1234, FO-5678, BE-9012"  # ← Comma-separated
```

### Option 2: Single Ticket

```yaml
jira_ticket: "FO-1234"  # Just one ticket
```

### Option 3: No Tickets

```yaml
jira_ticket: ""  # Optional field
```

---

## 📝 How It Works

### Input: deployment.yaml

```yaml
service: admin-site
version: "1.5.0"
summary: "Q1 release: Export feature + Login fix + API updates"
jira_ticket: "FO-1234, FO-5678, BE-9012"
```

### Output: Jira Change Ticket

```
CHGTEST-42: [admin-site] Deploy v1.5.0 to staging

Description:
Deployment Summary: Q1 release: Export feature + Login fix + API updates

Service: admin-site
Environment: staging
Version/Tag: admin-site-v1.5.0

Risk Assessment:
  Risk Level: high
  Blast Radius: multiple features
  ...

Related dev tickets:
  - FO-1234
  - FO-5678
  - BE-9012

GitHub:
  Workflow run: https://github.com/...
```

**All dev tickets linked in the Change ticket description!**

---

## 🔄 Complete Example

### Step 1: Multiple PRs Merged

```
PR #123: [FO-1234] Add export button
  ↓ merged

PR #124: [FO-5678] Fix login bug  
  ↓ merged

PR #125: [BE-9012] Update API endpoint
  ↓ merged
```

### Step 2: Developer Updates deployment.yaml

```yaml
service: admin-site
version: "1.5.0"
summary: "Q1 release: Export + Login fix + API updates"
jira_ticket: "FO-1234, FO-5678, BE-9012"  # ← All three tickets

impact:
  risk_level: "high"
  blast_radius: "Multiple features affecting export, login, and API"
  services_impacted:
    - "admin-site"
    - "api-gateway"
  
rollback:
  target_version: "1.4.9"
  est_time_minutes: 15
```

### Step 3: Create Release Tag

```bash
git tag admin-site-v1.5.0
git push origin admin-site-v1.5.0
```

### Step 4: GitHub Actions Creates Change Ticket

```
CHGTEST-42: [admin-site] Deploy v1.5.0 to staging

Related dev tickets:
  - FO-1234: Add export button
  - FO-5678: Fix login bug
  - BE-9012: Update API endpoint

Status: Awaiting TechOps Approval
```

### Step 5: TechOps Can See All Related Work

TechOps reviews CHGTEST-42 and sees:
- ✅ Links to all 3 dev tickets
- ✅ Can click to see each feature's details
- ✅ Can review all acceptance criteria
- ✅ Complete context for approval decision

---

## 📊 Traceability

### From Change Ticket → Dev Tickets

```
CHGTEST-42 (Change)
    ↓
Links to:
├── FO-1234 (Dev - Export feature)
├── FO-5678 (Dev - Login bugfix)
└── BE-9012 (Dev - API update)
```

**Click any link to see feature details**

### From Dev Ticket → Change Ticket

```
FO-1234 (Dev - Export feature)
    ↓
Search Jira:
"Related dev tickets: FO-1234"
    ↓
Find: CHGTEST-42 (Deployment)
```

**Bidirectional traceability!**

---

## 🎯 Best Practices

### 1. List All Significant Changes

```yaml
# GOOD - All major work listed
jira_ticket: "FO-1234, FO-5678, BE-9012"
summary: "Export feature + Login fix + API updates"
```

```yaml
# OK - Minor changes can be omitted
jira_ticket: "FO-1234, FO-5678"
summary: "Export feature + Login fix + minor refactoring"
```

### 2. Use Consistent Format

```yaml
# GOOD - Clear spacing
jira_ticket: "FO-1234, FO-5678, BE-9012"

# ALSO GOOD - No spaces
jira_ticket: "FO-1234,FO-5678,BE-9012"

# ALSO GOOD - Line break for readability
jira_ticket: "FO-1234, FO-5678, BE-9012, 
              FO-7890, BE-3456"
```

### 3. Match Summary to Tickets

```yaml
jira_ticket: "FO-1234, FO-5678"
summary: "Export button + Login fix"  # ← Mentions both
```

### 4. Include Primary Ticket First

```yaml
jira_ticket: "FO-1234, FO-5678, BE-9012"
             ^^^^^^^^
             Primary feature
```

---

## 🔍 Finding Related Deployments

### JQL: Find All Deployments with Specific Dev Ticket

```jql
project = CHGTEST AND description ~ "FO-1234" ORDER BY created DESC
```

**Shows all deployments that included FO-1234**

### JQL: Find All Deployments for a Service

```jql
project = CHGTEST AND Service = "admin-site" ORDER BY created DESC
```

### JQL: Find Recent Deployments with Multiple Tickets

```jql
project = CHGTEST AND description ~ "Related dev tickets" AND created >= -30d
```

---

## 💡 Common Scenarios

### Scenario 1: Sprint Release (Many Tickets)

```yaml
service: admin-site
version: "2.0.0"
summary: "Sprint 45 release - 8 features and 3 bugfixes"
jira_ticket: "FO-1234, FO-1245, FO-1256, FO-1267, FO-1278, 
              FO-1289, FO-1290, FO-1301, FO-5678, FO-5689, FO-5690"
```

### Scenario 2: Hotfix (Single Ticket)

```yaml
service: payments
version: "1.4.3"
summary: "HOTFIX: Fix payment processing bug"
jira_ticket: "URGENT-789"
change_type: "hotfix"
```

### Scenario 3: Multiple Services (Cross-Service Feature)

```yaml
service: api-gateway
version: "3.1.0"
summary: "Cross-service feature: New authentication flow"
jira_ticket: "FO-1234, BE-5678, AUTH-9012"  # Tickets from different projects

impact:
  services_impacted:
    - "api-gateway"
    - "frontend"
    - "auth-service"
```

### Scenario 4: Refactoring (No User-Facing Changes)

```yaml
service: user-db
version: "4.2.0"
summary: "Database optimization and code refactoring"
jira_ticket: "TECH-4567, TECH-4568"  # Tech debt tickets
```

---

## 📋 Developer Checklist

When preparing deployment.yaml with multiple tickets:

- [ ] Listed all significant dev tickets
- [ ] Tickets in logical order (primary first)
- [ ] Summary mentions all major changes
- [ ] Each ticket is valid and merged
- [ ] Comma-separated format used
- [ ] No typos in ticket IDs

---

## 🎓 Summary

### Multiple Dev Tickets Support

✅ **Supported**: `jira_ticket: "FO-1234, FO-5678, BE-9012"`  
✅ **Flexible**: Single ticket, multiple tickets, or none  
✅ **Formatted Nicely**: Listed in Change ticket description  
✅ **Traceable**: Links back to all dev work  
✅ **TechOps Friendly**: See all related work in one view  

### How to Use

```yaml
# Single ticket
jira_ticket: "FO-1234"

# Multiple tickets (comma-separated)
jira_ticket: "FO-1234, FO-5678, BE-9012"

# Many tickets (use line break for readability)
jira_ticket: "FO-1234, FO-5678, BE-9012,
              FO-7890, BE-3456, TECH-1111"

# No tickets (optional)
jira_ticket: ""
```

### Result in Jira

```
Change Ticket: CHGTEST-42

Related dev tickets:
  - FO-1234
  - FO-5678
  - BE-9012

Full traceability for TechOps approval!
```

---

**Last Updated**: 2026-01-28  
**See Also**: `docs/JIRA_TICKETS_EXPLAINED.md`, `QUICK_START_DEVELOPERS.md`
