# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Portafolio personal estático de Jorge Armando Escobar (backend / sistemas / ciberseguridad). Sin framework, sin build step, sin `node_modules`. Todo el sitio vive en **tres archivos**: `index.html`, `styles.css`, `main.js`. Se sirve con `nginx:1.27-alpine` dentro de Docker, detrás del nginx del VPS como reverse-proxy.

El idioma del contenido y de los comentarios es **español**. Mantén ese registro al editar copy o añadir comentarios.

## Comandos

```bash
# Dev local sin Docker (más rápido para iterar HTML/CSS/JS):
python3 -m http.server 8088      # → http://127.0.0.1:8088

# Dev local igual que producción:
docker compose up --build        # → http://127.0.0.1:8088

# Logs y salud del contenedor:
docker compose logs -f --tail=100 portfolio
docker inspect --format='{{.State.Health.Status}}' jae-portfolio

# Hot-swap en el VPS sin rebuild (solo si cambió html/css/js):
docker cp index.html jae-portfolio:/usr/share/nginx/html/
docker cp styles.css jae-portfolio:/usr/share/nginx/html/
docker cp main.js    jae-portfolio:/usr/share/nginx/html/
```

No hay tests, ni linter, ni typecheck. La verificación es visual en el navegador.

## Arquitectura

- **`index.html`** — single-page, secciones numeradas estilo dossier (§ 00 whoami, § 01 Panchi-Bot case study, § 02 otros sistemas, § 03 arsenal, § 04 contacto). Toda la estructura está aquí; el resto solo le da estilo y vida.
- **`styles.css`** (~900 líneas) — "terminal editorial": CSS moderno con variables, grid, `clamp()`. Tipografías Fraunces + JetBrains Mono desde Google Fonts. No hay preprocesador.
- **`main.js`** — vanilla JS, IIFE, sin dependencias. Cuatro bloques: (1) contador de uptime de sesión, (2) streamer de logs del hero con array `LOGS` hardcodeado, (3) scroll-reveal vía `IntersectionObserver` con selectores acoplados a clases de `index.html` (ver `targets` en `main.js:85`), (4) easter egg en `console.log`. Si renombras una clase revelable (`.feat`, `.proj`, `.whoami__card`, etc.), actualiza también `targets`.

### Docker / deploy

- `Dockerfile` copia **solo** `index.html styles.css main.js` a `/usr/share/nginx/html`. El directorio `assets/` está comentado — si añades imágenes/favicon, descomenta la línea `COPY assets ./assets` (`Dockerfile:19`).
- `docker-compose.yml` expone `127.0.0.1:8088:80` (solo loopback). La exposición pública la hace el nginx del host del VPS como reverse-proxy + Let's Encrypt. Detalles completos en `DEPLOY.md`.
- `nginx.conf` es la config **dentro del contenedor**, no la del host.
- Timezone del contenedor: `Europe/Madrid`.

## Placeholders pendientes

Hay datos de contacto provisionales en `index.html` y `main.js` que deben reemplazarse antes de publicar: `hola@ejemplo.com`, `github.com/tu-usuario`, `linkedin.com/in/tu-usuario`, `jae-cv.pdf`. Las descripciones de VPS Control y Cyber Toolkit son provisionales a la espera de detalles reales — no inventes copy técnico sobre esos proyectos.
