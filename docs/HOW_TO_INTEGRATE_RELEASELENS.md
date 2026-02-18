# How to Integrate ReleaseLens into Your Existing Deployment Workflows

**Target repo:** `aq-monorepo`  
**Goal:** Add Jira Change creation on STAGING and approval gate + transition on PROD/CERT, using your existing "Deploy to STAGING" and "Deploy to PROD and CERT" workflows.

---

## Step 1 — Copy ReleaseLens into aq-monorepo

Copy these from the **releaselens-sandbox** repo (or this repo) into **aq-monorepo**:

| Copy this | Into aq-monorepo at |
|-----------|---------------------|
| `.github/actions/releaselens-change/` (entire folder, including `action.yml`) | `.github/actions/releaselens-change/` |
| `src/jira/` (all `.ts` files: `client.ts`, `config.ts`, `create-change.ts`, `manifest-parser.ts`, `transition-change.ts`, `types.ts`, `verify-approval.ts`, `index.ts`) | `src/jira/` |

Ensure **aq-monorepo** can build the Jira code:

- If aq-monorepo already has a root `package.json` and `tsconfig.json`, add the Jira dependencies and build the `src/jira` folder. The composite action runs from the repo root and expects `npm install` and `npm run build` to produce `dist/jira/*.js`.
- Add to `package.json` (merge into existing):
  - **dependencies:** `"axios"`, `"js-yaml"`
  - **devDependencies:** `"typescript"`, `"@types/node"`, `"@types/js-yaml"`
  - **scripts:** `"build": "tsc"` (or ensure your existing `build` compiles `src/jira` so `dist/jira/create-change.js`, `transition-change.js`, `verify-approval.js` exist).
- Ensure `tsconfig.json` compiles `src/jira/**/*.ts` into `dist/jira/`.

The action runs: `npm install` and `npm run build` then `node dist/jira/create-change.js` (or transition/verify) with args.

---

## Step 2 — Configure Jira secrets in aq-monorepo

In the **aq-monorepo** GitHub repo (or org): **Settings → Secrets and variables → Actions**, add:

| Secret name | Description |
|-------------|-------------|
| `JIRA_BASE_URL` | Jira base URL (e.g. `https://your-domain.atlassian.net`) |
| `JIRA_USER_EMAIL` | Jira user email for API auth |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_CHANGE_PROJECT_KEY` | Project key for Change issues (e.g. `CHGTEST`) |

Use the same secrets for both the STAGING and PROD/CERT workflows.

---

## Step 3 — Add one deployment manifest per project (for STAGING)

ReleaseLens **Create** step (staging) reads a manifest per project. Add a YAML file for each project you want to track.

- **Path pattern:** `.techops/deployments/<project>.yaml`  
  Example: `.techops/deployments/compliance.yaml`, `.techops/deployments/platform-webapp.yaml`
- **Content:** One file per project; the `service` field must match the project name (e.g. `service: compliance`).

**Example** (`.techops/deployments/compliance.yaml`):

```yaml
service: compliance
version: "staging"
environment: staging
summary: "Staging deploy from workflow_dispatch"
jira_ticket: ""
change_type: "deployment"
impact:
  user_visible: true
  blast_radius: "staging only"
  services_impacted: [compliance]
  data_migration: false
  backward_compatible: true
  risk_level: "high"
tests:
  unit: passed
  integration: passed
  load: not_run
  test_report_url: ""
rollback:
  method: "rollback_to_previous"
  target_version: "previous"
  est_time_minutes: 10
  data_restore_required: false
owner:
  team: "your-team"
  slack_channel: "#your-channel"
```

Add a similar file for each project (e.g. `platform-webapp`, `aquacams`, …) you deploy to staging and want to track in Jira.

---

## Step 4 — Integrate into the **Deploy to STAGING** workflow

Open the workflow file that runs **Deploy to STAGING** (e.g. `deploy-staging.yml` or the file that has `name: Deploy to STAGING`).

1. In the job **lint-test-build-deploy**, find the step **Run target=test** (and the steps that set `AFFECTED_PROJECTS`: **Determine affected** / **Determine all matching projects**).
2. **After** **Run target=test** and **before or after** **Run target=pr-sync branch=main**, add this step:

```yaml
- name: Create Jira Change issue
  id: create-change
  if: inputs.projects != 'none' && env.AFFECTED_PROJECTS != ''
  uses: ./.github/actions/releaselens-change
  with:
    action: create
    manifest-path: .techops/deployments/${{ inputs.projects }}.yaml
    git-tag: ${{ inputs.projects }}-${{ github.sha }}
    environment: staging
    jira-base-url: ${{ secrets.JIRA_BASE_URL }}
    jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
    jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
    jira-project-key: ${{ secrets.JIRA_CHANGE_PROJECT_KEY }}
