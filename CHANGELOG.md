# Changelog

All notable changes to White Production are documented here.

---

## v0.1.16 - 2026-09-01

### Added

- **Site footer**: every page now shows a footer with credits and links to the developer's Instagram, LinkedIn and GitHub, ported from the sfxproone PWA; hidden on the /login page

---

## v0.1.15 - 2026-08-27

### Changed

- **Drop "delivery" from copy**: removed the word "delivery" from the browser tab description and the PWA home-screen entry, matching the landing page subtitle

---

## v0.1.14 - 2026-08-27

### Added

- **Project settings panel**: admins can edit a project's name, slug, event date and hidden flag, plus rename versions inline; both validated server-side for required values and uniqueness; changing a slug warns that shared links will break
- **Event dates**: projects can carry an optional event date, shown as DD.MM.YYYY everywhere via a shared helper under the project title; projects without one read as "Concept"; dates are stored and formatted in UTC so the day cannot drift by timezone
- **Hidden projects**: admin-only projects are excluded from the public list and served 404 by the project page, the 3D tour, the PDF viewer, and the file download/raw/thumbnail endpoints; thumbnail caching is now private since a project can be hidden after its thumbnails were cached
- **Public list sorting**: the public project list can be sorted by date added, event date or name; the admin index shows total storage used, counted once per stored object so files shared by cloned versions are not double counted

### Changed

- **PDF default zoom**: PDFs now open at 75% instead of 100%

---

## v0.1.13 - 2026-08-27

### Fixed

- **MinIO/Postgres cross-stack collision**: the web container joins the shared `proxy` network for Traefik, and other stacks on that network publish containers aliased `minio` and `postgres`; Docker DNS resolved `minio` to a neighbouring stack's instance, so every upload failed with `InvalidAccessKeyId` against someone else's object store; fixed by giving both backing services `wp`-prefixed aliases on the internal network so a neighbouring container can never win the lookup

---

## v0.1.12 - 2026-08-27

### Added

- **HSTS**: strict-transport-security is now set in next.config rather than via Traefik's shared secHeaders middleware, whose permissions-policy (`camera=(self)`) would override the gyroscope grant the 3D tour needs on phones

---

## v0.1.11 - 2026-08-27

### Fixed

- **Traefik discovery**: the server's Traefik uses the docker provider bound to a network named `proxy`, not `traefik`, so the web container was never discoverable; the compose file now attaches to `proxy`

---

## v0.1.10 - 2026-08-27

### Changed

- **MVR beam rendering behind a feature flag**: lit beams and the lights panel are now gated on `NEXT_PUBLIC_ENABLE_BEAMS`, off by default, along with the fixture count shown on the project page; uploaded MVRs are still parsed and stored, so turning the flag on later needs a rebuild but no re-upload

---

## v0.1.9 - 2026-08-27

### Added

- **Lit beams from MVR lighting rigs**: MVR uploads are parsed server-side into fixture records, and the 3D tour renders their beams; fixtures are converted from MVR millimeters/Z-up into viewer meters/Y-up, and classified from their manufacturer/model name into beams, spots, washes, bars, strobes, blinders, lasers and effects (each with its own cone angle, throw, colour and brightness) since Capture's stub GDTF profiles carry no physical beam description; beams are batched into one instanced mesh per kind so rendering cost stays at one draw call per kind regardless of fixture count

---

## v0.1.8 - 2026-08-27

### Added

- **In-app PDF viewer**: PDFs open inside the app via a lazily loaded react-pdf viewer (self-hosted worker, zoom controls, continuous page scroll) instead of a `target=_blank` link that broke out of the PWA into a browser window, fixing poor embedded-PDF rendering on iOS
- **50 MB upload limit**: raised the upload cap from 20 MB to 50 MB, consolidating three copies of the constant into a single `MAX_FILE_SIZE` in `lib/files` shared by the client check and the upload route

---

## v0.1.7 - 2026-08-27

### Added

- **Security headers**: nosniff, DENY framing, referrer policy, noindex, and a permissions policy that keeps gyroscope for the tour
- **Rate limiting**: in-memory rate limiting on all auth endpoints
- **Migration on deploy**: a one-shot migrate service runs `prisma migrate deploy` before the app starts
- **CI**: GitHub Actions running format, lint, typecheck and build on every push
- **Docs**: README setup and deployment notes; Prisma config no longer needs a database URL at image build time

---

## v0.1.6 - 2026-08-27

### Added

- **PWA manifest and icons**: web app manifest with standalone display, generated app icons (192/512/maskable/apple-touch), Apple web-app metadata and theme color for a chromeless home-screen experience
- **Error and loading states**: not-found, error, and loading states styled to match the site

---

## v0.1.5 - 2026-08-27

### Added

- **Mobile 3D viewer controls**: gyroscope look with iOS permission prompt, one-finger drag-look fallback, on-screen touch joystick for walking, automatic touch detection that swaps pointer-lock for mobile controls, and a reduced pixel-ratio cap on touch devices

---

## v0.1.4 - 2026-08-27

### Added

- **First-person 3D stage viewer**: lazy-loaded Three.js viewer via react-three-fiber and drei, with GLB loading via self-hosted Draco/meshopt decoders, pointer-lock mouse look, WASD movement with sprint, bird (free-fly) and person (1.8 m eye height) modes, camera preset jump buttons, a load progress overlay, capped pixel ratio, and neutral stage lighting

---

## v0.1.3 - 2026-08-27

### Added

- **Public project pages**: landing page with a public project list and login button; project page with version switcher, 3D model cards, PDF view/download list, an image gallery with sharp-backed thumbnails and a keyboard-driven lightbox, server-rendered CSV tables, and downloads for every file type; robots.txt disallow plus noindex metadata

---

## v0.1.2 - 2026-08-27

### Added

- **Admin content management**: server actions for project/version/file/preset CRUD with trash and restore; an upload endpoint streaming multipart files into MinIO (20 MB cap, type detection); public download/raw streaming routes; version cloning that shares S3 objects until unreferenced; hourly trash purge; an admin UI with drag-and-drop uploads, version cards grouped by file type, and an XYZ camera preset editor

---

## v0.1.1 - 2026-08-27

### Added

- **Passkey authentication**: WebAuthn login for admins via SimpleWebAuthn, with signed HMAC session and challenge cookies, a one-time `SETUP_TOKEN`-guarded passkey enrollment page at /setup, a login page, a logout route, and /admin gated by a server-side session check

---

## v0.1.0 - 2026-08-27

### Added

- **Project scaffold**: Next.js (App Router, TypeScript, Tailwind) with ESLint, Prettier and strict typecheck; multi-stage Dockerfile with standalone output; production Docker Compose (web + Postgres 17 + MinIO with bucket init, Traefik labels) and a dev compose for backing services
- **Data model and storage layer**: Prisma 7 schema (Project, Version, File, CameraPreset, Credential) with an initial migration; a Postgres driver adapter client singleton; an S3/MinIO wrapper with presigned upload/download and prefix deletion; a seed script creating a demo project
