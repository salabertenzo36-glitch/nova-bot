import crypto from "node:crypto";

import {
  addTextOption,
  addUserOption,
  buildFlatCommand,
  buildModuleCommand,
  replyInfo,
  type ModularGroupDefinition
} from "./shared.js";
import type { SlashCommand } from "../../types/command.js";

const socialNames = [
  "hug",
  "pat",
  "slap",
  "bite",
  "kiss",
  "cuddle",
  "punch",
  "tickle",
  "poke",
  "stare",
  "highfive",
  "wave",
  "roast",
  "compliment",
  "simp",
  "gayrate",
  "smart-rate",
  "chaos-rate",
  "vibe-check",
  "ship",
  "marry",
  "divorce",
  "adopt",
  "steal-heart",
  "steal-fries"
] as const;

const randomNames = [
  "choose",
  "dice",
  "fortune",
  "coinflip",
  "8ball",
  "would-you-rather",
  "truth",
  "dare",
  "number",
  "color",
  "emoji",
  "pick-role",
  "pick-channel",
  "pick-admin",
  "pick-victim",
  "daily-luck",
  "weekly-luck",
  "spin",
  "lottery",
  "prediction",
  "mood",
  "alignment",
  "energy",
  "destiny",
  "chaos"
] as const;

const gamesNames = [
  "rps",
  "guess",
  "memory",
  "slots",
  "blackjack",
  "higher-lower",
  "trivia",
  "hangman",
  "connect4",
  "mines",
  "2048",
  "sudoku",
  "quiz",
  "typing",
  "anagram",
  "battle",
  "duel",
  "bossfight",
  "pet",
  "catch",
  "tictactoe",
  "scramble",
  "sequence",
  "labyrinth",
  "raid"
] as const;

const generatorNames = [
  "meme",
  "joke",
  "quote",
  "fact",
  "story",
  "pickupline",
  "insult",
  "compliment-gen",
  "copypasta",
  "headline",
  "tierlist",
  "caption",
  "nickname",
  "bio",
  "fake-ad",
  "villain-name",
  "hero-name",
  "team-name",
  "clan-name",
  "song-idea",
  "playlist",
  "emoji-mix",
  "server-lore",
  "origin",
  "quest"
] as const;

const profileNames = [
  "aura",
  "drip",
  "ppsize",
  "cringe-rate",
  "hotness",
  "braincells",
  "luck",
  "karma",
  "level",
  "rank",
  "rare",
  "energy-profile",
  "mood-profile",
  "spirit-animal",
  "theme",
  "anime-title",
  "rapper-name",
  "streamer-name",
  "boss-title",
  "pet-name",
  "guild-job",
  "superpower",
  "weakness",
  "signature",
  "legacy"
] as const;

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function percent(seed: string): number {
  return crypto.createHash("md5").update(seed).digest()[0] % 101;
}

