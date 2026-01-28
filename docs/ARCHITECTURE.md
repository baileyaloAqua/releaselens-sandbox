# ReleaseLens - Architecture Overview

> **Key Point**: The `src/jira/` folder IS the automation engine that CI/CD uses to update Jira automatically when reading `deployment.yaml`

---

## 🔄 Complete Flow: deployment.yaml → Jira Dashboard

```
┌──────────────────────────────────────────────────────────────────────┐
│  Step 1: Developer pushes git tag                                   │
│  git tag service-v1.0.0 && git push origin service-v1.0.0          │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             v
┌──────────────────────────────────────────────────────────────────────┐
│  Step 2: GitHub Actions Workflow Triggered                          │
│  .github/workflows/releaselens-v2.yml                               │
│  - Deploys to staging                                               │
│  - Calls composite action                                           │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             v
┌──────────────────────────────────────────────────────────────────────┐
│  Step 3: Composite GitHub Action                                    │
│  .github/actions/releaselens-change/action.yml                      │
│  - Installs Node.js                                                 │
│  - Runs: npm install                                                │
│  - Runs: npm run build (compiles TypeScript)                       │
│  - Executes: node dist/jira/create-change.js                       │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             v
┌──────────────────────────────────────────────────────────────────────┐
│  Step 4: src/jira/create-change.ts (Automation Engine)             │
│  1. Reads .techops/deployment.yaml                                  │
│  2. Parses all fields (service, version, risk, rollback, etc)      │
│  3. Validates manifest structure                                    │
│  4. Maps to Jira custom fields                                      │
│  5. Calls Jira REST API to create Change issue                     │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             v
┌──────────────────────────────────────────────────────────────────────┐
│  Step 5: Jira API                                                   │
│  - Creates new Change issue (e.g., CHGTEST-42)                     │
│  - Populates all custom fields from deployment.yaml                │
│  - Sets status: "Awaiting TechOps Approval"                        │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             v
┌──────────────────────────────────────────────────────────────────────┐
│  Step 6: Jira Dashboard Automatically Updated                      │
│  - New Change appears in TechOps dashboard                         │
│  - All fields populated from deployment.yaml                       │
│  - Ready for TechOps review                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Result**: TechOps sees the change in their Jira dashboard, all fields automatically populated from `deployment.yaml`.

---

## 🏗️ Purpose of Each Component

### 1. `.techops/deployment.yaml` (The Source of Truth)

**Purpose**: Single source of truth for deployment metadata

**Contains**:
- Service name, version
- Risk level, blast radius
- Rollback plan
- Test results
- Owner information

**Read by**: `src/jira/manifest-parser.ts` during CI/CD execution

### 2. `.github/workflows/` (CI/CD Orchestration)

**Purpose**: Orchestrate deployments and trigger Jira updates

**Key workflows**:
- `releaselens-v2.yml` - Staging deployment + Jira creation
- `release-prod-v2.yml` - Production deployment + Jira updates

**Calls**: Composite action to handle Jira operations

### 3. `.github/actions/releaselens-change/` (Reusable Action)

**Purpose**: Reusable wrapper for Jira operations in CI/CD

**What it does**:
```yaml
# Line 86-96: Install and build
- Install Node.js
- Run npm install
- Run npm run build (compiles src/jira/*.ts → dist/jira/*.js)

# Line 117-120: Execute automation
- Run: node dist/jira/create-change.js --manifest deployment.yaml
```

**Why it exists**: Makes Jira integration reusable across all workflows

### 4. `src/jira/` (Automation Engine) ⭐ **THIS IS THE KEY**

**Purpose**: The actual automation code that reads deployment.yaml and updates Jira

#### 4a. `src/jira/manifest-parser.ts`

**Purpose**: Parse and validate deployment.yaml

```typescript
// Line 14-29: Read deployment.yaml file
export function parseManifest(manifestPath: string): DeploymentManifest {
  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = yaml.load(content) as DeploymentManifest;
  validateManifest(manifest);
  return manifest;
}

// Line 68-99: Convert manifest to Jira Change request
export function manifestToChangeRequest(
  manifest: DeploymentManifest,
  gitTag: string,
  githubRunUrl: string,
  environment: 'staging' | 'production' = 'staging'
): JiraChangeRequest {
  // Maps deployment.yaml fields to Jira custom fields
  return {
    service: manifest.service,
    riskLevel: manifest.impact.risk_level,
    rollbackMethod: manifest.rollback.method,
    // ... all fields from deployment.yaml
  };
}
```

**Used by**: CI/CD via `create-change.ts`

#### 4b. `src/jira/client.ts`

**Purpose**: Communicate with Jira REST API

```typescript
// Line 33-72: Create Jira Change issue
async createChange(request: JiraChangeRequest): Promise<JiraIssueResponse> {
  const payload = {
    fields: {
      project: { key: this.projectKey },
      summary: request.summary,
      
      // Custom fields mapped from deployment.yaml
      [JIRA_CUSTOM_FIELDS.SERVICE]: request.service,
      [JIRA_CUSTOM_FIELDS.RISK_LEVEL]: request.riskLevel,
      [JIRA_CUSTOM_FIELDS.ROLLBACK_METHOD]: request.rollbackMethod,
      // ... all fields
    },
  };
  
  const response = await this.client.post('/issue', payload);
  return response.data;
}
```

**Used by**: `create-change.ts` to actually create the Jira issue

#### 4c. `src/jira/create-change.ts`

**Purpose**: CLI entry point for creating Jira Changes (used by CI/CD)

```typescript
// Line 81: Read deployment.yaml
const manifest = parseManifest(args.manifestPath);

// Line 86-91: Convert to Jira format
const changeRequest = manifestToChangeRequest(
  manifest,
  args.gitTag,
  args.githubRunUrl,
  args.environment
);

// Line 98: Create Jira issue
const issue = await client.createChange(changeRequest);
```

**Executed by**: Composite action in CI/CD pipeline

**This is the automation engine that reads deployment.yaml and updates Jira!**

---

## 🎯 Why TypeScript Instead of Inline Bash?

### Old Approach (Problematic)
```yaml
# Inline bash in workflow - hard to maintain
- name: Create Jira issue
  run: |
    RESPONSE=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -u "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" \
      "${JIRA_BASE_URL}/rest/api/3/issue" \
      --data @- <<EOF
    {
      "fields": {
        "project": { "key": "${JIRA_PROJECT_KEY}" },
        "summary": "...",
        "customfield_10001": "$(yq '.service' .techops/deployment.yaml)",
        "customfield_10003": "$(yq '.impact.risk_level' .techops/deployment.yaml)",
        ...
      }
    }
    EOF
    )
```

**Problems**:
- ❌ No type safety
- ❌ Hard to test locally
- ❌ Error handling difficult
- ❌ Duplicated across workflows
- ❌ Hard to debug
- ❌ String escaping nightmares

### New Approach (src/jira/)
```typescript
// Type-safe, testable, reusable
const manifest = parseManifest('.techops/deployment.yaml');
const changeRequest = manifestToChangeRequest(manifest, gitTag, githubRunUrl);
const issue = await client.createChange(changeRequest);
```

**Benefits**:
- ✅ Type safety (compile-time checks)
- ✅ Easy to test locally (`node dist/jira/create-change.js`)
- ✅ Comprehensive error handling
- ✅ Reusable across all services
- ✅ Easy to debug and maintain
- ✅ No string escaping issues

---

## 🚀 Execution in CI/CD

### When Workflow Runs

```bash
# 1. Workflow starts
.github/workflows/releaselens-v2.yml

# 2. Calls composite action
uses: ./.github/actions/releaselens-change

# 3. Composite action builds and runs
npm install
npm run build  # Compiles src/jira/*.ts → dist/jira/*.js

# 4. Executes automation
node dist/jira/create-change.js \
  --manifest .techops/deployment.yaml \
  --tag service-v1.0.0 \
  --environment staging

# 5. Automation reads deployment.yaml
[create-change.js] Reading: .techops/deployment.yaml
[manifest-parser.ts] Parsing YAML...
[manifest-parser.ts] Validating fields...
[manifest-parser.ts] Converting to Jira format...

# 6. Calls Jira API
[client.ts] Creating Jira Change issue...
[client.ts] POST https://your-domain.atlassian.net/rest/api/3/issue
[client.ts] Response: {"key": "CHGTEST-42", "id": "12345"}

# 7. Success
✅ Created Jira Change: CHGTEST-42
View at: https://your-domain.atlassian.net/browse/CHGTEST-42
```

---

## 🔍 Data Flow: deployment.yaml → Jira

```yaml
# .techops/deployment.yaml
service: my-service
version: "1.0.0"
impact:
  risk_level: "high"
  blast_radius: "all users"
rollback:
  method: "rollback_to_version"
  target_version: "0.9.5"
owner:
  team: "platform-team"
```

**↓ Parsed by `manifest-parser.ts`**

```typescript
const manifest: DeploymentManifest = {
  service: "my-service",
  version: "1.0.0",
  impact: {
    risk_level: "high",
    blast_radius: "all users",
  },
  rollback: {
    method: "rollback_to_version",
    target_version: "0.9.5",
  },
  owner: {
    team: "platform-team",
  }
}
```

**↓ Converted to Jira format by `manifestToChangeRequest()`**

```typescript
const changeRequest: JiraChangeRequest = {
  summary: "[my-service] Deploy v1.0.0 to staging",
  service: "my-service",
  riskLevel: "high",
  blastRadius: "all users",
  rollbackMethod: "rollback_to_version",
  rollbackTargetVersion: "0.9.5",
  team: "platform-team",
  // ...
}
```

**↓ Mapped to Jira custom fields by `client.createChange()`**

```typescript
const jiraPayload = {
  fields: {
    project: { key: "CHGTEST" },
    summary: "[my-service] Deploy v1.0.0 to staging",
    issuetype: { name: "Change" },
    customfield_10001: "my-service",        // Service
    customfield_10003: "high",              // Risk Level
    customfield_10004: "all users",         // Blast Radius
    customfield_10008: "rollback_to_version", // Rollback Method
    customfield_10009: "0.9.5",            // Rollback Target
    customfield_10012: "platform-team",    // Team
  }
}
```

**↓ Sent to Jira REST API**

**✅ Appears in Jira Dashboard**

---

## 💡 Bonus: CLI Usage (Testing/Manual)

While the primary purpose is CI/CD automation, you can also run locally for testing:

```bash
# Test Jira integration locally before CI/CD
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_USER_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-token"
export JIRA_CHANGE_PROJECT_KEY="CHGTEST"

# Create a change manually
node dist/jira/create-change.js \
  --manifest .techops/deployment.yaml \
  --tag service-v1.0.0 \
  --environment staging

# Transition a change manually
node dist/jira/transition-change.js \
  --change-key CHGTEST-42 \
  --state "Completed"

# Verify approval manually
node dist/jira/verify-approval.js \
  --change-key CHGTEST-42
```

**This is useful for**:
- Testing Jira integration locally
- Debugging field mapping issues
- Manual operations outside CI/CD
- Learning how the automation works

---

## 📊 Summary

| Component | Purpose | Executed By |
|-----------|---------|-------------|
| `.techops/deployment.yaml` | Source of truth for deployment metadata | Read by CI/CD |
| `.github/workflows/` | CI/CD orchestration | GitHub Actions (automated) |
| `.github/actions/releaselens-change/` | Reusable Jira action wrapper | GitHub Actions (automated) |
| `src/jira/*.ts` | **Automation engine** that reads deployment.yaml and updates Jira | CI/CD via composite action (automated) |
| `dist/jira/*.js` | Compiled JavaScript from TypeScript | Executed by Node.js in CI/CD |

---

## ✅ Key Takeaways

1. **`src/jira/` IS the CI/CD automation** - not manual tooling
2. **deployment.yaml is automatically read** by `src/jira/manifest-parser.ts` during CI/CD
3. **Jira is automatically updated** by `src/jira/client.ts` during CI/CD
4. **TypeScript provides better reliability** than inline bash scripts
5. **Everything is automated** - no manual Jira updates needed
6. **CLI capability is a bonus** for local testing, not the primary purpose

---

## 🔄 Complete Example

```bash
# Developer action
git tag service-v1.0.0 && git push origin service-v1.0.0

# ↓ Automated CI/CD (no human intervention)

# 1. GitHub Actions workflow triggered
# 2. Deploys to staging
# 3. Composite action builds TypeScript
# 4. Runs: node dist/jira/create-change.js
# 5. Reads: .techops/deployment.yaml
# 6. Calls: Jira REST API
# 7. Creates: CHGTEST-42

# ✅ Result: Jira dashboard updated automatically
```

**No manual steps required!** The entire flow from `deployment.yaml` to Jira dashboard is fully automated via `src/jira/`.

---

**Last Updated**: 2026-01-28
