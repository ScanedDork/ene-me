#!/usr/bin/env node
// Minimal reference sync server for Ene me.
// Zero dependencies. Stores each user's AppState as a JSON file on disk.
//
// Usage:
//   node index.mjs
//   ENE_PORT=9000 ENE_TOKEN=mysecret ENE_DATA_DIR=./data node index.mjs
//
// Contract:
//   GET  /:path   -> 200 JSON | 404
//   PUT  /:path   -> 204 (body = JSON)
//   Auth: Authorization: Bearer <ENE_TOKEN>  (if ENE_TOKEN is set)
//
// CORS is open by default — lock it down in production.

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";

const PORT = Number(process.env.ENE_PORT || 8787);
const TOKEN = process.env.ENE_TOKEN || "";
const DATA_DIR = resolve(process.env.ENE_DATA_DIR || "./data");
const ORIGIN = process.env.ENE_ALLOW_ORIGIN || "*";

await mkdir(DATA_DIR, { recursive: true });

function safePath(rawPath) {
  // Strip query, leading slash, then normalize and reject traversal.
  const clean = decodeURIComponent(rawPath.split("?")[0]).replace(/^\/+/, "");
  if (!clean) return null;
  const normalized = normalize(clean).replace(/^[\\/]+/, "");
  if (normalized.startsWith("..") || normalized.includes(`..${sep}`)) return null;
  return join(DATA_DIR, `${normalized}.json`);
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

const server = createServer(async (req, res) => {
  cors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  if (TOKEN) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${TOKEN}`) {
      res.writeHead(401, { "Content-Type": "text/plain" }).end("Unauthorized");
      return;
    }
  }

  const filePath = safePath(req.url || "");
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain" }).end("Bad path");
    return;
  }

  try {
    if (req.method === "GET") {
      try {
        const body = await readFile(filePath, "utf8");
        res.writeHead(200, { "Content-Type": "application/json" }).end(body);
      } catch (err) {
        if (err.code === "ENOENT") {
          res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
        } else throw err;
      }
      return;
    }

    if (req.method === "PUT") {
      const chunks = [];
      let total = 0;
      for await (const c of req) {
        total += c.length;
        if (total > 10 * 1024 * 1024) {
          res.writeHead(413, { "Content-Type": "text/plain" }).end("Too large");
          return;
        }
        chunks.push(c);
      }
      const body = Buffer.concat(chunks).toString("utf8");
      try { JSON.parse(body); } catch {
        res.writeHead(400, { "Content-Type": "text/plain" }).end("Invalid JSON");
        return;
      }
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, body, "utf8");
      res.writeHead(204).end();
      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain" }).end("Method not allowed");
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain" }).end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`Ene me sync server listening on http://localhost:${PORT}`);
  console.log(`  data dir: ${DATA_DIR}`);
  console.log(`  auth:     ${TOKEN ? "bearer token enabled" : "OPEN (no token)"}`);
  console.log(`  CORS:     ${ORIGIN}`);
});
