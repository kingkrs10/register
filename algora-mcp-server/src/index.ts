#!/usr/bin/env node
/**
 * Algora MCP Server
 *
 * Exposes Algora's open-source bounty platform to any MCP-compatible AI agent
 * (Claude Desktop, Cursor, Windsurf, etc.). Agents can discover bounties,
 * filter by language/amount/status, and inspect individual bounty details.
 *
 * Usage (after build):
 *   node dist/index.js
 *
 * Or via npx (after publish):
 *   npx algora-mcp-server
 *
 * MCP Config (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "algora": {
 *         "command": "node",
 *         "args": ["/path/to/algora-mcp-server/dist/index.js"]
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { algora, type AlgoraOutput } from "@algora/sdk";

// ---------------------------------------------------------------------------
// Types derived from Algora SDK
// ---------------------------------------------------------------------------

/** Raw SDK type — some runtime fields are not in the TS declarations */
type BountyItemRaw = AlgoraOutput["bounty"]["list"]["items"][number];

/**
 * Extended bounty item that includes runtime fields the SDK types omit.
 * We use `any` cast at the call site and re-type here.
 */
interface BountyItem extends BountyItemRaw {
  // Present at runtime, missing from SDK type declarations
  tech?: string[];
  task: BountyItemRaw["task"] & {
    status?: string;
    tech?: string[];
  };
}

/** Reward field on a BountyItem: { amount: number; currency: "USD" } | null */
type BountyReward = BountyItem["reward"];

type AlgoraStatus = "active" | "inactive";

// Our user-facing status vocabulary mapped to Algora's internal status
type UserStatus = "open" | "active" | "completed" | "all";

// Input types for each tool handler
interface ListBountiesInput {
  org?: string;
  status?: UserStatus;
  limit?: number;
  cursor?: string;
  min_amount?: number;
  max_amount?: number;
  tech?: string;
}

interface GetOrgBountiesInput {
  org: string;
  status?: UserStatus;
  limit?: number;
}

interface SearchBountiesInput {
  keyword: string;
  tech?: string;
  min_amount?: number;
  limit?: number;
}

interface GetTopBountiesInput {
  tech?: string;
  min_amount?: number;
  limit?: number;
}

interface GetBountyStatsInput {
  org?: string;
}

// ---------------------------------------------------------------------------
// API parameter type — algora.bounty.list.query accepts this shape
// ---------------------------------------------------------------------------

