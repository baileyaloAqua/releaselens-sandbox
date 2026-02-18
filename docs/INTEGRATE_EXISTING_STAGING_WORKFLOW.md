# Integrating ReleaseLens — STAGING Deploy

> **Repo:** `aq-monorepo`  
> **Guide for adding Jira Change creation to your "Deploy to STAGING" workflow**

---

## Workflow reference (Deploy to STAGING)

This doc is aligned with the **aq-monorepo** workflow that has:

- **Repo:** `aq-monorepo`
- **Name:** `name: Deploy to STAGING`
- **Run name:** `run-name: "Deploy to STAGING: ${{ inputs.projects }}${{ inputs.deploy_all && ' (all matching)' || '' }}"`
- **Job:** `lint-test-build-deploy` (Lint, Test, Build, Deploy), `runs-on: AquanowRunner-Cams`, `environment: STAGING`, `if: startsWith(github.ref_name, 'release/')`
- **Inputs:** `projects` (choice), `deploy_all` (boolean, default false), `skip_cache` (boolean, default false)
- **Steps (relevant):** Determine affected / Determine all matching projects → Run target=lint → Run target=test → Run target=pr-sync branch=main

ReleaseLens adds a **Create Jira Change issue** step (after AFFECTED_PROJECTS is set, and before or after **Run target=pr-sync branch=main**).

---

## Your Workflow vs ReleaseLens Sandbox

| Aspect | Your staging workflow | ReleaseLens sandbox |
|--------|------------------------|---------------------|
| **Trigger** | `workflow_dispatch` (manual, project choice) | `push: tags` (e.g. `sandbox-service-v*`) |
| **Version/tag** | `IMAGE_TAG: ${{ github.sha }}` or branch | Git tag (e.g. `service-v1.0.0`) |
| **Projects** | Many (aquacams, compliance, platform-webapp, …) | Single service per repo |
| **Runner** | `AquanowRunner-Cams` | `ubuntu-latest` |

ReleaseLens creates a Jira Change per staging run using **project + SHA** as the logical “release” and **one manifest per project**.

---

## 1. One Manifest Per Project

Use a **separate deployment manifest for each project**. The path is derived from the selected project so each deploy has the correct service name, risk, rollback, and owner.

**Manifest path (choose one layout):**

- **`.techops/deployments/${{ inputs.projects }}.yaml`** — e.g. `.techops/deployments/compliance.yaml`, `.techops/deployments/platform-webapp.yaml`
- **`apps/${{ inputs.projects }}/.techops/deployment.yaml`** — colocated with app code

Each file must include `service: <project>` (e.g. `service: compliance`) and the full manifest fields (version, risk, rollback, owner, etc.). Add a manifest for every project you want to track in Jira.

---

## 2. What to Use for “Git Tag” in ReleaseLens

Your workflow doesn’t use Git tags. The Jira integration only needs a **unique, readable identifier** for the deployment. You can pass any of these as `git-tag`:

- **SHA (short):**  
  `${{ inputs.projects }}-${{ github.sha }}`  
  e.g. `compliance-a1b2c3d`
- **Run number:**  
  `${{ inputs.projects }}-staging-${{ github.run_number }}`  
  e.g. `compliance-staging-142`
- **Ref + SHA:**  
  `${{ inputs.projects }}-${{ github.ref_name }}-${{ github.sha }}`  
  e.g. `compliance-release-1.2-a1b2c3d`

Use the same convention in your manifest’s `version` if you want Jira to show it (e.g. in description/custom fields).

---

## 3. Add the ReleaseLens Step to Your Job

Add this step in the **lint-test-build-deploy** job **after** "Determine affected" / "Determine all matching projects" (so `AFFECTED_PROJECTS` is set) and **before or after** "Run target=pr-sync branch=main". Creating the Change before pr-sync lets you link the run to the ticket immediately.

The step runs only when `projects != 'none'` and `AFFECTED_PROJECTS` is non-empty.

### 3.1 Create Jira Change step (aligned with Deploy to STAGING)

```yaml
# In job lint-test-build-deploy, after "Run target=test" and before or after "Run target=pr-sync branch=main"

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

If the manifest might not exist for some projects, you can make the step optional or use a default path:

```yaml
- name: Create Jira Change issue
  id: create-change
  if: inputs.projects != 'none' && env.AFFECTED_PROJECTS != ''
  continue-on-error: true   # optional: don’t fail the workflow if manifest missing
  uses: ./.github/actions/releaselens-change
  with:
    action: create
    manifest-path: ${{ format('.techops/deployments/{0}.yaml', inputs.projects) }}
    git-tag: ${{ format('{0}-{1}', inputs.projects, github.sha) }}
    environment: staging
    jira-base-url: ${{ secrets.JIRA_BASE_URL }}
    jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
    jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
    jira-project-key: ${{ secrets.JIRA_CHANGE_PROJECT_KEY }}
