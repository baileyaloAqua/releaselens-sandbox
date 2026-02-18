# Integrating ReleaseLens into the Shared Deploy Workflow

> **Repo:** `aq-monorepo`  
> **Guide for adding ReleaseLens to one shared workflow used for STAGING, PROD, and CERT**

---

## Overview

ReleaseLens is added to a **single shared workflow** that handles all three environments:

| When the run is for… | ReleaseLens steps |
|----------------------|-------------------|
| **STAGING** | **Create Jira Change** (after AFFECTED_PROJECTS set, before or after deploy e.g. pr-sync) |
| **PROD** (and not cert_only) | **Verify** approval → existing PROD push → **Transition** to Completed. Requires `jira_change_key` input. |
| **CERT only** | No ReleaseLens steps (or optional; leave `jira_change_key` empty). |

The same job (`lint-test-build-deploy`) runs in all cases; ReleaseLens steps are conditional so they only run for the right environment.

---

## 1. Shared Workflow Shape (aq-monorepo)

The shared workflow in **aq-monorepo** can be one of:

- **Option A — One workflow file, multiple triggers:**  
  One YAML with two `workflow_dispatch` entries (e.g. different workflow names or a single name with an input that selects “staging” vs “prod/cert”). The same job runs; an input (e.g. `environment` or `cert_only` + “is this the staging workflow?”) decides which deploy and ReleaseLens steps run.

- **Option B — One workflow file, one trigger, one set of inputs:**  
  Single `workflow_dispatch` with inputs that fully define behavior, e.g.:
  - `target`: `staging` \| `prod_and_cert` \| `cert_only`
  - or: `deploy_staging` (bool) + `cert_only` (bool)

This doc assumes you keep your current **two entry points** (“Deploy to STAGING” and “Deploy to PROD and CERT”) but use **one shared job** (e.g. in a reusable workflow or the same file with conditional steps). ReleaseLens steps are then added once to that shared job with the conditions below.

---

## 2. Inputs to Add to the Shared Workflow

Add these to the workflow that can run PROD (so operators can pass the Jira Change key when deploying to PROD). If staging and prod/cert are separate workflow_dispatch definitions that call the same job, add the input only to the PROD/CERT one.

**For PROD/CERT runs, add:**

```yaml
jira_change_key:
  type: string
  description: 'Jira Change key from staging (required for PROD deploy; leave empty for CERT-only)'
  required: false
```

Keep existing inputs: `projects`, `cert_only`, `deploy_all`, `skip_cache` (and for staging, the same `projects`, `deploy_all`, `skip_cache`).

---

## 3. One Manifest Per Project (for STAGING)

Use **one deployment manifest per project** so the Create step has the right service name and risk.

- **Path:** `.techops/deployments/${{ inputs.projects }}.yaml` (e.g. `.techops/deployments/compliance.yaml`)
- **Alternative:** `apps/${{ inputs.projects }}/.techops/deployment.yaml`
- Each file: `service: <project>` plus full manifest fields (version, risk, rollback, owner, etc.).

Create a manifest for every project you want to track in Jira when deploying to staging.

---

## 4. ReleaseLens Steps in the Shared Job

Insert these steps into the **shared** `lint-test-build-deploy` job in this order. Conditions use your existing inputs so they only run for the right environment.

### 4.1 Create Jira Change (STAGING only)

Run only when this run is a **staging** deploy (e.g. your staging workflow or `environment == 'staging'`). Place after “Determine affected” / “Determine all matching projects” and before or after your staging deploy step (e.g. “Run target=pr-sync branch=main”).

```yaml
- name: Create Jira Change issue
  id: create-change
  if: inputs.projects != 'none' && env.AFFECTED_PROJECTS != '' && <STAGING_CONDITION>
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

Replace `<STAGING_CONDITION>` with how you know this is a staging run, for example:

- If the shared job is only ever called from the staging workflow, you can use a dedicated input, e.g. `inputs.deploy_staging == true`, or
- If you use a reusable workflow, the caller can pass `environment: staging` and the condition is `inputs.environment == 'staging'`.

If you have **two separate workflow files** (one for STAGING, one for PROD/CERT), the **Create Jira Change** step lives only in the STAGING workflow and its condition is just `inputs.projects != 'none' && env.AFFECTED_PROJECTS != ''` (no need for a staging flag).

### 4.2 Require Jira Change key for PROD (optional)

Only when the run can deploy to PROD and you want to enforce a key:

```yaml
- name: Require Jira Change key for PROD
  if: env.AFFECTED_PROJECTS != '' && !inputs.cert_only
  run: |
    if [ -z "${{ inputs.jira_change_key }}" ]; then
      echo "::error::PROD deploy requires a Jira Change key from staging. Re-run with jira_change_key set."
      exit 1
    fi
