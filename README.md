# Content Studio

Estudio privado para crear y organizar contenido de **varios proyectos**. La app web permite generar una imagen para Instagram, una historia o un video vertical corto desde el celular. Los flujos avanzados de CLI siguen disponibles para reels, carruseles y publicaciones multiplataforma.

> 📖 **Guía paso a paso de uso:** [`GUIA.md`](./GUIA.md)

- **App web:** Next.js, responsive y con acceso privado por contraseña.
- **Creación rápida:** OpenAI genera una imagen o historia; el video corto anima la imagen con Remotion. Los resultados se guardan dentro del proyecto activo.
- **Motor avanzado:** Remotion, agentes de texto, carruseles, captions, Buffer, historial y CLI quedan disponibles para los flujos que los necesiten.
- **Motor de ideas:** banco de hooks curado (`knowledge/hooks.json`) + ángulos + estructuras de hook + ideas manuales + feedback de resultados. Se actualiza con `pnpm knowledge:refresh` (lee fuentes de la web) y con las métricas que cargás por pieza.
- **Persistencia:** proyectos y creaciones quedan en `projects/` localmente y en un volumen persistente del VPS.

## Content Studio web

```bash
pnpm install --frozen-lockfile
cp .env.example .env
# Completá OPENAI_API_KEY, APP_PASSWORD y SESSION_SECRET en .env
pnpm dev
```

Abrí `http://localhost:3000`. Elegí un proyecto, un formato y describí la idea. Las opciones de la primera versión son imagen para post (4:5), historia (9:16) y video animado de 8 segundos (9:16). Una foto de referencia es opcional. Las imágenes generadas se guardan en la biblioteca del proyecto.

La app es privada: `APP_PASSWORD` protege el acceso y `SESSION_SECRET` firma la sesión. Generá un secreto local con `openssl rand -hex 32`. No publiques `.env` ni copies secretos a componentes cliente.

## Despliegue en VPS

El despliegue está preparado con Docker Compose. Configurá `.env`, revisá [`deploy/DEPLOY.md`](./deploy/DEPLOY.md) y ejecutá:

```bash
docker compose up -d --build
```

La aplicación queda escuchando solo en `127.0.0.1:3170`; el proxy web existente debe enviar `ads.hlucas.cloud` a ese puerto. Los datos de proyectos viven en el volumen `studio-data` y sobreviven a recrear el contenedor.

```
knowledge (hooks/ángulos/ideas/feedback) ─┐
projects/<nombre>/info.md + assets ───────┼─► creative-director ─► composer ─► Remotion ─► piezas + captions
history (qué ya salió, cómo rindió) ──────┘   (insights + briefs)   (spec de bloques)           + historial
```

## Comando principal

```bash
pnpm generate-content portfolio --count 1
```

## Estructura

