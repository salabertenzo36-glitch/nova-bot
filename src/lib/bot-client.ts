import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";

import type { PrefixCommand } from "../types/prefix-command.js";
import type { SlashCommand } from "../types/command.js";

export class BotClient extends Client {
  public readonly commands = new Collection<string, SlashCommand>();
  public readonly prefixCommands = new Collection<string, PrefixCommand>();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
      ],
      partials: [Partials.Channel]
    });
  }
}
