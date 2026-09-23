# Despliegue en `ads.hlucas.cloud`

El estudio corre como un contenedor Next.js en el VPS. No necesita una base de datos externa para la primera versión: el perfil de cada proyecto y su historial viven en un volumen persistente de Docker. Las claves de IA y la contraseña viven solo en `/opt/content-engine/.env`.

## 1. DNS

En el proveedor DNS, el subdominio debe tener un registro **A**:

| Tipo | Nombre | Contenido | TTL |
|---|---|---|---|
| A | `ads` | `187.77.253.222` | `300` |

No configures un CNAME para `ads` si el destino es una IP. Antes de seguir, `dig +short ads.hlucas.cloud A` debe mostrar `187.77.253.222`.

## 2. Acceso seguro al VPS

- Usá un usuario de despliegue no-root con clave SSH.
- No habilites ni uses acceso de `root` por contraseña.
- Mantené el secreto de sesión y la clave de OpenAI fuera de Git.
- Antes de cambiar el proxy, inspeccioná el servicio existente de `legajito` y los puertos 80/443. No detengas ni reemplaces servicios existentes.

## 3. Código y variables de entorno

Cloná el repositorio en `/opt/content-engine` usando una deploy key de solo lectura configurada en el VPS. Dentro del directorio:

```bash
cp .env.example .env
```

Completá en `.env`:

```dotenv
OPENAI_API_KEY=tu_clave_de_openai
OPENAI_IMAGE_MODEL=gpt-image-2.5-flare
OPENAI_IMAGE_QUALITY=high
APP_PASSWORD=una_contrasena_larga_y_unica
SESSION_SECRET=un_secreto_aleatorio_de_al_menos_32_bytes
```

Generá `SESSION_SECRET` con `openssl rand -hex 32`. Nunca incluyas los valores reales en comandos compartidos, tickets, Git o logs.

## 4. Construir y levantar la app

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 content-studio
curl --fail http://127.0.0.1:3170/api/health
```

El contenedor solo publica `127.0.0.1:3170` en el host. La primera ejecución copia los proyectos iniciales al volumen `studio-data`; las siguientes actualizaciones conservan proyectos e imágenes ya generados.

## 5. Integrar el proxy HTTPS existente

No se expone el contenedor directamente a Internet y no se reasignan los puertos 80/443 desde Docker. Agregá el bloque del proxy que ya existe:

- Caddy: adaptar [`Caddyfile.example`](./Caddyfile.example), que dirige `ads.hlucas.cloud` a `127.0.0.1:3170` y gestiona HTTPS.
- Nginx: crear un `server_name ads.hlucas.cloud` con `proxy_pass http://127.0.0.1:3170`, configurar `Host`, `X-Forwarded-For`, `X-Forwarded-Proto` y un `proxy_read_timeout` de 300 segundos. Emitir/adjuntar el certificado TLS con el mecanismo que ya use el VPS.

Probá la configuración antes de recargarla (`nginx -t` para Nginx o `caddy validate` para Caddy). Una vez recargada, verificá `https://ads.hlucas.cloud/api/health` y probá iniciar sesión desde el teléfono.

## 6. Actualizar y respaldar

Antes de cada actualización, respaldá `/opt/content-engine/.env` y el volumen `studio-data`. Luego actualizá el código y reconstruí:

```bash
git pull --ff-only
docker compose up -d --build
docker compose ps
```

No borres el volumen al actualizar. Las imágenes y proyectos creados viven allí, fuera de la imagen del contenedor.
