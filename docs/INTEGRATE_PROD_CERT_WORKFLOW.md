# Integrating ReleaseLens — PROD and CERT Deploy

> **Repo:** `aq-monorepo`  
> **Guide for adding Jira Change verification (approval gate) and transition to your "Deploy to PROD and CERT" workflow**

---

## Workflow reference (Deploy to PROD and CERT)

This doc is aligned with the **aq-monorepo** workflow that has:

- **Repo:** `aq-monorepo`
- **Name:** `name: Deploy to PROD and CERT`
- **Job:** `lint-test-build-deploy` (Lint, Test, Build, Deploy), `runs-on: AquanowRunner-Cams`, `environment: CERT`
- **Inputs:** `projects` (choice), `cert_only` (boolean, default false), `deploy_all` (boolean, default false), `skip_cache` (boolean, default true)
- **Steps (relevant):** Determine affected / Determine all matching projects → Run target=lint → Run target=test → **Run target=push on PROD** (`if: ${{ env.AFFECTED_PROJECTS != '' && !inputs.cert_only }}`) → **Run target=push on CERT** (`if: env.AFFECTED_PROJECTS != ''`)

ReleaseLens adds: an optional `jira_change_key` input, a **Verify** step before PROD push, and a **Transition** step after PROD push.

---

## Overview

Your PROD/CERT workflow deploys to **CERT** whenever projects are selected, and to **PROD** only when `cert_only` is false. ReleaseLens integrates by:

1. **Before PROD push**: Verify that the Jira Change (created when you deployed to staging) is **approved** by TechOps. The workflow needs the Change issue key from that staging run.
2. **After PROD push**: Transition the Jira Change to **Completed**.
3. **CERT-only runs**: No approval gate or transition; you can leave the Jira Change key empty.

Same **one manifest per project** layout as staging (e.g. `.techops/deployments/${{ inputs.projects }}.yaml`) is used only if you create a Change in this workflow; for verify/transition you only need the **change key**.

---

## 1. Add Workflow Input for the Jira Change Key

Add an optional workflow input so the operator can pass the Change issue key from the staging run (e.g. from Slack or Jira). Place it after your existing inputs (`projects`, `cert_only`, `deploy_all`, `skip_cache`).

```yaml
on:
  workflow_dispatch:
    inputs:
      projects:
        type: choice
        description: 'Which projects would you like to deploy'
        required: true
        options: [ none, aquacams, compliance, ... ]
      cert_only:
        type: boolean
        description: 'Only deploy to CERT environment'
        required: false
        default: false
      deploy_all:
        type: boolean
        description: 'Deploy all matching projects not just affected'
        required: false
        default: false
      skip_cache:
        description: 'Skip Nx cache'
        required: false
        type: boolean
        default: true
      jira_change_key:
        type: string
        description: 'Jira Change key from staging (required for PROD deploy; leave empty for CERT-only)'
        required: false
```

---

## 2. Verify Approval Before PROD Push

Add a step **before** "Run target=push on PROD" that runs ReleaseLens **verify**. If the Change is not approved, the step fails and PROD push never runs.

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

**Policy options:**

- **Require key for PROD**: To block PROD when no key is provided, add a separate step that fails when `!inputs.cert_only && inputs.jira_change_key == ''` (e.g. "PROD deploy requires a Jira Change key from staging").
- **Allow PROD without key**: Omit that check if you sometimes deploy to PROD without going through staging/Jira.

---

## 3. Transition Change to Completed After PROD Push

Add a step **after** "Run target=push on PROD" to move the Jira Change to **Completed**.

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

Place this step immediately after the "Run target=push on PROD" step so it runs only when PROD deploy has succeeded.

---

## 4. Optional: Fail PROD When Change Key Is Missing

If your policy is "all PROD deploys must have an approved Jira Change", add this step before the verify step:

```yaml
- name: Require Jira Change key for PROD
  if: env.AFFECTED_PROJECTS != '' && !inputs.cert_only
  run: |
    if [ -z "${{ inputs.jira_change_key }}" ]; then
      echo "::error::PROD deploy requires a Jira Change key from staging. Get the key from the staging run or Jira, then re-run with jira_change_key set."
      exit 1
    fi
```

---

## 5. Step Order Summary (aligned with Deploy to PROD and CERT)

In the job `lint-test-build-deploy`, insert the ReleaseLens steps in this order:

1. … (Harden runner, Checkout, Install pnpm, Get pnpm store directory, Setup pnpm cache, Get SHAs, Setup Node.js 20.11, Set up JDK 25, Setup OPA, Setup jq, Connect to twingate, Set NEXT_PUBLIC_ASSETS_PATH, Prepare .npmrc, Install Dependencies, Install Playwright Browsers, Formatting, Determine affected / Determine all matching projects, **Run target=lint**, **Run target=test**)
2. *(Optional)* **Require Jira Change key for PROD** — only when `env.AFFECTED_PROJECTS != '' && !inputs.cert_only`
3. **Verify Jira Change approval** — only when `env.AFFECTED_PROJECTS != '' && !inputs.cert_only && inputs.jira_change_key != ''`
4. **Run target=push on PROD** — existing step, `if: ${{ env.AFFECTED_PROJECTS != '' && !inputs.cert_only }}`
5. **Transition Jira Change to Completed** — only when same condition as verify (PROD run + key set)
6. **Run target=push on CERT** — existing step, `if: env.AFFECTED_PROJECTS != ''`

---

## 6. Required Setup

- Same as staging: ReleaseLens composite action (`.github/actions/releaselens-change`), `src/jira/`, and Jira secrets in the repo.
- No extra manifests needed for verify/transition; the **change key** is passed via the workflow input.

---

## 7. Summary Checklist (PROD/CERT)

- [ ] ReleaseLens action and `src/jira` (and build deps) in repo; Jira secrets configured
- [ ] `jira_change_key` workflow_dispatch input added
- [ ] Step "Verify Jira Change approval" added before "Run target=push on PROD"
- [ ] Step "Transition Jira Change to Completed" added after "Run target=push on PROD"
- [ ] Optional: "Require Jira Change key for PROD" step when policy is strict

CERT-only runs can leave `jira_change_key` empty; PROD runs use the key from the staging deploy so TechOps approval is enforced before push and the Change is closed after deploy.

**See also:** [Integrating ReleaseLens — STAGING Deploy](INTEGRATE_EXISTING_STAGING_WORKFLOW.md) for creating the Jira Change when you deploy to staging.
