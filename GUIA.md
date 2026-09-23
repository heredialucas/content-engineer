# Guía de uso — de info.md a pieza publicada

## Opción sencilla: Content Studio web

Para generar una pieza sin usar la terminal:

1. Configurá `OPENAI_API_KEY`, `APP_PASSWORD` y `SESSION_SECRET` en `.env`.
2. Ejecutá `pnpm dev` y abrí `http://localhost:3000`.
3. Iniciá sesión y elegí Portafolio, Deco Atletas u otro proyecto.
4. Elegí **Imagen para post**, **Historia** o **Video corto**, describí la idea y, si querés, adjuntá una referencia.
5. Generá la pieza. Queda guardada y se puede volver a abrir o descargar desde **Mis creaciones**.

Para crear un proyecto nuevo usá **Proyectos → Nuevo proyecto**. Cada proyecto mantiene su propia descripción, tono e historial. La web genera imágenes con OpenAI; el video corto es una animación vertical de 8 segundos a partir de la imagen.

La app web está pensada como flujo de creación y biblioteca. Los pasos avanzados de aprobación, Buffer, métricas y edición de composiciones que siguen abajo son para el motor CLI.

Workflow completo para generar contenido real, revisarlo, medirlo y publicarlo. Cada pieza cuesta ≈ $0.02–0.08 en tokens; el render es local y gratis (re-render ilimitado sin tokens).

## Paso 0 — Proyecto (`projects/<nombre>/`)

**`info.md` es la fuente de verdad.** Todo lo que genere la IA sale de acá. Si un dato está mal o es inventado, la pieza lo va a mostrar.

Secciones recomendadas: Descripción, Servicios, Tecnologías, Propuesta de valor, Público objetivo, Tono, CTA.

### Sección `## Marca` (obligatoria)

Fija identidad visual y contacto **por encima de la IA** (el pipeline la aplica siempre, la IA no puede cambiarla):

```markdown
## Marca

- **Fondo:** #0A0A0C
- **Primario:** #FAFAFA
- **Acento:** #999D9E
- **Handle de Instagram:** @hlucasdev
- **Sitio:** https://hlucas.cloud
- **Logo:** projects/portfolio/assets/logo/logoHL-mark.png
```

- `Fondo/Primario/Acento`: hex exactos (tomalos del sitio real).
- `Handle`: aparece en el footer de las piezas, en el CTA y en los captions.
- `Logo`: ruta del archivo en `assets/` (ej: `projects/<nombre>/assets/logo/logoHL-mark.png`). Si falta, el footer usa la inicial del handle como fallback.
- Los specs viejos guardan la marca que tenían al crearse: si cambiás la sección, re-generá o editá el spec.

### Sección `## Venta` (recomendada)

Todo el contenido apunta a **venta**: hablarle al cliente futuro (su dolor, su beneficio, su objeción), no armar un CV. Con esta sección el creative-director tiene materia prima concreta:

```markdown
## Venta

- **Oferta:** desarrollo web de punta a punta (requisitos, diseño, código, deploy) con un único responsable técnico.
- **Dolores del cliente:** plataformas legacy que frenan el negocio, features trabadas, webs que no convierten, proyectos que mueren entre reuniones.
- **Resultados con prueba:** rescate de plataforma Python→React + GraphQL (Fundswin), módulo destrabado tras 6 meses, e-commerce operando digital-first (Punto Under).
- **Objeciones frecuentes:** "es caro", "mejor lo hago por partes", "ahora no puedo frenar para migrar".
- **Prueba social:** nombres reales de clientes y qué se entregó.
```

Sin esta sección el motor igual funciona, pero los insights de venta (`dolor-cliente`, `beneficio`, `objecion`, `oferta`) salen más genéricos.

## Paso 1 — Assets reales (`assets/`)

```
assets/
├── logo/logoHL-mark.png
├── projects/         # imágenes de proyectos (webp/jpg)
└── screenshots/      # capturas de sitio (desktop/mobile)
```

Las capturas se generan con puppeteer contra tu sitio:

```bash
pnpm assets:capture <nombre> --dev ../tu-sitio --pages /es --clean   # dev server local
pnpm assets:capture <nombre> --url https://tu-sitio.com --pages /es  # producción
```

Los assets se copian automáticamente a `public/projects/<nombre>/` para que Remotion los sirva via `staticFile()`.

> Los bloques `screen` usan assets reales. Si la IA pide uno que no existe, el pipeline lo reemplaza por un `statement` — nunca hay placeholders rotos.

## Paso 2 — Motor de ideas (`knowledge/`)

Antes de generar, alimentá el banco si querés:

```bash
pnpm knowledge:refresh     # lee las fuentes con ingest: true y suma hooks nuevos
```

- `knowledge/sources.json` — de dónde aprende (newsletters, cuentas, sitios). Poné `"ingest": true` en las que quieras releer.
- `knowledge/hooks.json` — hooks curados; el refresh agrega con dedupe automático.
- `knowledge/ideas.md` — tu banco manual: escribí ideas sueltas ahí y entran al pipeline.
- `src/knowledge/structures.ts` — 12 estructuras de hook disponibles para los briefs.

El historial también alimenta el motor: cada pieza guarda su estructura de hook y sus métricas (`pnpm feedback`), y las mejores piezas influyen en los próximos briefs.

## Paso 3 — Generar

```bash
pnpm generate-content <nombre>                    # 1 pieza, elige formato y red
pnpm generate-content <nombre> --count 4          # hasta 4 (valida lote sin repetir hooks)
pnpm generate-content <nombre> --format carousel  # reel | static | carousel | linkedin-post | x-post | thread
pnpm generate-content <nombre> --platform linkedin
pnpm generate-content <nombre> --aspect 1:1       # reel 9:16|1:1|16:9 · stills 4:5|1:1|16:9
```

