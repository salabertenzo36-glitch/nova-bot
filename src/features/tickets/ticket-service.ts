import { JsonStore } from "../../lib/json-store.js";

export interface TicketPanelRef {
  channelId: string;
  messageId: string;
}

export interface TicketState {
  panels: Record<string, string | TicketPanelRef>;
}

const store = new JsonStore<TicketState>("tickets.json", { panels: {} });

export async function registerTicketPanel(
  guildId: string,
  channelId: string,
  messageId: string
): Promise<void> {
  await store.update(async (state) => {
    state.panels[guildId] = { channelId, messageId };
    return state;
  });
}

export async function getTicketPanel(guildId: string): Promise<TicketPanelRef | undefined> {
  const state = await store.read();
  const entry = state.panels[guildId];
  if (!entry) {
    return undefined;
  }
  if (typeof entry === "string") {
    return undefined;
  }
  return entry;
}
