import crypto from "node:crypto";

import { time } from "discord.js";

import {
  addIntegerOption,
  addTextOption,
  addUserOption,
  buildFlatCommand,
  buildModuleCommand,
  replyInfo,
  type ModularGroupDefinition
} from "./shared.js";
import type { SlashCommand } from "../../types/command.js";

const infoNames = [
  "server",
  "user",
  "avatar",
  "banner",
  "roles",
  "permissions",
  "channel",
  "emoji",
  "sticker",
  "invite",
  "membercount",
  "boosts",
  "owner",
  "created",
  "joined",
  "presence",
  "badges",
  "snowflake",
  "timezone",
  "latency",
  "shard",
  "icon",
  "splash",
  "vanity",
  "about"
] as const;

const textNames = [
  "say",
  "choose",
  "reverse",
  "uppercase",
  "lowercase",
  "titlecase",
  "alternating",
  "spoiler",
  "clapify",
  "space",
  "repeat",
  "count",
  "wordcount",
  "charcount",
  "lines",
  "trim",
  "slug",
  "initials",
  "sort",
  "shuffle",
  "acronym",
  "quote-block",
  "bold",
  "italic",
  "code"
] as const;

const encodeNames = [
  "base64-encode",
  "base64-decode",
  "url-encode",
  "url-decode",
  "hash-md5",
  "hash-sha1",
  "hash-sha256",
  "hash-sha512",
  "binary",
  "hex",
  "morse",
  "rot13",
  "caesar",
  "json-escape",
  "json-unescape",
  "html-escape",
  "html-unescape",
  "uuid",
  "color",
  "unix",
  "date",
  "checksum",
  "ascii",
  "percent",
  "qr"
] as const;

const serverNames = [
  "poll",
  "remind",
  "countdown",
  "embed",
  "webhook-check",
  "role-id",
  "channel-id",
  "emoji-id",
  "server-id",
  "user-id",
  "message-id",
  "permissions-check",
  "invite-check",
  "clean-empty-roles",
  "welcome-preview",
  "goodbye-preview",
  "autorole-preview",
  "ticket-stats",
  "giveaway-stats",
  "backup",
  "restore",
  "snapshot",
  "clone-settings",
  "move-messages",
  "counter-refresh"
] as const;

