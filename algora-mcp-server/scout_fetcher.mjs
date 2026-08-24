import { algora } from "@algora/sdk";

async function fetchBounties() {
  try {
    const res = await algora.bounty.list.query({ limit: 50, status: "active" });
    const items = res.items || [];
    
    const formatted = items.map((b) => ({
      id: b.task.id,
      title: b.task.title || "Untitled",
      url: b.task.url || "",
      org_handle: b.org.handle,
      org_name: b.org.display_name || b.org.name,
      repo_owner: b.task.repo_owner,
      repo_name: b.task.repo_name,
      issue_number: b.task.number,
      body: b.task.body || "",
      reward_usd: b.reward ? b.reward.amount / 100 : 0,
      reward_formatted: b.reward_formatted || `$${b.reward ? b.reward.amount / 100 : 0}`,
      tech: b.tech || [],
      created_at: b.created_at || new Date().toISOString(),
    }));

    console.log(JSON.stringify(formatted, null, 2));
  } catch (err) {
    console.error("Error fetching bounties:", err.message);
    process.exit(1);
  }
}

fetchBounties();
