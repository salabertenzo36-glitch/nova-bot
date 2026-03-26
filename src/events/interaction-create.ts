import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField
} from "discord.js";

import { getTicketConfig } from "../features/tickets/ticket-config.js";
import type { BotClient } from "../lib/bot-client.js";

function interactionEmbed(title: string, description: string, color = 0x5865f2): EmbedBuilder {
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

function buildTicketWelcomeEmbed(config: Awaited<ReturnType<typeof getTicketConfig>>, userId: string): EmbedBuilder {
  const color = parseHexColor(config.texts["panel.color"]);
  const roleLine = config.texts["setup.staffrole"] ? `Staff: <@&${config.texts["setup.staffrole"]}>` : "Staff: non defini";
  const transcriptLine = `Transcripts: ${(config.booleans["setup.transcript"] ?? false) ? "on" : "off"}`;

  return new EmbedBuilder()
    .setTitle(config.texts["ticket.welcome-title"] || "Ticket ouvert")
    .setDescription(
      [
        config.texts["ticket.welcome-description"] || "Merci d'expliquer ton besoin avec un maximum de details.",
        "",
        `Auteur: <@${userId}>`,
        roleLine,
        transcriptLine
      ].join("\n")
    )
    .setColor(color)
    .setFooter({
      text: config.texts["panel.footer"] || "Nova Support"
    });
}

export function registerInteractionCreateEvent(client: BotClient): void {
  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          await interaction.reply({
            embeds: [interactionEmbed("Commande", "Commande introuvable.", 0xed4245)],
            ephemeral: true
          });
          return;
        }

        await command.execute(client, interaction);
        return;
      }

      if (interaction.isButton() && interaction.customId === "ticket:create") {
        if (!interaction.guild || !interaction.channel) {
          await interaction.reply({
            embeds: [interactionEmbed("Ticket", "Contexte invalide.", 0xed4245)],
            ephemeral: true
          });
          return;
        }

        const config = await getTicketConfig(interaction.guild.id);
        const staffRoleId = config.texts["setup.staffrole"];
        const categoryId = config.texts["setup.category"];
        const logChannelId = config.texts["setup.logchannel"];

        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`.slice(0, 90),
          type: ChannelType.GuildText,
          parent: categoryId || undefined,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            ...(staffRoleId
              ? [{
                  id: staffRoleId,
                  allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                  ]
                }]
              : []),
            {
              id: client.user!.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            }
          ]
        });

        const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket:claim")
            .setLabel("Claim")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("ticket:close")
            .setLabel("Fermer")
            .setStyle(ButtonStyle.Danger)
        );

        await channel.send({
          embeds: [buildTicketWelcomeEmbed(config, interaction.user.id)],
          components: [closeRow]
        });

        if (logChannelId) {
          const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
          if (logChannel && "send" in logChannel) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Ticket Ouvert")
                  .setDescription(`Auteur: <@${interaction.user.id}>\nSalon: <#${channel.id}>\nType: ${config.texts["panel.title"] || "Support"}`)
                  .setColor(parseHexColor(config.texts["panel.color"]))
              ]
            }).catch(() => null);
          }
        }

        await interaction.reply({
          embeds: [interactionEmbed("Ticket", `Ticket cree: <#${channel.id}>`, 0x3ba55d)],
          ephemeral: true
        });
        return;
      }

      if (interaction.isButton() && interaction.customId === "ticket:claim") {
        if (!interaction.channel || !("setName" in interaction.channel)) {
          await interaction.reply({
            embeds: [interactionEmbed("Ticket", "Salon incompatible.", 0xed4245)],
            ephemeral: true
          });
          return;
        }

        const nextName = `claimed-${interaction.channel.name}`.slice(0, 90);
        await interaction.channel.setName(nextName).catch(() => null);
        await interaction.reply({
          embeds: [interactionEmbed("Ticket", `Ticket claim par <@${interaction.user.id}>.`, 0x3ba55d)],
          ephemeral: false
        });
        return;
      }

      if (interaction.isButton() && interaction.customId === "ticket:close") {
        await interaction.reply({
          embeds: [interactionEmbed("Ticket", "Fermeture du ticket...", 0x3ba55d)],
          ephemeral: true
        });
        await interaction.channel?.delete();
      }
    } catch (error) {
      console.error(error);

      if (interaction.isRepliable()) {
        const payload = {
          embeds: [interactionEmbed("Erreur", "Une erreur est survenue pendant l'execution.", 0xed4245)],
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      }
    }
  });
}
