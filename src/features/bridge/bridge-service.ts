import { JsonStore } from "../../lib/json-store.js";

interface BridgeConfig {
  channels: string[];
}

const store = new JsonStore<BridgeConfig>("bridge.json", { channels: [] });

export async function listBridgeChannels(): Promise<string[]> {
  const state = await store.read();
  return state.channels;
}

export async function addBridgeChannel(channelId: string): Promise<void> {
  const state = await store.read();
  if (!state.channels.includes(channelId)) {
    state.channels.push(channelId);
    await store.write(state);
  }
}

export async function removeBridgeChannel(channelId: string): Promise<void> {
  const state = await store.read();
  state.channels = state.channels.filter((id) => id !== channelId);
  await store.write(state);
}
