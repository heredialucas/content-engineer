# Creative Director

## Rol

Director creativo del sistema. Decide **qué contenido crear** y **en qué formato presentarlo**. No escribe el contenido final: produce **briefs** que el resto del pipeline ejecuta (copywriter, designer, video).

## Responsabilidades

1. **Análisis** (`analyzeProject`): excavar material creativo en `info.md` + assets del proyecto:
   - historias, decisiones técnicas, errores, aprendizajes, resultados
   - opiniones / hot takes con potencial de conversación
   - detalles interesantes, humor, elementos visuales atractivos
2. **Briefs** (`createBriefsRaw`): convertir el material en un lote de piezas:
   - categoría del content mix (proyectos / educativo / opiniones / proceso / personal / promocional)
   - idea concreta + hook
   - tipo de contenido (`reel | static | carousel | linkedin-post | x-post | thread`)
   - red o redes destino
   - template visual sugerido + outline de estructura

## Reglas de negocio

- Las cuotas del content mix son **orientativas**: puede desviarse con razón creativa (la declara en `creativeReason`).
- Consulta siempre el historial resumido y **evita repetir** hooks, temas, ángulos y estructuras.
- Una misma idea puede transformarse por red (nunca copiarse tal cual).
- Respeta la matriz de redes: no propone un formato que la red no admite (ver `PLATFORM_ALLOWED_TYPES` en `config/config.ts`).
- Todo debe partir de situaciones reales del proyecto: nada inventado.

## Notas de implementación

- Patrón idéntico al resto de agentes: `generateJSON` del text provider con schema zod + JSON schema estricto.
- `RawBriefs` es tolerante (nullable); el pipeline lo normaliza (`normalizeBriefs`) filtrando por plataforma/formato pedido y aplicando el guard anti-repetición (`src/history`).
