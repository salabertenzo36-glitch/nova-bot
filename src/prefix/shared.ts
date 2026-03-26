import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type PermissionResolvable
} from "discord.js";
import { createHash, randomUUID } from "node:crypto";

import { getGuildAiSettings, updateGuildAiSettings } from "../features/ai/ai-settings.js";
import { answerWithAi, resetAiConversation } from "../features/ai/ai-service.js";
import { addBridgeChannel, listBridgeChannels, removeBridgeChannel } from "../features/bridge/bridge-service.js";
import { createGiveaway, joinGiveaway } from "../features/giveaway/giveaway-service.js";
import { getModConfig, setModBoolean, setModNumber, setModText, toggleModBoolean } from "../features/moderation/mod-config.js";
import { getTicketConfig, setTicketBoolean, setTicketNumber, setTicketText } from "../features/tickets/ticket-config.js";
import { getTicketPanel, registerTicketPanel } from "../features/tickets/ticket-service.js";
import type { PrefixCommand, PrefixCommandContext } from "../types/prefix-command.js";

export function makeEmbed(title: string, description: string, color = 0x5865f2): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title.slice(0, 256))
    .setDescription(description.slice(0, 4096))
    .setColor(color);
}

function parseHexColor(input?: string): number {
  if (!input) {
    return 0x5865f2;
  }

  const normalized = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return 0x5865f2;
  }

  return Number.parseInt(normalized, 16);
}

function buildTicketPanelEmbed(config: Awaited<ReturnType<typeof getTicketConfig>>): EmbedBuilder {
  const color = parseHexColor(config.texts["panel.color"]);
  const titleText = config.texts["panel.title"] || "Support";
  const descriptionText = config.texts["panel.description"] || "Clique pour ouvrir un ticket.";
  const noteText = config.texts["panel.note"] || "Explique ton probleme clairement pour avoir une reponse plus rapide.";
  const footerText = config.texts["panel.footer"] || "Nova Support";

  const embed = makeEmbed(titleText, descriptionText, color)
    .addFields({
      name: "Informations",
      value: noteText.slice(0, 1024)
    })
    .setFooter({ text: footerText.slice(0, 2048) });

  return embed;
}

function buildTicketOpenEmbed(
  config: Awaited<ReturnType<typeof getTicketConfig>>,
  userId: string
): EmbedBuilder {
  const color = parseHexColor(config.texts["panel.color"]);
  const roleLine = config.texts["setup.staffrole"] ? `Staff: <@&${config.texts["setup.staffrole"]}>` : "Staff: non defini";
  const transcriptLine = `Transcripts: ${(config.booleans["setup.transcript"] ?? false) ? "on" : "off"}`;

  return makeEmbed(
    config.texts["ticket.welcome-title"] || "Ticket ouvert",
    [
      config.texts["ticket.welcome-description"] || "Merci d'expliquer ton besoin avec un maximum de details.",
      "",
      `Auteur: <@${userId}>`,
      roleLine,
      transcriptLine
    ].join("\n"),
    color
  ).setFooter({
    text: config.texts["panel.footer"] || "Nova Support"
  });
}

export async function replyEmbed(
  context: PrefixCommandContext,
  title: string,
  description: string,
  color = 0x5865f2
): Promise<void> {
  await context.message.reply({ embeds: [makeEmbed(title, description, color)] });
}

async function replyPrivateEmbed(
  context: PrefixCommandContext,
  title: string,
  description: string,
  color = 0x5865f2
): Promise<void> {
  try {
    await context.message.author.send({ embeds: [makeEmbed(title, description, color)] });
    return;
  } catch {
    const reply = await context.message.reply({ embeds: [makeEmbed(title, description, color)] }).catch(() => null);
    if (reply) {
      setTimeout(() => {
        void reply.delete().catch(() => null);
      }, 8000);
    }
  }
}

export async function ensurePermissions(
  context: PrefixCommandContext,
  permissions?: PermissionResolvable[]
): Promise<boolean> {
  if (!permissions?.length) {
    return true;
  }

  if (!context.message.guild || !context.message.member?.permissions.has(permissions)) {
    await replyEmbed(
      context,
      "Permissions insuffisantes",
      `Il te faut: ${permissions.join(", ")}`,
      0xed4245
    );
    return false;
  }

  return true;
}

export function tokenize(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

async function sendTicketPanel(
  context: PrefixCommandContext,
  mode: "preview" | "post"
): Promise<void> {
  const { message } = context;
  if (!message.guild || !("send" in message.channel)) {
    await replyEmbed(context, "Ticket Setup", "Salon incompatible.", 0xed4245);
    return;
  }

  const config = await getTicketConfig(message.guild.id);
  const buttonText = config.texts["panel.button-open"] || "Ouvrir un ticket";
  const buttonEmoji = config.texts["panel.button-emoji"] || "🎫";

  const panelPayload = {
    embeds: [buildTicketPanelEmbed(config)],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket:create")
          .setLabel(buttonText.slice(0, 80) || "Ouvrir un ticket")
          .setEmoji(buttonEmoji)
          .setStyle(ButtonStyle.Primary)
      ).toJSON()
    ]
  };

  try {
    if (mode === "preview") {
      await message.reply(panelPayload);
      await replyPrivateEmbed(context, "Ticket Setup", "Preview envoyee.", 0x3ba55d);
      return;
    }

    const existingPanel = await getTicketPanel(message.guild.id);
    if (existingPanel) {
      const existingChannel = await message.guild.channels.fetch(existingPanel.channelId).catch(() => null);
      if (existingChannel && "messages" in existingChannel) {
        const existingMessage = await existingChannel.messages.fetch(existingPanel.messageId).catch(() => null);
        if (existingMessage) {
          await existingMessage.edit(panelPayload);
          await replyPrivateEmbed(
            context,
            "Ticket Panel",
            `Panel mis a jour dans <#${existingPanel.channelId}>.`,
            0x3ba55d
          );
          return;
        }
      }
    }

    const panelMessage = await message.channel.send(panelPayload);
    await registerTicketPanel(message.guild.id, message.channel.id, panelMessage.id);
    await replyPrivateEmbed(context, "Ticket Panel", "Panel envoye dans ce salon.", 0x3ba55d);
  } catch (error) {
    console.error("ticket panel error:", error);
    const detail = error instanceof Error ? error.message : "erreur inconnue";
    await replyPrivateEmbed(context, "Ticket Panel", `Impossible d'envoyer le panel: ${detail}`.slice(0, 4000), 0xed4245);
  }
}

