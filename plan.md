# Development Plan: White Production Stage Design Delivery Platform

Target: `wp.olliecross.com`, self-hosted Docker Compose (x86) behind Traefik, Next.js + Three.js, PostgreSQL + MinIO.

---

## Stage 0: Project scaffolding & tooling

Goal: empty but production-grade repository that builds, lints, and runs in Docker.

- Initialize Next.js (App Router, TypeScript, strict mode).
- Tooling: ESLint, Prettier, `tsconfig` strict, `.gitignore`, `.dockerignore`, `.editorconfig`, `.env.example`.
- Folder structure:
  ```
  /src
    /app            # routes (App Router)
    /components     # shared UI
    /components/viewer  # 3D viewer components
    /lib            # db, s3, auth, utils
    /server         # server actions / API logic
  /prisma           # schema + migrations
  /public
  /docker           # compose files, Dockerfile
  ```
- Dockerfile (multi-stage, standalone Next.js output) and `docker-compose.yml` with services: `web`, `postgres`, `minio`; Traefik labels on `web`.
- Local dev compose override (`docker-compose.dev.yml`) with hot reload.

Deliverable: `docker compose up` serves a hello page through the full stack.

## Stage 1: Data model & storage layer

Goal: schema and file plumbing everything else builds on.

- Prisma schema:
  - `Project` (id, slug, name, createdAt, deletedAt for trash)
  - `Version` (id, projectId, label, createdAt), a whole-project revision
  - `File` (id, versionId, type: pdf | image | model | csv, name, s3Key, size, createdAt)
  - `CameraPreset` (id, fileId [model], name, x, y, z, yaw, pitch)
  - `Credential` (WebAuthn passkey storage)
- MinIO client wrapper in `/lib/s3.ts`: presigned upload, presigned/streamed download, delete.
- Migration workflow (`prisma migrate`) wired into container startup.

Deliverable: seed script creates a demo project with files in MinIO.

## Stage 2: Admin authentication (passkey)

Goal: single-admin login with WebAuthn, compatible with 1Password.

- `@simplewebauthn/server` + `@simplewebauthn/browser`.
- One-time registration route (guarded by env-var setup token) to enroll the passkey into 1Password.
- Session via signed httpOnly cookie; middleware protects all `/admin` routes.
- Logout, session expiry.

Deliverable: login with 1Password passkey, admin area gated.

## Stage 3: Admin area (CRUD + uploads)

Goal: full content management.

- Project list with create (name + slug), rename, delete (moves to trash).
- Trash view: restore or wait for purge; nightly cron (in-app or container cron) hard-deletes projects trashed more than 7 days ago, including S3 objects.
- Version management inside project: create new version (optionally clone previous version's files), delete version.
- File upload per version: drag-and-drop, multi-file, direct-to-MinIO via presigned URLs, 50 MB limit, type detection into groups (PDF / images / 3D models / CSV).
- Camera preset editor per model: list of presets with name + XYZ coordinate and yaw/pitch input fields.

Deliverable: full admin workflow from empty database to a shareable project.

## Stage 4: Public project pages & file viewers

Goal: what the production manager sees at `/projects/[slug]`.

- Landing page `/`: public project list + login button.
- Project page: version switcher (defaults to latest), files grouped by type within selected version, download buttons on everything.
- Viewers:
  - PDF: inline viewer (browser-native embed, fallback download).
  - Images: lightbox with thumbnails (server-generated via `sharp`).
  - CSV: parsed and rendered as a clean styled table (no sorting needed).
  - 3D models: card that opens the tour (Stage 5).
- `noindex` via `robots.txt` + meta on all pages.
- Design pass: colors/style direction from empiremusic.sk, Helvetica everywhere, English only.

Deliverable: shareable URL with all non-3D content viewable and downloadable.

## Stage 5: 3D viewer, desktop

Goal: the core feature on PC.

- Three.js via `three` + `@react-three/fiber` + `@react-three/drei`; GLB loading with Draco/meshopt support; lazy-loaded route chunk so the rest of the site stays light.
- Two movement modes with a toggle:
  - Bird's view: free-fly ghost (WASD + mouse look, vertical movement, no collision).
  - Person's view: 2D movement locked at 1.8 m eye height, mouse look.
- Preset camera positions from the database rendered as jump buttons.
- Performance: capped pixel ratio, on-demand/frameloop tuning for low CPU, tone-mapped neutral lighting for unlit-exported models.

Deliverable: smooth first-person tour of an uploaded GLB on desktop.

## Stage 6: 3D viewer, mobile

Goal: phone controls.

- Gyroscope (DeviceOrientation, with iOS permission prompt) drives pan/tilt.
- On-screen touch joystick drives walking/movement; works in both bird's and person's view.
- Touch fallback (drag to look) when gyro permission denied.
- Performance tuning for mobile GPUs (reduced pixel ratio, no shadows).

Deliverable: full tour usable on a phone held up and rotated.

## Stage 7: PWA & polish

Goal: clean standalone experience.

- Web app manifest: `display: standalone`, icons, theme color matching design; installable so the production manager gets a chromeless view from the home screen. No offline caching beyond default.
- Loading states, error pages, empty states, mobile layout pass, favicon/OG basics.
- Accessibility and keyboard pass on non-3D pages.

Deliverable: bookmark-to-homescreen opens the site without browser UI.

## Stage 8: Production hardening & deployment

Goal: GitHub push ready and live.

- Final `docker-compose.prod.yml`: Traefik labels for `wp.olliecross.com`, MinIO and Postgres on internal network only, volumes for data, restart policies, healthchecks.
- Env handling documented in `README.md` (setup, deploy, backup notes for Postgres + MinIO volumes).
- CI-friendly scripts: `lint`, `typecheck`, `build` npm scripts; optional GitHub Actions workflow running them.
- Security pass: upload validation, rate limiting on auth endpoints, security headers.

Deliverable: `git push`, `docker compose up -d` on the server, site live behind Traefik.

## Stage 9: Lit beams (done)

Fixture ingestion and beam rendering are implemented. Capture writes stub GDTF profiles (generic Dimmer channels, no <Beam> physical data), and MVR carries no DMX levels, so optics are derived from the fixture type and the look is set in the viewer.

- Workflow: the lighting rig is uploaded as an MVR export from Capture; fixtures are parsed server-side into the database.
- Fixture positions and aim come from the MVR matrices (converted from MVR millimeters, Z-up to viewer meters, Y-up); beams render as instanced additive cones, one draw call per fixture kind.

---

## Suggested order of work

Stages 0-8 are sequential; each ends in a working, demoable state. Stage 9 builds on Stage 5.
