# content-engine

Sistema personal de generación de contenido de marketing: **Reels verticales (MP4) + guion + caption + hashtags**, listos para revisar y publicar en Instagram.

> 📖 **Guía paso a paso de uso:** [`GUIA.md`](./GUIA.md)

- **Video:** [Remotion](https://remotion.dev) — render local, determinista, gratis e ilimitado.
- **IA (texto):** OpenAI vía provider intercambiable (default `gpt-5.6-luna`). Genera ideas, guiones, storyboards y captions como JSON estricto validado con zod.
- **Todo local:** sin SaaS intermedios, sin instalaciones globales (pnpm), sin publicación automática.

```
info.md + assets ──► marketing ──► copywriter ──► video ──► Remotion ──► MP4
 (tu proyecto)       ideas          guion      storyboard            + caption
```

## Estructura

```
content-engine/
├── agents/                  # agentes especializados (rol + prompt + acción)
│   ├── marketing/           # ideas de contenido con score
│   ├── copywriter/          # guion (hook + pantallas + CTA) y caption
│   ├── video/               # storyboard normalizado + validación de assets
│   └── social-media/        # paquete de publicación (stub para Buffer)
├── config/                  # constantes: FPS, formatos, template ids, rutas
├── templates/               # design system compartido + 5 templates Remotion
│   ├── _shared/             # fuentes, fondos, escenas, transiciones, router
│   ├── portfolio-showcase/
│   ├── website-demo/
│   ├── problem-solution/
│   ├── case-study/
│   └── product-promo/
├── projects/<nombre>/       # UNA carpeta por proyecto de contenido
│   ├── info.md              # descripción, servicios, tono, CTA (fuente de verdad)
│   ├── assets/              # screenshots, logos, b-roll (input visual)
│   ├── scripts/             # guiones generados (.md)
│   ├── storyboards/         # storyboards ejecutables (.json)
│   ├── videos/              # MP4 finales
│   └── posts/               # caption + hashtags + checklist de revisión
├── src/
│   ├── ai/                  # TextProvider + providers/ (openai) + registry
│   ├── remotion/            # Root, ContentEngine (composición dinámica)
│   ├── project/             # carga info.md + assets
│   ├── render/              # bundle + renderMedia/renderStill
│   ├── pipeline/            # orquestador de 8 pasos
│   └── storyboard/          # schemas zod + cálculo de duraciones
├── scripts/                 # utilidades (crear proyecto, placeholders, test render)
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

Futuros proveedores ya previstos en `.env.example` (sin implementación): `ELEVENLABS_API_KEY` (voz), `PEXELS_API_KEY` / `PIXABAY_API_KEY` (stock gratis).

> ⚠️ Si tu clave alguna vez quedó expuesta (chat, screenshot, log), rotala en platform.openai.com.

## Uso

```bash
# generar 1 reel (ideas → guion → storyboard → render → caption)
pnpm generate portfolio

# generar 5 reels de una
pnpm generate portfolio --count 5

# otro formato
pnpm generate portfolio -f 1:1     # 9:16 (default) | 1:1 | 16:9

# capturas reales del sitio (puppeteer + Chrome de sistema, apaga el dev server solo)
pnpm assets:capture portfolio --dev ../lucas-portfolio --pages /es --clean
pnpm assets:capture portfolio --url https://hlucas.cloud --pages /es

# re-renderizar un contenido desde su storyboard (sin gastar tokens)
pnpm render portfolio reel-20260904-225222

# previsualizar/editar en Remotion Studio
pnpm studio

# utilidades
pnpm list
pnpm templates
pnpm test:render            # render de sanity con storyboard demo
```

Cada contenido genera 4 archivos en `projects/<nombre>/`:

```
scripts/reel-XXX.md        # guion legible (estado: pendiente de revisión)
storyboards/reel-XXX.json  # storyboard ejecutable
videos/reel-XXX.mp4        # H.264 1080×1920 30fps + AAC (válido para Instagram)
posts/reel-XXX.md          # caption + hashtags + checklist
```

## Agregar un proyecto

```bash
pnpm project:create <nombre>
```

1. Completá `projects/<nombre>/info.md` — secciones clave: Descripción, Servicios, Tecnologías, Propuesta de valor, Público objetivo, Tono, CTA, y la sección **`## Marca`** (colores reales, handle de IG, logo): esos valores se aplican **por encima de la IA**, siempre.
2. Poné tus assets reales en `assets/` (screenshots, logos). Capturas automáticas de un sitio web:
   ```bash
   pnpm assets:capture <nombre> --dev <ruta-al-sitio> --pages /es --clean
   ```
   O placeholders temporales con Remotion:
   ```bash
   pnpm assets:placeholders <nombre> [cantidad]   # screenshots placeholder
   ```
3. `pnpm generate <nombre>`

Los assets se copian automáticamente a `public/projects/<nombre>/` para que Remotion los sirva via `staticFile()`.

## Templates

5 templates (`templates/<id>/index.tsx`) montados sobre un design system compartido (`templates/_shared/`): fuentes Google (Space Grotesk + Inter), fondo animado con gradientes, progress bar, caption pill y escenas tipadas (hook, title, showcase, features, stats, text, cta). Las transiciones (slide / wipe / fade) se alternan automáticamente entre escenas.

El agente de video elige el template según la idea; el storyboard JSON referencia el template y las escenas, así que **podés cambiar el template o retocar texto y re-renderizar sin gastar tokens** (`pnpm render`).

## Proveedores

`src/ai/registry.ts` expone `getTextProvider()`. Para agregar otro proveedor (Anthropic, Gemini, local con Ollama): implementá la interfaz `TextProvider` en `src/ai/providers/` y registralo. El resto del sistema no cambia.

Interfaces ya definidas y listas para implementar cuando hagan falta:

- `VoiceProvider` — voiceover con ElevenLabs.
- `StockProvider` — clips/imágenes gratis de Pexels/Pixabay.
- `PublishProvider` — publicación vía Buffer (stub inerte en `agents/social-media/`; por diseño todo pasa por revisión manual).

## Costos

Con `gpt-5.6-luna` (~$1 / $6 por millón de tokens), cada contenido consume ~4 llamadas (ideas + guion + storyboard + caption) ≈ **$0.02–0.10**. El render de video es 100% local.

## Notas técnicas

- Remotion 4 trae su propio `ffmpeg/ffprobe` (en `node_modules/.pnpm/@remotion+compositor-*`); no hace falta ffmpeg del sistema.
- Render headless usa `gl: "swiftshader"`; las transiciones WebGL no funcionan en ese modo, por eso se usan transiciones CSS puras.
- El storyboard se valida en dos capas: schema estricto en el provider (reintentos con feedback de error) + `normalizeStoryboard` (clamp de duraciones, hook primero, CTA al final, assets verificados contra el proyecto).