function title(input: string): string {
  return input
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function percent(seed: string): number {
  let total = 0;
  for (const char of seed) total += char.charCodeAt(0);
  return total % 101;
}

function categoryEmoji(category: string): string {
  const map: Record<string, string> = {
    core: "🧠",
    moderation: "🛡️",
    tickets: "🎫",
    utility: "🧰",
    fun: "🎉"
  };
  return map[category] ?? "📘";
}

function priorityScore(command: PrefixCommand): number {
  const high = new Set([
    "help", "ping", "warn", "mute", "kick", "ban", "unban", "purge", "history",
    "ticket-panel-post", "ticket-close", "ticket-claim", "ticket-add", "ticket-remove",
    "ai-ask", "ai-reset", "ai-status", "reverse", "choose", "coinflip", "8ball",
    "hug", "ship", "meme", "fortune", "rps"
  ]);
  return high.has(command.name) ? 0 : 1;
}

function chunkCommands(commands: PrefixCommand[], size: number): PrefixCommand[][] {
  const chunks: PrefixCommand[][] = [];
  for (let index = 0; index < commands.length; index += size) {
    chunks.push(commands.slice(index, index + size));
  }
  return chunks;
}

async function moderationHandler(kind: string, context: PrefixCommandContext): Promise<void> {
  const { message, args, rawArgs } = context;
  if (!message.guild) {
    await replyEmbed(context, "Serveur requis", "Commande reservee a un serveur.", 0xed4245);
    return;
  }

  const guildId = message.guild.id;
  const member = message.mentions.members?.first() ?? null;

  if (["warn", "mute", "unmute", "kick", "ban", "nickname", "role-add", "role-remove", "avatar"].includes(kind) && !member && kind !== "avatar") {
    await replyEmbed(context, title(kind), "Mentionne un membre.", 0xed4245);
    return;
  }

  if (kind === "warn") {
    const reason = rawArgs.replace(member!.toString(), "").trim() || "Aucune raison fournie";
    const warnsKey = `member.warns.${member!.id}`;
    const notesKey = `member.warn-notes.${member!.id}`;
    const state = await getModConfig(guildId);
    const nextCount = (state.numbers[warnsKey] ?? 0) + 1;
    const history = state.texts[notesKey] ?? "";
    const entry = `#${nextCount} • ${message.author.tag} • ${reason}`;
    await setModNumber(guildId, warnsKey, nextCount);
    await setModText(guildId, notesKey, history ? `${history}\n${entry}` : entry);
    await replyEmbed(context, "Warn", `${member} a ete averti.\nTotal warns: ${nextCount}\nRaison: ${reason}`, 0x3ba55d);
    return;
  }
  if (kind === "history" || kind === "flags" || kind === "note-view") {
    const target = member ?? message.mentions.members?.first();
    if (!target) {
      await replyEmbed(context, "Historique", "Mentionne un membre.", 0xed4245);
      return;
    }
    const state = await getModConfig(guildId);
    const warns = state.numbers[`member.warns.${target.id}`] ?? 0;
    const notes = state.texts[`member.warn-notes.${target.id}`] ?? "Aucun historique.";
    await replyEmbed(context, "Historique Mod", `${target}\nWarns: ${warns}\n\n${notes}`);
    return;
  }
  if (kind === "mute") {
    if (!member?.moderatable) {
      await replyEmbed(context, "Mute impossible", "Je ne peux pas timeout ce membre.", 0xed4245);
      return;
    }
    const minutes = Number(args.find((arg) => /^\d+$/.test(arg)) ?? "10");
    await member.timeout(minutes * 60_000, rawArgs);
    await replyEmbed(context, "Mute", `${member} timeout pour ${minutes} minute(s).`, 0x3ba55d);
    return;
  }
  if (kind === "unmute") {
    await member!.timeout(null);
    await replyEmbed(context, "Unmute", `${member} n'est plus timeout.`, 0x3ba55d);
    return;
  }
  if (kind === "kick") {
    if (!member?.manageable) {
      await replyEmbed(context, "Kick impossible", "Je ne peux pas expulser ce membre.", 0xed4245);
      return;
    }
    await member.kick(rawArgs);
    await replyEmbed(context, "Kick", `${member.user.tag} expulse.`, 0x3ba55d);
    return;
  }
  if (kind === "ban") {
    if (!member?.manageable) {
      await replyEmbed(context, "Ban impossible", "Je ne peux pas bannir ce membre.", 0xed4245);
      return;
    }
    await member.ban({ reason: rawArgs });
    await replyEmbed(context, "Ban", `${member.user.tag} banni.`, 0x3ba55d);
    return;
  }
  if (kind === "unban") {
    const userId = args[0];
    if (!userId) {
      await replyEmbed(context, "Unban", "Donne un ID utilisateur.", 0xed4245);
      return;
    }
    await message.guild.bans.remove(userId);
    await replyEmbed(context, "Unban", `${userId} debanni.`, 0x3ba55d);
    return;
  }
  if (kind === "nickname") {
    const nickname = rawArgs.replace(member!.toString(), "").trim();
    await member!.setNickname(nickname || null);
    await replyEmbed(context, "Nickname", `${member!.user.tag} -> ${nickname || "reset"}`, 0x3ba55d);
    return;
  }
  if (kind === "avatar") {
    const user = message.mentions.users.first() ?? message.author;
    await replyEmbed(context, "Avatar", user.displayAvatarURL({ size: 4096 }));
    return;
  }
  if (kind === "purge") {
    const amount = Number(args[0] ?? "10");
    if (!message.channel || !("bulkDelete" in message.channel)) {
      await replyEmbed(context, "Purge", "Salon incompatible.", 0xed4245);
      return;
    }
    await message.channel.bulkDelete(amount, true);
    await replyEmbed(context, "Purge", `${amount} message(s) supprimes.`, 0x3ba55d);
    return;
  }
  if (kind === "purge-user") {
    const user = message.mentions.users.first();
    const amount = Number(args.find((arg) => /^\d+$/.test(arg)) ?? "10");
    if (!user || !("messages" in message.channel) || !("bulkDelete" in message.channel)) {
      await replyEmbed(context, "Purge User", "Usage: .purge-user @membre 20", 0xed4245);
      return;
    }
    const messages = await message.channel.messages.fetch({ limit: 100 });
    const filtered = messages.filter((entry) => entry.author.id === user.id).first(amount);
    await message.channel.bulkDelete(filtered, true);
    await replyEmbed(context, "Purge User", `${filtered.length} message(s) de ${user.tag} supprimes.`, 0x3ba55d);
    return;
  }
  if (kind === "say") {
    const content = rawArgs.trim();
    if (!content) {
      await replyEmbed(context, "Say", "Donne un texte.", 0xed4245);
      return;
    }
    if (!("send" in message.channel)) {
      await replyEmbed(context, "Say", "Salon incompatible.", 0xed4245);
      return;
    }
    await message.channel.send({ embeds: [makeEmbed("Annonce", content)] });
    await replyEmbed(context, "Say", "Message envoye.", 0x3ba55d);
    return;
  }
  if (kind === "lock" || kind === "unlock") {
    if (!("permissionOverwrites" in message.channel)) {
      await replyEmbed(context, title(kind), "Salon incompatible.", 0xed4245);
      return;
    }
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: kind === "lock" ? false : null
    });
    await replyEmbed(context, title(kind), `Salon ${kind === "lock" ? "verrouille" : "deverrouille"}.`, 0x3ba55d);
    return;
  }

  const configBuckets: Record<string, string> = {
    automod: "automod",
    logs: "logs",
    channels: "channels",
    messages: "messages",
    member: "member"
  };
  const bucket = kind.startsWith("automod-")
    ? "automod"
    : kind.startsWith("log-")
      ? "logs"
      : kind.startsWith("channel-")
        ? "channels"
        : kind.startsWith("message-")
          ? "messages"
          : "member";

  const key = `${bucket}.${kind}`;
  if (args[0] === "on" || args[0] === "off") {
    const enabled = args[0] === "on";
    await setModBoolean(guildId, key, enabled);
    await replyEmbed(context, title(kind), `${kind} ${enabled ? "active" : "desactive"}.`, 0x3ba55d);
    return;
  }
  if (args[0] && /^\d+$/.test(args[0])) {
    await setModNumber(guildId, key, Number(args[0]));
    await replyEmbed(context, title(kind), `Valeur numerique: ${args[0]}`, 0x3ba55d);
    return;
  }
  if (rawArgs.trim()) {
    await setModText(guildId, key, rawArgs.trim());
    await replyEmbed(context, title(kind), `Valeur: ${rawArgs.trim()}`, 0x3ba55d);
    return;
  }
  if (bucket === "logs" || bucket === "automod" || bucket === "channels" || bucket === "messages") {
    const next = await toggleModBoolean(guildId, key);
    await replyEmbed(context, title(kind), `${kind} ${next ? "active" : "desactive"}.`, 0x3ba55d);
    return;
  }

  const state = await getModConfig(guildId);
  await replyEmbed(
    context,
    title(kind),
    `Booleen: ${String(state.booleans[key] ?? false)}\nNombre: ${String(state.numbers[key] ?? 0)}\nTexte: ${state.texts[key] ?? "aucun"}`
  );
}

