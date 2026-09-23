# AGENTS.md — Content Studio

## Goal

Keep this product small and reliable: a private, mobile-friendly workspace to create an Instagram post image, story image, or short motion video for one selected project at a time.

## Source of truth

- `DESIGN.md` — UI tokens and responsive interaction rules, based on Seguros VyB's design reference.
- `README.md` — local setup, environment, project structure and deployment.
- `projects/<id>/info.md` — brand and content context for that project.

Read the relevant source files and this guide before changing application behavior. Do not delete or rewrite project assets, histories, prompts, or existing CLI workflows just to simplify the web app.

## Working rules

1. Prefer the smallest change that completes the user's creation flow.
2. Keep project selection explicit and scope every generated file to that project.
3. Keep AI keys and session secrets server-side. Never put secrets in client components, logs, docs, committed media, or error responses.
4. Require a valid session for project, media and generation routes. Keep `/api/health` free of project data.
5. Validate user input, project ids, upload type/size, and resolved file paths at the server boundary.
6. Persist project files in `CONTENT_PROJECTS_DIR` when set; local development defaults to `projects/`.
7. Keep the UI responsive and follow `DESIGN.md`. Include keyboard focus, errors, loading, empty and success states.
8. Do not add public registration, multi-tenant billing, a database, publishing automation, or Meta Ads writes without a separate requirement.
9. Before removing code, prove it has no live imports, scripts, project references or documented use. Preserve users' generated content.
10. Never connect to the production VPS as root with a password. Deploy only through the provisioned non-root SSH key and inspect existing proxy/container services before changing them.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm exec tsc --noEmit
pnpm build
pnpm test:render
docker compose config
```

The production container listens on port 3000 internally and is bound to `127.0.0.1:3170` on the host. The existing proxy for `legajito` must be inspected before adding `ads.hlucas.cloud`; do not take over ports 80/443 blindly.
