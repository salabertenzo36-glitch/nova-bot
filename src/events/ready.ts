import type { BotClient } from "../lib/bot-client.js";

export function registerReadyEvent(client: BotClient): void {
  client.once("clientReady", () => {
    console.log(`Nova connecte en tant que ${client.user?.tag}`);
  });
}
