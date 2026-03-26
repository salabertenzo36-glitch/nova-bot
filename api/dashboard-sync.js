const SNAPSHOT_KEY = process.env.DASHBOARD_SNAPSHOT_KEY || "nova:dashboard:snapshot";

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

async function writeKvValue(key, value) {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!baseUrl || !token) {
    return false;
  }

  const response = await fetch(
    `${baseUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.ok;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-dashboard-secret",
    });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  const expectedSecret = process.env.DASHBOARD_SYNC_SECRET;
  if (expectedSecret && req.headers["x-dashboard-secret"] !== expectedSecret) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  let payload = "";
  for await (const chunk of req) {
    payload += chunk;
  }

  try {
    const parsed = JSON.parse(payload || "{}");
    const stored = await writeKvValue(SNAPSHOT_KEY, parsed);

    if (!stored) {
      sendJson(res, 503, {
        error: "KV not configured",
        hint: "Set KV_REST_API_URL and KV_REST_API_TOKEN on Vercel."
      });
      return;
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 400, {
      error: "Invalid JSON",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
