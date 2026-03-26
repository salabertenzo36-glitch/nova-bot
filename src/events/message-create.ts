import { ChannelType, EmbedBuilder, type Message } from "discord.js";

import { answerWithAi } from "../features/ai/ai-service.js";
import { getGuildAiSettings } from "../features/ai/ai-settings.js";
import { listBridgeChannels } from "../features/bridge/bridge-service.js";
import { env } from "../config/env.js";
import type { BotClient } from "../lib/bot-client.js";
import { prefix } from "../prefix/index.js";
import { ensurePermissions, makeEmbed } from "../prefix/shared.js";

function makeAiEmbed(title: string, description: string): EmbedBuilder {
  return makeEmbed(title, description, 0x5ba2ff).setFooter({
    text: "Nova AI"
  });
}

async function relayBridgeMessage(
  client: BotClient,
  message: Message<true>,
  targetChannelId: string
): Promise<void> {
  const target = await client.channels.fetch(targetChannelId).catch(() => null);
  if (!target || target.type !== ChannelType.GuildText) {
    return;
  }

  const webhooks = await target.fetchWebhooks().catch(() => null);
  if (!webhooks) {
    return;
  }

  let webhook = webhooks.find((entry) => entry.owner?.id === client.user?.id && entry.name === "Nova Bridge");
  if (!webhook) {
    webhook = await target.createWebhook({
      name: "Nova Bridge",
      avatar: client.user?.displayAvatarURL() ?? undefined
    }).catch(() => undefined);
  }

  if (!webhook) {
    return;
  }

  const memberName =
    message.member?.displayName ||
    message.author.globalName ||
    message.author.username;

  const attachmentLinks = [...message.attachments.values()].map((attachment) => attachment.url);
  const content = [message.content.trim(), ...attachmentLinks].filter(Boolean).join("\n").slice(0, 2000) || "*message sans texte*";

  await webhook.send({
    content,
    username: `${memberName} • ${message.guild.name}`.slice(0, 80),
    avatarURL: message.author.displayAvatarURL(),
    allowedMentions: {
      parse: []
    }
  }).catch(() => null);
}

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
          await relayBridgeMessage(client, message as Message<true>, channelId);
        }
      }

      const founderMentioned = message.mentions.users.has(env.founderId);
      if (founderMentioned && message.author.id !== env.founderId) {
        await message.delete().catch(() => null);
        const warning = await message.channel.send({
          embeds: [
            makeEmbed(
              "Anti Ping Fondateur",
              "Le fondateur ne peut pas etre mentionne ici. Utilise un ticket ou le support si besoin. 🚫",
              0xed4245
            )
          ]
        }).catch(() => null);

        if (warning) {
          setTimeout(() => {
            void warning.delete().catch(() => null);
          }, 8000);
        }
        return;
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
          await message.reply({
            embeds: [makeAiEmbed("Nova AI", "Ecris un message apres la mention du bot. 💬")]
          });
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
        await message.reply({
          embeds: [makeAiEmbed("Nova AI", reply)]
        });
      }
    } catch (error) {
      console.error("messageCreate error:", error);
      await message.reply({
        embeds: [
          makeEmbed(
            "Erreur",
            "Erreur pendant l'execution de la commande ou de l'IA. Verifie Ollama et les logs du bot.",
            0xed4245
          )
        ]
      }).catch(() => null);
    }
  });
}
