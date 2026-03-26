import type { BotClient } from "../../lib/bot-client.js";
import { env } from "../../config/env.js";
import { buildDashboardSnapshot } from "./dashboard-service.js";

let syncTimer: NodeJS.Timeout | null = null;

async function pushSnapshot(client: BotClient): Promise<void> {
  if (!env.dashboardSyncUrl) {
    return;
  }

  try {
    const snapshot = await buildDashboardSnapshot(client);
    await fetch(env.dashboardSyncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dashboard-secret": env.dashboardSyncSecret
      },
      body: JSON.stringify(snapshot)
    });
  } catch (error) {
    console.error("Dashboard sync failed:", error);
  }
}

export function startDashboardSync(client: BotClient): void {
  if (syncTimer) {
    return;
  }

  const run = () => {
    void pushSnapshot(client);
  };

  client.once("clientReady", run);
  syncTimer = setInterval(run, 60_000);
  syncTimer.unref?.();
}