Qué pasa internamente por cada pieza:

1. **creative-director** — analiza el proyecto + knowledge + historial → brief (idea, hook con su estructura, categoría, formato, red, assets a usar).
2. **composer** — convierte el brief en un spec de bloques (JSON validado).
3. **pipeline** — normaliza (trunca textos, repara assets faltantes, hook primero, CTA al final) y **renderiza** (Remotion, local).
4. **copywriter** — caption por plataforma + hashtags + checklist en `posts/<id>.md`.
5. Se registra en `history/history.json` y se sincroniza a `public/previews/`.

Outputs por pieza:

| Formato | Salida |
|---|---|
| reel | `videos/<id>.mp4` (H.264, 30fps, AAC) |
| static | `static/<id>/image.png` |
| carousel | `carousels/<id>/slides/slide-NN.png` + `manifest.json` |
| linkedin-post / x-post / thread | `posts/<id>.md` |

## Paso 4 — Revisar y retocar

Abrí la pieza y si algo no te gusta, **editá el spec y re-renderizá (gratis)**:

```bash
# 1. mirá el spec
open projects/<nombre>/pieces/<id>.json

# 2. cambiá textos, variantes, orden de bloques… (mismo schema)
#    ej: cambiá el texto del hook, sacá un bloque, cambiá "variant"

# 3. re-renderizá
pnpm render <nombre> <id>
```

También podés previsualizar/editar con feedback visual en Remotion Studio:

```bash
pnpm previews <nombre>   # sincroniza los specs a public/previews/
pnpm studio              # abre el Studio con las piezas reales
```

Reglas del normalizador (lo que la IA no puede romper):

- Máximo 2 bloques en stills 4:5 (hook + un bloque de contenido).
- Textos truncados a límites seguros por bloque (`fitStillBlock` / `fitBlock`).
- `screen` sin asset válido → se reemplaza por `statement`.
- Hook primero, CTA al final; carruseles 3–8 páginas.
- Marca, categoría y aspecto los fija el pipeline.
- CTA que repita el handle se limpia (no hay `@handle` duplicado).

## Paso 5 — Aprobar y publicar

```bash
pnpm list <nombre>                                # qué hay y en qué estado
pnpm approve-content <nombre> <id>                # draft → approved

# Publicar vía Buffer (requiere BUFFER_API_KEY + MEDIA_HOST configurados)
pnpm buffer:channels                              # lista orgs y canales conectados
pnpm publish-content <nombre> <id> --mode draft   # borrador en Buffer (revisar ahí)
pnpm publish-content <nombre> <id> --mode queue   # a la cola de Buffer
pnpm publish-content <nombre> <id> --mode at --at 2026-09-12T14:00:00Z
pnpm publish-content <nombre> <id> --mode now     # publica al instante
pnpm publish-content <nombre> <id> --channels instagram,linkedin   # limitar redes
```

La publicación usa la API GraphQL de Buffer. Como **Buffer no acepta subir archivos**, los assets se suben al host configurado (`MEDIA_HOST`; hoy Cloudinary) y se pasa la URL pública. El caption de cada red sale del `posts/<id>.md`. El resultado (id y estado de cada post) queda registrado en `history.json`; si una red falla, el resto sigue y se avisa en consola.

## Paso 6 — Medir (cierra el círculo)

Primero traé las métricas reales de Buffer (impresiones, likes, comentarios, shares):

```bash
pnpm buffer:metrics <nombre> <id>
```

Y sumá a mano lo que Buffer no ve (DMs y leads). Después de unos días de publicada la pieza:

```bash
pnpm feedback <nombre> <id> --views 4200 --likes 180 --comments 12 --dms 3 --leads 1
```

El score pondera lo que importa para venta: `views*0.001 + likes*0.5 + dms*10 + leads*40`. Con métricas cargadas, los próximos briefs priorizan lo que rindió y bloquean los hooks que ya se usaron (similitud ≥ 0.55 contra el historial).

## Diagnóstico rápido

| Síntoma | Causa probable | Solución |
|---|---|---|
| `OPENAI_API_KEY missing` | `.env` sin completar | `cp .env.example .env` y completala |
| La pieza sale con textos cortados | texto demasiado largo para el bloque | acortá el texto en `pieces/<id>.json` y re-renderizá |
| Una slide de carrusel repite contenido | spec viejo previo a un fix | editá el spec o regenerate |
| Quiero otra proporción | aspecto fijado en el spec | regenerate con `--aspect` o editá el spec |
| Hooks repetidos | historial limpio / knowledge vacío | corré `knowledge:refresh` y generá en lotes |

## Arquitectura (referencia rápida)

```
knowledge/ + history/ + info.md
        │
        ▼
agents/creative-director   →  briefs (idea + hookStructure + formato + red)
        ▼
agents/composer            →  spec de bloques (pieces/<id>.json)
        ▼
src/pipeline/generate.ts   →  normaliza + renderiza (src/render/) + caption (agents/copywriter)
        ▼
videos/ · static/ · carousels/ · posts/  +  history/  +  public/previews/
```

- `src/design/tokens.ts` — fuentes (Bebas Neue, Playfair Display, Inter), colores, easings, scales.
- `src/design/blocks.tsx` — los 7 bloques con variantes + chrome (footer, rail de páginas, eyebrow).
- `src/remotion/Pieces.tsx` — ReelPiece / StaticPiece / CarouselPiece.
- `src/specs/index.ts` — schemas zod (Block, PieceSpec, Brief).
- `src/history/index.ts` — anti-repetición + métricas.
