import { JsonStore } from "../../lib/json-store.js";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  authorId?: string;
  createdAt: number;
}

interface AiMemoryState {
  conversations: Record<string, AiMessage[]>;
}

const store = new JsonStore<AiMemoryState>("ai-memory.json", {
  conversations: {}
});

const MAX_MESSAGES = 12;

export async function getConversation(scopeId: string): Promise<AiMessage[]> {
  const state = await store.read();
  return state.conversations[scopeId] ?? [];
}

export async function appendConversationMessage(
  scopeId: string,
  message: AiMessage
): Promise<AiMessage[]> {
  const state = await store.read();
  const conversation = state.conversations[scopeId] ?? [];
  conversation.push(message);
  state.conversations[scopeId] = conversation.slice(-MAX_MESSAGES);
  await store.write(state);
  return state.conversations[scopeId];
}

export async function clearConversation(scopeId: string): Promise<void> {
  const state = await store.read();
  delete state.conversations[scopeId];
  await store.write(state);
}
