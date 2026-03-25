import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type GuildTextBasedChannel,
  type SlashCommandSubcommandBuilder
} from "discord.js";
import crypto from "node:crypto";

import { getModConfig, setModBoolean, setModNumber, setModText, toggleModBoolean } from "../../features/moderation/mod-config.js";
import type { SlashCommand } from "../../types/command.js";

export type ModularCommandHandler = (
  interaction: ChatInputCommandInteraction
) => Promise<void>;

export interface ModularSubcommandDefinition {
  name: string;
  description: string;
  configure?: (builder: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
  handler: ModularCommandHandler;
}

export interface ModularGroupDefinition {
  name: string;
  description: string;
  commands: ModularSubcommandDefinition[];
}

export function buildModuleCommand(
  name: string,
  description: string,
  groups: ModularGroupDefinition[],
  defaultMemberPermissions?: string | number | bigint
): SlashCommand {
  const builder = new SlashCommandBuilder().setName(name).setDescription(description);

  if (defaultMemberPermissions !== undefined) {
    builder.setDefaultMemberPermissions(defaultMemberPermissions);
  }

  for (const group of groups) {
    builder.addSubcommandGroup((subgroup) => {
      subgroup.setName(group.name).setDescription(group.description);
      for (const command of group.commands) {
        subgroup.addSubcommand((subcommand) => {
          let built = subcommand.setName(command.name).setDescription(command.description);
          if (command.configure) {
            built = command.configure(built);
          }
          return built;
        });
      }
      return subgroup;
    });
  }

  const handlers = new Map<string, ModularCommandHandler>();
  for (const group of groups) {
    for (const command of group.commands) {
      handlers.set(`${group.name}.${command.name}`, command.handler);
    }
  }

  return {
    category: name,
    data: builder,
    async execute(_, interaction) {
      const key = `${interaction.options.getSubcommandGroup(true)}.${interaction.options.getSubcommand(true)}`;
      const handler = handlers.get(key);
      if (!handler) {
        await replyError(interaction, "Sous-commande introuvable", "Cette sous-commande n'existe pas.");
        return;
      }
      await handler(interaction);
    }
  };
}

export function buildFlatCommand(
  name: string,
  description: string,
  commands: ModularSubcommandDefinition[],
  defaultMemberPermissions?: string | number | bigint
): SlashCommand {
  const builder = new SlashCommandBuilder().setName(name).setDescription(description);

  if (defaultMemberPermissions !== undefined) {
    builder.setDefaultMemberPermissions(defaultMemberPermissions);
  }

  for (const command of commands) {
    builder.addSubcommand((subcommand) => {
      let built = subcommand.setName(command.name).setDescription(command.description);
      if (command.configure) {
        built = command.configure(built);
      }
      return built;
    });
  }

  const handlers = new Map<string, ModularCommandHandler>();
  for (const command of commands) {
    handlers.set(command.name, command.handler);
  }

  return {
    category: name,
    data: builder,
    async execute(_, interaction) {
      const handler = handlers.get(interaction.options.getSubcommand(true));
      if (!handler) {
        await replyError(interaction, "Sous-commande introuvable", "Cette sous-commande n'existe pas.");
        return;
      }
      await handler(interaction);
    }
  };
}

export function addUserOption(
  builder: SlashCommandSubcommandBuilder
): SlashCommandSubcommandBuilder {
  return builder.addUserOption((option) =>
    option.setName("user").setDescription("Membre cible").setRequired(true)
  );
}

export function addBooleanOption(
  builder: SlashCommandSubcommandBuilder,
  name: string,
  description: string,
  required = false
): SlashCommandSubcommandBuilder {
  return builder.addBooleanOption((option) =>
    option.setName(name).setDescription(description).setRequired(required)
  );
}

export function addReasonOption(
  builder: SlashCommandSubcommandBuilder
): SlashCommandSubcommandBuilder {
  return builder.addStringOption((option) =>
    option.setName("reason").setDescription("Raison").setRequired(false)
  );
}

export function addAmountOption(
  builder: SlashCommandSubcommandBuilder
): SlashCommandSubcommandBuilder {
  return builder.addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Quantite")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  );
}

export function addIntegerOption(
  builder: SlashCommandSubcommandBuilder,
  name: string,
  description: string,
  required = false,
  minValue?: number,
  maxValue?: number
): SlashCommandSubcommandBuilder {
  return builder.addIntegerOption((option) => {
    option.setName(name).setDescription(description).setRequired(required);
    if (minValue !== undefined) option.setMinValue(minValue);
    if (maxValue !== undefined) option.setMaxValue(maxValue);
    return option;
  });
}

export function addTextOption(
  builder: SlashCommandSubcommandBuilder,
  name: string,
  description: string,
  required = false
): SlashCommandSubcommandBuilder {
  return builder.addStringOption((option) =>
    option.setName(name).setDescription(description).setRequired(required)
  );
}

export async function requireModeratableMember(
  interaction: ChatInputCommandInteraction
): Promise<GuildMember | null> {
  const member = interaction.options.getMember("user");
  if (!member || !(member instanceof Object) || !("moderatable" in member)) {
    await replyError(interaction, "Membre introuvable", "Membre introuvable sur ce serveur.");
    return null;
  }

  return member as GuildMember;
}

export async function requireManageableMember(
  interaction: ChatInputCommandInteraction
): Promise<GuildMember | null> {
  const member = await requireModeratableMember(interaction);
  if (!member) {
    return null;
  }

  if (!member.manageable) {
    await replyError(
      interaction,
      "Hierarchie invalide",
      "Je ne peux pas gerer ce membre a cause de la hierarchie des roles."
    );
    return null;
  }

  return member;
}

export function getReason(interaction: ChatInputCommandInteraction): string {
  return interaction.options.getString("reason") ?? "Aucune raison fournie";
}

export function successEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x3ba55d);
}

