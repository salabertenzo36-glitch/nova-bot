import { JsonStore } from "../../lib/json-store.js";

export interface ModGuildConfig {
  booleans: Record<string, boolean>;
  numbers: Record<string, number>;
  texts: Record<string, string>;
}

interface ModConfigState {
  guilds: Record<string, ModGuildConfig>;
}

const defaults: ModGuildConfig = {
  booleans: {},
  numbers: {},
  texts: {}
};

const store = new JsonStore<ModConfigState>("mod-config.json", {
  guilds: {}
});

export async function getModConfig(guildId: string): Promise<ModGuildConfig> {
  const state = await store.read();
  return {
    booleans: {
      ...defaults.booleans,
      ...(state.guilds[guildId]?.booleans ?? {})
    },
    numbers: {
      ...defaults.numbers,
      ...(state.guilds[guildId]?.numbers ?? {})
    },
    texts: {
      ...defaults.texts,
      ...(state.guilds[guildId]?.texts ?? {})
    }
  };
}

export async function setModBoolean(
  guildId: string,
  key: string,
  value: boolean
): Promise<boolean> {
  await store.update(async (state) => {
    const guild = state.guilds[guildId] ?? structuredClone(defaults);
    guild.booleans[key] = value;
    state.guilds[guildId] = guild;
    return state;
  });
  return value;
}

export async function toggleModBoolean(guildId: string, key: string): Promise<boolean> {
  const current = await getModConfig(guildId);
  return setModBoolean(guildId, key, !current.booleans[key]);
}

export async function setModNumber(
  guildId: string,
  key: string,
  value: number
): Promise<number> {
  await store.update(async (state) => {
    const guild = state.guilds[guildId] ?? structuredClone(defaults);
    guild.numbers[key] = value;
    state.guilds[guildId] = guild;
    return state;
  });
  return value;
}

export async function setModText(
  guildId: string,
  key: string,
  value: string
): Promise<string> {
  await store.update(async (state) => {
    const guild = state.guilds[guildId] ?? structuredClone(defaults);
    guild.texts[key] = value;
    state.guilds[guildId] = guild;
    return state;
  });
  return value;
}
