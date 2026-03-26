import { readFile } from "node:fs/promises";
import path from "node:path";

import type { BotClient } from "../../lib/bot-client.js";
import { listBridgeChannels } from "../bridge/bridge-service.js";
import { getTicketPanel } from "../tickets/ticket-service.js";

export interface DashboardServerEntry {
  id: string;
  name: string;
  members: number;
  status: string;
  support: string;
  color: "online" | "idle" | "offline";
  modules: string[];
}

export interface DashboardSnapshot {
  live: boolean;
  source: string;
  sourceUrl: string | null;
  updatedAt: string;
  bot: {
    name: string;
    status: string;
    prefix: string;
    aiModel: string;
    aiStatus: string;
    latencyMs: number | null;
    modules: string[];
  };
  stats: {
    guilds: number;
    members: number;
    activeModules: number;
    ticketsOpen: number;
    bridgeChannels: number;
  };
  servers: DashboardServerEntry[];
}

interface FileState {
  guilds?: Record<string, unknown>;
  panels?: Record<string, unknown>;
  channels?: string[];
}

async function readJsonFile<T extends FileState>(filename: string): Promise<T | null> {
  const filepath = path.join(process.cwd(), "data", filename);
  try {
    const content = await readFile(filepath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniqueModules(modules: string[]): string[] {
  return [...new Set(modules.filter(Boolean))];
}

export async function buildDashboardSnapshot(client: BotClient): Promise<DashboardSnapshot> {
  const bridgeChannels = await listBridgeChannels();
  const ticketsState = await readJsonFile<{ panels?: Record<string, unknown> }>("tickets.json");

  const servers = await Promise.all(
    client.guilds.cache.map(async (guild) => {
      const guildTicketPanel = await getTicketPanel(guild.id);
      const guildBridgeChannels = bridgeChannels.filter((channelId) => guild.channels.cache.has(channelId));

      const modules = uniqueModules([
        guildTicketPanel ? "Tickets" : "",
        guildBridgeChannels.length ? "Bridge" : ""
      ]);

      const supportTarget = guildTicketPanel?.channelId ?? guildBridgeChannels[0];
      const supportChannel = supportTarget
        ? (() => {
            const channel = guild.channels.cache.get(supportTarget);
            if (channel && "name" in channel && typeof channel.name === "string") {
              return `#${channel.name}`;
            }
            return "#support";
          })()
        : "#support";

      const status = guildTicketPanel ? "Actif" : guildBridgeChannels.length ? "Connecté" : "En attente";
      const color = guildTicketPanel ? "online" : guildBridgeChannels.length ? "idle" : "offline";

      return {
        id: guild.id,
        name: guild.name,
        members: guild.memberCount ?? 0,
        status,
        support: supportChannel,
        color,
        modules
      } satisfies DashboardServerEntry;
    })
  );

  const members = servers.reduce((sum, server) => sum + toNumber(server.members), 0);
  const activeModules = uniqueModules(servers.flatMap((server) => server.modules)).length;
  const ticketPanels = Object.keys(ticketsState?.panels ?? {}).length;

  return {
    live: true,
    source: "bot-live",
    sourceUrl: null,
    updatedAt: new Date().toISOString(),
    bot: {
      name: client.user?.username ?? "Nova",
      status: client.user ? "Bot connecté" : "Bot hors ligne",
      prefix: "+",
      aiModel: process.env.OLLAMA_MODEL ?? "llama3.2:3b",
      aiStatus: "Active",
      latencyMs: client.ws.ping >= 0 ? Math.round(client.ws.ping) : null,
      modules: uniqueModules(["Tickets", "Bridge"])
    },
    stats: {
      guilds: client.guilds.cache.size,
      members,
      activeModules,
      ticketsOpen: ticketPanels,
      bridgeChannels: bridgeChannels.length
    },
    servers: servers
      .sort((left, right) => right.members - left.members)
      .map((server) => ({
        ...server,
        modules: uniqueModules(server.modules)
      }))
  };
}
