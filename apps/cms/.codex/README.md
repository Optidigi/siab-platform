# .codex

Codex-specific project config lives here.

Behavioral instructions live only in the repository root `AGENTS.md`. Keep this
directory for Codex config and MCP mirrors so the root policy does not drift.

Files:

- `config.toml` - Codex-style project MCP server config.
- `mcp.toml` - MCP TOML mirror for tools that probe this filename.

Do not store API keys, tokens, or other secrets in this directory.
