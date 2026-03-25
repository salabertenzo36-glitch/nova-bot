import { PermissionFlagsBits } from "discord.js";

import {
  addAmountOption,
  addBooleanOption,
  addIntegerOption,
  addReasonOption,
  addTextOption,
  addUserOption,
  adminPermission,
  boolStatus,
  buildFlatCommand,
  buildModuleCommand,
  ensureTextChannel,
  getReason,
  infoEmbed,
  replyError,
  replyInfo,
  replySuccess,
  requireManageableMember,
  requireModeratableMember,
  successEmbed,
  type ModularGroupDefinition
} from "./shared.js";
import {
  getModConfig,
  setModBoolean,
  setModNumber,
  setModText,
  toggleModBoolean
} from "../../features/moderation/mod-config.js";
import type { SlashCommand } from "../../types/command.js";

const memberConfigNames = [
  "history",
  "note-add",
  "note-view",
  "note-clear",
  "flags",
  "watchlist-add",
  "watchlist-remove",
  "verify",
  "unverify",
  "profile-lock",
  "profile-unlock",
  "quarantine",
  "unquarantine",
  "appeal-accept",
  "appeal-deny"
] as const;

const messageToggleNames = [
  "purge-bots",
  "purge-links",
  "purge-attachments",
  "purge-embeds",
  "purge-contains",
  "announce",
  "quote",
  "pin-last",
  "unpin-all",
  "media-only",
  "media-off",
  "thread-open",
  "thread-close",
  "thread-archive",
  "thread-unarchive",
  "relay-target",
  "filter-word-add",
  "filter-word-remove",
  "filter-word-list",
  "transcript",
  "silent-clean",
  "smart-clean"
] as const;

const channelSettingNames = [
  "rename",
  "topic",
  "nsfw",
  "sfw",
  "clone",
  "delete",
  "create-text",
  "create-voice",
  "create-forum",
  "create-stage",
  "category-set",
  "rate-limit",
  "reset",
  "permission-sync",
  "stats-board",
  "auto-name",
  "archive-mode",
  "mirror-mode",
  "mention-only",
  "mention-off",
  "move-top",
  "move-bottom",
  "view-config"
] as const;

const automodNames = [
  "anti-link",
  "anti-invite",
  "anti-spam",
  "anti-caps",
  "anti-mention",
  "anti-emoji",
  "anti-zalgo",
  "anti-phishing",
  "anti-token",
  "anti-raid",
  "anti-join-spam",
  "anti-webhook",
  "anti-massban",
  "anti-massrole",
  "anti-selfbot",
  "whitelist-add",
  "whitelist-remove",
  "exempt-role-add",
  "exempt-role-remove",
  "threshold-spam",
  "threshold-caps",
  "threshold-mention",
  "punishment",
  "status",
  "reset"
] as const;

const logNames = [
  "joins",
  "leaves",
  "messages",
  "edits",
  "deletes",
  "voice",
  "roles",
  "channels",
  "automod",
  "tickets",
  "giveaways",
  "mod-actions",
  "errors",
  "warnings",
  "reports",
  "starboard",
  "members",
  "server",
  "webhooks",
  "nicknames",
  "avatars",
  "threads",
  "reactions",
  "status",
  "export"
] as const;

function userKey(name: string, userId: string): string {
  return `member.${name}.${userId}`;
}

function configHandler(name: string) {
  return async (interaction: Parameters<NonNullable<ModularGroupDefinition["commands"][number]["handler"]>>[0]) => {
    if (!interaction.guildId) {
      await interaction.reply({ content: "Commande reservee au serveur.", ephemeral: true });
      return;
    }
    const user = interaction.options.getUser("user", true);
    const value = interaction.options.getString("value") ?? getReason(interaction);

    if (name.endsWith("view") || name === "history" || name === "flags") {
      const state = await getModConfig(interaction.guildId);
      const stored = state.texts[userKey(name.replace("-view", "-add"), user.id)] ?? "Aucune donnee.";
      await interaction.reply({ embeds: [infoEmbed(title(name), `${user}\n${stored}`)], ephemeral: true });
      return;
    }

    if (name.endsWith("clear") || name === "watchlist-remove" || name === "unverify" || name === "profile-unlock" || name === "unquarantine" || name === "mark-safe") {
      await setModText(interaction.guildId, userKey(name, user.id), "");
      await setModBoolean(interaction.guildId, userKey(name, user.id), false);
      await interaction.reply({ embeds: [successEmbed(title(name), `${user} mis a jour.`)], ephemeral: true });
      return;
    }

    if (["verify", "profile-lock", "quarantine", "suspect", "focus", "watchlist-add"].includes(name)) {
      const next = await setModBoolean(interaction.guildId, userKey(name, user.id), true);
      await interaction.reply({ embeds: [successEmbed(title(name), `${user}: ${boolStatus(next)}.`)], ephemeral: true });
      return;
    }

    await setModText(
      interaction.guildId,
      userKey(name, user.id),
      value || `Entree creee le ${new Date().toLocaleString("fr-FR")}`
    );
    await interaction.reply({ embeds: [successEmbed(title(name), `${user}: enregistre.`)], ephemeral: true });
  };
}

