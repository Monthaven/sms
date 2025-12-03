Address Verifier Helper

What this does

- Reads `August-5th-ADDRESS-VERIFICATION-PRIORITY-2025-11-12.csv` (created earlier)
- Generates `address-lookup-prompts.json` and `address-lookup-tasks.csv` with one LLM prompt per lead
- `address-verifier-runner.cjs` can run in dry-run (default) or provider mode

Quick start (dry-run)

1. Ensure `address-lookup-prompts.json` exists (if you ran the earlier script, it will be present).
2. Run the dry-run resolver to produce sample outputs:

```powershell
cd "C:\Users\Smooth King\Downloads\New folder (2)\sms\sms"
node address-verifier-runner.cjs
# OR via npm script
npm run verify:dry
```

Outputs

- `address-lookup-results-dryrun.json`  — array of sample resolver outputs
- `address-lookup-results.csv`         — CSV summary for import into Notion/CRM

Provider integration (next steps)

- Add provider modules in `providers/` (templates present):
  - `providers/google-geocode.cjs`
  - `providers/smarty.cjs`

- To execute real provider calls, implement provider logic and set env vars (e.g. `GOOGLE_API_KEY` or `SMARTY_AUTH_ID`/`SMARTY_AUTH_TOKEN`). Then run:

```powershell
# run with real provider calls (runner currently falls back to sample if providers missing)
$env:DRY_RUN = 'false'
node address-verifier-runner.cjs
```

- Alternatively, you can pipe `address-lookup-prompts.json` into your LLM batch job and write results back to the `address-lookup-results-*.json` format.

Security

- Never commit API keys. Use a secure secrets store or environment variables on your host/CI.

What I can do next

- Implement provider modules to call Google/Smarty/Lob and perform structured parsing
- Add batched LLM runner using OpenAI (with rate limiting and retries)
- Add a Notion sync step to push verified addresses back to your database

