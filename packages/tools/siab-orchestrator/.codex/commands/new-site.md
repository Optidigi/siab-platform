# New Site

Trigger this contract when the user asks for `/new-site` or otherwise asks to
start a new `sitegen` engagement.

Run this from the monorepo root or from `packages/tools/siab-orchestrator`;
resolve paths relative to the monorepo root.

1. Verify GitHub CLI readiness with `gh auth status`. If it fails, stop and ask
   the operator to authenticate before reading the workflow preflight.
2. Read `packages/tools/siab-orchestrator/workflows/sitegen/preflight.md`.
3. Summarize back to the user, in your own words:
   - what the workflow does end to end,
   - which phase agents are available and when each runs,
   - the quality floor the site has to clear,
   - what operational work is out of scope.
4. Wait for explicit user confirmation.
5. After confirmation, read
   `packages/tools/siab-orchestrator/workflows/sitegen/prompt.md` and begin
   Phase 1.

Do not skip the confirmation gate.
