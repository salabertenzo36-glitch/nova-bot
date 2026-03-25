import { env } from "../../config/env.js";
import { generateAiReply } from "../../lib/ollama-client.js";
import { appendConversationMessage, clearConversation, getConversation } from "./ai-memory.js";
import { getCooldownRemainingMs, markCooldown } from "./ai-rate-limit.js";
import { getGuildAiSettings } from "./ai-settings.js";

export interface AiRequestContext {
  scopeId: string;
  userId: string;
  username: string;
  guildId?: string;
  guildName?: string;
  channelName?: string;
  prompt: string;
}

function buildSystemPrompt(context: AiRequestContext): string {
  const styleLine = {
    balanced: "Style: equilibre entre chaleur, precision et concision.",
    strict: "Style: direct, factuel, sans blabla, structure nette.",
    friendly: "Style: plus chaleureux, accessible, convivial.",
    developer: "Style: technique, rigoureux, oriente implementation et debogage.",
    short: "Style: reponses tres courtes, a fort signal."
  } as const;

  return [
    "Tu es Nova, une IA Discord publique haut de gamme.",
    "Le prefixe des commandes du bot est `.` et pas `!`.",
    "Quand on te demande les commandes du bot, tu dois citer uniquement des commandes qui existent vraiment dans ce projet.",
    "Si tu n'es pas sure d'une commande, dis que tu n'es pas certaine au lieu d'inventer.",
    "Commandes tickets reelles importantes: `.ticketpanel`, `.ticketsetup`, `.ticketclose`, `.ticketclaim`, `.ticketadd @user`, `.ticketremove @user`.",
    "Commandes moderation reelles importantes: `.warn @user raison`, `.mute @user 10 raison`, `.unmute @user`, `.kick @user raison`, `.ban @user raison`, `.unban ID`, `.purge 20`, `.purge-user @user 20`, `.lock`, `.unlock`, `.history @user`.",
    "Commandes IA reelles importantes: `.ai-ask question`, `.ai-reset`, `.ai-status`, `.ai-style balanced|strict|friendly|developer|short`, `.ai-cooldown 8`, `.ai-mentions on|off`.",
    "Commande d'aide reelle: `.help`, `.help moderation`, `.help warn`, `.help tickets 2`.",
    "Tu reponds principalement en francais, sauf si l'utilisateur demande clairement une autre langue.",
    "Tu dois etre precise, utile, naturelle, concise par defaut, et structuree quand le sujet est complexe.",
    "Tu gardes un ton propre a Discord: humain, net, pas robotique.",
    "Tu n'inventes pas des faits. Si une information manque, tu le dis franchement.",
    "Tu refuses poliment les demandes illegales, dangereuses ou malveillantes.",
    "Si l'utilisateur demande du code, donne une solution exploitable et courte avant les details.",
    styleLine[(context as AiRequestContext & { style?: keyof typeof styleLine }).style ?? "balanced"],
    `Contexte serveur: ${context.guildName ?? "message prive ou inconnu"}.`,
    `Contexte salon: ${context.channelName ?? "inconnu"}.`,
    `Utilisateur courant: ${context.username} (${context.userId}).`
  ].join(" ");
}

function sanitizePrompt(prompt: string): string {
  return prompt.trim().slice(0, 4000);
}

export async function answerWithAi(context: AiRequestContext): Promise<string> {
  const prompt = sanitizePrompt(context.prompt);
  const settings = await getGuildAiSettings(context.guildId);
  const cooldownKey = `${context.guildId ?? "dm"}:${context.scopeId}:${context.userId}`;
  const remaining = getCooldownRemainingMs(cooldownKey, settings.cooldownSeconds);

  if (remaining > 0) {
    const seconds = Math.ceil(remaining / 1000);
    return `Patiente ${seconds}s avant de relancer Nova dans ce salon.`;
  }

  const memory = (await getConversation(context.scopeId)).slice(-settings.maxMemoryMessages);
  markCooldown(cooldownKey, settings.cooldownSeconds);

  const reply = await generateAiReply(
    env.ollamaBaseUrl,
    settings.modelOverride || env.ollamaModel,
    {
    systemPrompt: buildSystemPrompt({
      ...context,
      style: settings.style
    } as AiRequestContext),
    messages: memory.map((message) => ({
      role: message.role,
      content: message.content
    })),
    userPrompt: prompt
  });

  await appendConversationMessage(context.scopeId, {
    role: "user",
    content: prompt,
    authorId: context.userId,
    createdAt: Date.now()
  });

  await appendConversationMessage(context.scopeId, {
    role: "assistant",
    content: reply,
    createdAt: Date.now()
  });

  return reply;
}

export async function resetAiConversation(scopeId: string): Promise<void> {
  await clearConversation(scopeId);
}