```

3. *(Optional)* To use the created Change key in Slack or later steps, add job **outputs** and reference `steps.create-change.outputs.change-key` in a later step.

After this, each staging deploy (for a selected project with a manifest) will create a Jira Change issue. TechOps can approve it for production.

---

## Step 5 — Integrate into the **Deploy to PROD and CERT** workflow

Open the workflow file that runs **Deploy to PROD and CERT** (e.g. `deploy-prod-cert.yml`).

### 5.1 Add workflow input

Under `on.workflow_dispatch.inputs`, add (e.g. after `skip_cache`):

```yaml
jira_change_key:
  type: string
  description: 'Jira Change key from staging (required for PROD deploy; leave empty for CERT-only)'
  required: false
```

### 5.2 Add steps in the job **lint-test-build-deploy**

Use the same job that has **Run target=lint**, **Run target=test**, **Run target=push on PROD**, and **Run target=push on CERT**.

**A. Optional — Require key for PROD**  
If you want to block PROD when no Jira key is provided, add this step **before** "Run target=push on PROD":

```yaml
- name: Require Jira Change key for PROD
  if: env.AFFECTED_PROJECTS != '' && !inputs.cert_only
  run: |
    if [ -z "${{ inputs.jira_change_key }}" ]; then
      echo "::error::PROD deploy requires a Jira Change key from staging. Re-run with jira_change_key set."
      exit 1
    fi
```

**B. Verify approval (before PROD push)**  
Add **before** the step **Run target=push on PROD**:

```yaml
- name: Verify Jira Change approval (required for PROD)
  if: env.AFFECTED_PROJECTS != '' && !inputs.cert_only && inputs.jira_change_key != ''
  uses: ./.github/actions/releaselens-change
  with:
    action: verify
    change-key: ${{ inputs.jira_change_key }}
    jira-base-url: ${{ secrets.JIRA_BASE_URL }}
    jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
    jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
    jira-project-key: ${{ secrets.JIRA_CHANGE_PROJECT_KEY }}
```

**C. Keep** the existing step **Run target=push on PROD** unchanged (e.g. `if: ${{ env.AFFECTED_PROJECTS != '' && !inputs.cert_only }}`).

**D. Transition to Completed (after PROD push)**  
Add **immediately after** the step **Run target=push on PROD**:

```yaml
- name: Transition Jira Change to Completed
  if: env.AFFECTED_PROJECTS != '' && !inputs.cert_only && inputs.jira_change_key != ''
  uses: ./.github/actions/releaselens-change
  with:
    action: transition
    change-key: ${{ inputs.jira_change_key }}
    target-state: Completed
    jira-base-url: ${{ secrets.JIRA_BASE_URL }}
    jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
    jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
    jira-project-key: ${{ secrets.JIRA_CHANGE_PROJECT_KEY }}
```

**E. Keep** the existing step **Run target=push on CERT** unchanged.

Order in the job: … → **Verify** → **Run target=push on PROD** → **Transition** → **Run target=push on CERT**.

---

## Step 6 — Run the flow

1. **Staging:** Run "Deploy to STAGING", choose a project that has a manifest under `.techops/deployments/<project>.yaml`. The run creates a Jira Change; note the issue key (e.g. `CHGTEST-123`) from the run summary or Jira.
2. **TechOps:** Approve that Change in Jira (move to your "Approved" or "Ready for production" state).
3. **PROD:** Run "Deploy to PROD and CERT" with the same (or intended) project, leave **Only deploy to CERT** unchecked, and set **Jira Change key** to the key from step 1 (e.g. `CHGTEST-123`). The workflow will verify approval, then push to PROD, then transition the Change to Completed. For **CERT-only** runs, leave the Jira Change key empty.

---

## Quick checklist

- [ ] ReleaseLens action at `.github/actions/releaselens-change/` and `src/jira/` (and build) in aq-monorepo  
- [ ] Jira secrets set in aq-monorepo  
- [ ] At least one manifest at `.techops/deployments/<project>.yaml` for a project you deploy to staging  
- [ ] STAGING workflow: **Create Jira Change issue** step added after test, before/after pr-sync  
- [ ] PROD/CERT workflow: **jira_change_key** input added; **Verify** before PROD push; **Transition** after PROD push  
- [ ] Optional: **Require Jira Change key for PROD** step when you want to block PROD without a key  

**More detail:** [Shared workflow (STAGING + PROD + CERT)](INTEGRATE_SHARED_WORKFLOW.md)
