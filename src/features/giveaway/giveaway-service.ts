import { JsonStore } from "../../lib/json-store.js";

export interface Giveaway {
  id: string;
  guildId: string;
  channelId: string;
  prize: string;
  winnerCount: number;
  endsAt: number;
  entrants: string[];
  messageId?: string;
}

interface GiveawayState {
  giveaways: Giveaway[];
}

const store = new JsonStore<GiveawayState>("giveaways.json", { giveaways: [] });

export async function listGiveaways(): Promise<Giveaway[]> {
  const state = await store.read();
  return state.giveaways;
}

export async function createGiveaway(giveaway: Giveaway): Promise<void> {
  const state = await store.read();
  state.giveaways.push(giveaway);
  await store.write(state);
}

export async function joinGiveaway(giveawayId: string, userId: string): Promise<boolean> {
  const state = await store.read();
  const giveaway = state.giveaways.find((entry) => entry.id === giveawayId);
  if (!giveaway) {
    return false;
  }

  if (!giveaway.entrants.includes(userId)) {
    giveaway.entrants.push(userId);
    await store.write(state);
  }

  return true;
}