async function ticketHandler(kind: string, context: PrefixCommandContext): Promise<void> {
  const { message, rawArgs, args } = context;
  if (!message.guild) {
    await replyEmbed(context, "Serveur requis", "Commande reservee a un serveur.", 0xed4245);
    return;
  }
  const guildId = message.guild.id;

  if (kind === "setup") {
    const action = (args[0] ?? "").toLowerCase();
    if (!action) {
      const config = await getTicketConfig(guildId);
      await replyEmbed(
        context,
        "Ticket Setup",
        [
          `Titre: ${config.texts["panel.title"] ?? "Support"}`,
          `Description: ${config.texts["panel.description"] ?? "Clique pour ouvrir un ticket."}`,
          `Bouton: ${config.texts["panel.button-open"] ?? "Ouvrir un ticket"}`,
          `Emoji bouton: ${config.texts["panel.button-emoji"] ?? "🎫"}`,
          `Couleur: ${config.texts["panel.color"] ?? "#5865f2"}`,
          `Note: ${config.texts["panel.note"] ?? "aucune"}`,
          `Footer: ${config.texts["panel.footer"] ?? "Nova Support"}`,
          `Titre ticket: ${config.texts["ticket.welcome-title"] ?? "Ticket ouvert"}`,
          `Message ticket: ${config.texts["ticket.welcome-description"] ?? "Merci d'expliquer ton besoin avec un maximum de details."}`,
          `Categorie: ${config.texts["setup.category"] ?? "aucune"}`,
          `Role staff: ${config.texts["setup.staffrole"] ?? "aucun"}`,
          `Salon logs: ${config.texts["setup.logchannel"] ?? "aucun"}`,
          `Transcripts: ${(config.booleans["setup.transcript"] ?? false) ? "on" : "off"}`,
          "",
          "Actions:",
          "`+ticketsetup title <texte>`",
          "`+ticketsetup description <texte>`",
          "`+ticketsetup note <texte>`",
          "`+ticketsetup footer <texte>`",
          "`+ticketsetup color #5865f2`",
          "`+ticketsetup button <texte>`",
          "`+ticketsetup emoji 🎫`",
          "`+ticketsetup opentitle <texte>`",
          "`+ticketsetup openmessage <texte>`",
          "`+ticketsetup category #categorie`",
          "`+ticketsetup staffrole @role`",
          "`+ticketsetup logchannel #salon`",
          "`+ticketsetup transcript on|off`",
          "`+ticketsetup preview`",
          "`+ticketsetup post`"
        ].join("\n")
      );
      return;
    }

    if (action === "title") {
      await setTicketText(guildId, "panel.title", args.slice(1).join(" ").trim());
      await replyPrivateEmbed(context, "Ticket Setup", "Titre du panel mis a jour.", 0x3ba55d);
      return;
    }
    if (action === "description") {
      await setTicketText(guildId, "panel.description", args.slice(1).join(" ").trim());
      await replyPrivateEmbed(context, "Ticket Setup", "Description du panel mise a jour.", 0x3ba55d);
      return;
    }
    if (action === "button") {
      await setTicketText(guildId, "panel.button-open", args.slice(1).join(" ").trim());
      await replyPrivateEmbed(context, "Ticket Setup", "Texte du bouton mis a jour.", 0x3ba55d);
      return;
    }
    if (action === "emoji") {
      const emoji = args[1]?.trim();
      if (!emoji) {
        await replyPrivateEmbed(context, "Ticket Setup", "Donne un emoji pour le bouton.", 0xed4245);
        return;
      }
      await setTicketText(guildId, "panel.button-emoji", emoji);
      await replyPrivateEmbed(context, "Ticket Setup", "Emoji du bouton mis a jour.", 0x3ba55d);
      return;
    }
    if (action === "note") {
      await setTicketText(guildId, "panel.note", args.slice(1).join(" ").trim());
      await replyPrivateEmbed(context, "Ticket Setup", "Note du panel mise a jour.", 0x3ba55d);
      return;
    }
    if (action === "footer") {
      await setTicketText(guildId, "panel.footer", args.slice(1).join(" ").trim());
      await replyPrivateEmbed(context, "Ticket Setup", "Footer du panel mis a jour.", 0x3ba55d);
      return;
    }
    if (action === "color") {
      const value = args[1]?.trim();
      if (!value) {
        await replyPrivateEmbed(context, "Ticket Setup", "Donne une couleur hex, par exemple `#5865f2`.", 0xed4245);
        return;
      }
      await setTicketText(guildId, "panel.color", value);
      await replyPrivateEmbed(context, "Ticket Setup", "Couleur du panel mise a jour.", 0x3ba55d);
      return;
    }
    if (action === "opentitle") {
      await setTicketText(guildId, "ticket.welcome-title", args.slice(1).join(" ").trim());
      await replyPrivateEmbed(context, "Ticket Setup", "Titre du ticket mis a jour.", 0x3ba55d);
      return;
    }
    if (action === "openmessage") {
      await setTicketText(guildId, "ticket.welcome-description", args.slice(1).join(" ").trim());
      await replyPrivateEmbed(context, "Ticket Setup", "Message d'accueil du ticket mis a jour.", 0x3ba55d);
      return;
    }
    if (action === "category") {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await replyPrivateEmbed(context, "Ticket Setup", "Mentionne une categorie.", 0xed4245);
        return;
      }
      await setTicketText(guildId, "setup.category", channel.id);
      await replyPrivateEmbed(context, "Ticket Setup", `Categorie definie sur <#${channel.id}>.`, 0x3ba55d);
      return;
    }
    if (action === "staffrole") {
      const role = message.mentions.roles.first();
      if (!role) {
        await replyPrivateEmbed(context, "Ticket Setup", "Mentionne un role staff.", 0xed4245);
        return;
      }
      await setTicketText(guildId, "setup.staffrole", role.id);
      await replyPrivateEmbed(context, "Ticket Setup", `Role staff defini sur <@&${role.id}>.`, 0x3ba55d);
      return;
    }
    if (action === "logchannel") {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await replyPrivateEmbed(context, "Ticket Setup", "Mentionne un salon logs.", 0xed4245);
        return;
      }
      await setTicketText(guildId, "setup.logchannel", channel.id);
      await replyPrivateEmbed(context, "Ticket Setup", `Salon logs defini sur <#${channel.id}>.`, 0x3ba55d);
      return;
    }
    if (action === "transcript") {
      const enabled = (args[1] ?? "").toLowerCase() === "on";
      await setTicketBoolean(guildId, "setup.transcript", enabled);
      await replyPrivateEmbed(context, "Ticket Setup", `Transcripts ${enabled ? "actives" : "desactives"}.`, 0x3ba55d);
      return;
    }
    if (action === "preview" || action === "post") {
      await sendTicketPanel(context, action);
      return;
    }

    await replyPrivateEmbed(context, "Ticket Setup", "Action inconnue.", 0xed4245);
    return;
  }

  if (kind === "close") {
    if (!message.channel || !("delete" in message.channel)) {
      await replyEmbed(context, "Ticket", "Salon incompatible.", 0xed4245);
      return;
    }
    await replyEmbed(context, "Ticket", "Fermeture du ticket...", 0x3ba55d);
    await message.channel.delete().catch(() => null);
    return;
  }

  if (kind === "claim") {
    if (!("setName" in message.channel)) {
      await replyEmbed(context, "Ticket", "Salon incompatible.", 0xed4245);
      return;
    }
    const nextName = `claimed-${message.channel.name}`.slice(0, 90);
    await message.channel.setName(nextName).catch(() => null);
    await replyEmbed(context, "Ticket", `${message.author} a claim ce ticket.`, 0x3ba55d);
    return;
  }

  if (kind === "add" || kind === "remove") {
    const member = message.mentions.members?.first();
    if (!member || !("permissionOverwrites" in message.channel)) {
      await replyEmbed(context, "Ticket", `Usage: +ticket${kind} @membre`, 0xed4245);
      return;
    }
    await message.channel.permissionOverwrites.edit(member.id, {
      ViewChannel: kind === "add" ? true : false,
      SendMessages: kind === "add" ? true : false,
      ReadMessageHistory: kind === "add" ? true : false
    });
    await replyEmbed(context, "Ticket", `${member} ${kind === "add" ? "ajoute" : "retire"} du ticket.`, 0x3ba55d);
    return;
  }

  if (["panel-post", "panel-preview", "panel-send-demo"].includes(kind)) {
    if (kind === "panel-preview") {
      await sendTicketPanel(context, "preview");
      return;
    }
    await sendTicketPanel(context, "post");
    return;
  }

  const key = kind.replace(/-/g, ".");
  if (context.args[0] === "on" || context.args[0] === "off") {
    const enabled = context.args[0] === "on";
    await setTicketBoolean(guildId, key, enabled);
  } else if (context.args[0] && /^\d+$/.test(context.args[0])) {
    await setTicketNumber(guildId, key, Number(context.args[0]));
  } else if (rawArgs.trim()) {
    await setTicketText(guildId, key, rawArgs.trim());
  }

  const config = await getTicketConfig(guildId);
  await replyEmbed(
    context,
    title(kind),
    `Etat: ${String(config.booleans[key] ?? false)}\nNombre: ${String(config.numbers[key] ?? 0)}\nTexte: ${config.texts[key] ?? "aucun"}`
  );
}

