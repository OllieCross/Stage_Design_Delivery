# White Production - Stage Design Delivery Platform

Delivery platform and PWA for stage design projects: PDFs, images, CSV tables, and first-person
3D stage tours (GLB models), grouped by project and version. Single-admin (passkey login),
clients access projects via shared URLs.

**Stack:** Next.js (App Router, TypeScript) · Three.js · PostgreSQL · MinIO (S3) · Docker Compose · Traefik

## Local development

```bash
# 1. Backing services (Postgres on :5432, MinIO on :9000 / console :9001)
docker compose -f docker-compose.dev.yml up -d

# 2. Environment
cp .env.example .env   # then edit values for local dev

# 3. App
npm install
npm run dev            # http://localhost:3000
```

## Scripts

| Script                 | What it does        |
| ---------------------- | ------------------- |
| `npm run dev`          | Dev server          |
| `npm run build`        | Production build    |
| `npm run lint`         | ESLint              |
| `npm run typecheck`    | TypeScript, no emit |
| `npm run format`       | Prettier write      |
| `npm run format:check` | Prettier check (CI) |

## Production deployment

Runs on a Docker host behind an existing Traefik proxy (external network named `proxy`,
entrypoint `websecure`, cert resolver `letsencrypt` - adjust labels in `docker-compose.yml`
if your Traefik setup differs).

```bash
cp .env.example .env   # fill in real secrets
docker compose up -d --build
```

Services: `web` (Next.js standalone), `postgres` (17), `minio`, a one-shot `minio-init`
that creates the bucket, and a one-shot `migrate` that applies Prisma migrations before
the app starts. Postgres and MinIO are on an internal network only; nothing but the
web app is exposed through Traefik at `wp.olliecross.com`.

### First-time setup

After the first deploy, open `https://wp.olliecross.com/setup`, enter the `SETUP_TOKEN`
from `.env`, and register your passkey (store it in 1Password). From then on, log in at
`/login`. Registration always requires either the setup token or an active admin session.

### Backups

Back up the `pg_data` and `minio_data` volumes. For Postgres, prefer
`docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`.

## Project structure

```text
src/
  app/                # routes (App Router)
  components/         # shared UI
    viewer/           # 3D viewer components
  lib/                # db, s3, auth, utils
  server/             # server actions / API logic
docker/               # Dockerfile
prisma/               # schema + migrations (added in Stage 1)
```

See [plan.md](plan.md) for the development stages and [PROMPT.md](PROMPT.md) for full requirements.
