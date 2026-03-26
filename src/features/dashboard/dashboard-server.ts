import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { env } from "../../config/env.js";
import type { BotClient } from "../../lib/bot-client.js";
import { buildDashboardSnapshot } from "./dashboard-service.js";

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}

function sendText(res: ServerResponse, statusCode: number, text: string): void {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(text);
}

function resolvePath(request: IncomingMessage): string {
  const host = request.headers.host ?? `127.0.0.1:${env.dashboardApiPort}`;
  return new URL(request.url ?? "/", `http://${host}`).pathname;
}

export function startDashboardServer(client: BotClient) {
  const server = createServer(async (request, response) => {
    const pathname = resolvePath(request);

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      response.end();
      return;
    }

    if (request.method !== "GET") {
      sendText(response, 405, "Method Not Allowed");
      return;
    }

    if (pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        botReady: client.isReady(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (pathname === "/api/dashboard") {
      const snapshot = await buildDashboardSnapshot(client);
      sendJson(response, 200, snapshot);
      return;
    }

    sendText(response, 404, "Not Found");
  });

  server.listen(env.dashboardApiPort, "0.0.0.0", () => {
    console.log(`Dashboard API disponible sur http://127.0.0.1:${env.dashboardApiPort}/api/dashboard`);
  });

  return server;
}
