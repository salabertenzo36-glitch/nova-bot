import { EmbedBuilder } from "discord.js";

import { answerWithAi } from "../features/ai/ai-service.js";
import { getGuildAiSettings } from "../features/ai/ai-settings.js";
import { listBridgeChannels } from "../features/bridge/bridge-service.js";
import type { BotClient } from "../lib/bot-client.js";
import { prefix } from "../prefix/index.js";
import { ensurePermissions } from "../prefix/shared.js";

export function registerMessageCreateEvent(client: BotClient): void {
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot || !message.guild) {
        return;
      }

      const bridgeChannels = await listBridgeChannels();

      if (bridgeChannels.includes(message.channelId)) {
        for (const channelId of bridgeChannels) {
          if (channelId === message.channelId) {
            continue;
          }

          const target = await client.channels.fetch(channelId).catch(() => null);
          if (!target || !("send" in target)) {
            continue;
          }

          const embed = new EmbedBuilder()
            .setAuthor({
              name: `${message.author.username} • ${message.guild.name}`,
              iconURL: message.author.displayAvatarURL()
            })
            .setDescription(message.content || "*message sans texte*")
            .setTimestamp();

          await target.send({ embeds: [embed] }).catch(() => null);
        }
      }

      if (message.content.startsWith(prefix)) {
        const lines = message.content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith(prefix) && line.length > prefix.length);

        for (const line of lines) {
          const body = line.slice(prefix.length).trim();
          if (!body) {
            continue;
          }

          const [name, ...args] = body.split(/\s+/);
          const command = client.prefixCommands.get(name.toLowerCase());
          if (!command) {
            continue;
          }

          const context = {
            client,
            message,
            args,
            rawArgs: body.slice(name.length).trim(),
            commandName: name.toLowerCase()
          };

          if (!(await ensurePermissions(context, command.permissions))) {
            continue;
          }

          await command.execute(context);
        }
        return;
      }

      const mentionRegex = new RegExp(`^<@!?${client.user?.id}>`);
      if (mentionRegex.test(message.content)) {
        const settings = await getGuildAiSettings(message.guild.id);
        if (!settings.mentionEnabled) {
          return;
        }

        const prompt = message.content.replace(mentionRegex, "").trim();
        if (!prompt) {
          await message.reply("Ecris un message apres la mention du bot.");
          return;
        }

        const reply = await answerWithAi({
          scopeId: message.channelId,
          userId: message.author.id,
          username: message.author.username,
          guildId: message.guild.id,
          guildName: message.guild.name,
          channelName: "name" in message.channel && typeof message.channel.name === "string" ? message.channel.name : undefined,
          prompt
        });
        await message.reply(reply.slice(0, 2000));
      }
    } catch (error) {
      console.error("messageCreate error:", error);
      await message.reply("Erreur pendant l'execution de la commande ou de l'IA. Verifie Ollama et les logs du bot.").catch(() => null);
    }
  });
}
