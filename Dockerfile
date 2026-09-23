FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fontconfig \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --uid 1001 app

WORKDIR /app
RUN chown app:app /app
COPY --chown=app:app package.json pnpm-lock.yaml ./
USER app
RUN pnpm install --frozen-lockfile --prod=false

COPY --chown=app:app . .
RUN pnpm build
RUN mkdir -p /app/data/projects

ENV CONTENT_PROJECTS_DIR=/app/data/projects
EXPOSE 3000
CMD ["node", "scripts/container-entrypoint.mjs"]