export function infoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x5865f2);
}

export function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0xed4245);
}

export async function replyInfo(
  interaction: ChatInputCommandInteraction,
  title: string,
  description: string,
  ephemeral = false
): Promise<void> {
  await interaction.reply({ embeds: [infoEmbed(title, description)], ephemeral });
}

export async function replySuccess(
  interaction: ChatInputCommandInteraction,
  title: string,
  description: string,
  ephemeral = false
): Promise<void> {
  await interaction.reply({ embeds: [successEmbed(title, description)], ephemeral });
}

export async function replyError(
  interaction: ChatInputCommandInteraction,
  title: string,
  description: string,
  ephemeral = true
): Promise<void> {
  await interaction.reply({ embeds: [errorEmbed(title, description)], ephemeral });
}

export function ensureTextChannel(
  interaction: ChatInputCommandInteraction
): GuildTextBasedChannel | null {
  const channel = interaction.channel;
  if (!channel || !("send" in channel)) {
    return null;
  }

  return channel as GuildTextBasedChannel;
}

export function requireGuildId(interaction: ChatInputCommandInteraction): string | null {
  if (!interaction.guildId) {
    void replyError(interaction, "Serveur requis", "Commande reservee a un serveur.");
    return null;
  }

  return interaction.guildId;
}

export function boolStatus(value: boolean): string {
  return value ? "active" : "desactivee";
}

export function adminPermission() {
  return PermissionFlagsBits.ManageGuild;
}

