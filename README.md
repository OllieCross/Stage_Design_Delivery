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
that creates the bucket, a one-shot `migrate` that applies Prisma migrations before
the app starts, and two backup sidecars (see [Backups](#backups)). Postgres and MinIO
are on an internal network only; nothing but the web app is exposed through Traefik at
`wp.olliecross.com`.

### First-time setup

After the first deploy, open `https://wp.olliecross.com/setup`, enter the `SETUP_TOKEN`
from `.env`, and register your passkey (store it in 1Password). From then on, log in at
`/login`. Registration always requires either the setup token or an active admin session.

### Backups

Two sidecars back up nightly at 02:30 (server local time) to the Synology NAS over NFS
(share `/volume3/Homelab_Backups/white-production`; the NAS address is `NAS_HOST` in
`.env`). Each run overwrites the previous one:

- `postgres-backup`: `pg_dump` to `postgres.sql.gz`. A failed dump keeps the last good file.
- `minio-backup`: archive of the `minio_data` volume to `minio-backup.tar.gz`.

The NAS share's NFS rule must allow the Docker host read/write with squash "Map all
users to admin". The `white-production` folder must exist on the share before the first
`docker compose up`.

Back up right now:

```bash
docker compose exec minio-backup backup
docker compose exec postgres-backup sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h wp-postgres -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > /backups/postgres.sql.gz'
```

Restore Postgres into an empty database:
`gunzip -c postgres.sql.gz | docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB`.

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
