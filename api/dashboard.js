const DEFAULT_DATA = {
  live: false,
  source: "demo",
  sourceUrl: null,
  updatedAt: new Date().toISOString(),
  bot: {
    name: "Nova",
    status: "Mode démonstration",
    prefix: "+",
    aiModel: "Ollama",
    aiStatus: "Démo",
    latencyMs: null,
    modules: ["Moderation", "Tickets", "IA", "Utilitaire", "Fun", "Bridge"],
  },
  stats: {
    guilds: 4,
    members: 12480,
    activeModules: 6,
    ticketsOpen: 12,
  },
  servers: [
    {
      id: "1482339195346358333",
      name: "Yuren",
      members: 1280,
      status: "Actif",
      support: "#support",
      color: "online",
      modules: ["Tickets", "Moderation", "IA"],
    },
    {
      id: "112233445566778899",
      name: "Nova Support",
      members: 840,
      status: "Actif",
      support: "#ticket-logs",
      color: "online",
      modules: ["Tickets", "Bridge", "Fun"],
    },
    {
      id: "223344556677889900",
      name: "Creator Hub",
      members: 2840,
      status: "Actif",
      support: "#help",
      color: "online",
      modules: ["Moderation", "Utilitaire", "IA"],
    },
    {
      id: "334455667788990011",
      name: "Community FR",
      members: 6520,
      status: "En attente",
      support: "#support",
      color: "idle",
      modules: ["Tickets", "Fun", "Bridge"],
    },
  ],
};

function json(response, statusCode = 200) {
  return new Response(JSON.stringify(response, null, 2), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeServer(server, index = 0) {
  if (!server || typeof server !== "object") {
    return null;
  }

  const modules = Array.isArray(server.modules)
    ? server.modules.map((module) => String(module)).filter(Boolean)
    : [];

  return {
    id: String(server.id ?? index),
    name: String(server.name ?? server.guildName ?? `Serveur ${index + 1}`),
    members: toNumber(server.members ?? server.memberCount ?? 0),
    status: String(server.status ?? server.state ?? "Actif"),
    support: String(server.support ?? server.channel ?? "#support"),
    color: String(server.color ?? (String(server.status ?? "").toLowerCase().includes("att") ? "idle" : "online")),
    modules,
  };
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    const servers = payload.map((server, index) => normalizeServer(server, index)).filter(Boolean);
    return {
      ...DEFAULT_DATA,
      live: true,
      source: "remote",
      updatedAt: new Date().toISOString(),
      stats: {
        guilds: servers.length,
        members: servers.reduce((sum, server) => sum + (server.members || 0), 0),
        activeModules: new Set(servers.flatMap((server) => server.modules)).size,
        ticketsOpen: DEFAULT_DATA.stats.ticketsOpen,
      },
      servers,
    };
  }

  if (!payload || typeof payload !== "object") {
    return DEFAULT_DATA;
  }

  const servers = Array.isArray(payload.servers)
    ? payload.servers.map((server, index) => normalizeServer(server, index)).filter(Boolean)
    : DEFAULT_DATA.servers;
  const bot = payload.bot && typeof payload.bot === "object" ? payload.bot : {};
  const stats = payload.stats && typeof payload.stats === "object" ? payload.stats : {};
  const modules = Array.isArray(bot.modules) && bot.modules.length ? bot.modules.map((module) => String(module)).filter(Boolean) : DEFAULT_DATA.bot.modules;
  const uniqueModules = new Set(servers.flatMap((server) => server.modules));

  return {
    live: payload.live !== false,
    source: String(payload.source ?? "remote"),
    sourceUrl: payload.sourceUrl ?? DEFAULT_DATA.sourceUrl,
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
    bot: {
      name: String(bot.name ?? DEFAULT_DATA.bot.name),
      status: String(bot.status ?? "En ligne"),
      prefix: String(bot.prefix ?? DEFAULT_DATA.bot.prefix),
      aiModel: String(bot.aiModel ?? DEFAULT_DATA.bot.aiModel),
      aiStatus: String(bot.aiStatus ?? DEFAULT_DATA.bot.aiStatus),
      latencyMs: bot.latencyMs == null ? null : toNumber(bot.latencyMs, null),
      modules,
    },
    stats: {
      guilds: toNumber(stats.guilds ?? servers.length, servers.length),
      members: toNumber(stats.members ?? servers.reduce((sum, server) => sum + (server.members || 0), 0)),
      activeModules: toNumber(stats.activeModules ?? uniqueModules.size, uniqueModules.size),
      ticketsOpen: toNumber(stats.ticketsOpen ?? DEFAULT_DATA.stats.ticketsOpen, DEFAULT_DATA.stats.ticketsOpen),
    },
    servers,
  };
}

async function readRemoteSource(sourceUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Source dashboard invalide: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(request) {
  const sourceUrl = process.env.DASHBOARD_SOURCE_URL?.trim();

  if (sourceUrl) {
    try {
      const payload = await readRemoteSource(sourceUrl);
      return json(normalizePayload(payload));
    } catch (error) {
      return json(
        {
          ...DEFAULT_DATA,
          live: false,
          source: "fallback",
          sourceUrl,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        },
        200
      );
    }
  }

  return json(DEFAULT_DATA);
}
