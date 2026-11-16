# ─────────────────────────────────────────────────────────────
# jae-portfolio · web estática servida por nginx SIN root
# ─────────────────────────────────────────────────────────────
# nginx-unprivileged: imagen oficial de nginx preparada para correr
# como uid 101 (trae USER 101). PID y caché en /tmp, escucha en 8080
# (>1024, no necesita privilegios). OWASP Docker #2 "Set a user".
# Fijada por DIGEST (OWASP #9/#13): el tag 1.30-alpine puede moverse, el digest no.
# Dependabot (.github/dependabot.yml) abre PR cuando sale una versión nueva.
FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e

# Metadatos OCI: trazabilidad (de qué repo sale la imagen). Van en la imagen,
# no solo en el compose → se ven con docker inspect aunque se arranque a mano.
LABEL org.opencontainers.image.title="jae-portfolio" \
      org.opencontainers.image.description="Portfolio estático servido por nginx sin root" \
      org.opencontainers.image.source="https://github.com/jorgearma/porfolio-jaec" \
      org.opencontainers.image.base.name="nginxinc/nginx-unprivileged:1.30-alpine"

# Pasos de build que necesitan root → se sube a root SOLO aquí
USER root

# apk upgrade: la imagen base (1.30-alpine, 2026-10-19) trae CVEs HIGH/CRITICAL
#   con parche ya publicado en Alpine (musl, zlib, libexpat, brotli...). Trivy en CI.
# apk del curl: nginx no lo usa (el healthcheck es wget de busybox); menos
#   herramientas para un atacante que consiga ejecución.
# tzdata: copiar la zona y borrar el paquete (no queda en la imagen). Sin versión
#   fijada (DL3018) porque se instala y se elimina en la misma capa.
# hadolint ignore=DL3018
RUN apk upgrade --no-cache \
 && apk add --no-cache tzdata \
 && cp /usr/share/zoneinfo/Europe/Madrid /etc/localtime \
 && echo "Europe/Madrid" > /etc/timezone \
 && apk del --no-cache tzdata curl

# config y web: propiedad de root, solo LECTURA para nginx (uid 101).
# Si alguien compromete nginx, no puede reescribir la web ni su config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# La imagen base deja /etc/nginx con dueño nginx(101) y g+w → el 101 podía
# reemplazar default.conf o añadir .conf nuevos. Se devuelve a root sin escritura.
# (Refuerzo de read_only del compose, por si se arranca sin él.)
RUN chown -R root:root /etc/nginx \
 && chmod -R go-w /etc/nginx

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY index.html styles.css main.js ./
COPY assets ./assets

# Vuelta al usuario sin privilegios: el contenedor en marcha corre como 101.
# Explícito aunque la imagen base ya lo traiga (que se vea al leerlo).
USER 101

EXPOSE 8080

# 127.0.0.1 y NO localhost: en Alpine localhost resuelve a ::1 (IPv6) y
# nginx solo escucha en IPv4 → "Connection refused" → contenedor unhealthy.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
