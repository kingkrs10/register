# Algora MCP Server

An MCP (Model Context Protocol) server that gives AI agents direct access to Algora's open-source bounty platform. Use it from Claude Desktop, Cursor, Windsurf, or any MCP-compatible client to discover, search, and analyze open bounties.

## What It Does

AI agents can call five tools:

| Tool | What It Does |
|------|-------------|
| `list_bounties` | Browse open bounties with filters (org, amount, tech) |
| `get_org_bounties` | Get all bounties for a specific org (cal.com, supabase, etc.) |
| `search_bounties` | Keyword search across titles, descriptions, repos |
| `get_top_bounties` | Highest-value open bounties, sorted by reward |
| `get_bounty_stats` | Aggregate stats: total value, by tech, by org |

## Requirements

- Node.js 18+
- No API key required — Algora's public API is open

## Quick Start

```bash
git clone https://github.com/idapixl/algora-mcp-server
cd algora-mcp-server
npm install
npm run build
```

## Claude Desktop Config

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "algora": {
      "command": "node",
      "args": ["/absolute/path/to/algora-mcp-server/dist/index.js"]
    }
  }
}
```

## Cursor / Windsurf Config

Add to your MCP settings:

```json
{
  "algora": {
    "command": "node",
    "args": ["/absolute/path/to/algora-mcp-server/dist/index.js"]
  }
}
```

## Example Agent Interactions

**Find high-value TypeScript bounties:**
> "Show me open bounties worth $200+ in TypeScript"

The agent will call `get_top_bounties({ tech: "typescript", min_amount: 200 })` and return formatted results.

**Check a specific org:**
> "What bounties does projectdiscovery have open?"

Calls `get_org_bounties({ org: "projectdiscovery" })`.

**Search by domain:**
> "Find bounties related to MCP or model context protocol"

Calls `search_bounties({ keyword: "MCP" })`.

**Market overview:**
> "What's the total value of all open bounties on Algora?"

Calls `get_bounty_stats({})` and returns counts, total, average, breakdown by tech and org.

## Tool Reference

### `list_bounties`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `org` | string | — | Org slug (e.g., `"cal"`, `"supabase"`) |
| `status` | `"open"` \| `"completed"` \| `"all"` | `"open"` | Bounty status |
| `limit` | number | 20 | Results per page (1–100) |
| `cursor` | string | — | Pagination cursor |
| `min_amount` | number | — | Minimum USD amount |
| `max_amount` | number | — | Maximum USD amount |
| `tech` | string | — | Tech filter (e.g., `"typescript"`) |

### `get_org_bounties`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org` | string | Yes | Org slug from Algora URL |
| `status` | string | No | Default: `"open"` |
| `limit` | number | No | Default: 50 |

### `search_bounties`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | string | Yes | Search term |
| `tech` | string | No | Tech stack filter |
| `min_amount` | number | No | Min USD |
| `limit` | number | No | Default: 30 |

### `get_top_bounties`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tech` | string | — | Tech filter |
| `min_amount` | number | 100 | Min USD |
| `limit` | number | 10 | How many to return |

### `get_bounty_stats`

| Parameter | Type | Description |
|-----------|------|-------------|
| `org` | string | Scope to org. Omit for all. |

## Development

```bash
npm run dev      # Run with tsx (no build step)
npm run build    # Compile TypeScript
npm run typecheck  # Type check without emitting
```

## Architecture

The server uses stdio transport (standard MCP convention) — no HTTP server, no port, no configuration. It communicates with the MCP client through stdin/stdout and connects to Algora's public API (no auth required).

The `@algora/sdk` tRPC client handles API calls. Local filtering is applied in-memory for features the API doesn't natively support (keyword search, min/max amount).

## License

MIT
