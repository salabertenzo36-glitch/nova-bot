import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} from "discord.js";

import {
  addBooleanOption,
  addIntegerOption,
  addTextOption,
  adminPermission,
  boolStatus,
  buildFlatCommand,
  buildModuleCommand,
  infoEmbed,
  replyError,
  successEmbed,
  type ModularGroupDefinition
} from "./shared.js";
import {
  getTicketConfig,
  setTicketBoolean,
  setTicketNumber,
  setTicketText
} from "../../features/tickets/ticket-config.js";
import { registerTicketPanel } from "../../features/tickets/ticket-service.js";
import type { SlashCommand } from "../../types/command.js";

const panelNames = [
  "post",
  "title",
  "description",
  "color",
  "image",
  "thumbnail",
  "button-open",
  "button-close",
  "button-claim",
  "button-transcript",
  "welcome-message",
  "close-message",
  "reopen-message",
  "panel-channel",
  "transcript-channel",
  "log-channel",
  "ping-role",
  "support-role",
  "emoji-open",
  "emoji-close",
  "style",
  "reset-panel",
  "preview",
  "clone-panel",
  "send-demo"
] as const;

const categoryNames = [
  "default",
  "staff",
  "vip",
  "billing",
  "report",
  "appeal",
  "partnership",
  "bug",
  "application",
  "question",
  "shop",
  "media",
  "events",
  "creator",
  "security",
  "support",
  "custom-1",
  "custom-2",
  "custom-3",
  "custom-4",
  "custom-5",
  "custom-6",
  "custom-7",
  "custom-8",
  "custom-9"
] as const;

const behaviorNames = [
  "max-open",
  "cooldown",
  "auto-close",
  "inactivity-close",
  "rename-on-claim",
  "claim-only",
  "transcript",
  "transcript-dm",
  "transcript-html",
  "transcript-json",
  "delete-on-close",
  "close-confirm",
  "reopen",
  "lock-on-claim",
  "rating",
  "satisfaction",
  "priority",
  "tags",
  "mention-user",
  "mention-staff",
  "require-reason",
  "require-email",
  "require-screenshot",
  "public-threads",
  "private-threads"
] as const;

const formNames = [
  "modal-title",
  "modal-description",
  "question-1",
  "question-2",
  "question-3",
  "question-4",
  "question-5",
  "question-6",
  "question-7",
  "question-8",
  "question-9",
  "question-10",
  "placeholder-1",
  "placeholder-2",
  "placeholder-3",
  "placeholder-4",
  "placeholder-5",
  "placeholder-6",
  "placeholder-7",
  "placeholder-8",
  "required-1",
  "required-2",
  "required-3",
  "required-4",
  "required-5"
] as const;

const staffNames = [
  "add-role",
  "remove-role",
  "list",
  "permissions",
  "blacklist-add",
  "blacklist-remove",
  "whitelist-add",
  "whitelist-remove",
  "claim-transfer",
  "close-all",
  "reopen-last",
  "rename-format",
  "welcome-thread",
  "archive-days",
  "response-sla",
  "auto-assign",
  "rotation",
  "queue-mode",
  "panel-stats",
  "config-export",
  "config-import",
  "transcript-export",
  "reason-required",
  "force-close",
  "force-open"
] as const;

function title(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function showTicketValue(interaction: any, bucket: string, name: string) {
  if (!interaction.guildId) {
    await replyError(interaction, "Serveur requis", "Commande reservee au serveur.");
    return;
  }
  const config = await getTicketConfig(interaction.guildId);
  await interaction.reply({
    embeds: [
      infoEmbed(
        title(name),
        `Etat: ${boolStatus(config.booleans[`${bucket}.${name}`] ?? false)}\n` +
          `Nombre: ${config.numbers[`${bucket}.${name}`] ?? 0}\n` +
          `Texte: ${config.texts[`${bucket}.${name}`] ?? "aucun"}`
      )
    ],
    ephemeral: true
  });
}

function makeConfigCommands(bucket: string, names: readonly string[]): ModularGroupDefinition["commands"] {
  return names.map((name) => ({
    name,
    description: title(name),
    configure: (b: any) =>
      addTextOption(
        addIntegerOption(addBooleanOption(b, "enabled", "Etat", false), "amount", "Valeur numerique", false, 0, 10000),
        "value",
        "Valeur texte",
        false
      ),
    handler: async (interaction: any) => {
      if (!interaction.guildId) {
        await replyError(interaction, "Serveur requis", "Commande reservee au serveur.");
        return;
      }
      const enabled = interaction.options.getBoolean("enabled");
      const amount = interaction.options.getInteger("amount");
      const value = interaction.options.getString("value");

      if (enabled !== null) {
        await setTicketBoolean(interaction.guildId, `${bucket}.${name}`, enabled);
      }
      if (amount !== null) {
        await setTicketNumber(interaction.guildId, `${bucket}.${name}`, amount);
      }
      if (value) {
        await setTicketText(interaction.guildId, `${bucket}.${name}`, value);
      }

      await showTicketValue(interaction, bucket, name);
    }
  }));
}

const groups: ModularGroupDefinition[] = [
  {
    name: "panel",
    description: "Panneaux et messages de ticket",
    commands: makeConfigCommands("panel", panelNames).map((command) => {
      if (command.name !== "post" && command.name !== "preview" && command.name !== "send-demo") {
        return command;
      }

      return {
        ...command,
        handler: async (interaction: any) => {
          if (!interaction.guildId) {
            await replyError(interaction, "Serveur requis", "Commande reservee au serveur.");
            return;
          }
          const channel = interaction.channel;
          if (!channel || !("send" in channel) || !interaction.guild) {
            await replyError(interaction, "Salon incompatible", "Ce salon ne supporte pas cette action.");
            return;
          }

          const config = await getTicketConfig(interaction.guildId);
          const titleText = config.texts["panel.title"] || "Support";
          const descriptionText = config.texts["panel.description"] || "Clique pour ouvrir un ticket.";
          const openLabel = config.texts["panel.button-open"] || "Ouvrir un ticket";

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("ticket:create").setLabel(openLabel).setStyle(ButtonStyle.Primary)
          );

          if (command.name === "preview") {
            await interaction.reply({
              embeds: [infoEmbed(titleText, descriptionText)],
              components: [row],
              ephemeral: true
            });
            return;
          }

          const panelMessage = await channel.send({
            embeds: [infoEmbed(titleText, descriptionText)],
            components: [row]
          });

          await registerTicketPanel(interaction.guildId, channel.id, panelMessage.id);
          await interaction.reply({
            embeds: [successEmbed("Ticket Panel", "Panel envoye dans ce salon.")],
            ephemeral: true
          });
        }
      };
    })
  },
  {
    name: "category",
    description: "Categories et types de ticket",
    commands: makeConfigCommands("category", categoryNames)
  },
  {
    name: "behavior",
    description: "Comportement des tickets",
    commands: makeConfigCommands("behavior", behaviorNames)
  },
  {
    name: "forms",
    description: "Formulaires et modals",
    commands: makeConfigCommands("forms", formNames)
  },
  {
    name: "staff",
    description: "Gestion staff et workflow",
    commands: makeConfigCommands("staff", staffNames)
  }
];

export function createTicketCommands(): SlashCommand[] {
  return groups.map((group) =>
    buildFlatCommand(
      `ticket-${group.name}`,
      `Tickets ${group.description.toLowerCase()}`,
      group.commands,
      adminPermission()
    )
  );
}
