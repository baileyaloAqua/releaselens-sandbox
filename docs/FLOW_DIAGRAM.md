# ReleaseLens - Data Flow Diagram

> **Visual guide**: How deployment.yaml automatically updates Jira via src/jira/

---

## 📊 Complete Automation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer Action                                               │
│  ┌──────────────────────┐                                       │
│  │ git tag service-v1.0 │                                       │
│  │ git push origin tag  │                                       │
│  └──────────────────────┘                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │ Push triggers workflow
                         v
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions Workflow: .github/workflows/releaselens-v2.yml  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Deploy to staging environment                         │  │
│  │ 2. Call composite action to create Jira Change           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ uses: ./.github/actions/releaselens-change
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Composite Action: .github/actions/releaselens-change/action.yml│
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 1: Setup Node.js                                    │  │
│  │ Step 2: npm install (install dependencies)               │  │
│  │ Step 3: npm run build (compile TypeScript)               │  │
│  │         src/jira/*.ts → dist/jira/*.js                   │  │
│  │ Step 4: Execute automation:                              │  │
│  │         node dist/jira/create-change.js \                │  │
│  │           --manifest .techops/deployment.yaml \          │  │
│  │           --tag service-v1.0.0 \                         │  │
│  │           --environment staging                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ node executes compiled JavaScript
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Automation: src/jira/create-change.ts (compiled to .js)        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Read file: .techops/deployment.yaml                   │  │
│  │    const manifest = parseManifest('.techops/...')        │  │
│  │                                                           │  │
│  │ 2. Parse YAML (src/jira/manifest-parser.ts):            │  │
│  │    - service: "my-service"                               │  │
│  │    - version: "1.0.0"                                    │  │
│  │    - risk_level: "high"                                  │  │
│  │    - rollback: { method: "...", target: "..." }         │  │
│  │    - owner: { team: "...", slack: "..." }               │  │
│  │                                                           │  │
│  │ 3. Convert to Jira format:                               │  │
│  │    const changeRequest = manifestToChangeRequest(...)    │  │
│  │                                                           │  │
│  │ 4. Map to Jira custom fields (src/jira/config.ts):      │  │
│  │    {                                                     │  │
│  │      customfield_10001: manifest.service,               │  │
│  │      customfield_10003: manifest.impact.risk_level,     │  │
│  │      customfield_10008: manifest.rollback.method,       │  │
│  │      ...                                                 │  │
│  │    }                                                     │  │
│  │                                                           │  │
│  │ 5. Create Jira issue (src/jira/client.ts):              │  │
│  │    const issue = await client.createChange(request)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP POST to Jira REST API
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Jira REST API: POST /rest/api/3/issue                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ {                                                         │  │
│  │   "fields": {                                             │  │
│  │     "project": { "key": "CHGTEST" },                     │  │
│  │     "summary": "[my-service] Deploy v1.0.0 to staging",  │  │
│  │     "issuetype": { "name": "Change" },                   │  │
│  │     "customfield_10001": "my-service",                   │  │
│  │     "customfield_10003": "high",                         │  │
│  │     "customfield_10008": "rollback_to_version",          │  │
│  │     ...all fields from deployment.yaml...                │  │
│  │   }                                                       │  │
│  │ }                                                         │  │
│  │                                                           │  │
│  │ Response: { "key": "CHGTEST-42", "id": "12345" }        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ Jira issue created
                         v
┌─────────────────────────────────────────────────────────────────┐
│  Jira Dashboard: Automatically Updated                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ New Change Issue: CHGTEST-42                             │  │
│  │ Status: Awaiting TechOps Approval                        │  │
│  │                                                           │  │
│  │ Service:         my-service                              │  │
│  │ Version:         1.0.0                                   │  │
│  │ Risk Level:      high                                    │  │
│  │ Rollback Method: rollback_to_version                     │  │
│  │ Target Version:  0.9.5                                   │  │
│  │ Team:            platform-team                           │  │
│  │ Git Tag:         service-v1.0.0                          │  │
│  │ GitHub Run:      [link to workflow]                      │  │
│  │                                                           │  │
│  │ ✅ All fields automatically populated from               │  │
│  │    .techops/deployment.yaml                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│  TechOps Reviews in Jira                                        │
│  - Reviews all fields                                           │
│  - Approves or rejects                                          │
│  - Transitions to "Approved for Prod"                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Points

### 1. **Everything is Automated**
- Developer pushes tag → Jira updated automatically
- No manual Jira ticket creation
- No copy/paste of deployment info

### 2. **src/jira/ is the Automation Engine**
- Compiled to JavaScript by CI/CD
- Executed by Node.js in GitHub Actions
- Reads deployment.yaml automatically
- Calls Jira API automatically

### 3. **deployment.yaml is the Single Source of Truth**
- All deployment metadata in one place
- Automatically parsed and validated
- Automatically mapped to Jira fields
- Version controlled with code

### 4. **Type Safety Prevents Errors**
- TypeScript catches errors at compile time
- Field mappings are validated
- API responses are type-checked
- Better than bash/curl scripts

---

## 📁 File Responsibilities

| File | What It Does | When It Runs |
|------|-------------|--------------|
| `.techops/deployment.yaml` | Contains deployment metadata | Read by automation |
| `.github/workflows/releaselens-v2.yml` | Orchestrates deployment + Jira update | On git tag push |
| `.github/actions/releaselens-change/action.yml` | Builds and executes TypeScript | Called by workflow |
| `src/jira/manifest-parser.ts` | Reads and parses deployment.yaml | During CI/CD execution |
| `src/jira/client.ts` | Communicates with Jira REST API | During CI/CD execution |
| `src/jira/create-change.ts` | Coordinates the full process | Executed by Node.js in CI/CD |
| `dist/jira/*.js` | Compiled JavaScript | What actually runs in CI/CD |

---

## 🎯 What This Means

### For Developers
✅ Update deployment.yaml  
✅ Push git tag  
✅ **That's it!** Jira updated automatically

### For TechOps
✅ See new Change in Jira dashboard automatically  
✅ All fields pre-populated from deployment.yaml  
✅ Review and approve/reject

### For Operations
✅ No manual ticket creation  
✅ Consistent data format  
✅ Full audit trail  
✅ Type-safe implementation

---

## 🚀 Example: Real Execution Log

```
[GitHub Actions] Tag pushed: service-v1.0.0
[GitHub Actions] Triggering workflow: releaselens-v2.yml
[GitHub Actions] Step: Deploy to staging ✓
[GitHub Actions] Step: Create Jira Change
[Composite Action] Installing Node.js v20...
[Composite Action] Running: npm install
[Composite Action] Running: npm run build
[TypeScript Compiler] Compiling src/jira/*.ts → dist/jira/*.js
[Composite Action] Executing: node dist/jira/create-change.js

[create-change.js] Starting ReleaseLens - Creating Jira Change Issue
[create-change.js] Configuration:
[create-change.js]   Manifest: .techops/deployment.yaml
[create-change.js]   Git Tag: service-v1.0.0
[create-change.js]   Environment: staging

[manifest-parser.ts] Reading deployment manifest...
[manifest-parser.ts] Parsing YAML content...
[manifest-parser.ts] ✓ Parsed deployment manifest for my-service v1.0.0
[manifest-parser.ts]   Risk Level: high

[manifest-parser.ts] Converting manifest to Jira change request...
[manifest-parser.ts] ✓ Mapped all fields to Jira format

[client.ts] Creating Jira Change issue...
[client.ts] POST https://your-domain.atlassian.net/rest/api/3/issue
[client.ts] Request payload:
[client.ts]   {
[client.ts]     "fields": {
[client.ts]       "project": { "key": "CHGTEST" },
[client.ts]       "summary": "[my-service] Deploy v1.0.0 to staging",
[client.ts]       "customfield_10001": "my-service",
[client.ts]       "customfield_10003": "high",
[client.ts]       ...
[client.ts]     }
[client.ts]   }

[client.ts] Response: { "key": "CHGTEST-42", "id": "12345" }
[client.ts] ✓ Successfully created Jira Change issue

[create-change.js] ✅ Success! Created Jira Change: CHGTEST-42
[create-change.js]    View at: https://your-domain.atlassian.net/browse/CHGTEST-42

[GitHub Actions] ✓ Jira Change created successfully
[GitHub Actions] Change Key: CHGTEST-42
[GitHub Actions] Risk Level: high

[GitHub Actions] Step: Send Slack notification
[GitHub Actions] ✓ Workflow completed successfully
```

---

**Result**: Jira dashboard shows CHGTEST-42 with all fields from deployment.yaml, ready for TechOps review.

**Time**: ~2 minutes from git push to Jira update.

**Manual steps**: Zero. Fully automated.

---

**Last Updated**: 2026-01-28
