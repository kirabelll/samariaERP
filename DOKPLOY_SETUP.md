# Dokploy Deployment Setup — Samaria ERP (Nixpacks)

## Overview

Samaria ERP deploys on [Dokploy](https://dokploy.com) using **Nixpacks** as the build method.
Nixpacks auto-detects the Next.js framework, builds the standalone output, and creates a
production-ready container — no Dockerfile needed.

**Live URL**: https://app.samariaerp.org

---

## Architecture

```
Internet → Traefik (SSL/443) → Next.js App (Port 3000) → PostgreSQL DB
```

- **Traefik**: Managed by Dokploy. Handles SSL termination (Let's Encrypt) and routing.
- **Next.js App**: Built by Nixpacks. Runs on port 3000 inside the container.
- **PostgreSQL**: Separate service in Dokploy (or external DB like Neon).

---

## Prerequisites

1. **DNS** — `A` record for `app.samariaerp.org` pointing to your server IP (`167.235.197.55`)
2. **Dokploy** installed on the server (port 3000 for dashboard)
3. **PostgreSQL** — either a Dokploy database service or external (Neon, Supabase, etc.)

---

## Deployment Steps

### 1. Create Application in Dokploy

| Setting         | Value                        |
|-----------------|------------------------------|
| **Type**        | Application                  |
| **Build Type**  | Nixpacks                     |
| **Repository**  | Your Git repo URL            |
| **Branch**      | `main`                       |
| **Build Path**  | `.`                          |

### 2. Set Environment Variables

In Dokploy → Application → **Environment** tab:

```env
NODE_ENV=production
DATABASE_URL=postgresql://samaria:YOUR_PASSWORD@DB_HOST:5432/samaria_erp
NEXTAUTH_SECRET=samaria1995
NEXTAUTH_URL=https://app.samariaerp.org
NEXT_PUBLIC_APP_URL=https://app.samariaerp.org
HOSTNAME=0.0.0.0
PORT=3000
```

> **Note**: Replace `DB_HOST` with your actual database host.
> - If using a Dokploy PostgreSQL service, use the internal Docker network hostname.
> - If using Neon, use your Neon connection string.

### 3. Configure Domain

In Dokploy → Application → **Domains** tab:

| Setting               | Value                    |
|----------------------|--------------------------|
| **Host**             | `app.samariaerp.org`     |
| **Container Port**   | `3000`                   |
| **HTTPS**            | ✅ Enabled               |
| **Certificate Type** | Let's Encrypt            |

### 4. Deploy

Click **Deploy**. Dokploy will:
1. Clone your repo
2. Run Nixpacks build (installs deps → generates Prisma client → builds Next.js)
3. Create and start the container
4. Traefik routes `app.samariaerp.org` → container port 3000

---

## Key Files

| File               | Purpose                                                  |
|--------------------|----------------------------------------------------------|
| `nixpacks.toml`    | Nixpacks build config (install, build, start commands)   |
| `next.config.js`   | Next.js config with `output: 'standalone'`               |
| `package.json`     | Scripts — `build` includes `prisma generate`             |
| `dokploy.json`     | Dokploy metadata (optional, for reference)               |
| `Dockerfile`       | Still available for local Docker builds (ignored by Nixpacks) |
| `docker-compose.yml` | Still available for local Docker Compose (ignored by Nixpacks) |

---

## Build Pipeline (What Nixpacks Does)

Defined in `nixpacks.toml`:

```
1. Setup   → Node.js + OpenSSL
2. Install → npm install --legacy-peer-deps
3. Build   → prisma generate && next build
4. Start   → prisma migrate deploy && node .next/standalone/server.js
```

---

## Troubleshooting

### Build fails
- Check **Build Logs** in Dokploy dashboard
- Common: missing env vars, npm install failures
- Ensure `prisma/schema.prisma` is committed to Git

### App returns 502
- Container is starting or unhealthy
- Check **Runtime Logs** in Dokploy
- Verify `DATABASE_URL` is correct and DB is reachable

### Database connection error
- If using Dokploy DB: ensure both services are on the same Docker network
- If using Neon: ensure connection string includes `?sslmode=require`

### Health check
- Endpoint: `GET /api/health`
- Must return HTTP 200

---

## Verification Checklist

- [ ] DNS `A` record points to server IP
- [ ] Dokploy application created with Nixpacks build type
- [ ] Environment variables configured
- [ ] Domain configured with HTTPS (Let's Encrypt)
- [ ] Deployment succeeds (green status)
- [ ] https://app.samariaerp.org loads
- [ ] https://app.samariaerp.org/api/health returns 200
- [ ] Admin login works (`admin` / `admin123`)
- [ ] SSL certificate is valid