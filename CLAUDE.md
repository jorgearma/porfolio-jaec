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

- **`index.html`** — single-page, secciones numeradas como puertos de un escaneo nmap (`00/tcp` whoami, `01/tcp` Panchi-Bot case study, `02/tcp` Nordwind AD Lab, `03/tcp` herramientas de seguridad, `04/tcp` write-ups, `05/tcp` arsenal, `06/tcp` contacto). Cada cabecera lleva un `<p class="port">`; si añades una sección, renumera también la navegación de `.statusbar__right`. Toda la estructura está aquí; el resto solo le da estilo y vida.
- **`styles.css`** (~900 líneas) — "terminal editorial": CSS moderno con variables, grid, `clamp()`. Tipografías auto-alojadas en `assets/fonts/` (OFL): Redaction (titulares y texto, grados 0/35/70), Commit Mono (`--f-mono`) y Departure Mono (`--f-label`, rótulos pequeños a 11px). No hay preprocesador.
- **`main.js`** — vanilla JS, IIFE, sin dependencias. Cuatro bloques: (1) contador de uptime de sesión, (2) streamer de logs del hero con array `LOGS` hardcodeado, (3) scroll-reveal vía `IntersectionObserver` con selectores acoplados a clases de `index.html` (ver `targets` en `main.js:85`), (4) easter egg en `console.log`. Si renombras una clase revelable (`.feat`, `.proj`, `.whoami__card`, etc.), actualiza también `targets`.

### Docker / deploy

- `Dockerfile` copia **solo** `index.html styles.css main.js` a `/usr/share/nginx/html`. El directorio `assets/` está comentado — si añades imágenes/favicon, descomenta la línea `COPY assets ./assets` (`Dockerfile:19`).
- `docker-compose.yml` expone `127.0.0.1:8088:80` (solo loopback). La exposición pública la hace el nginx del host del VPS como reverse-proxy + Let's Encrypt. Detalles completos en `DEPLOY.md`.
- `nginx.conf` es la config **dentro del contenedor**, no la del host.
- Timezone del contenedor: `Europe/Madrid`.

## Placeholders pendientes

El enlace del CV en contacto (`jae-cv.pdf`) apunta a `#`: falta subir el PDF a `assets/`. No inventes copy técnico sobre los proyectos: usa solo lo que Jorge confirme.
