import type { Message, PermissionResolvable } from "discord.js";

import type { BotClient } from "../lib/bot-client.js";

export interface PrefixCommandContext {
  client: BotClient;
  message: Message;
  args: string[];
  rawArgs: string;
  commandName: string;
}

export interface PrefixCommand {
  name: string;
  description: string;
  category: string;
  usage?: string;
  aliases?: string[];
  permissions?: PermissionResolvable[];
  execute: (context: PrefixCommandContext) => Promise<void>;
}
