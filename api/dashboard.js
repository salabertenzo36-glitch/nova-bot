const SNAPSHOT_KEY = process.env.DASHBOARD_SNAPSHOT_KEY || "nova:dashboard:snapshot";

const DEMO_DATA = {
  live: false,
  source: "demo",
  sourceUrl: null,
  updatedAt: new Date().toISOString(),
  bot: {
    name: "Nova",
    status: "Mode demonstration",
    prefix: "+",
    aiModel: "Ollama",
    aiStatus: "Demo",
    latencyMs: null,
    modules: ["Moderation", "Tickets", "IA", "Utilitaire", "Fun", "Bridge"],
  },
  stats: {
    guilds: 4,
    members: 12480,
    activeModules: 6,
    ticketsOpen: 12,
    bridgeChannels: 2,
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

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

async function readKvValue(key) {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!baseUrl || !token) {
    return null;
  }

  const response = await fetch(`${baseUrl}/get/${encodeURIComponent(key)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  if (!payload || typeof payload.result !== "string") {
    return null;
  }

  try {
    return JSON.parse(payload.result);
  } catch {
    return null;
  }
}

async function readExternalSource() {
  const sourceUrl = process.env.DASHBOARD_SOURCE_URL;
  if (!sourceUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(sourceUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSnapshot(payload) {
  if (!payload || typeof payload !== "object") {
    return DEMO_DATA;
  }

  const servers = Array.isArray(payload.servers) ? payload.servers : DEMO_DATA.servers;
  const bot = payload.bot && typeof payload.bot === "object" ? payload.bot : DEMO_DATA.bot;
  const stats = payload.stats && typeof payload.stats === "object" ? payload.stats : DEMO_DATA.stats;

  return {
    live: payload.live !== false,
    source: String(payload.source || "remote"),
    sourceUrl: payload.sourceUrl || null,
    updatedAt: payload.updatedAt || new Date().toISOString(),
    bot: {
      name: String(bot.name || "Nova"),
      status: String(bot.status || "En ligne"),
      prefix: String(bot.prefix || "+"),
      aiModel: String(bot.aiModel || "Ollama"),
      aiStatus: String(bot.aiStatus || "Active"),
      latencyMs: bot.latencyMs == null ? null : Number(bot.latencyMs),
      modules: Array.isArray(bot.modules) ? bot.modules : DEMO_DATA.bot.modules,
    },
    stats: {
      guilds: Number(stats.guilds || servers.length),
      members: Number(stats.members || 0),
      activeModules: Number(stats.activeModules || 0),
      ticketsOpen: Number(stats.ticketsOpen || 0),
      bridgeChannels: Number(stats.bridgeChannels || 0),
    },
    servers,
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  const kvSnapshot = await readKvValue(SNAPSHOT_KEY);
  if (kvSnapshot) {
    sendJson(res, 200, normalizeSnapshot(kvSnapshot));
    return;
  }

  const external = await readExternalSource();
  if (external) {
    sendJson(res, 200, normalizeSnapshot(external));
    return;
  }

  sendJson(res, 200, DEMO_DATA);
}