interface AlgoraBountyListParams {
  org?: string;
  limit?: number;
  cursor?: string;
  status?: AlgoraStatus;
  rewarded?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps our user-facing status to Algora's internal status param.
 */
function toAlgoraStatus(status: UserStatus): AlgoraStatus | undefined {
  if (status === "open" || status === "active") return "active";
  if (status === "completed") return "inactive";
  return undefined; // "all" — no status filter
}

/**
 * Returns reward amount in USD dollars (not cents).
 * Algora's reward.amount is in cents.
 */
function rewardDollars(reward: BountyReward): number {
  if (!reward) return 0;
  return reward.amount / 100;
}

/**
 * Format a single bounty as readable markdown.
 */
function formatBounty(b: BountyItem): string {
  const amount = b.reward_formatted ?? (b.reward ? `$${rewardDollars(b.reward)}` : "$?");
  const status = b.task.status ?? "unknown";
  const org = b.org.display_name ?? b.org.handle;
  const title = b.task.title ?? "Untitled";
  const url = b.task.url ?? "(no URL)";
  const tech = (b.tech ?? []).join(", ") || "unspecified";

  return [
    `### ${title}`,
    `- **Org:** ${org} (\`${b.org.handle}\`)`,
    `- **Tech:** ${tech}`,
    `- **Amount:** ${amount}`,
    `- **Status:** ${status}`,
    `- **URL:** ${url}`,
    "",
  ].join("\n");
}

/**
 * Local filter — applies filters the Algora API doesn't support natively.
 */
function applyLocalFilters(
  items: BountyItem[],
  opts: {
    min_amount?: number;
    max_amount?: number;
    tech?: string;
    keyword?: string;
  }
): BountyItem[] {
  return items.filter((b) => {
    const dollars = rewardDollars(b.reward);

    if (opts.min_amount !== undefined && dollars < opts.min_amount) return false;
    if (opts.max_amount !== undefined && dollars > opts.max_amount) return false;

    if (opts.tech) {
      const techList = (b.tech ?? []).map((t) => t.toLowerCase());
      const filter = opts.tech.toLowerCase();
      if (!techList.some((t) => t.includes(filter))) return false;
    }

    if (opts.keyword) {
      const kw = opts.keyword.toLowerCase();
      const title = (b.task.title ?? "").toLowerCase();
      const body = (b.task.body ?? "").toLowerCase();
      const repo = (b.task.repo_name ?? "").toLowerCase();
      const orgHandle = (b.org.handle ?? "").toLowerCase();
      if (
        !title.includes(kw) &&
        !body.includes(kw) &&
        !repo.includes(kw) &&
        !orgHandle.includes(kw)
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Call algora.bounty.list.query with properly typed params.
 * Returns extended BountyItem array with runtime fields included.
 */
async function fetchBounties(params: AlgoraBountyListParams): Promise<{
  items: BountyItem[];
  next_cursor: string | null | undefined;
}> {
  const queryParams = {
    ...(params.org ? { org: params.org } : {}),
    limit: params.limit ?? 20,
    ...(params.cursor ? { cursor: params.cursor } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.rewarded !== undefined ? { rewarded: params.rewarded } : {}),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await algora.bounty.list.query(queryParams as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result as any;
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function handleListBounties(
  input: ListBountiesInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const {
    org,
    status = "open",
    limit = 20,
    cursor,
    min_amount,
    max_amount,
    tech,
  } = input;

  const fetchLimit = Math.min((limit ?? 20) * 3, 100);
  const algoraStatus = toAlgoraStatus(status);

  const result = await fetchBounties({
    org,
    status: algoraStatus,
    limit: fetchLimit,
    cursor,
  });

  let items = result.items ?? [];
  items = applyLocalFilters(items, { min_amount, max_amount, tech });
  items = items.slice(0, limit);

  if (items.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No bounties found matching your criteria. Try broadening your filters or checking a specific org.",
        },
      ],
    };
  }

  const header = `## Algora Bounties — ${items.length} results\n\n`;
  const body = items.map(formatBounty).join("\n");
  const footer = result.next_cursor
    ? `\n---\n*More results available. Use \`cursor: "${result.next_cursor}"\` to get the next page.*`
    : "\n---\n*End of results.*";

  return { content: [{ type: "text", text: header + body + footer }] };
}

async function handleGetOrgBounties(
  input: GetOrgBountiesInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { org, status = "open", limit = 50 } = input;
  const algoraStatus = toAlgoraStatus(status);

  const result = await fetchBounties({
    org,
    status: algoraStatus,
    limit: Math.min(limit, 100),
  });

  const items = result.items ?? [];

  if (items.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No ${status === "all" ? "" : status + " "}bounties found for **${org}**.\n\nVerify the org slug — use the handle from their Algora URL (e.g., algora.io/cal → slug is "cal").`,
        },
      ],
    };
  }

  const totalValue = items.reduce((sum, b) => sum + rewardDollars(b.reward), 0);
  const header = `## ${org} Bounties\n\n**${items.length} bounties** | **Total: $${totalValue.toLocaleString()}**\n\n`;
  const body = items.map(formatBounty).join("\n");

  return { content: [{ type: "text", text: header + body }] };
}

async function handleSearchBounties(
  input: SearchBountiesInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { keyword, tech, min_amount, limit = 30 } = input;

  // Fetch a broad active set and filter locally
  const result = await fetchBounties({ status: "active", limit: 100 });

  let items = result.items ?? [];
  items = applyLocalFilters(items, { keyword, tech, min_amount });
  items = items.slice(0, limit);

  if (items.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No bounties found matching "${keyword}"${tech ? ` in ${tech}` : ""}${min_amount ? ` with min $${min_amount}` : ""}.`,
        },
      ],
    };
  }

  const header = `## Search: "${keyword}" — ${items.length} results\n\n`;
  const body = items.map(formatBounty).join("\n");

  return { content: [{ type: "text", text: header + body }] };
}

async function handleGetTopBounties(
  input: GetTopBountiesInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { tech, min_amount = 100, limit = 10 } = input;

  const result = await fetchBounties({ status: "active", limit: 100 });

  let items = result.items ?? [];
  items = applyLocalFilters(items, { min_amount, tech });

  // Sort by reward descending
  items.sort((a, b) => rewardDollars(b.reward) - rewardDollars(a.reward));
  items = items.slice(0, limit);

  if (items.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No bounties found above $${min_amount}${tech ? ` in ${tech}` : ""}.`,
        },
      ],
    };
  }

  const totalValue = items.reduce((sum, b) => sum + rewardDollars(b.reward), 0);
  const header = `## Top Bounties by Value\n\n**${items.length} bounties** | **Combined: $${totalValue.toLocaleString()}**\n\n`;
  const body = items.map(formatBounty).join("\n");

  return { content: [{ type: "text", text: header + body }] };
}

async function handleGetBountyStats(
  input: GetBountyStatsInput
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { org } = input;

  const result = await fetchBounties({
    org,
    status: "active",
    limit: 100,
  });

  const items = result.items ?? [];

  if (items.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No active bounties found${org ? ` for org: ${org}` : ""}.`,
        },
      ],
    };
  }

  const totalDollars = items.reduce((sum, b) => sum + rewardDollars(b.reward), 0);
  const avgDollars = totalDollars / items.length;

  // Tech breakdown
  const techMap: Record<string, { count: number; total: number }> = {};
  for (const b of items) {
    const techList: string[] = (b.tech ?? []).length > 0 ? (b.tech ?? []) : ["unspecified"];
    for (const t of techList) {
      if (!techMap[t]) techMap[t] = { count: 0, total: 0 };
      techMap[t].count += 1;
      techMap[t].total += rewardDollars(b.reward);
    }
  }

  const techLines = Object.entries(techMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(
      ([t, s]) =>
        `  - **${t}**: ${s.count} bounties, $${s.total.toLocaleString()} total`
    )
    .join("\n");

  // Value buckets
  const buckets = [
    { label: "$1,000+", min: 1000 },
    { label: "$500–$999", min: 500, max: 999 },
    { label: "$200–$499", min: 200, max: 499 },
    { label: "$100–$199", min: 100, max: 199 },
    { label: "Under $100", max: 99 },
  ];

  const bucketLines = buckets
    .map(({ label, min, max }) => {
      const count = items.filter((b) => {
        const d = rewardDollars(b.reward);
        if (min !== undefined && d < min) return false;
        if (max !== undefined && d > max) return false;
        return true;
      }).length;
      return `  - **${label}**: ${count} bounties`;
    })
    .join("\n");

  // Org breakdown (only when not scoped to single org)
  let orgSection = "";
  if (!org) {
    const orgMap: Record<string, { count: number; total: number }> = {};
    for (const b of items) {
      const handle = b.org.handle;
      if (!orgMap[handle]) orgMap[handle] = { count: 0, total: 0 };
      orgMap[handle].count += 1;
      orgMap[handle].total += rewardDollars(b.reward);
    }

    const orgLines = Object.entries(orgMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(
        ([handle, s]) =>
          `  - **${handle}**: ${s.count} bounties, $${s.total.toLocaleString()} total`
      )
      .join("\n");

    orgSection = `\n### By Organization (top 10)\n${orgLines}\n`;
  }

  const scope = org ? `**${org}**` : "Algora (all orgs)";
  const text = [
    `## Bounty Stats — ${scope}`,
    "",
    `- **Active bounties:** ${items.length}`,
    `- **Total value:** $${totalDollars.toLocaleString()}`,
    `- **Average bounty:** $${avgDollars.toFixed(0)}`,
    "",
    "### By Amount Range",
    bucketLines,
    "",
    "### By Tech Stack (top 10)",
    techLines,
    orgSection,
  ].join("\n");

  return { content: [{ type: "text", text }] };
}

// ---------------------------------------------------------------------------
// Tool schema definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "list_bounties",
    description:
      "List open bounties on Algora. Optionally filter by organization slug, status, minimum/maximum amount in USD, or tech stack. Returns paginated results with reward amounts and issue URLs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        org: {
          type: "string",
          description:
            "Organization slug on Algora (e.g., 'cal', 'supabase', 'projectdiscovery'). Omit to browse all orgs.",
        },
        status: {
          type: "string",
          enum: ["open", "active", "completed", "all"],
          description: "Bounty status. 'open'/'active' = claimable now. Default: 'open'.",
        },
        limit: {
          type: "number",
          description: "Max results (1–100). Default: 20.",
          minimum: 1,
          maximum: 100,
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response's next_cursor.",
        },
        min_amount: {
          type: "number",
          description: "Minimum bounty amount in USD (e.g., 200 for $200+).",
        },
        max_amount: {
          type: "number",
          description: "Maximum bounty amount in USD.",
        },
        tech: {
          type: "string",
          description: "Filter by tech/language (e.g., 'typescript', 'python', 'rust').",
        },
      },
      required: [],
    },
  },
  {
    name: "get_org_bounties",
    description:
      "Get all open bounties for a specific organization on Algora. Use this to check if a known project (cal.com, supabase, etc.) has active bounties you can claim.",
    inputSchema: {
      type: "object" as const,
      properties: {
        org: {
          type: "string",
          description:
            "Org slug from their Algora URL (e.g., 'cal' for algora.io/cal).",
        },
        status: {
          type: "string",
          enum: ["open", "active", "completed", "all"],
          description: "Bounty status filter. Default: 'open'.",
        },
        limit: {
          type: "number",
          description: "Max results (1–100). Default: 50.",
        },
      },
      required: ["org"],
    },
  },
  {
    name: "search_bounties",
    description:
      "Search open bounties by keyword. Searches titles, descriptions, repo names, and org handles. Useful for finding bounties in a specific domain (e.g., 'database', 'MCP', 'authentication').",
    inputSchema: {
      type: "object" as const,
      properties: {
        keyword: {
          type: "string",
          description: "Search term to match against bounty content.",
        },
        tech: {
          type: "string",
          description: "Filter by tech stack (e.g., 'typescript', 'go').",
        },
        min_amount: {
          type: "number",
          description: "Minimum bounty USD amount.",
        },
        limit: {
          type: "number",
          description: "Max results. Default: 30.",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "get_top_bounties",
    description:
      "Get the highest-value open bounties on Algora, sorted by reward descending. Perfect for finding the most lucrative opportunities first.",
    inputSchema: {
      type: "object" as const,
      properties: {
        tech: {
          type: "string",
          description: "Filter by tech stack (e.g., 'typescript', 'rust').",
        },
        min_amount: {
          type: "number",
          description: "Minimum USD amount to include. Default: 100.",
        },
        limit: {
          type: "number",
          description: "How many top bounties to return. Default: 10.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_bounty_stats",
    description:
      "Get aggregate statistics about open bounties: total count, combined value, average amount, breakdown by tech stack, and breakdown by organization. Useful for understanding the overall bounty landscape.",
    inputSchema: {
      type: "object" as const,
      properties: {
        org: {
          type: "string",
          description: "Scope stats to a specific org slug. Omit for all orgs.",
        },
      },
      required: [],
    },
  },
] as const;

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "algora-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs ?? {}) as Record<string, unknown>;

  try {
    switch (name) {
      case "list_bounties":
        return handleListBounties(args as ListBountiesInput);

      case "get_org_bounties":
        if (!args.org || typeof args.org !== "string") {
          throw new McpError(ErrorCode.InvalidParams, "org is required and must be a string");
        }
        return handleGetOrgBounties(args as unknown as GetOrgBountiesInput);

      case "search_bounties":
        if (!args.keyword || typeof args.keyword !== "string") {
          throw new McpError(ErrorCode.InvalidParams, "keyword is required and must be a string");
        }
        return handleSearchBounties(args as unknown as SearchBountiesInput);

      case "get_top_bounties":
        return handleGetTopBounties(args as GetTopBountiesInput);

      case "get_bounty_stats":
        return handleGetBountyStats(args as GetBountyStatsInput);

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (err) {
    if (err instanceof McpError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new McpError(ErrorCode.InternalError, `Tool "${name}" failed: ${message}`);
  }
});

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("Algora MCP Server v1.0.0 running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(
    `Fatal: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
