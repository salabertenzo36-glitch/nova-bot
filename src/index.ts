import { env } from "./config/env.js";
import { registerInteractionCreateEvent } from "./events/interaction-create.js";
import { registerMessageCreateEvent } from "./events/message-create.js";
import { registerReadyEvent } from "./events/ready.js";
import { startDashboardServer } from "./features/dashboard/dashboard-server.js";
import { BotClient } from "./lib/bot-client.js";
import { buildPrefixCommandMap } from "./prefix/index.js";

async function main(): Promise<void> {
  const client = new BotClient();

  for (const [name, command] of buildPrefixCommandMap()) {
    client.prefixCommands.set(name, command);
  }

  registerReadyEvent(client);
  registerInteractionCreateEvent(client);
  registerMessageCreateEvent(client);

  startDashboardServer(client);

  await client.login(env.discordToken);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
