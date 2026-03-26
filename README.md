# Couple Health Mini Program MVP

Private WeChat Mini Program for one couple to log bowel events and menstrual cycles, share status, and surface overdue reminders.

## Structure

- `miniprogram/`: Mini Program client pages and utilities
- `cloudfunctions/api/`: single Cloud Development function that handles pairing, records, dashboard state, prediction, and reminder sweep
- `cloud/database/`: collection, index, and rule definitions
- `tests/`: Node-based verification for domain and handler logic
- `openspec/changes/couple-health-mvp/`: source change proposal, design, specs, and tasks

## Local verification

Run:

```bash
npm test
```

The test suite runs in single-process mode because sandboxed environments often block Node's default test worker spawning.

## Manual setup in WeChat DevTools

1. Open the repo as a Mini Program project and keep `project.config.json` as the root config.
2. Replace `replace-with-your-cloud-env-id` in `miniprogram/config.js`.
3. Replace `replace-with-your-reminder-template-id` in `miniprogram/config.js` after creating the WeChat subscription message template.
4. Deploy the `api` cloud function and install its npm dependency `wx-server-sdk`.
5. Create the database collections listed in `cloud/database/collections.json`.
6. Apply the indexes from `cloud/database/indexes.json`.
7. Apply the deny-all client data rules from `cloud/database.rules.json`.
8. Configure a scheduled cloud job that invokes `api` with `{ "action": "runReminderSweep" }`.

## Notes

- Client reads and writes go through cloud functions. Direct client database access is disabled by rules.
- Subscription reminders are additive. In-app overdue reminders still work even if the template ID is not configured or a user does not grant permission.