async function utilHandler(kind: string, context: PrefixCommandContext): Promise<void> {
  const { message, rawArgs, args } = context;
  const input = rawArgs || "Nova";
  const user = message.mentions.users.first() ?? message.author;

  const outputs: Record<string, string> = {
    server: message.guild ? `Serveur: ${message.guild.name}\nMembres: ${message.guild.memberCount}` : "Aucun serveur.",
    user: `Utilisateur: ${user.tag}\nID: ${user.id}`,
    avatar: user.displayAvatarURL({ size: 4096 }),
    membercount: `${message.guild?.memberCount ?? 0}`,
    owner: message.guild ? `<@${message.guild.ownerId}>` : "Aucun serveur",
    latency: `${context.client.ws.ping}ms`,
    say: input,
    choose: pick(input.split("|").map((item) => item.trim()).filter(Boolean).length ? input.split("|").map((item) => item.trim()).filter(Boolean) : ["Aucun choix valide"]),
    reverse: input.split("").reverse().join(""),
    uppercase: input.toUpperCase(),
    lowercase: input.toLowerCase(),
    titlecase: input.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()),
    "base64-encode": Buffer.from(input).toString("base64"),
    "base64-decode": Buffer.from(input, "base64").toString("utf8"),
    "url-encode": encodeURIComponent(input),
    "url-decode": decodeURIComponent(input),
    "hash-md5": createHash("md5").update(input).digest("hex"),
    "hash-sha256": createHash("sha256").update(input).digest("hex"),
    binary: input.split("").map((char) => char.charCodeAt(0).toString(2)).join(" "),
    hex: Buffer.from(input).toString("hex"),
    uuid: randomUUID(),
    color: `#${createHash("md5").update(input).digest("hex").slice(0, 6)}`,
    calc: `${input.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)}`,
    dice: `${Math.floor(Math.random() * 6) + 1}`,
    coinflip: pick(["Pile", "Face"]),
    "8ball": pick(["Oui", "Non", "Peut-etre", "Reessaie plus tard"]),
    timestamp: `${Math.floor(Date.now() / 1000)}`,
    "random-number": `${Math.floor(Math.random() * ((Number(args[1] ?? "100")) - (Number(args[0] ?? "1")) + 1)) + Number(args[0] ?? "1")}`
  };
  await replyEmbed(context, title(kind), outputs[kind] ?? `Resultat: ${input}`);
}

