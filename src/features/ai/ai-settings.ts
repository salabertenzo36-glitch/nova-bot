import { JsonStore } from "../../lib/json-store.js";

export type AiStyle = "balanced" | "strict" | "friendly" | "developer" | "short";

export interface GuildAiSettings {
  mentionEnabled: boolean;
  cooldownSeconds: number;
  style: AiStyle;
  maxMemoryMessages: number;
  modelOverride: string;
}

interface AiSettingsState {
  guilds: Record<string, GuildAiSettings>;
}

const defaults: GuildAiSettings = {
  mentionEnabled: true,
  cooldownSeconds: 8,
  style: "balanced",
  maxMemoryMessages: 10,
  modelOverride: ""
};

const store = new JsonStore<AiSettingsState>("ai-settings.json", {
  guilds: {}
});

export async function getGuildAiSettings(guildId?: string): Promise<GuildAiSettings> {
  if (!guildId) {
    return defaults;
  }

  const state = await store.read();
  return {
    ...defaults,
    ...(state.guilds[guildId] ?? {})
  };
}

export async function updateGuildAiSettings(
  guildId: string,
  patch: Partial<GuildAiSettings>
): Promise<GuildAiSettings> {
  const state = await store.read();
  const next = {
    ...defaults,
    ...(state.guilds[guildId] ?? {}),
    ...patch
  };
  state.guilds[guildId] = next;
  await store.write(state);
  return next;
}