```

### 3.2 Job outputs (optional)

If you want to use the created Change in later steps or in Slack, add `outputs` to the **lint-test-build-deploy** job (same job that has `environment: STAGING` and `if: startsWith(github.ref_name, 'release/')`):

```yaml
jobs:
  lint-test-build-deploy:
    name: Lint, Test, Build, Deploy
    runs-on: AquanowRunner-Cams
    environment: STAGING
    if: startsWith(github.ref_name, 'release/')
    outputs:
      change_key: ${{ steps.create-change.outputs.change-key }}
      change_service: ${{ steps.create-change.outputs.service }}
      change_risk_level: ${{ steps.create-change.outputs.risk-level }}
    steps:
      # ... your existing steps, including the Create Jira Change step above
```

### 3.3 Step order (aligned with Deploy to STAGING)

In the job **lint-test-build-deploy**, the **Create Jira Change issue** step should appear after AFFECTED_PROJECTS is set and before or after your deploy step. Recommended order:

1. … (Harden runner, Checkout, pnpm, Nx SHAs, Node 20.11, JDK 25, OPA, jq, Twingate, Set NEXT_PUBLIC_ASSETS_PATH, Prepare .npmrc, Install Dependencies, Playwright, Formatting)
2. **Determine affected** / **Determine all matching projects**
3. **Run target=lint**
4. **Run target=test**
5. **Create Jira Change issue** ← add here (or after step 6)
6. **Run target=pr-sync branch=main**

---

## 4. Required Setup in Your Repo

For `./.github/actions/releaselens-change` to work in your repo you need:

1. **Copy the composite action**  
   From this sandbox:  
   `.github/actions/releaselens-change/`  
   into your repo at the same path.

2. **Copy the Jira automation code and deps**  
   - `src/jira/` (all .ts files)  
   - Root `package.json` (or merge the scripts and dependencies: `axios`, `js-yaml`, `typescript`, etc.)  
   - `tsconfig.json`  
   The action runs `npm install` and `npm run build` then `node dist/jira/create-change.js ...`.

3. **Jira secrets** in the repo (or org):  
   - `JIRA_BASE_URL`  
   - `JIRA_USER_EMAIL`  
   - `JIRA_API_TOKEN`  
   - `JIRA_CHANGE_PROJECT_KEY` (e.g. `CHGTEST`)

4. **One manifest per project**  
   For each project you want to track, add a manifest at `.techops/deployments/<project>.yaml` (e.g. `.techops/deployments/compliance.yaml`). The `service` field in each file must match the project name.

---

## 5. Example Manifest for One Project

Example for `compliance` at `.techops/deployments/compliance.yaml`:

```yaml
service: compliance
version: "staging"   # or use dynamic value in workflow
environment: staging
summary: "Staging deploy from workflow_dispatch"
jira_ticket: ""   # optional: link to dev ticket(s)
change_type: "deployment"

impact:
  user_visible: true
  blast_radius: "staging only"
  services_impacted:
    - compliance
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

You can later drive `version` or other fields from workflow env (e.g. `IMAGE_TAG`) by generating this file in a prior step if you prefer.

---

## 6. Optional: Slack Notification with Change Key

After the Create Jira Change step you can post to Slack using the step output:

```yaml
- name: Post Slack notification (with Jira Change)
  if: always() && inputs.projects != 'none' && steps.create-change.outputs.change-key != ''
  run: |
    STATUS="${{ job.status == 'success' && 'SUCCESS' || 'FAILED' }}"
    CHANGE_KEY="${{ steps.create-change.outputs.change-key }}"
    JIRA_URL="${{ secrets.JIRA_BASE_URL }}/browse/${CHANGE_KEY}"
    # ... your existing Slack payload, plus:
    # "Change: ${CHANGE_KEY} - ${JIRA_URL}"
```

---

## 7. Summary Checklist

- [ ] ReleaseLens action and `src/jira` (and build deps) added to your repo  
- [ ] Jira secrets configured  
- [ ] One manifest per project at `.techops/deployments/<project>.yaml`  
- [ ] Step “Create Jira Change issue” added to your staging job with `manifest-path` and `git-tag` as above  
- [ ] Optional: job outputs and Slack updated to use `change-key`

After this, each run of your staging deploy (for a chosen project) will create a Jira Change issue that TechOps can use for approval and production deployment.

**Next:** For adding the approval gate and transition on your PROD/CERT workflow, see [Integrating ReleaseLens — PROD and CERT Deploy](INTEGRATE_PROD_CERT_WORKFLOW.md).