```

### 4.3 Verify Jira Change approval (PROD only)

Before “Run target=push on PROD”:

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

### 4.4 Run target=push on PROD (existing)

Keep your existing step; no change. Example condition: `if: ${{ env.AFFECTED_PROJECTS != '' && !inputs.cert_only }}`

### 4.5 Transition Jira Change to Completed (PROD only)

Immediately after “Run target=push on PROD”:

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

### 4.6 Run target=push on CERT (existing)

Keep your existing step; no change. Example condition: `if: env.AFFECTED_PROJECTS != ''`

---

## 5. Full Step Order in the Shared Job

Use this order so ReleaseLens runs in the right place for staging, prod, and cert:

1. Harden runner, Checkout, pnpm, cache, Get SHAs, Setup Node, JDK, OPA, jq, Twingate, env, .npmrc, Install Dependencies, Playwright, Formatting  
2. **Determine affected** / **Determine all matching projects**  
3. **Run target=lint**  
4. **Run target=test**  
5. **Create Jira Change issue** — only when this run is for STAGING (see 4.1)  
6. *(Staging deploy step if applicable, e.g. **Run target=pr-sync branch=main**)*  
7. *(Optional)* **Require Jira Change key for PROD** — when PROD will run and policy is strict  
8. **Verify Jira Change approval** — when PROD will run and `jira_change_key` set  
9. **Run target=push on PROD** — existing, when `!cert_only`  
10. **Transition Jira Change to Completed** — when PROD ran and key set  
11. **Run target=push on CERT** — existing  

Steps 5–6 run only in the staging path; steps 7–10 only in the PROD path; step 11 for both PROD and CERT-only runs when you deploy to CERT.

---

## 6. How to Share One Workflow for All Three

You can structure the repo in one of these ways:

### A. Single workflow file, two workflow_dispatch names

Not possible in one file (one file = one workflow name). So use **B** or **C**.

### B. Two workflow files that duplicate the job (simplest)

- **Deploy to STAGING** (e.g. `deploy-staging.yml`): same job steps, including **Create Jira Change**; no `jira_change_key`, no Verify/Transition.  
- **Deploy to PROD and CERT** (e.g. `deploy-prod-cert.yml`): same job steps, plus **Verify**, **Transition**, and input `jira_change_key`; no Create step.

ReleaseLens is “in the shared workflow” in the sense that the same job shape and step order are used in both files; you add the relevant ReleaseLens steps to each file as above.

### C. One reusable workflow, two callers (DRY)

- **Reusable workflow** (e.g. `.github/workflows/deploy.yml`):  
  `on: workflow_call` with inputs: `projects`, `cert_only`, `deploy_all`, `skip_cache`, `jira_change_key`, and e.g. `environment: staging | prod_cert`.  
  One job that runs all steps; conditions on `inputs.environment` (and `inputs.cert_only`, `inputs.jira_change_key`) decide which deploy and ReleaseLens steps run.

- **Caller 1 — Deploy to STAGING:** calls the reusable workflow with `environment: staging` (no `jira_change_key`).  
- **Caller 2 — Deploy to PROD and CERT:** calls the reusable workflow with `environment: prod_cert`, `cert_only: false` or `true`, and `jira_change_key` when doing PROD.

Then all ReleaseLens logic lives in the reusable workflow: Create when `environment == 'staging'`, Verify/Transition when `environment == 'prod_cert' && !cert_only && jira_change_key`.

---

## 7. Required Setup (aq-monorepo)

- **ReleaseLens composite action:** `.github/actions/releaselens-change/` (from this sandbox).  
- **Jira automation:** `src/jira/` and build deps in the repo; action runs `npm install` and `npm run build` then the Node scripts.  
- **Secrets:** `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN`, `JIRA_CHANGE_PROJECT_KEY`.  
- **Manifests (for staging):** one per project at `.techops/deployments/<project>.yaml` with `service` matching the project name.

---

## 8. Summary Checklist

- [ ] ReleaseLens action and `src/jira` (and build deps) added to **aq-monorepo**; Jira secrets configured.  
- [ ] One manifest per project at `.techops/deployments/<project>.yaml` for staging.  
- [ ] **Staging path:** “Create Jira Change issue” step added (after AFFECTED_PROJECTS, before/after staging deploy).  
- [ ] **PROD path:** `jira_change_key` input added; “Verify” before PROD push; “Transition” after PROD push.  
- [ ] Optional: “Require Jira Change key for PROD” when policy is strict.  
- [ ] Shared workflow (whether two files or one reusable + two callers) uses the step order in section 5.

With this, ReleaseLens is integrated into the single shared workflow used for STAGING, PROD, and CERT in **aq-monorepo**.

**See also:** [How to integrate ReleaseLens](HOW_TO_INTEGRATE_RELEASELENS.md) for step-by-step instructions.
