# Guía de uso — de info.md a Reel publicado

Workflow completo para generar contenido real, revisarlo y publicarlo. ~5 minutos por reel, costo ≈ $0.02–0.10 en tokens.

## Paso 0 — Proyecto (`projects/<nombre>/`)

**`info.md` es la fuente de verdad.** Todo lo que genere la IA sale de acá. Si un dato está mal o es inventado, el reel lo va a mostrar.

Secciones recomendadas: Descripción, Servicios, Tecnologías, Propuesta de valor, Público objetivo, Tono, CTA.

### Sección `## Marca` (obligatoria)

Fija identidad visual y contacto **por encima de la IA** (el normalizador la aplica siempre, la IA no puede cambiarla):

```markdown
## Marca

- **Fondo:** #0A0A0C
- **Primario:** #FAFAFA
- **Acento:** #999D9E
- **Handle de Instagram:** @hlucasdev
- **Sitio:** https://hlucas.cloud
- **Logo:** projects/portfolio/assets/logo/logo.svg
```

- `Fondo/Primario/Acento`: hex exactos (tomalos del sitio real).
- `Handle`: aparece en el CTA, en la pantalla final y en el caption.
- `Logo`: ruta relativa a `projects/<nombre>/` del archivo en `assets/` (ej: `projects/<nombre>/assets/logo/logo.svg`). Si falta, el CTA usa la inicial del handle como fallback.
- Si cambiás estos valores, regenerate o re-renderizá: los storyboards viejos guardan la marca que tenían al crearse.

## Paso 1 — Assets reales (`assets/`)

```
assets/
├── logo/logo.svg          # logo real (ej: el favicon del sitio)
├── screenshots/           # capturas reales del producto/sitio
└── projects/              # fotos y capturas de proyectos concretos
```

### Capturas automáticas del sitio

```bash
# sitio en dev local
pnpm assets:capture portfolio --dev ../lucas-portfolio --pages /es --clean

# o sitio ya deployado
pnpm assets:capture portfolio --url https://hlucas.cloud --pages /es --clean
```

- Saca N screenshots desktop (1440×900 @2x) y N mobile (390×844 @3x) con scroll progresivo (para que entren las animaciones) y apaga el dev server al terminar.
- `--clean` borra las capturas viejas. `--desktop-only` / `--mobile-only` para limitar.
- El nombre queda `<slug>-<viewport>-N.png` (ej: `es-desktop-1.png`).
- En el reel, las escenas `showcase` (mockup de navegador) **siempre muestran un asset real**: si la IA no asigna uno, el normalizador asigna automáticamente del pool (desktop primero, rotando para no repetir).

Imágenes puntuales (foto de perfil, capturas de un proyecto): copialas a mano a `assets/` con nombres claros (`projects/finna.webp`).

## Paso 2 — Generar

```bash
pnpm generate portfolio             # 1 reel
pnpm generate portfolio --count 2   # 2 reels (varían la idea)
pnpm generate portfolio -f 1:1      # 9:16 | 1:1 | 16:9
```

Pipeline (8 pasos): lee info.md + assets → 6 ideas, elige la mejor → guion → storyboard → valida + copia assets → guarda → renderiza MP4 → caption + hashtags.

Salida por reel, en `projects/<nombre>/`:

| Archivo | Qué es |
|---|---|
| `videos/reel-XXX.mp4` | H.264 1080×1920 30fps + AAC (silencioso) |
| `scripts/reel-XXX.md` | guion legible (revisalo: es la verdad del video) |
| `storyboards/reel-XXX.json` | storyboard ejecutable |
| `posts/reel-XXX.md` | caption + hashtags + checklist para publicar |

## Paso 3 — Revisar

1. **Mirá el MP4 completo** (QuickTime o `pnpm studio` para frame a frame).
2. **Leé `scripts/reel-XXX.md`**: verificá que cada dato (nombres, métricas, empresas) sea real. Si algo está inventado, corregí `info.md` y regenerate.
3. **Leé `posts/reel-XXX.md`**: el caption tiene que sonar como vos.

### Retoques sin gastar tokens

Editá `storyboards/reel-XXX.json` (textos, duraciones, colores, asset de una escena) y re-renderizá gratis:

```bash
pnpm render portfolio reel-XXX
```

Estructura mínima de una escena:

```json
{ "id": "mi-escena", "type": "showcase", "durationInSeconds": 4,
  "eyebrow": "02 / DELIVERY", "text": "Después: deploys confiables",
  "asset": "projects/portfolio/assets/screenshots/es-desktop-1.png",
  "caption": "Cambios validados de punta a punta." }
```

`type`: `hook` | `title` | `showcase` | `features` | `stats` | `text` | `cta`. La primera escena debe ser `hook` y la última `cta`. `asset` es la ruta completa dentro de `public/` (formato `projects/<nombre>/assets/...`).

## Paso 4 — Publicar

En `posts/reel-XXX.md` tenés todo:

1. El MP4 sale **silencioso**: dentro de Instagram, al publicar, agregale un **audio trending** de la app (el caption se refiere a eso, no al audio del archivo).
2. Copiá el caption tal cual y los hashtags al final.
3. Marcá el estado en el post (`⏳ pendiente` → `✅ publicado <fecha>`).

No hay publicación automática: siempre pasás por revisión manual.

## Checklist rápido antes de publicar

- [ ] ¿Todos los datos del video son reales y actuales?
- [ ] ¿El screenshot del mockup es del sitio/producto real?
- [ ] ¿Los colores son los de tu marca (sección `## Marca`)?
- [ ] ¿El CTA apunta a tu contacto real (@hlucasdev)?
- [ ] ¿El caption cierra invitando al DM y menciona el sitio?
- [ ] ¿Le vas a agregar el audio trending en IG?
