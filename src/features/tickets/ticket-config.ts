import { JsonStore } from "../../lib/json-store.js";

export interface TicketGuildConfig {
  booleans: Record<string, boolean>;
  numbers: Record<string, number>;
  texts: Record<string, string>;
}

interface TicketConfigState {
  guilds: Record<string, TicketGuildConfig>;
}

const defaults: TicketGuildConfig = {
  booleans: {},
  numbers: {},
  texts: {}
};

const store = new JsonStore<TicketConfigState>("ticket-config.json", {
  guilds: {}
});

export async function getTicketConfig(guildId: string): Promise<TicketGuildConfig> {
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

export async function setTicketBoolean(
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

export async function setTicketNumber(
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

export async function setTicketText(
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