async function funHandler(kind: string, context: PrefixCommandContext): Promise<void> {
  const { message, rawArgs } = context;
  const user = message.mentions.users.first() ?? message.author;
  const outputs: Record<string, string> = {
    hug: `Nova fait un hug a ${user}.`,
    pat: `Nova pat ${user}.`,
    slap: `${user} a pris une claque orbitale.`,
    ship: `${message.author} x ${user}: ${percent(`${message.author.id}:${user.id}`)}%`,
    fortune: pick(["Tu vas lancer un gros module aujourd'hui.", "Un ticket bizarre va apparaitre a 3h du matin.", "Ton prochain giveaway va exploser."]),
    joke: pick(["Le bug n'etait pas en prod, il y campait.", "500 commandes plus tard, tout allait presque bien."]),
    meme: `Meme: ${rawArgs || "quand le bot marche du premier coup"}`,
    quote: pick(["Fais simple, puis fais massif.", "Le bon bot ne spam pas, il orchestre."]),
    rps: `Toi: ${rawArgs || "pierre"}\nNova: ${pick(["pierre", "feuille", "ciseaux"])}`,
    aura: `${user}: ${percent(user.id)} aura`,
    ppsize: `${user}: 8${"=".repeat((percent(user.id) % 12) + 1)}D`
  };
  await replyEmbed(context, title(kind), outputs[kind] ?? `Commande fun ${kind} executee pour ${user}.`);
}

