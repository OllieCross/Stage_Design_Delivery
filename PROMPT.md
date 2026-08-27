# Prompt

Your task is to create a stage design delivery platform website and PWA for a production company called "White Production". The stage designer is going to upload various PDFs, images, 3D objects, and CSV tables, grouped by the project for the production manager and for the clients so they can view them and download them. The stage designer should be able log in, create/delete new events (event = group for files), and upload the files. Use modern frameworks and libraries prioritizing fast load times, smooth movements and low cpu usage.

The main feature of this platform is the ability to view and tour the 3D stage design from first person view and move around the stage with controls (on pc) or with gyroscope telemetry data (on Phone). Tell me which of these model formats is the best for this kind of implementation.

- DWG
- DXF
- GLB
- GLTF
- MVR

Is there also an option to export the project from Elation Capture 2026 with static DMX/lighting data so that the user can tour the stage with the beams/lights turned on ?

Ask as many question as possible about website layout, design, hierarchy, color scheme, features, context, usage, deployment, UX, UI and more.

## Requirements & Answers

### Users & access

There is only one stage designer, which is me, so a single admin account is sufficient. No other accounts are needed besides my admin editing account; sharing with the client happens via URL, for example `wp.olliecross.com/projects/rave-fusion-v2`. There will actually be only one client, the production manager, so there is no need to filter who sees what. Everybody with access to a project link can download everything in it.

### Content & hierarchy

Each event contains a flat file list grouped by file type, and these groups are themselves grouped by version. File versioning is required, as implied by the version-based grouping above. Uploads are capped at 50 MB per file. CSV tables do not need to be sortable, but they should be rendered nicely in the browser so they can be viewed properly. An event can contain multiple 3D models, not just one.

### 3D viewer UX

Movement in the 3D viewer should be a free-fly ghost mode with no collision. There should be some preset camera positions (for example front of house, stage, audience) that the user can jump to. On phones, the gyroscope controls pan and tilt while an on-screen touch joystick handles walking and moving around. No measure tool or annotations are needed in the 3D view.

### Design & layout

Styles, colors, and overall design direction should be pulled from empiremusic.sk, but not its fonts; all typography should be Helvetica. The site language is English only. The main design reference site is empiremusic.sk.

### Deployment & platform

The platform will be self-hosted on my Docker production server with S3-compatible storage for files. The domain is `wp.olliecross.com`, sitting behind a working traefik.io reverse proxy. Expected traffic is only a handful of visitors per event. The PWA aspect is needed only so that the production manager can bookmark the site on their home screen and open it without Chrome/Safari browser UI, giving a cleaner view; no offline capability is required.

### Stack

The proposed stack is approved: SvelteKit or Next.js with Three.js for the 3D viewer and S3-compatible object storage for files. The delivery format for 3D models is GLB, with MVR accepted as an upload/interchange format and converted server-side to GLB.

### Versioning model

A version is a whole-project revision, meaning each version contains a full snapshot of all file groups; the nesting is project, then version, then file-type groups. Each project has a single URL with a version switcher inside the page, so the production manager's bookmark never goes stale.

### Sharing & security

Project slugs are human-readable and guessable, for example `rave-fusion`; no unguessable tokens are needed. The whole site must send `noindex` so projects never appear in search engines. Admin login uses a passkey (WebAuthn) stored in my 1Password.

### Landing & structure

The root page at `wp.olliecross.com` shows a public list of all projects plus a login button for the admin. Deleting an event moves it to a trash with a 7-day retention period before permanent deletion.

### 3D pipeline & viewer scope

The MVR-to-GLB server conversion pipeline is skipped for simplicity; models are exported as GLB/glTF directly from Capture and uploaded as-is. Rendering lit beams from a static DMX snapshot is deferred to a later phase, after the basic tour works. Preset camera positions are defined per model in the admin UI using XYZ coordinate input fields. The user touring the model must be able to switch between a bird's view with free 3D movement and a person's view with 2D movement locked to a fixed eye height of 1.8 m.

### Infrastructure

The stack includes a MinIO container for S3-compatible storage and a PostgreSQL container for the database. Deployment is via Docker Compose on an x86 server, behind the existing traefik.io proxy.

### Final stack

The final choice is Next.js with Three.js. The whole project must be production ready and GitHub push ready, with linters, ignore files, and a proper folder structure.
