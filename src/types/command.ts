import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from "discord.js";

import type { BotClient } from "../lib/bot-client.js";

export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface SlashCommand {
  category: string;
  data: SlashCommandData;
  execute: (
    client: BotClient,
    interaction: ChatInputCommandInteraction
  ) => Promise<void>;
}
