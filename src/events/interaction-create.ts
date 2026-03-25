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

export function registerInteractionCreateEvent(client: BotClient): void {
  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          await interaction.reply({
            content: "Commande introuvable.",
            ephemeral: true
          });
          return;
        }

        await command.execute(client, interaction);
        return;
      }

      if (interaction.isButton() && interaction.customId === "ticket:create") {
        if (!interaction.guild || !interaction.channel) {
          await interaction.reply({ content: "Contexte invalide.", ephemeral: true });
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
          embeds: [
            new EmbedBuilder()
              .setTitle(config.texts["panel.title"] || "Support")
              .setDescription(
                `${config.texts["panel.description"] || "Merci de decrire ton probleme."}\n\nAuteur: <@${interaction.user.id}>`
              )
              .setColor(0x5865f2)
          ],
          components: [closeRow]
        });

        if (logChannelId) {
          const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
          if (logChannel && "send" in logChannel) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Ticket Ouvert")
                  .setDescription(`Auteur: <@${interaction.user.id}>\nSalon: <#${channel.id}>`)
                  .setColor(0x3ba55d)
              ]
            }).catch(() => null);
          }
        }

        await interaction.reply({
          content: `Ticket cree: <#${channel.id}>`,
          ephemeral: true
        });
        return;
      }

      if (interaction.isButton() && interaction.customId === "ticket:claim") {
        if (!interaction.channel || !("setName" in interaction.channel)) {
          await interaction.reply({ content: "Salon incompatible.", ephemeral: true });
          return;
        }

        const nextName = `claimed-${interaction.channel.name}`.slice(0, 90);
        await interaction.channel.setName(nextName).catch(() => null);
        await interaction.reply({ content: `Ticket claim par <@${interaction.user.id}>.`, ephemeral: false });
        return;
      }

      if (interaction.isButton() && interaction.customId === "ticket:close") {
        await interaction.reply({ content: "Fermeture du ticket...", ephemeral: true });
        await interaction.channel?.delete();
      }
    } catch (error) {
      console.error(error);

      if (interaction.isRepliable()) {
        const payload = {
          content: "Une erreur est survenue pendant l'execution.",
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
