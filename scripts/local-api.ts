import { createServer } from "node:http";
import { loadEnv } from "vite";
import type { VercelRequest, VercelResponse } from "../server/types";
Object.assign(process.env, loadEnv("development", process.cwd(), ""));
const routes = [
  "chat",
  "transcribe",
  "journeys",
  "events",
  "health-context",
  "nearby",
  "conversations",
  "privacy",
  "status",
];
createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost:3001");
  const name = url.pathname.replace("/api/", "");
  if (!routes.includes(name)) {
    res.writeHead(404);
    res.end();
    return;
  }
  let length = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 4400000) {
      res.writeHead(413);
      res.end(JSON.stringify({ error: { message: "Request too large." } }));
      return;
    }
    chunks.push(chunk);
  }
  const request = Object.assign(req, {
    query: Object.fromEntries(url.searchParams),
    body: Buffer.concat(chunks).toString() || undefined,
  });
  const response = Object.assign(res, {
    status(code: number) {
      res.statusCode = code;
      return response;
    },
    json(data: unknown) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return response;
    },
  });
  try {
    const module = await import(`../api/${name}.ts`);
    await module.default(
      request as VercelRequest,
      response as unknown as VercelResponse,
    );
  } catch {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: { message: "Local service could not complete the request." },
      }),
    );
  }
}).listen(3001, "127.0.0.1", () => console.log("LINC-33 local API ready"));
