// Pluggable storage backend for Ene me.
//
// Three modes:
//   - "memory":  in-memory only, cleared on reload. Maximum privacy.
//   - "local":   browser localStorage (default). Survives reloads, per-device.
//   - "server":  any HTTPS endpoint you control. Bring your own backend.
//
// The store API (src/lib/store.ts) reads and writes synchronously, so this
// layer keeps an in-memory cache that mirrors the chosen backend and
// flushes writes in the background (debounced for "server").
//
// Server contract (deliberately minimal — easy to self-host):
//   GET  ${baseUrl}/${path}          -> 200 application/json (the AppState blob)
//                                       or 404 if no state yet
//   PUT  ${baseUrl}/${path}          -> request body is AppState JSON, any 2xx is success
//   Headers: Authorization: Bearer ${token}  (only if token configured)
//
// A reference Node server lives in /server/ in the repo.

export type StorageMode = "memory" | "local" | "server";

export type StorageConfig = {
  mode: StorageMode;
  serverUrl: string;
  serverPath: string; // e.g. "state" or "users/me/state"
  serverToken: string; // optional bearer
};

const CFG_KEY = "ene-storage-config-v1";
const DATA_KEY = "recovery-app-state-v1"; // matches legacy key in store.ts
const CHANGE_EVENT = "ene-storage-change";

export const STORAGE_DEFAULTS: StorageConfig = {
  mode: "local",
  serverUrl: "",
  serverPath: "state",
  serverToken: "",
};

let memoryCache: string | null = null; // raw JSON string mirror
let initialized = false;
let pendingFlush: ReturnType<typeof setTimeout> | null = null;
let lastServerError: string | null = null;

export function getStorageConfig(): StorageConfig {
  if (typeof window === "undefined") return STORAGE_DEFAULTS;
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return STORAGE_DEFAULTS;
    return { ...STORAGE_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return STORAGE_DEFAULTS;
  }
}

export function saveStorageConfig(cfg: StorageConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  // Reset cache so the next read pulls from the new backend.
  initialized = false;
  memoryCache = null;
  window.dispatchEvent(new CustomEvent("ene-storage-config-change"));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getLastServerError() {
  return lastServerError;
}

function endpoint(cfg: StorageConfig): string {
  const base = cfg.serverUrl.replace(/\/+$/, "");
  const path = cfg.serverPath.replace(/^\/+/, "");
  return `${base}/${path}`;
}

async function serverFetch(cfg: StorageConfig): Promise<string | null> {
  try {
    const res = await fetch(endpoint(cfg), {
      method: "GET",
      headers: cfg.serverToken ? { Authorization: `Bearer ${cfg.serverToken}` } : {},
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      lastServerError = `GET ${res.status}`;
      return null;
    }
    lastServerError = null;
    return await res.text();
  } catch (e) {
    lastServerError = (e as Error).message;
    return null;
  }
}

async function serverPut(cfg: StorageConfig, body: string) {
  try {
    const res = await fetch(endpoint(cfg), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.serverToken ? { Authorization: `Bearer ${cfg.serverToken}` } : {}),
      },
      body,
    });
    if (!res.ok) {
      lastServerError = `PUT ${res.status}: ${(await res.text()).slice(0, 200)}`;
    } else {
      lastServerError = null;
    }
  } catch (e) {
    lastServerError = (e as Error).message;
  }
}

function loadInitial(cfg: StorageConfig): string | null {
  if (typeof window === "undefined") return null;
  switch (cfg.mode) {
    case "memory":
      return memoryCache;
    case "local":
      return localStorage.getItem(DATA_KEY);
    case "server": {
      // Sync read uses the localStorage mirror so the UI never blocks.
      // The remote pull happens once on init and overwrites the mirror
      // if newer data is found.
      return localStorage.getItem(DATA_KEY);
    }
  }
}

/** Called once per session to hydrate the server snapshot. Safe to call multiple times. */
export async function hydrate(): Promise<void> {
  const cfg = getStorageConfig();
  if (cfg.mode !== "server" || !cfg.serverUrl) return;
  const remote = await serverFetch(cfg);
  if (remote) {
    memoryCache = remote;
    localStorage.setItem(DATA_KEY, remote);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function readRaw(): string | null {
  const cfg = getStorageConfig();
  if (!initialized) {
    memoryCache = loadInitial(cfg);
    initialized = true;
    // Kick off a server hydrate in the background; UI gets the update via event.
    if (cfg.mode === "server" && cfg.serverUrl) {
      void hydrate();
    }
  }
  return memoryCache;
}

export function writeRaw(json: string) {
  const cfg = getStorageConfig();
  memoryCache = json;
  initialized = true;

  switch (cfg.mode) {
    case "memory":
      break;
    case "local":
      try { localStorage.setItem(DATA_KEY, json); } catch { /* quota */ }
      break;
    case "server":
      // Keep a local mirror so reads stay sync and the app works offline.
      try { localStorage.setItem(DATA_KEY, json); } catch { /* quota */ }
      if (cfg.serverUrl) {
        if (pendingFlush) clearTimeout(pendingFlush);
        pendingFlush = setTimeout(() => {
          pendingFlush = null;
          void serverPut(cfg, json);
        }, 600);
      }
      break;
  }

  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function onStorageChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export async function testServerConfig(cfg: StorageConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!cfg.serverUrl) return { ok: false, error: "Server URL is required" };
  try {
    const res = await fetch(endpoint(cfg), {
      method: "GET",
      headers: cfg.serverToken ? { Authorization: `Bearer ${cfg.serverToken}` } : {},
    });
    if (res.status === 404 || res.ok) return { ok: true };
    return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function eraseLocalData() {
  localStorage.removeItem(DATA_KEY);
  memoryCache = null;
  initialized = false;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}