function title(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const groups: ModularGroupDefinition[] = [
  {
    name: "social",
    description: "Interactions sociales",
    commands: socialNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addUserOption(b),
      handler: async (interaction: any) => {
        const user = interaction.options.getUser("user", true);
        const outputs: Record<string, string> = {
          hug: `Nova fait un hug a ${user}.`,
          pat: `Nova pat ${user}.`,
          slap: `${user} a pris une claque orbitale.`,
          bite: `Nova mord ${user}.`,
          kiss: `Bisou cosmique pour ${user}.`,
          cuddle: `Nova cuddle ${user}.`,
          punch: `${user} se fait punch avec amour.`,
          tickle: `${user} se fait chatouiller.`,
          poke: `Nova poke ${user}.`,
          stare: `Nova fixe ${user} intensement.`,
          highfive: `High five avec ${user}.`,
          wave: `Nova salue ${user}.`,
          roast: `${user}, meme ton ping a plus de flow.`,
          compliment: `${user}, tu portes ce serveur mieux que la moyenne.`,
          simp: `${user} simp a ${percent(user.id)}%.`,
          gayrate: `${user} rayonne a ${percent(`gay:${user.id}`)}%.`,
          "smart-rate": `${user} a ${percent(`iq:${user.id}`) + 50} IQ Discord.`,
          "chaos-rate": `${user} seme ${percent(`chaos:${user.id}`)}% de chaos.`,
          "vibe-check": `${user} passe le vibe check: ${pick(["oui", "non", "de justesse", "pas aujourd hui"])}`,
          ship: `${interaction.user} x ${user}: ${percent(`${interaction.user.id}:${user.id}`)}%`,
          marry: `${interaction.user} epouse ${user} dans un univers parallele.`,
          divorce: `${interaction.user} divorce proprement avec ${user}.`,
          adopt: `${interaction.user} adopte ${user}.`,
          "steal-heart": `${interaction.user} vole le coeur de ${user}.`,
          "steal-fries": `${interaction.user} vole les frites de ${user}.`
        };
        await replyInfo(interaction, title(name), outputs[name]);
      }
    }))
  },
  {
    name: "random",
    description: "Hasard et choix",
    commands: randomNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addTextOption(b, "input", "Valeur", false),
      handler: async (interaction: any) => {
        const input = interaction.options.getString("input") ?? "Nova";
        const outputs: Record<string, string> = {
          choose: pick(
            input
              .split("|")
              .map((item: string) => item.trim())
              .filter(Boolean).length
              ? input
                  .split("|")
                  .map((item: string) => item.trim())
                  .filter(Boolean)
              : ["Aucun choix valide"]
          ),
          dice: `${Math.floor(Math.random() * 6) + 1}`,
          fortune: pick(["Tu vas shipper un module entier ce soir.", "Un ticket bizarre arrivera a 3h.", "Ton prochain event va exploser."]),
          coinflip: pick(["Pile", "Face"]),
          "8ball": pick(["Oui", "Non", "Peut-etre", "Reessaie", "Clairement oui", "Clairement non"]),
          "would-you-rather": pick(["Coder 12h sans pause ou debug a 4h du matin ?", "100 tickets ou 1 bug critique en prod ?"]),
          truth: pick(["Qui du serveur te fait le plus rire ?", "Quel est ton dernier mensonge en vocal ?"]),
          dare: pick(["Envoie un compliment absurde.", "Change ton pseudo 5 minutes."]),
          number: `${Math.floor(Math.random() * 1000)}`,
          color: `#${crypto.randomBytes(3).toString("hex")}`,
          emoji: pick(["😀", "🔥", "🫡", "💀", "🚀", "🎯", "🧠"]),
          "pick-role": interaction.guild?.roles.cache.random()?.name || "Aucun role",
          "pick-channel": interaction.guild?.channels.cache.random()?.id || "Aucun salon",
          "pick-admin": interaction.guild?.members.cache.filter((m: any) => m.permissions.has("Administrator")).random()?.user.tag || "Aucun admin",
          "pick-victim": interaction.guild?.members.cache.random()?.user.tag || "Aucun membre",
          "daily-luck": `${percent(`daily:${interaction.user.id}`)}%`,
          "weekly-luck": `${percent(`weekly:${interaction.user.id}`)}%`,
          spin: pick(["gagne", "perd", "double", "joker", "vide"]),
          lottery: `${Math.floor(Math.random() * 999999)}`.padStart(6, "0"),
          prediction: pick(["Tu vas ouvrir 4 onglets de plus.", "Ton bot va attirer du monde.", "Quelqu un va casser un setup simple."]),
          mood: pick(["chaotique", "focus", "detendu", "rage", "social"]),
          alignment: pick(["lawful good", "neutral", "chaotic evil", "chaotic good"]),
          energy: `${percent(`energy:${interaction.user.id}`)}%`,
          destiny: pick(["leader", "lurker", "builder", "gremlin"]),
          chaos: `${percent(`chaos:${interaction.user.id}:${input}`)}%`
        };
        await replyInfo(interaction, title(name), outputs[name]);
      }
    }))
  },
  {
    name: "games",
    description: "Mini jeux",
    commands: gamesNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addTextOption(b, "input", "Valeur", false),
      handler: async (interaction: any) => {
        const input = interaction.options.getString("input") ?? interaction.user.username;
        const outputs: Record<string, string> = {
          rps: `Toi: ${input}\nNova: ${pick(["pierre", "feuille", "ciseaux"])}`,
          guess: `Nombre secret: ${Math.floor(Math.random() * 10) + 1}`,
          memory: pick(["Bonne pioche", "Carte vide", "Tu as trouve une paire"]),
          slots: pick(["🍒 🍒 🍒 JACKPOT", "🍋 🍋 🍉", "💀 🍒 🍋"]),
          blackjack: pick(["20 points", "Blackjack", "Bust 26", "17 et tu tiens"]),
          "higher-lower": pick(["plus haut", "plus bas"]),
          trivia: pick(["Question: capitale du Japon ?", "Question: 2 + 2 * 2 ?"]),
          hangman: `Mot cache: ${input[0]}${"_".repeat(Math.max(1, input.length - 1))}`,
          connect4: "Grille 7x6 prete.",
          mines: `${Math.floor(Math.random() * 5) + 1} mines detectees.`,
          "2048": "Tu commences avec 2 et 4.",
          sudoku: "Grille sudoku generee.",
          quiz: "Quiz express lance.",
          typing: `Tape ceci: ${input.slice(0, 20)}`,
          anagram: input.split("").sort(() => Math.random() - 0.5).join(""),
          battle: `${interaction.user} inflige ${Math.floor(Math.random() * 100)} degats.`,
          duel: `${interaction.user} gagne ${Math.floor(Math.random() * 2) ? "de justesse" : "facilement"}.`,
          bossfight: `Boss HP restant: ${Math.floor(Math.random() * 1000)}`,
          pet: pick(["Le pet dort.", "Le pet a faim.", "Le pet t adore."]),
          catch: pick(["Tu attrapes un poisson.", "Tu attrapes une botte.", "Tu attrapes un tresor."]),
          tictactoe: "Grille 3x3 prete.",
          scramble: input.split("").sort(() => Math.random() - 0.5).join(""),
          sequence: `${Math.floor(Math.random() * 9)} ${Math.floor(Math.random() * 9)} ${Math.floor(Math.random() * 9)}`,
          labyrinth: "Labyrinthe genere.",
          raid: `Escouade ${pick(["reussit", "echoue", "critique"])}.`
        };
        await replyInfo(interaction, title(name), outputs[name]);
      }
    }))
  },
  {
    name: "generator",
    description: "Generateurs de contenu",
    commands: generatorNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addTextOption(b, "input", "Sujet", false),
      handler: async (interaction: any) => {
        const input = interaction.options.getString("input") ?? interaction.user.username;
        const outputs: Record<string, string> = {
          meme: `Meme: quand ${input} deploye 500 commandes d un coup.`,
          joke: pick(["Le bug ne dormait pas, il attendait juste la prod.", "Le bot a plante par timidite."]),
          quote: pick(["Fais simple, puis fais massif.", "Le bon bot ne spam pas, il orchestre."]),
          fact: pick(["Fait: Discord prefere les sous-commandes aux 500 top-level.", "Fait: la maintenabilite gagne toujours."]),
          story: `Histoire courte: ${input} a ouvert un ticket qui a reveille tout le staff.`,
          pickupline: `Hey ${input}, ton cache est-il invalide ? Parce que je te redemande sans cesse.`,
          insult: `${input}, meme un placeholder avait plus de roadmap.`,
          "compliment-gen": `${input}, tu as une energie de release qui fonctionne du premier coup.`,
          copypasta: `${input.toUpperCase()} EST ARRIVE ET TOUT LE SERVEUR A CHANGe`,
          headline: `${input}: le serveur entier sous le choc`,
          tierlist: `S: ${input}\nA: setup\nB: ping\nC: bug`,
          caption: `${input}, mais en plus dramatique.`,
          nickname: `${input}-${pick(["prime", "ultra", "nova", "legend"])}`,
          bio: `${input} construit, casse, puis rebuild en mieux.`,
          "fake-ad": `Achetez ${input} maintenant: plus de chaos, moins de sommeil.`,
          "villain-name": `Le ${pick(["Seigneur", "Docteur", "Fantome"])} ${input}`,
          "hero-name": `Captain ${input}`,
          "team-name": `${input} Squad`,
          "clan-name": `${input} Clan`,
          "song-idea": `${input} feat. 3h du matin`,
          playlist: `Playlist ${input}: rage, focus, victory`,
          "emoji-mix": `${pick(["🔥", "💀", "✨"])}${pick(["🎯", "🧠", "🚀"])}`,
          "server-lore": `Lore: ${input} a un passe trouble et un ping variable.`,
          origin: `Origine de ${input}: forge dans les logs de prod.`,
          quest: `Quete: aide ${input} a survivre au prochain event.`
        };
        await replyInfo(interaction, title(name), outputs[name]);
      }
    }))
  },
  {
    name: "profile",
    description: "Profils absurdes et stats",
    commands: profileNames.map((name) => ({
      name,
      description: title(name),
      configure: (b: any) => addUserOption(b),
      handler: async (interaction: any) => {
        const user = interaction.options.getUser("user", true);
        const seed = `${name}:${user.id}`;
        const outputs: Record<string, string> = {
          aura: `${user}: ${percent(seed)} aura`,
          drip: `${user}: ${percent(seed)} drip`,
          ppsize: `${user}: 8${"=".repeat((percent(seed) % 12) + 1)}D`,
          "cringe-rate": `${user}: ${percent(seed)}% cringe`,
          hotness: `${user}: ${percent(seed)}% hotness`,
          braincells: `${user}: ${percent(seed) + 1} braincells`,
          luck: `${user}: ${percent(seed)}% luck`,
          karma: `${user}: ${percent(seed) - 50}`,
          level: `${user}: niveau ${Math.floor(percent(seed) / 5) + 1}`,
          rank: `${user}: rang #${percent(seed) + 1}`,
          rare: `${user}: rarete ${pick(["commun", "rare", "epique", "legendaire"])}`,
          "energy-profile": `${user}: ${pick(["hyper", "fatigue", "stable", "chaotique"])}`,
          "mood-profile": `${user}: ${pick(["mysterieux", "violent", "calme", "focus"])}`,
          "spirit-animal": `${user}: ${pick(["loup", "corbeau", "chat", "dragon"])}`,
          theme: `${user}: theme ${pick(["neon", "retro", "cyber", "clean"])}`,
          "anime-title": `${user}: ${pick(["Nova no Kage", "Ping Slayer", "Ticket Academia"])}`,
          "rapper-name": `${user}: Lil ${pick(["Cache", "Thread", "Shard", "Nova"])}`,
          "streamer-name": `${user}: ${pick(["xNova", "TVNova", "NovaLive"])}`,
          "boss-title": `${user}: ${pick(["Overlord", "Final Boss", "Raid King"])}`,
          "pet-name": `${user}: ${pick(["Pixel", "Chaos", "Blob", "Rocket"])}`,
          "guild-job": `${user}: ${pick(["mod", "clown officiel", "builder", "oracle"])}`,
          superpower: `${user}: ${pick(["invisibilite", "teleportation", "temps", "duplication"])}`,
          weakness: `${user}: ${pick(["Monday", "lag", "coffee", "pings"])}`,
          signature: `${user}: ${crypto.createHash("md5").update(seed).digest("hex").slice(0, 10)}`,
          legacy: `${user}: ${pick(["inoubliable", "chaotique", "respecte", "mythique"])}`
        };
        await replyInfo(interaction, title(name), outputs[name]);
      }
    }))
  }
];

export function createFunCommands(): SlashCommand[] {
  return groups.map((group) =>
    buildFlatCommand(`fun-${group.name}`, `Fun ${group.description.toLowerCase()}`, group.commands)
  );
}
