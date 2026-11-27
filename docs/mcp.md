# Talk to your bar from Claude (MCP)

Bar Flores ships an MCP server, so an AI assistant can read your menus,
recipes and bottle inventory and make careful edits while you chat:

- "I picked up two bottles of Campari and finished the rye."
- "What can I make tonight with what I have?"
- "Give me three ideas for a smoky stirred drink using what's on the shelf,
  then save the one I pick to the fall menu."
- "What should I buy this week?"

## What it can and cannot do

| Tool | Does |
|------|------|
| `get_bar_overview` | Menus, inventory totals, low/out items, drinks blocked on active menus, open order count |
| `list_inventory` | Ingredients with on-hand, par and status; filter by status, category, name |
| `get_shopping_list` | Everything at or below par, drink-blocking items first |
| `list_drinks` | Drinks with recipes and linked ingredients; `makeableOnly` for "what can I make" |
| `get_drink_stats` | Order counts per drink, and what nobody orders |
| `update_inventory` | Batch stock changes (`delta` or exact `onHand`), par, unit, category, rename, retire |
| `add_ingredients` | Add new ingredients; existing names are skipped |
| `create_drink` | Add a drink to a menu as a **hidden draft** |
| `update_drink` | Edit a drink, publish/hide it, 86 it, relink ingredients |
| `create_menu` | Create a **hidden** menu |
| `update_menu` | Rename, reorder sections, activate/hide |

Guardrails, by design:

- **Nothing is deleted.** There are no delete tools. Remove things in the dashboard.
- **Orders are off limits.** The assistant can see how many are waiting, nothing more.
- **New drinks and menus are drafts.** Guests do not see them until you publish
  in the dashboard or tell the assistant to.
- **`MCP_READ_ONLY=1`** removes every write tool.
- Names are matched exactly, then by unique partial match. If "rye" could mean
  two bottles, the tool refuses and lists both rather than guessing.

## Turn it on (hosted app)

The endpoint is off until you set a token.

1. Generate a token: `openssl rand -hex 24`
2. Add it as the secret `MCP_TOKEN` (24+ characters). On Replit add it to the
   **deployment** secrets as well as the workspace ones; they are separate lists.
3. Republish. The server log prints `[mcp] endpoint enabled at /mcp`.

### Claude Code

```bash
claude mcp add --transport http barflores https://YOUR-APP/mcp \
  --header "Authorization: Bearer YOUR_TOKEN"
```

### Claude apps (claude.ai, desktop, mobile)

Settings -> Connectors -> Add custom connector, and use the URL form that
carries the token, because the connector dialog has no field for a header:

```
https://YOUR-APP/mcp/YOUR_TOKEN
```

That URL is now a password. Do not paste it into chats, screenshots or
issues. To revoke it, change `MCP_TOKEN` and republish. Connector settings
change between releases; if the dialog looks different, check
<https://support.claude.com> for "custom connectors".

## Run it locally instead (stdio)

No deployed app needed; the assistant talks straight to your database.

```bash
DATABASE_URL=... npm run mcp
```

Claude Code: `claude mcp add barflores --env DATABASE_URL=... -- npm --prefix /path/to/BarMenu run --silent mcp`

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "barflores": {
      "command": "npm",
      "args": ["--prefix", "/path/to/BarMenu", "run", "--silent", "mcp"],
      "env": { "DATABASE_URL": "postgresql://..." }
    }
  }
}
```

`--silent` matters: stdout must carry protocol messages only.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 404 on `/mcp` | `MCP_TOKEN` is not set in the running deployment, or is shorter than 24 characters. Set it and republish |
| 401 | Wrong token. Compare with the secret; re-add the connector if you rotated it |
| 429 | Twenty wrong tokens from one IP in 15 minutes. Wait, then fix the token |
| 405 | Something sent GET. The endpoint is POST-only (stateless Streamable HTTP) |
| "DATABASE_URL must be set" (stdio) | Pass `DATABASE_URL` in the client's `env` block |
| Assistant says a drink "cannot be made" | A linked ingredient is at zero. Update stock, or unlink it with `update_drink` |

## For contributors

- `server/mcp/server.ts`: tools. Depends only on the `IStorage` interface.
- `server/mcp/http.ts`: Express mount, auth, rate limit. Stateless: a new
  server and transport per request, so it is safe on autoscale.
- `scripts/mcp-stdio.ts`: stdio entry.
- Tests: `npm test` runs both over the real protocol against a fake store, and
  asserts that no delete or order tool exists.
