# ReleaseLens Rules: Gating & Jira Dashboard

ReleaseLens enforces **gating** (approval before production) and keeps the **Jira Change dashboard** in sync with deployments.

---

## Gating (Production approval)

- **Rule:** Production deploys are allowed only when the Jira Change issue is approved by TechOps.
- **Enforcement:** The **verify** action (`verify-approval.js`) runs before production deploy. It:
  - Fetches the Change issue and reads **Risk Level** and **Status**.
  - **Low risk:** Proceeds without approval.
  - **Medium or high risk:** Requires status **"Approved for Prod"**. If the issue is not in that status, the script exits with code 1 and the workflow fails (production deploy step does not run).
- **Where:** Use the **Verify Jira Change approval** step in your PROD workflow immediately before the step that deploys to production (see [HOW_TO_INTEGRATE_RELEASELENS.md](HOW_TO_INTEGRATE_RELEASELENS.md)).

---

## Jira dashboard (Create & transition)

- **Create (staging):** When you deploy to staging, the **create** action creates a Jira Change issue from the deployment manifest. The dashboard shows the new Change with service, version, risk, rollback plan, and link to the GitHub run.
- **Transition (production):** After a successful production deploy, the **transition** action moves the Change to **Completed**, so the dashboard reflects that the release is done.
- **Flow:** Staging deploy → Create Change → TechOps approves in Jira → Production deploy (verify passes) → Transition to Completed.

---

## Workflow usage

| Step        | When        | Effect |
|------------|-------------|--------|
| **create** | After staging deploy | New Jira Change; dashboard updated. |
| **verify** | Before production deploy | Gate: fails if medium/high risk and not "Approved for Prod". |
| **transition** | After production deploy | Change status → Completed; dashboard updated. |

These three actions are invoked by the composite action `releaselens-change` with `action: create | verify | transition`. Keep this order in your workflows so gating and dashboard updates stay correct.
