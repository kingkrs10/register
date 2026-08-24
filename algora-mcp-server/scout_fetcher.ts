import { algora } from "@algora/sdk";

async function fetchBounties() {
  try {
    const res = await algora.bounty.list.query({ limit: 50, status: "active" });
    const items = res.items || [];
    
    const formatted = items.map((b: any) => ({
      id: b.task ? b.task.id : "bounty-" + Math.random(),
      title: b.task ? b.task.title : "Untitled",
      url: b.task ? b.task.url : "",
      org_handle: b.org ? b.org.handle : "",
      org_name: b.org ? (b.org.display_name || b.org.name) : "",
      repo_owner: b.task ? b.task.repo_owner : "",
      repo_name: b.task ? b.task.repo_name : "",
      issue_number: b.task ? b.task.number : 0,
      body: b.task ? b.task.body : "",
      reward_usd: b.reward ? b.reward.amount / 100 : 0,
      reward_formatted: b.reward_formatted || `$${b.reward ? b.reward.amount / 100 : 0}`,
      tech: b.tech || [],
      created_at: b.created_at || new Date().toISOString(),
    }));

    console.log(JSON.stringify(formatted, null, 2));
  } catch (err: any) {
    console.error("Error fetching bounties:", err.message);
    process.exit(1);
  }
}

fetchBounties();