```
content-engine/
├── app/                      # UI móvil, login y API privada de proyectos/generación
├── deploy/                   # ejemplos para integrar el proxy existente
├── scripts/container-entrypoint.mjs # inicializa proyectos en el volumen persistente
├── agents/                  # agentes especializados (rol + prompt + acción)
│   ├── creative-director/   # insights del proyecto + briefs (idea + hookStructure + formato + red)
│   ├── composer/            # specs de bloques por formato (reel/static/carousel)
│   ├── copywriter/          # captions por plataforma + posts de texto (LinkedIn/X/thread)
│   └── _shared/             # reglas de naturalidad compartidas (es-AR)
├── knowledge/               # banco vivo: sources.json, hooks.json, angles.json, ideas.md
├── config/                  # FPS, formatos, content types, redes, content mix, rutas
├── projects/<nombre>/       # UNA carpeta por proyecto de contenido
│   ├── info.md              # descripción, servicios, tono, CTA, ## Marca (fuente de verdad)
│   ├── assets/              # screenshots + logo (input visual único)
│   ├── pieces/              # specs JSON de cada pieza (fuente de verdad para re-render)
│   ├── videos/  static/  carousels/  posts/   # outputs
│   └── history/             # history.json: piezas + estados + métricas
├── src/
│   ├── ai/                  # TextProvider + proveedores de texto e imágenes
│   ├── knowledge/           # estructuras de hook + loaders del banco + builders de prompt
│   ├── design/              # tokens + bloques (hook, statement, screen, metrics, steps, quote, cta)
│   ├── remotion/            # composiciones ReelPiece / StaticPiece / CarouselPiece + Studio
│   ├── specs/               # schemas zod v4 (Block + PieceSpec + Brief)
│   ├── pipeline/            # orquestador: briefs → spec → render → caption → historial
│   ├── render/              # bundle + renderMedia (reel) + renderStill (static/carousel)
│   ├── history/             # historial + anti-repetición + métricas
│   ├── previews/            # sync de piezas reales a public/previews/ (Studio)
│   ├── project/             # carga info.md + assets para el motor avanzado
│   └── server/              # autenticación y almacenamiento del estudio web
├── scripts/                 # crear proyecto, capturas, refresh knowledge, test render, sync previews
└── output/                  # artefactos de prueba (gitignored)
```

## Setup

```bash
pnpm install
cp .env.example .env     # y completá tu OPENAI_API_KEY
```

Variables (`.env`, nunca se commitea):

| Variable | Default | Descripción |
|---|---|---|
| `OPENAI_API_KEY` | — | requerida |
| `OPENAI_TEXT_MODEL` | `gpt-5.6-luna` | alternativas: `gpt-5.6-terra`, `gpt-5.6-sol` |
| `OPENAI_REASONING` | `low` | `none\|low\|medium\|high` |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-flare` | generación/edición de imágenes del Content Studio |
| `OPENAI_IMAGE_QUALITY` | `high` | `low\|medium\|high\|auto` |
| `APP_PASSWORD` | — | contraseña privada del estudio web |
| `SESSION_SECRET` | — | secreto aleatorio para firmar las sesiones web |
| `CONTENT_PROJECTS_DIR` | `./projects` | carpeta persistente de proyectos, opcional |

> ⚠️ Si tu clave alguna vez quedó expuesta (chat, screenshot, log), rotala en platform.openai.com.

## Uso

```bash
# sistema creativo completo: elige formato y red (mientras validamos: 1 pieza)
pnpm generate-content portfolio
pnpm generate-content portfolio --count 4 --platform instagram
pnpm generate-content portfolio --format carousel        # reel | static | carousel | linkedin-post | x-post | thread
pnpm generate-content portfolio --aspect 1:1             # reel 9:16|1:1|16:9 · stills 4:5|1:1|16:9

# re-renderizar una pieza desde su spec (sin gastar tokens)
pnpm render portfolio reel-20260907-182913-350
pnpm render portfolio carousel-20260907-183047-920

# feedback de una pieza publicada (alimenta el motor de ideas)
pnpm feedback portfolio reel-20260907-182913-350 --views 4200 --likes 180 --dms 3 --leads 1

# estado del historial
pnpm list portfolio
pnpm approve-content portfolio <piece-id>          # draft → approved

# publicar vía Buffer (requiere BUFFER_API_KEY y MEDIA_HOST)
pnpm buffer:channels                                # lista orgs y canales conectados
pnpm publish-content portfolio <piece-id> --mode draft             # borrador en Buffer
pnpm publish-content portfolio <piece-id> --mode queue             # a la cola
pnpm publish-content portfolio <piece-id> --mode at --at 2026-09-12T14:00:00Z
pnpm publish-content portfolio <piece-id> --mode now               # publica ya

# seguimiento: trae métricas de Buffer al historial
pnpm buffer:metrics portfolio <piece-id>

# motor de ideas
pnpm knowledge:refresh      # lee sources.json (ingest: true), extrae hooks nuevos, dedupe

