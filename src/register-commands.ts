import { REST, Routes } from "discord.js";

import { allCommands } from "./commands/index.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.discordToken);
  const bodies = allCommands.map((command) => command.data.toJSON());

  if (bodies.length > 100) {
    console.warn(
      `Attention: ${bodies.length} commandes top-level detectees. Discord limite les slash chat input top-level. Regroupe-les en sous-commandes avant de deployer en production.`
    );
  }

  if (env.discordDevGuildId) {
    await rest.put(
      Routes.applicationGuildCommands(env.discordClientId, env.discordDevGuildId),
      { body: bodies.slice(0, 100) }
    );
    console.log(`Commandes deployees sur le serveur de dev: ${bodies.slice(0, 100).length}`);
    return;
  }

  await rest.put(Routes.applicationCommands(env.discordClientId), {
    body: bodies.slice(0, 100)
  });
  console.log(`Commandes globales deployees: ${bodies.slice(0, 100).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
