# Ene me — reference sync server

A tiny zero-dependency Node server that implements the Ene me storage contract.

```bash
node index.mjs                                              # port 8787, no auth, ./data
ENE_PORT=9000 ENE_TOKEN=secret ENE_DATA_DIR=/var/ene node index.mjs
ENE_ALLOW_ORIGIN=https://my-ene.example.com node index.mjs  # lock CORS
```

Then in the app: **Storage → My server** with the matching URL, path, and token.

Run behind a real TLS proxy (Caddy, Nginx, Cloudflare Tunnel) in production. The
server is intentionally minimal — swap it for anything that honours the same
two-method contract documented in the project README.