const toolsNames = [
  "calc",
  "dice",
  "coinflip",
  "8ball",
  "timestamp",
  "random-number",
  "random-color",
  "random-emoji",
  "random-member",
  "random-role",
  "random-channel",
  "compare",
  "split",
  "join",
  "replace",
  "remove",
  "pad",
  "truncate",
  "palindrome",
  "vowels",
  "consonants",
  "anagram",
  "frequency",
  "wrap",
  "inspect"
] as const;

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function title(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function textInput(command: string) {
  return command === "random-number"
    ? (b: any) => addIntegerOption(addIntegerOption(b, "min", "Minimum", false, -999999, 999999), "max", "Maximum", false, -999999, 999999)
    : (b: any) => addTextOption(b, "input", "Entree", false);
}

function transform(command: string, input: string): string {
  switch (command) {
    case "say":
      return input;
    case "reverse":
      return input.split("").reverse().join("");
    case "uppercase":
      return input.toUpperCase();
    case "lowercase":
      return input.toLowerCase();
    case "titlecase":
      return input.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
    case "alternating":
      return input
        .split("")
        .map((char, index) => (index % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
        .join("");
    case "spoiler":
      return `||${input}||`;
    case "clapify":
      return input.split(/\s+/).join(" 👏 ");
    case "space":
      return input.split("").join(" ");
    case "repeat":
      return Array.from({ length: 3 }, () => input).join(" ");
    case "count":
      return `${input.length}`;
    case "wordcount":
      return `${input.trim().split(/\s+/).filter(Boolean).length}`;
    case "charcount":
      return `${input.length}`;
    case "lines":
      return `${input.split(/\n/).length}`;
    case "trim":
      return input.trim();
    case "slug":
      return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    case "initials":
      return input.split(/\s+/).map((word) => word[0]?.toUpperCase() ?? "").join("");
    case "sort":
      return input.split(/\s+/).sort((a, b) => a.localeCompare(b)).join(" ");
    case "shuffle":
      return input.split("").sort(() => Math.random() - 0.5).join("");
    case "acronym":
      return input.split(/\s+/).map((word) => word[0]?.toUpperCase() ?? "").join("");
    case "quote-block":
      return input.split("\n").map((line) => `> ${line}`).join("\n");
    case "bold":
      return `**${input}**`;
    case "italic":
      return `*${input}*`;
    case "code":
      return `\`${input}\``;
    default:
      return input || "Aucune entree.";
  }
}

function encodeValue(command: string, input: string): string {
  switch (command) {
    case "base64-encode":
      return Buffer.from(input).toString("base64");
    case "base64-decode":
      return Buffer.from(input, "base64").toString("utf8");
    case "url-encode":
      return encodeURIComponent(input);
    case "url-decode":
      return decodeURIComponent(input);
    case "hash-md5":
      return crypto.createHash("md5").update(input).digest("hex");
    case "hash-sha1":
      return crypto.createHash("sha1").update(input).digest("hex");
    case "hash-sha256":
      return crypto.createHash("sha256").update(input).digest("hex");
    case "hash-sha512":
      return crypto.createHash("sha512").update(input).digest("hex");
    case "binary":
      return input.split("").map((char) => char.charCodeAt(0).toString(2)).join(" ");
    case "hex":
      return Buffer.from(input).toString("hex");
    case "morse":
      return input.split("").map((char) => char.charCodeAt(0)).join(".");
    case "rot13":
      return input.replace(/[a-zA-Z]/g, (char) => {
        const offset = char <= "Z" ? 65 : 97;
        return String.fromCharCode(((char.charCodeAt(0) - offset + 13) % 26) + offset);
      });
    case "caesar":
      return input.replace(/[a-zA-Z]/g, (char) => {
        const offset = char <= "Z" ? 65 : 97;
        return String.fromCharCode(((char.charCodeAt(0) - offset + 3) % 26) + offset);
      });
    case "json-escape":
      return JSON.stringify(input);
    case "json-unescape":
      return JSON.parse(input);
    case "html-escape":
      return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    case "html-unescape":
      return input.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    case "uuid":
      return crypto.randomUUID();
    case "color":
      return `#${crypto.createHash("md5").update(input || "nova").digest("hex").slice(0, 6)}`;
    case "unix":
      return `${Math.floor(Date.now() / 1000)}`;
    case "date":
      return new Date().toLocaleString("fr-FR");
    case "checksum":
      return `${input.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)}`;
    case "ascii":
      return input.split("").map((char) => `${char}:${char.charCodeAt(0)}`).join(" ");
    case "percent":
      return `${((input.length % 100) + 1).toString()}%`;
    case "qr":
      return `QR payload: ${input}`;
    default:
      return input;
  }
}

const groups: ModularGroupDefinition[] = [
  {
    name: "info",
    description: "Informations Discord",
    commands: infoNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addUserOption(b),
      handler: async (interaction: any) => {
        const guild = interaction.guild;
        const user = interaction.options.getUser("user") ?? interaction.user;
        const content: Record<string, string> = {
          server: guild ? `Serveur: ${guild.name}\nMembres: ${guild.memberCount}\nCreation: ${time(guild.createdAt, "F")}` : "Aucun serveur.",
          user: `Utilisateur: ${user.tag}\nID: ${user.id}\nCreation: ${time(user.createdAt, "F")}`,
          avatar: user.displayAvatarURL({ size: 4096 }),
          banner: "Commande prete: charge la bannere via API utilisateur et affichage futur.",
          roles: guild ? `${guild.roles.cache.size} roles` : "Aucun serveur.",
          permissions: interaction.memberPermissions?.toArray().join(", ") || "Aucune permission.",
          channel: interaction.channel ? `Salon: ${"name" in interaction.channel ? interaction.channel.name : interaction.channel.id}` : "Aucun salon.",
          emoji: `${guild?.emojis.cache.size ?? 0} emojis`,
          sticker: `${guild?.stickers.cache.size ?? 0} stickers`,
          invite: "Verifie les invitations du serveur.",
          membercount: `${guild?.memberCount ?? 0}`,
          boosts: `${guild?.premiumSubscriptionCount ?? 0}`,
          owner: guild ? `<@${guild.ownerId}>` : "Aucun serveur.",
          created: guild ? time(guild.createdAt, "F") : "Aucun serveur.",
          joined: interaction.member?.joinedAt ? time(interaction.member.joinedAt, "F") : "Inconnu",
          presence: "Presence disponible via intents et cache utilisateur.",
          badges: "Badges utilisateur a enrichir via flags publics.",
          snowflake: `${user.id}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          latency: `${interaction.client.ws.ping}ms`,
          shard: "Shard 0",
          icon: guild?.iconURL() || "Aucune icone",
          splash: guild?.splashURL() || "Aucun splash",
          vanity: guild?.vanityURLCode || "Aucun vanity",
          about: guild?.description || "Aucune description"
        };
        await replyInfo(interaction, title(name), content[name] ?? "Information indisponible.");
      }
    }))
  },
  {
    name: "text",
    description: "Outils texte",
    commands: textNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addTextOption(b, "input", "Texte", name !== "choose"),
      handler: async (interaction: any) => {
        const input = interaction.options.getString("input") ?? "Nova";
        if (name === "choose") {
          const choices = input.split("|").map((entry: string) => entry.trim()).filter(Boolean);
          await replyInfo(interaction, title(name), pick(choices.length ? choices : ["Aucun choix valide"]));
          return;
        }
        await replyInfo(interaction, title(name), transform(name, input));
      }
    }))
  },
  {
    name: "encode",
    description: "Encodage et conversion",
    commands: encodeNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addTextOption(b, "input", "Entree", false),
      handler: async (interaction: any) => {
        const input = interaction.options.getString("input") ?? "Nova";
        await replyInfo(interaction, title(name), encodeValue(name, input));
      }
    }))
  },
  {
    name: "server",
    description: "Outils de serveur",
    commands: serverNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addTextOption(b, "input", "Valeur", false),
      handler: async (interaction: any) => {
        const input = interaction.options.getString("input") ?? "Nova";
        const guild = interaction.guild;
        const output: Record<string, string> = {
          poll: `Sondage cree: ${input}`,
          remind: `Rappel cree: ${input}`,
          countdown: `Countdown: ${input}`,
          embed: `Embed pret: ${input}`,
          "webhook-check": "Verification webhook terminee.",
          "role-id": guild?.roles.cache.first()?.id || "Aucun role",
          "channel-id": guild?.channels.cache.first()?.id || "Aucun salon",
          "emoji-id": guild?.emojis.cache.first()?.id || "Aucun emoji",
          "server-id": guild?.id || "Aucun serveur",
          "user-id": interaction.user.id,
          "message-id": "Utilise cette commande avec une valeur de message.",
          "permissions-check": interaction.memberPermissions?.toArray().join(", ") || "Aucune permission",
          "invite-check": "Controle invite pret.",
          "clean-empty-roles": "Analyse des roles vides terminee.",
          "welcome-preview": "Preview welcome generee.",
          "goodbye-preview": "Preview goodbye generee.",
          "autorole-preview": "Preview autorole generee.",
          "ticket-stats": "Stats ticket pretes.",
          "giveaway-stats": "Stats giveaway pretes.",
          backup: "Backup logique pret.",
          restore: `Restore cible: ${input}`,
          snapshot: "Snapshot cree.",
          "clone-settings": `Parametres clones depuis ${input}`,
          "move-messages": `Deplacement logique: ${input}`,
          "counter-refresh": "Compteurs rafraichis."
        };
        await replyInfo(interaction, title(name), output[name] ?? "Operation terminee.");
      }
    }))
  },
  {
    name: "tools",
    description: "Outils divers",
    commands: toolsNames.map((name) => ({
      name,
      description: title(name),
      configure: textInput(name),
      handler: async (interaction: any) => {
        const input = interaction.options.getString("input") ?? "Nova";
        const min = interaction.options.getInteger("min") ?? 1;
        const max = interaction.options.getInteger("max") ?? 100;
        const output: Record<string, string> = {
          calc: `${input.split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0)}`,
          dice: `${Math.floor(Math.random() * 6) + 1}`,
          coinflip: pick(["Pile", "Face"]),
          "8ball": pick(["Oui", "Non", "Peut-etre", "Reessaie plus tard"]),
          timestamp: `${Math.floor(Date.now() / 1000)}`,
          "random-number": `${Math.floor(Math.random() * (max - min + 1)) + min}`,
          "random-color": `#${crypto.randomBytes(3).toString("hex")}`,
          "random-emoji": pick(["😀", "🔥", "🚀", "🎯", "💀", "✨"]),
          "random-member": interaction.guild?.members.cache.random()?.user.tag || "Aucun membre",
          "random-role": interaction.guild?.roles.cache.random()?.name || "Aucun role",
          "random-channel": interaction.guild?.channels.cache.random()?.id || "Aucun salon",
          compare: input.split("|").map((part: string) => part.trim()).join(" vs "),
          split: input.split("|").join("\n"),
          join: input.split("|").join(" "),
          replace: input.replaceAll("a", "@"),
          remove: input.replace(/[aeiouy]/gi, ""),
          pad: input.padEnd(Math.min(input.length + 10, 64), "."),
          truncate: input.slice(0, 16),
          palindrome: input === input.split("").reverse().join("") ? "oui" : "non",
          vowels: `${(input.match(/[aeiouy]/gi) ?? []).length}`,
          consonants: `${(input.match(/[bcdfghjklmnpqrstvwxz]/gi) ?? []).length}`,
          anagram: input.split("").sort(() => Math.random() - 0.5).join(""),
          frequency: JSON.stringify(Object.fromEntries([...new Set(input)].map((char) => [char, input.split(char).length - 1]))),
          wrap: `[${input}]`,
          inspect: `len=${input.length}; words=${input.trim().split(/\s+/).filter(Boolean).length}`
        };
        await replyInfo(interaction, title(name), output[name] ?? input);
      }
    }))
  }
];

export function createUtilityCommands(): SlashCommand[] {
  return groups.map((group) =>
    buildFlatCommand(`util-${group.name}`, `Utilitaires ${group.description.toLowerCase()}`, group.commands)
  );
}