async function coreHandler(kind: string, context: PrefixCommandContext): Promise<void> {
  const { message, rawArgs, args, client } = context;
  if (kind === "ping") {
    await replyEmbed(context, "Ping", `${client.ws.ping}ms`);
    return;
  }
  if (kind === "bridge-add" || kind === "bridge-remove") {
    const mentioned = message.mentions.channels.first() ?? message.channel;
    if (kind === "bridge-add") {
      await addBridgeChannel(mentioned.id);
      await replyEmbed(context, "Bridge", `Salon ajoute au bridge: <#${mentioned.id}>`, 0x3ba55d);
    } else {
      await removeBridgeChannel(mentioned.id);
      await replyEmbed(context, "Bridge", `Salon retire du bridge: <#${mentioned.id}>`, 0x3ba55d);
    }
    return;
  }
  if (kind === "bridge-list") {
    const ids = await listBridgeChannels();
    await replyEmbed(context, "Bridge", ids.length ? ids.map((id) => `<#${id}>`).join("\n") : "Aucun salon configure.");
    return;
  }
  if (kind === "giveaway-create") {
    const duration = Number(args[0] ?? "60");
    const prize = args.slice(1).join(" ") || "Lot mystere";
    const id = `gw_${Date.now()}`;
    await createGiveaway({
      id,
      guildId: message.guild!.id,
      channelId: message.channel.id,
      prize,
      winnerCount: 1,
      endsAt: Date.now() + duration * 60_000,
      entrants: []
    });
    await replyEmbed(context, "Giveaway", `ID: ${id}\nLot: ${prize}\nDuree: ${duration} minutes`, 0x3ba55d);
    return;
  }
  if (kind === "giveaway-join") {
    const id = args[0];
    if (!id) {
      await replyEmbed(context, "Giveaway", "Usage: +giveaway-join <id>", 0xed4245);
      return;
    }
    const joined = await joinGiveaway(id, message.author.id);
    await replyEmbed(context, "Giveaway", joined ? `Participation enregistree pour ${id}.` : "Giveaway introuvable.", joined ? 0x3ba55d : 0xed4245);
    return;
  }
  if (kind === "ai-ask") {
    try {
      const reply = await answerWithAi({
        scopeId: message.channelId,
        userId: message.author.id,
        username: message.author.username,
        guildId: message.guild?.id,
        guildName: message.guild?.name,
        channelName: "name" in message.channel && typeof message.channel.name === "string" ? message.channel.name : undefined,
        prompt: rawArgs
      });
      await replyEmbed(context, "Nova AI", reply);
    } catch (error) {
      console.error("ai-ask error:", error);
      await replyEmbed(context, "Nova AI", "Erreur IA. Verifie que Ollama tourne et que le modele existe.", 0xed4245);
    }
    return;
  }
  if (kind === "ai-reset") {
    await resetAiConversation(message.channelId);
    await replyEmbed(context, "Nova AI", "Memoire reinitialisee.", 0x3ba55d);
    return;
  }
  if (kind === "ai-status") {
    const settings = await getGuildAiSettings(message.guild?.id);
    await replyEmbed(
      context,
      "Nova AI",
      `Style: ${settings.style}\nMentions: ${settings.mentionEnabled ? "on" : "off"}\nCooldown: ${settings.cooldownSeconds}s`
    );
    return;
  }
  if (kind === "ai-style") {
    if (!message.guild) {
      await replyEmbed(context, "Nova AI", "Serveur requis.", 0xed4245);
      return;
    }
    const value = args[0] as "balanced" | "strict" | "friendly" | "developer" | "short" | undefined;
    if (!value) {
      await replyEmbed(context, "Nova AI", "Usage: +ai-style balanced|strict|friendly|developer|short", 0xed4245);
      return;
    }
    await updateGuildAiSettings(message.guild.id, { style: value });
    await replyEmbed(context, "Nova AI", `Style defini sur ${value}.`, 0x3ba55d);
    return;
  }
  if (kind === "ai-cooldown") {
    if (!message.guild) {
      await replyEmbed(context, "Nova AI", "Serveur requis.", 0xed4245);
      return;
    }
    const seconds = Number(args[0] ?? "8");
    await updateGuildAiSettings(message.guild.id, { cooldownSeconds: seconds });
    await replyEmbed(context, "Nova AI", `Cooldown defini sur ${seconds}s.`, 0x3ba55d);
    return;
  }
  if (kind === "ai-mentions") {
    if (!message.guild) {
      await replyEmbed(context, "Nova AI", "Serveur requis.", 0xed4245);
      return;
    }
    const enabled = args[0] === "on";
    await updateGuildAiSettings(message.guild.id, { mentionEnabled: enabled });
    await replyEmbed(context, "Nova AI", `Mentions ${enabled ? "activees" : "desactivees"}.`, 0x3ba55d);
  }
}