function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function replyPlaceholder(area: string, command: string): ModularCommandHandler {
  return async (interaction) => {
    const input =
      interaction.options.getString("input")
      ?? interaction.options.getString("value")
      ?? interaction.options.getString("text")
      ?? interaction.options.getString("reason")
      ?? "";
    const user = interaction.options.getUser("user");

    if (area.startsWith("mod.")) {
      if (!interaction.guildId) {
        await interaction.reply({ content: "Commande reservee au serveur.", ephemeral: true });
        return;
      }

      if (area === "mod.automod" || area === "mod.logs") {
        const explicit = interaction.options.getString("value");
        if (explicit) {
          await setModText(interaction.guildId, `${area}.${command}`, explicit);
          await interaction.reply({
            embeds: [successEmbed("Configuration", `${command} defini sur: ${explicit}`)],
            ephemeral: true
          });
          return;
        }

        const next = await toggleModBoolean(interaction.guildId, `${area}.${command}`);
        await interaction.reply({
          embeds: [successEmbed("Configuration", `${command} ${boolStatus(next)}.`)],
          ephemeral: true
        });
        return;
      }

      if (area === "mod.member") {
        const target = user ? `<@${user.id}>` : "ce membre";
        if (command.includes("history")) {
          const config = await getModConfig(interaction.guildId);
          const note = config.texts[`mod.member.note-add:${user?.id ?? "unknown"}`] ?? "Aucun historique stocke.";
          await interaction.reply({ content: `${target}\n${note}`, ephemeral: true });
          return;
        }
        if (command.includes("note") || command.includes("flag") || command.includes("watchlist")) {
          const key = `${area}.${command}:${user?.id ?? "unknown"}`;
          await setModText(interaction.guildId, key, input || `Entree creee le ${new Date().toLocaleString("fr-FR")}`);
          await interaction.reply({ content: `${command} enregistre pour ${target}.`, ephemeral: true });
          return;
        }
        await interaction.reply({ content: `${command} execute pour ${target}.`, ephemeral: true });
        return;
      }

      if (area === "mod.messages" || area === "mod.channel") {
        if (input) {
          await setModText(interaction.guildId, `${area}.${command}`, input);
          await interaction.reply({ content: `${command} mis a jour: ${input}`, ephemeral: true });
          return;
        }
        const next = await toggleModBoolean(interaction.guildId, `${area}.${command}`);
        await interaction.reply({ content: `${command} ${boolStatus(next)}.`, ephemeral: true });
        return;
      }
    }

    if (area.startsWith("util.")) {
      const source = input || "Nova";
      const outputs: Record<string, string> = {
        calc: `${source} => ${source.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)}`,
        "base64-encode": Buffer.from(source).toString("base64"),
        "base64-decode": Buffer.from(source, "base64").toString("utf8"),
        hash: crypto.createHash("sha256").update(source).digest("hex"),
        timestamp: `${Math.floor(Date.now() / 1000)}`,
        binary: source.split("").map((char) => char.charCodeAt(0).toString(2)).join(" "),
        hex: Buffer.from(source).toString("hex"),
        morse: source.split("").map((char) => char.charCodeAt(0)).join("."),
        reverse: source.split("").reverse().join(""),
        uppercase: source.toUpperCase(),
        lowercase: source.toLowerCase(),
        titlecase: titleCase(source),
        translate: `Traduction locale indisponible, texte recu: ${source}`,
        shorten: source.slice(0, 32),
        expand: source.padEnd(Math.min(source.length + 10, 64), "."),
        color: `#${crypto.createHash("md5").update(source).digest("hex").slice(0, 6)}`,
        qr: `QR payload: ${source}`,
        remind: `Rappel cree: ${source}`,
        poll: `Sondage cree: ${source}`,
        default: `Resultat utilitaire pour ${command}: ${source}`
      };
      await interaction.reply(outputs[command] ?? outputs.default);
      return;
    }

    if (area.startsWith("fun.")) {
      const target = user ? `<@${user.id}>` : (input || "toi");
      const outputs: Record<string, string> = {
        hug: `Nova fait un hug a ${target}.`,
        pat: `Nova pat ${target}.`,
        slap: `${target} vient de prendre une claque cosmique.`,
        bite: `Nova mord ${target}.`,
        kiss: `Bisou pour ${target}.`,
        cuddle: `Nova cuddle ${target}.`,
        punch: `${target} se fait punch avec amour.`,
        tickle: `${target} se fait chatouiller.`,
        poke: `Nova poke ${target}.`,
        stare: `Nova fixe ${target} intensement.`,
        highfive: `High five avec ${target}.`,
        wave: `Nova salue ${target}.`,
        roast: `${target}, ton Wi-Fi a plus de charisme que toi.`,
        compliment: `${target}, tu portes ce serveur mieux que la moyenne.`,
        simp: `${target} simp a ${Math.floor(Math.random() * 101)}%.`,
        "gayrate": `${target} rayonne a ${Math.floor(Math.random() * 101)}%.`,
        "smart-rate": `${target} a ${Math.floor(Math.random() * 201)} IQ Discord.`,
        "chaos-rate": `${target} seme ${Math.floor(Math.random() * 101)}% de chaos.`,
        "vibe-check": `${target} passe le vibe check: ${pick(["oui", "non", "presque", "de justesse"])}`,
        joke: pick(["Nova a teste la prod un vendredi. Mauvaise idee.", "Le bug n'est pas un bug, c'est une feature qui panique."]),
        meme: pick(["Meme du jour: quand le bot marche du premier coup.", "Meme du jour: 500 commandes et zero sommeil."]),
        fact: pick(["Fait: Discord limite fortement les slash commands top-level.", "Fait: une bonne architecture vaut plus que 100 commandes clones."]),
        quote: pick(["Fais simple, puis fais massif.", "Le bon bot ne spam pas, il orchestre."]),
        story: `Il etait une fois ${target}, chef inconteste du chaos.`,
        default: `Commande fun ${command} pour ${target}.`
      };
      await interaction.reply(outputs[command] ?? outputs.default);
      return;
    }

    await interaction.reply({
      content: `${area}.${command}: commande executee.`,
      ephemeral: true
    });
  };
}
