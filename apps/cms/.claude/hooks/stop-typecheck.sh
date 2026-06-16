#!/usr/bin/env bash
# Stop hook — typecheck before claude declares done.
# Wired in .claude/settings.json. Behaviour:
#   - exit 0 silently if node_modules missing (with one-line warning to stderr)
#   - exit 0 silently if no .ts/.tsx/.js/.jsx files have uncommitted changes
#     (typecheck of a clean tree is wasted work)
#   - exit 0 silently if typecheck passes
#   - exit 2 (blocking) + last 40 lines of the failure to stderr if typecheck fails

set -u

cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0

if [ ! -d node_modules ]; then
  echo "Typecheck skipped — node_modules missing. Run 'pnpm install' to enable typecheck on Stop." >&2
  exit 0
fi

# Skip when no TS/JS files are touched — typecheck of a clean tree is wasted work.
# Looks at unstaged + staged + untracked files via git status --porcelain.
ts_changed=$(git status --porcelain 2>/dev/null | grep -cE '\.(ts|tsx|js|jsx|mjs|cjs)$' || true)
if [ "${ts_changed:-0}" -eq 0 ]; then
  exit 0
fi

LOG=/tmp/claude-typecheck.log
if pnpm typecheck > "$LOG" 2>&1; then
  exit 0
fi

echo "Typecheck failed before Stop. Last 40 lines of $LOG:" >&2
tail -40 "$LOG" >&2
exit 2