function title(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function simpleToggle(interaction: any, bucket: string, name: string) {
  if (!interaction.guildId) {
    await interaction.reply({ content: "Commande reservee au serveur.", ephemeral: true });
    return;
  }
  const next = await toggleModBoolean(interaction.guildId, `${bucket}.${name}`);
  await interaction.reply({
    embeds: [successEmbed(title(name), `${name} ${boolStatus(next)}.`)],
    ephemeral: true
  });
}

const groups: ModularGroupDefinition[] = [
  {
    name: "members",
    description: "Gestion des membres",
    commands: [
      {
        name: "warn",
        description: "Avertir un membre",
        configure: (b) => addReasonOption(addUserOption(b)),
        handler: async (interaction) => {
          const member = await requireModeratableMember(interaction);
          if (!member) return;
          await interaction.reply({
            embeds: [successEmbed("Warn", `${member} a ete averti.\nRaison: ${getReason(interaction)}`)]
          });
        }
      },
      {
        name: "mute",
        description: "Timeout un membre",
        configure: (b) => addReasonOption(addIntegerOption(addUserOption(b), "minutes", "Duree", true, 1, 40320)),
        handler: async (interaction) => {
          const member = await requireModeratableMember(interaction);
          if (!member) return;
          if (!member.moderatable) {
            await replyError(interaction, "Mute impossible", "Je ne peux pas timeout ce membre.");
            return;
          }
          const minutes = interaction.options.getInteger("minutes", true);
          await member.timeout(minutes * 60_000, getReason(interaction));
          await interaction.reply({ embeds: [successEmbed("Mute", `${member} timeout pour ${minutes} minute(s).`)] });
        }
      },
      {
        name: "unmute",
        description: "Retirer un timeout",
        configure: (b) => addReasonOption(addUserOption(b)),
        handler: async (interaction) => {
          const member = await requireModeratableMember(interaction);
          if (!member) return;
          await member.timeout(null, getReason(interaction));
          await interaction.reply({ embeds: [successEmbed("Unmute", `${member} n'est plus timeout.`)] });
        }
      },
      {
        name: "kick",
        description: "Expulser un membre",
        configure: (b) => addReasonOption(addUserOption(b)),
        handler: async (interaction) => {
          const member = await requireManageableMember(interaction);
          if (!member) return;
          await member.kick(getReason(interaction));
          await interaction.reply({ embeds: [successEmbed("Kick", `${member.user.tag} expulse.`)] });
        }
      },
      {
        name: "ban",
        description: "Bannir un membre",
        configure: (b) => addReasonOption(addUserOption(b)),
        handler: async (interaction) => {
          const member = await requireManageableMember(interaction);
          if (!member) return;
          await member.ban({ reason: getReason(interaction) });
          await interaction.reply({ embeds: [successEmbed("Ban", `${member.user.tag} banni.`)] });
        }
      },
      {
        name: "unban",
        description: "Debannir par ID",
        configure: (b) => addTextOption(b, "user_id", "ID utilisateur", true),
        handler: async (interaction) => {
          const userId = interaction.options.getString("user_id", true);
          await interaction.guild!.bans.remove(userId);
          await interaction.reply({ embeds: [successEmbed("Unban", `${userId} debanni.`)] });
        }
      },
      {
        name: "nickname",
        description: "Changer le pseudo",
        configure: (b) => addTextOption(addUserOption(b), "nickname", "Nouveau pseudo", true),
        handler: async (interaction) => {
          const member = await requireManageableMember(interaction);
          if (!member) return;
          const nickname = interaction.options.getString("nickname", true);
          await member.setNickname(nickname);
          await interaction.reply({ embeds: [successEmbed("Nickname", `${member.user.tag} -> ${nickname}`)] });
        }
      },
      {
        name: "role-add",
        description: "Ajouter un role",
        configure: (b) =>
          addUserOption(b).addRoleOption((option) =>
            option.setName("role").setDescription("Role cible").setRequired(true)
          ),
        handler: async (interaction) => {
          const member = await requireManageableMember(interaction);
          if (!member) return;
          const role = interaction.options.getRole("role", true);
          if (!("id" in role)) {
            await replyError(interaction, "Role invalide", "Le role fourni est invalide.");
            return;
          }
          await member.roles.add(role.id);
          await interaction.reply({ embeds: [successEmbed("Role Add", `Role <@&${role.id}> ajoute a ${member}.`)] });
        }
      },
      {
        name: "role-remove",
        description: "Retirer un role",
        configure: (b) =>
          addUserOption(b).addRoleOption((option) =>
            option.setName("role").setDescription("Role cible").setRequired(true)
          ),
        handler: async (interaction) => {
          const member = await requireManageableMember(interaction);
          if (!member) return;
          const role = interaction.options.getRole("role", true);
          if (!("id" in role)) {
            await replyError(interaction, "Role invalide", "Le role fourni est invalide.");
            return;
          }
          await member.roles.remove(role.id);
          await interaction.reply({ embeds: [successEmbed("Role Remove", `Role <@&${role.id}> retire a ${member}.`)] });
        }
      },
      {
        name: "avatar",
        description: "Voir l avatar",
        configure: (b) => addUserOption(b),
        handler: async (interaction) => {
          const user = interaction.options.getUser("user", true);
          await replyInfo(interaction, "Avatar", user.displayAvatarURL({ size: 4096 }));
        }
      },
      ...memberConfigNames.map((name) => ({
        name,
        description: title(name),
        configure: (b: any) => addTextOption(addUserOption(b), "value", "Valeur", false),
        handler: configHandler(name)
      }))
    ]
  },
  {
    name: "messages",
    description: "Gestion des messages",
    commands: [
      {
        name: "purge",
        description: "Supprimer des messages",
        configure: (b) => addAmountOption(b),
        handler: async (interaction) => {
          const amount = interaction.options.getInteger("amount", true);
          const channel = ensureTextChannel(interaction);
          if (!channel || !("bulkDelete" in channel)) {
            await replyError(interaction, "Salon incompatible", "Ce salon ne supporte pas cette action.");
            return;
          }
          await channel.bulkDelete(amount, true);
          await replySuccess(interaction, "Purge", `${amount} message(s) supprimes.`, true);
        }
      },
      {
        name: "purge-user",
        description: "Supprimer les messages d un membre",
        configure: (b) => addAmountOption(addUserOption(b)),
        handler: async (interaction) => {
          const channel = ensureTextChannel(interaction);
          if (!channel || !("messages" in channel) || !("bulkDelete" in channel)) {
            await replyError(interaction, "Salon incompatible", "Ce salon ne supporte pas cette action.");
            return;
          }
          const amount = interaction.options.getInteger("amount", true);
          const user = interaction.options.getUser("user", true);
          const messages = await channel.messages.fetch({ limit: 100 });
          const filtered = messages.filter((message) => message.author.id === user.id).first(amount);
          await channel.bulkDelete(filtered, true);
          await replySuccess(interaction, "Purge User", `${filtered.length} message(s) de ${user.tag} supprimes.`, true);
        }
      },
      {
        name: "say",
        description: "Faire parler le bot",
        configure: (b) => addTextOption(b, "text", "Texte", true),
        handler: async (interaction) => {
          const channel = ensureTextChannel(interaction);
          if (!channel) {
            await replyError(interaction, "Salon incompatible", "Ce salon ne supporte pas cette action.");
            return;
          }
          const text = interaction.options.getString("text", true);
          await replySuccess(interaction, "Say", "Message envoye.", true);
          await channel.send(text);
        }
      },
      ...messageToggleNames.map((name) => ({
        name,
        description: title(name),
        configure: (b: any) => addTextOption(b, "value", "Valeur", false),
        handler: async (interaction: any) => {
          if (interaction.options.getString("value") && interaction.guildId) {
            await setModText(interaction.guildId, `messages.${name}`, interaction.options.getString("value", true));
            await interaction.reply({ embeds: [successEmbed(title(name), "Valeur enregistree.")], ephemeral: true });
            return;
          }
          await simpleToggle(interaction, "messages", name);
        }
      }))
    ]
  },
  {
    name: "channels",
    description: "Gestion des salons",
    commands: [
      {
        name: "lock",
        description: "Verrouiller le salon",
        handler: async (interaction) => {
          const channel = interaction.channel;
          if (!channel || !("permissionOverwrites" in channel) || !interaction.guild) {
            await replyError(interaction, "Salon incompatible", "Ce salon ne supporte pas cette action.");
            return;
          }
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
          await interaction.reply({ embeds: [successEmbed("Lock", "Salon verrouille.")] });
        }
      },
      {
        name: "unlock",
        description: "Deverrouiller le salon",
        handler: async (interaction) => {
          const channel = interaction.channel;
          if (!channel || !("permissionOverwrites" in channel) || !interaction.guild) {
            await replyError(interaction, "Salon incompatible", "Ce salon ne supporte pas cette action.");
            return;
          }
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
          await interaction.reply({ embeds: [successEmbed("Unlock", "Salon deverrouille.")] });
        }
      },
      ...channelSettingNames.map((name) => ({
        name,
        description: title(name),
        configure: (b: any) => addTextOption(b, "value", "Valeur", false),
        handler: async (interaction: any) => {
          if (!interaction.guildId) {
            await interaction.reply({ content: "Commande reservee au serveur.", ephemeral: true });
            return;
          }
          const value = interaction.options.getString("value");
          if (value) {
            await setModText(interaction.guildId, `channels.${name}`, value);
            await interaction.reply({ embeds: [successEmbed(title(name), `Valeur: ${value}`)], ephemeral: true });
            return;
          }
          const next = await toggleModBoolean(interaction.guildId, `channels.${name}`);
          await interaction.reply({ embeds: [successEmbed(title(name), `${boolStatus(next)}.`)], ephemeral: true });
        }
      }))
    ]
  },
  {
    name: "automod",
    description: "Automoderation",
    commands: automodNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) =>
        addTextOption(addIntegerOption(addBooleanOption(b, "enabled", "Etat", false), "amount", "Valeur", false, 0, 10000), "value", "Texte", false),
      handler: async (interaction: any) => {
        if (!interaction.guildId) {
          await interaction.reply({ content: "Commande reservee au serveur.", ephemeral: true });
          return;
        }
        const enabled = interaction.options.getBoolean("enabled");
        const amount = interaction.options.getInteger("amount");
        const value = interaction.options.getString("value");
        if (enabled !== null) {
          await setModBoolean(interaction.guildId, `automod.${name}`, enabled);
          await interaction.reply({ embeds: [successEmbed(title(name), `${boolStatus(enabled)}.`)], ephemeral: true });
          return;
        }
        if (amount !== null) {
          await setModNumber(interaction.guildId, `automod.${name}`, amount);
          await interaction.reply({ embeds: [successEmbed(title(name), `Valeur numerique: ${amount}`)], ephemeral: true });
          return;
        }
        if (value) {
          await setModText(interaction.guildId, `automod.${name}`, value);
          await interaction.reply({ embeds: [successEmbed(title(name), `Valeur: ${value}`)], ephemeral: true });
          return;
        }
        const config = await getModConfig(interaction.guildId);
        await interaction.reply({
          embeds: [
            infoEmbed(
              title(name),
              `Etat: ${boolStatus(config.booleans[`automod.${name}`] ?? false)}\n` +
                `Nombre: ${config.numbers[`automod.${name}`] ?? 0}\n` +
                `Texte: ${config.texts[`automod.${name}`] ?? "aucun"}`
            )
          ],
          ephemeral: true
        });
      }
    }))
  },
  {
    name: "logs",
    description: "Logs et audit",
    commands: logNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addTextOption(addBooleanOption(b, "enabled", "Etat", false), "channel_id", "Salon log", false),
      handler: async (interaction: any) => {
        if (!interaction.guildId) {
          await interaction.reply({ content: "Commande reservee au serveur.", ephemeral: true });
          return;
        }
        const enabled = interaction.options.getBoolean("enabled");
        const channelId = interaction.options.getString("channel_id");
        if (enabled !== null) {
          await setModBoolean(interaction.guildId, `logs.${name}.enabled`, enabled);
        }
        if (channelId) {
          await setModText(interaction.guildId, `logs.${name}.channel`, channelId);
        }
        const config = await getModConfig(interaction.guildId);
        await interaction.reply({
          embeds: [
            infoEmbed(
              title(name),
              `Etat: ${boolStatus(config.booleans[`logs.${name}.enabled`] ?? false)}\n` +
                `Salon: ${config.texts[`logs.${name}.channel`] || "non defini"}`
            )
          ],
          ephemeral: true
        });
      }
    }))
  }
];

export function createModerationCommands(): SlashCommand[] {
  return groups.map((group) =>
    buildFlatCommand(
      `mod-${group.name}`,
      `Moderation ${group.description.toLowerCase()}`,
      group.commands,
      adminPermission() ?? PermissionFlagsBits.ManageGuild
    )
  );
}