# previsualizar/editar en Remotion Studio (piezas reales vía PiecePreview)
pnpm previews portfolio     # sincroniza specs a public/previews/
pnpm studio                 # abre el Studio

# capturas reales del sitio (puppeteer + Chrome de sistema)
pnpm assets:capture portfolio --dev ../lucas-portfolio --pages /es --clean

# utilidades
pnpm project:create <nombre>
pnpm test:render            # render de sanity con specs demo
```

Cada pieza genera su output en `projects/<nombre>/`:

```
pieces/<id>.json                          # spec de bloques (editá texto acá y re-renderizá)
videos/<id>.mp4                           # reel H.264 1080×1920 30fps + AAC
static/<id>/image.png                     # estático (4:5 · 1080×1350)
carousels/<id>/slides/slide-NN.png        # carrusel + manifest.json
posts/<id>.md                             # caption por plataforma + hashtags + checklist
```

## Piezas = bloques

Cada pieza es una lista de bloques con variantes — no hay templates fijos:

| Bloque | Variantes |
|---|---|
| `hook` | stack (Bebas gigante) · serif (Playfair) · split (dos mitades) |
| `statement` | left (barra) · editorial · center (serif) |
| `screen` | browser (chrome de navegador) · framed (imagen con borde) |
| `metrics` | rows (label↔value) · center (value gigante) |
| `steps` | numbered (lista numerada) |
| `quote` | serif italic · center serif |
| `cta` | pill (botón) · minimal (serif + handle) |

El composer (IA) elige bloques y escribe el contenido; el pipeline inyecta marca, categoría y aspecto, normaliza (textos truncados a límites seguros, screens sin asset válido → statement, hook primero, CTA al final) y renderiza. **Para retocar una pieza: editá `pieces/<id>.json` y `pnpm render`.**

## Motor de ideas

- `knowledge/hooks.json` — banco de hooks (fuente + texto + tema). `pnpm knowledge:refresh` lee las fuentes con `ingest: true`, extrae hooks nuevos y deduplica contra el banco y contra tu historial.
- `knowledge/ideas.md` — tu banco manual: anotá ideas sueltas ahí y el creative-director las considera.
- `src/knowledge/structures.ts` — 12 estructuras de hook (afirmación contraria, secreto de industria, resultado concreto…). El creative-director elige una por brief y no repite estructuras en el lote.
- Historial: cada pieza guardada registra estructura de hook y métricas. Con `pnpm feedback`, las piezas de mejor performance pesan más en los próximos briefs; hooks ya usados se bloquean (similitud ≥ 0.55).

## Proveedores

- **Texto:** `src/ai/registry.ts` expone `getTextProvider()` (OpenAI). Para agregar otro (Anthropic, Gemini, local): implementá la interfaz `TextProvider` en `src/ai/providers/` y registralo.
- **Imágenes IA:** `getImageProvider()` — GPT-Image-2.5, solo edita assets oficiales (`src/ai/image-provider.ts`).
- **Publicación:** Buffer (`src/publish/`). La API es GraphQL (`api.buffer.com`) y **no acepta subir archivos**: los assets se hostean y se pasa la URL pública (`MEDIA_HOST`, hoy Cloudinary). Ver `.env.example`.

## Costos

Con `gpt-5.6-luna`, cada pieza consume ~2 llamadas (briefs + spec/caption) ≈ **$0.02–0.08**. El render es 100% local y gratis; re-render ilimitado sin tokens.

## Notas técnicas

- Remotion 4 trae su propio `ffmpeg/ffprobe`; no hace falta ffmpeg del sistema.
- Render headless usa `gl: "swiftshader"`.
- La validación es en dos capas: schema estricto en el provider (reintentos con feedback de error) + normalizadores del pipeline (truncado, reparación de assets, orden de bloques).
- Los stills usan tipografía adaptativa (`textFit`) y máximo 2 bloques en 4:5 para no desbordar.
