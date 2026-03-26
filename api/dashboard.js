const SNAPSHOT_KEY = process.env.DASHBOARD_SNAPSHOT_KEY || "nova:dashboard:snapshot";

const EMPTY_DATA = {
  live: false,
  source: "unconfigured",
  sourceUrl: null,
  updatedAt: new Date().toISOString(),
  bot: {
    name: "Nova",
    status: "Aucune source live configuree",
    prefix: "+",
    aiModel: "Ollama",
    aiStatus: "En attente",
    latencyMs: null,
    modules: [],
  },
  stats: {
    guilds: 0,
    members: 0,
    activeModules: 0,
    ticketsOpen: 0,
    bridgeChannels: 0,
  },
  servers: [],
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
    return EMPTY_DATA;
  }

  const servers = Array.isArray(payload.servers) ? payload.servers : EMPTY_DATA.servers;
  const bot = payload.bot && typeof payload.bot === "object" ? payload.bot : EMPTY_DATA.bot;
  const stats = payload.stats && typeof payload.stats === "object" ? payload.stats : EMPTY_DATA.stats;

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
      modules: Array.isArray(bot.modules) ? bot.modules : EMPTY_DATA.bot.modules,
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

  sendJson(res, 200, EMPTY_DATA);
}