export function createPrefixedCommands(): PrefixCommand[] {
  const commands: PrefixCommand[] = [];

  const add = (
    name: string,
    category: string,
    description: string,
    execute: PrefixCommand["execute"],
    aliases?: string[],
    permissions?: PermissionResolvable[],
    usage?: string
  ) => {
    commands.push({ name, category, description, execute, aliases, permissions, usage });
  };

  add("help", "core", "Afficher toutes les commandes", async (context) => {
    const query = (context.args[0] ?? "").toLowerCase();
    const page = Number(context.args.find((arg) => /^\d+$/.test(arg)) ?? "1");
    const groups = new Map<string, PrefixCommand[]>();
    for (const command of createPrefixedCommandsCache) {
      if (command.name !== context.commandName) {
        const list = groups.get(command.category) ?? [];
        list.push(command);
        groups.set(command.category, list);
      }
    }

    if (query) {
      const exact = createPrefixedCommandsCache.find(
        (command) =>
          command.name === query || (command.aliases ?? []).includes(query)
      );

      if (exact) {
        await context.message.reply({
          embeds: [
            makeEmbed(
              `Help • .${exact.name}`,
              [
              `**Categorie**: ${title(exact.category)}`,
              `**Description**: ${exact.description}`,
              `**Usage**: ${exact.usage ?? `+${exact.name}`}`,
              `**Aliases**: ${(exact.aliases?.length ? exact.aliases.map((alias) => `+${alias}`).join(", ") : "Aucun")}`,
              `**Permissions**: ${(exact.permissions?.length ? exact.permissions.join(", ") : "Aucune")}`
            ].join("\n")
          )
          ]
        });
        return;
      }
    }

    if (query && groups.has(query)) {
      const commands = groups
        .get(query)!
        .sort((a, b) => priorityScore(a) - priorityScore(b) || a.name.localeCompare(b.name));
      const pages = chunkCommands(commands, 12);
      const safePage = Math.min(Math.max(page, 1), Math.max(1, pages.length));
      const chunk = pages[safePage - 1] ?? [];
      await context.message.reply({
        embeds: [
          makeEmbed(
            `${categoryEmoji(query)} Help • ${title(query)} • Page ${safePage}/${Math.max(1, pages.length)}`,
            chunk
              .map((command) =>
                [
                  `\`+${command.name}\``,
                  `${command.description}`,
                  command.usage ? `Usage: \`${command.usage}\`` : null,
                  command.aliases?.length ? `Alias: ${command.aliases.map((alias) => `+${alias}`).join(", ")}` : null
                ]
                  .filter(Boolean)
                  .join("\n")
              )
              .join("\n\n") || "Aucune commande."
          )
        ]
      });
      return;
    }

    const summary = [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, entries]) => `${categoryEmoji(category)} **${title(category)}** • ${entries.length} commandes\nEx: \`+help ${category}\``)
      .join("\n\n");

    await context.message.reply({
      embeds: [
        makeEmbed(
          "📚 Help",
          [
            "Utilise `+help categorie` pour voir une categorie.",
            "Utilise `+help commande` pour voir une commande precise.",
            "",
            summary,
            "",
            `Commande totale: ${createPrefixedCommandsCache.length}`,
            "Prefixe: `+`",
            "Exemples: `+help moderation`, `+help warn`, `+help tickets 2`"
          ].join("\n")
        )
      ]
    });
  }, ["commands", "h"], undefined, "+help [categorie] [page]");

  for (const name of ["ping", "bridge-add", "bridge-remove", "bridge-list", "giveaway-create", "giveaway-join", "ai-ask", "ai-reset", "ai-status", "ai-style", "ai-cooldown", "ai-mentions"]) {
    const permissions =
      name.startsWith("bridge") || name.startsWith("giveaway")
        ? [PermissionFlagsBits.ManageGuild]
        : name === "ai-style" || name === "ai-cooldown" || name === "ai-mentions"
          ? [PermissionFlagsBits.ManageGuild]
          : undefined;
    add(name, "core", title(name), (context) => coreHandler(name, context), name === "ping" ? ["p"] : [], permissions, `+${name}`);
  }

  const modNames = [
    "warn","mute","unmute","kick","ban","unban","nickname","role-add","role-remove","avatar",
    "history","note-add","note-view","note-clear","flags","watchlist-add","watchlist-remove","verify","unverify","profile-lock","profile-unlock","quarantine","unquarantine","appeal-accept","appeal-deny",
    "purge","purge-user","say","message-purge-bots","message-purge-links","message-purge-attachments","message-purge-embeds","message-purge-contains","message-announce","message-quote","message-pin-last","message-unpin-all","message-media-only","message-media-off","message-thread-open","message-thread-close","message-thread-archive","message-thread-unarchive","message-relay-target","message-filter-word-add","message-filter-word-remove","message-filter-word-list","message-transcript","message-silent-clean","message-smart-clean",
    "lock","unlock","channel-rename","channel-topic","channel-nsfw","channel-sfw","channel-clone","channel-delete","channel-create-text","channel-create-voice","channel-create-forum","channel-create-stage","channel-category-set","channel-rate-limit","channel-reset","channel-permission-sync","channel-stats-board","channel-auto-name","channel-archive-mode","channel-mirror-mode","channel-mention-only","channel-mention-off","channel-move-top","channel-move-bottom","channel-view-config",
    "automod-anti-link","automod-anti-invite","automod-anti-spam","automod-anti-caps","automod-anti-mention","automod-anti-emoji","automod-anti-zalgo","automod-anti-phishing","automod-anti-token","automod-anti-raid","automod-anti-join-spam","automod-anti-webhook","automod-anti-massban","automod-anti-massrole","automod-anti-selfbot","automod-whitelist-add","automod-whitelist-remove","automod-exempt-role-add","automod-exempt-role-remove","automod-threshold-spam","automod-threshold-caps","automod-threshold-mention","automod-punishment","automod-status","automod-reset",
    "log-joins","log-leaves","log-messages","log-edits","log-deletes","log-voice","log-roles","log-channels","log-automod","log-tickets","log-giveaways","log-mod-actions","log-errors","log-warnings","log-reports","log-starboard","log-members","log-server","log-webhooks","log-nicknames","log-avatars","log-threads","log-reactions","log-status","log-export"
  ];
  for (const name of modNames) add(name, "moderation", title(name), (context) => moderationHandler(name, context), name === "warn" || name === "kick" || name === "ban" || name === "mute" || name === "unmute" || name === "purge" ? [name.replace(/-.+$/, "")] : [], [PermissionFlagsBits.ManageMessages], `+${name}`);

  const ticketNames = [
    "setup","close","claim","add","remove",
    "panel-post","panel-title","panel-description","panel-color","panel-image","panel-thumbnail","panel-button-open","panel-button-close","panel-button-claim","panel-button-transcript","panel-welcome-message","panel-close-message","panel-reopen-message","panel-panel-channel","panel-transcript-channel","panel-log-channel","panel-ping-role","panel-support-role","panel-emoji-open","panel-emoji-close","panel-style","panel-reset-panel","panel-preview","panel-clone-panel","panel-send-demo",
    "category-default","category-staff","category-vip","category-billing","category-report","category-appeal","category-partnership","category-bug","category-application","category-question","category-shop","category-media","category-events","category-creator","category-security","category-support","category-custom-1","category-custom-2","category-custom-3","category-custom-4","category-custom-5","category-custom-6","category-custom-7","category-custom-8","category-custom-9",
    "behavior-max-open","behavior-cooldown","behavior-auto-close","behavior-inactivity-close","behavior-rename-on-claim","behavior-claim-only","behavior-transcript","behavior-transcript-dm","behavior-transcript-html","behavior-transcript-json","behavior-delete-on-close","behavior-close-confirm","behavior-reopen","behavior-lock-on-claim","behavior-rating","behavior-satisfaction","behavior-priority","behavior-tags","behavior-mention-user","behavior-mention-staff","behavior-require-reason","behavior-require-email","behavior-require-screenshot","behavior-public-threads","behavior-private-threads",
    "forms-modal-title","forms-modal-description","forms-question-1","forms-question-2","forms-question-3","forms-question-4","forms-question-5","forms-question-6","forms-question-7","forms-question-8","forms-question-9","forms-question-10","forms-placeholder-1","forms-placeholder-2","forms-placeholder-3","forms-placeholder-4","forms-placeholder-5","forms-placeholder-6","forms-placeholder-7","forms-placeholder-8","forms-required-1","forms-required-2","forms-required-3","forms-required-4","forms-required-5",
    "staff-add-role","staff-remove-role","staff-list","staff-permissions","staff-blacklist-add","staff-blacklist-remove","staff-whitelist-add","staff-whitelist-remove","staff-claim-transfer","staff-close-all","staff-reopen-last","staff-rename-format","staff-welcome-thread","staff-archive-days","staff-response-sla","staff-auto-assign","staff-rotation","staff-queue-mode","staff-panel-stats","staff-config-export","staff-config-import","staff-transcript-export","staff-reason-required","staff-force-close","staff-force-open"
  ];
  for (const name of ticketNames) {
    const aliases =
      name === "panel-post"
        ? ["ticketpanel"]
        : name === "setup"
            ? ["ticketsetup"]
            : name === "close"
              ? ["ticketclose"]
          : name === "claim"
            ? ["ticketclaim"]
            : name === "add"
              ? ["ticketadd"]
              : name === "remove"
                ? ["ticketremove"]
                : [];
    add(`ticket-${name}`, "tickets", title(name), (context) => ticketHandler(name, context), aliases, [PermissionFlagsBits.ManageChannels], `+ticket-${name}`);
  }

  const utilNames = [
    "server","user","avatar","banner","roles","permissions","channel","emoji","sticker","invite","membercount","boosts","owner","created","joined","presence","badges","snowflake","timezone","latency","shard","icon","splash","vanity","about",
    "say","choose","reverse","uppercase","lowercase","titlecase","alternating","spoiler","clapify","space","repeat","count","wordcount","charcount","lines","trim","slug","initials","sort","shuffle","acronym","quote-block","bold","italic","code",
    "base64-encode","base64-decode","url-encode","url-decode","hash-md5","hash-sha1","hash-sha256","hash-sha512","binary","hex","morse","rot13","caesar","json-escape","json-unescape","html-escape","html-unescape","uuid","color","unix","date","checksum","ascii","percent","qr",
    "poll","remind","countdown","embed","webhook-check","role-id","channel-id","emoji-id","server-id","user-id","message-id","permissions-check","invite-check","clean-empty-roles","welcome-preview","goodbye-preview","autorole-preview","ticket-stats","giveaway-stats","backup","restore","snapshot","clone-settings","move-messages","counter-refresh",
    "calc","dice","coinflip","8ball","timestamp","random-number","random-color","random-emoji","random-member","random-role","random-channel","compare","split","join","replace","remove","pad","truncate","palindrome","vowels","consonants","anagram","frequency","wrap","inspect"
  ];
  for (const name of utilNames) add(name, "utility", title(name), (context) => utilHandler(name, context), [], undefined, `+${name}`);

  const funNames = [
    "hug","pat","slap","bite","kiss","cuddle","punch","tickle","poke","stare","highfive","wave","roast","compliment","simp","gayrate","smart-rate","chaos-rate","vibe-check","ship","marry","divorce","adopt","steal-heart","steal-fries",
    "choose-fun","dice-fun","fortune","coinflip-fun","8ball-fun","would-you-rather","truth","dare","number","color-fun","emoji-fun","pick-role","pick-channel","pick-admin","pick-victim","daily-luck","weekly-luck","spin","lottery","prediction","mood","alignment","energy","destiny","chaos",
    "rps","guess","memory","slots","blackjack","higher-lower","trivia","hangman","connect4","mines","2048","sudoku","quiz","typing","anagram-game","battle","duel","bossfight","pet","catch","tictactoe","scramble","sequence","labyrinth","raid",
    "meme","joke","quote","fact","story","pickupline","insult","compliment-gen","copypasta","headline","tierlist","caption","nickname-gen","bio","fake-ad","villain-name","hero-name","team-name","clan-name","song-idea","playlist","emoji-mix","server-lore","origin","quest",
    "aura","drip","ppsize","cringe-rate","hotness","braincells","luck","karma","level","rank","rare","energy-profile","mood-profile","spirit-animal","theme","anime-title","rapper-name","streamer-name","boss-title","pet-name","guild-job","superpower","weakness","signature","legacy"
  ];
  for (const name of funNames) {
    const runtimeName = name;
    const handlerName = name
      .replace(/-fun$/, "")
      .replace(/-game$/, "")
      .replace(/-gen$/, "");
    const aliases =
      runtimeName === "hug" || runtimeName === "ship" || runtimeName === "rps" || runtimeName === "meme"
        ? [handlerName]
        : [];
    add(runtimeName, "fun", title(handlerName), (context) => funHandler(handlerName, context), aliases, undefined, `+${runtimeName}`);
  }

  return commands;
}

export const createPrefixedCommandsCache = createPrefixedCommands();
