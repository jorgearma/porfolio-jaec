# ─────────────────────────────────────────────────────────────
# jae-portfolio · static build served by nginx:alpine
# ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# timezone + minimal tooling
RUN apk add --no-cache tzdata \
 && cp /usr/share/zoneinfo/Europe/Madrid /etc/localtime \
 && echo "Europe/Madrid" > /etc/timezone \
 && apk del tzdata

# nginx config (the container one — behind the host nginx, or direct)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# static assets
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY index.html styles.css main.js ./
COPY assets ./assets

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
