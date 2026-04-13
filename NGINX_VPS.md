# Nginx en el VPS — cómo funciona y cómo está configurado

## La idea fundamental: un portero para todo el tráfico

El VPS tiene **un solo nginx** instalado en el sistema operativo (no en Docker).
Este nginx escucha en los puertos públicos **80 y 443** y es el único proceso
que habla directamente con internet.

Cuando llega una petición, nginx mira el dominio (`Host` header) y la reenvía
al contenedor Docker correspondiente por un puerto interno de localhost.
Ese proceso se llama **reverse proxy**.

```
Internet (HTTPS)
       │
       ▼
┌─────────────────────────────────────┐
│        nginx del HOST               │  ← escucha 0.0.0.0:80 y :443
│                                     │  ← termina SSL aquí
│  panchibot.es  ──► 127.0.0.1:8081  │
│  jorgearmandoescobar.com ──► :8089  │
└─────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐    ┌──────────────────┐
│  contenedor │    │    contenedor    │
│  panchi-bot │    │    portfolio     │
│  puerto 80  │    │    puerto 80     │
│  (interno)  │    │    (interno)     │
└─────────────┘    └──────────────────┘
       │
       ▼
  gunicorn :5000
  (la app Python)
```

Los contenedores **no tienen puertos abiertos al exterior**.
Solo escuchan en `127.0.0.1` (loopback), invisible desde fuera del servidor.

---

## Cómo nginx gestiona múltiples dominios

Nginx usa el concepto de **server block** (equivalente a VirtualHost en Apache).
Cada dominio tiene su propio bloque con sus reglas.

### Estructura de archivos en Ubuntu/Debian

```
/etc/nginx/
├── nginx.conf                  ← config global, incluye lo de abajo
├── sites-available/            ← configs disponibles (archivos)
│   ├── panchibot.es
│   └── jae-portfolio
└── sites-enabled/              ← configs activas (symlinks a sites-available)
    ├── panchibot.es  ──► ../sites-available/panchibot.es
    └── jae-portfolio ──► ../sites-available/jae-portfolio
```

`nginx.conf` tiene esta línea que carga todo lo que haya en `sites-enabled/`:
```nginx
include /etc/nginx/sites-enabled/*;
```

Para activar un sitio:
```bash
ln -s /etc/nginx/sites-available/mi-sitio /etc/nginx/sites-enabled/mi-sitio
nginx -t && kill -HUP $(pgrep -f "nginx: master")
```

Para desactivarlo:
```bash
rm /etc/nginx/sites-enabled/mi-sitio
nginx -t && kill -HUP $(pgrep -f "nginx: master")
```

---

## Los server blocks actuales

### panchibot.es — `/etc/nginx/sites-available/panchibot.es`

```nginx
# Bloque 1: HTTP → redirige a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name panchibot.es www.panchibot.es;
    location / { return 301 https://$host$request_uri; }
}

# Bloque 2: HTTPS → proxy al contenedor en :8081
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name panchibot.es www.panchibot.es;

    # Certificados Let's Encrypt
    ssl_certificate     /etc/letsencrypt/live/panchibot.es/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panchibot.es/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Cabeceras de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options    "nosniff" always;
    add_header X-Frame-Options           "SAMEORIGIN" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection          "0" always;
    add_header Permissions-Policy        "geolocation=(), microphone=(), camera=()" always;

    # Proxy al contenedor Docker
    location / {
        proxy_pass         http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}
```

### jorgearmandoescobar.com — `/etc/nginx/sites-available/jae-portfolio`

```nginx
# Bloque 1: HTTP → redirige a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name jorgearmandoescobar.com www.jorgearmandoescobar.com;
    location / { return 301 https://$host$request_uri; }
}

# Bloque 2: HTTPS → proxy al contenedor en :8089
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name jorgearmandoescobar.com www.jorgearmandoescobar.com;

    ssl_certificate     /etc/letsencrypt/live/jorgearmandoescobar.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jorgearmandoescobar.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass         http://127.0.0.1:8089;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

---

## Los contenedores Docker

### panchi-bot — `/opt/panchi-bot/`

| Contenedor | Puerto interno | Puerto host | Qué hace |
|---|---|---|---|
| `panchi-bot-nginx-1` | 80 | `127.0.0.1:8081` | Recibe del host nginx, pasa a gunicorn |
| `panchi-bot-app-1` | 5000 | ninguno | Gunicorn (la app Flask) |
| `panchi-bot-redis-1` | 6379 | ninguno | Cola de tareas |
| `panchi-bot-sqlserver-1` | 1433 | ninguno | Base de datos |
| `panchi-bot-worker-*` | — | ninguno | Workers de cola |

El archivo `/opt/panchi-bot/nginx.prod.conf` ahora contiene solo un proxy HTTP
sin SSL (el SSL lo hace el host nginx):

```nginx
server {
    listen 80;
    server_name panchibot.es www.panchibot.es;

    location / {
        proxy_pass http://app:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 30s;
    }
}
```

### portfolio — `/opt/jae-portfolio/`

| Contenedor | Puerto interno | Puerto host | Qué hace |
|---|---|---|---|
| `jae-portfolio` | 80 | `127.0.0.1:8089` | Sirve los archivos estáticos |

---

## Flujo completo de una petición a panchibot.es

```
1. Usuario → https://panchibot.es/reserva
2. DNS resuelve panchibot.es → IP del VPS
3. TCP llega al VPS puerto 443
4. nginx del host:
   - termina TLS (descifra con el certificado de Let's Encrypt)
   - mira server_name: es panchibot.es
   - añade cabeceras de seguridad
   - reenvía por HTTP a 127.0.0.1:8081
5. nginx del contenedor panchi-bot:
   - recibe HTTP en su puerto 80 interno
   - pasa la petición a gunicorn en app:5000
   - incluye X-Forwarded-Proto: https para que Flask sepa que era HTTPS
6. Flask (gunicorn) procesa la petición y responde
7. La respuesta sube por el mismo camino hasta el navegador
```

---

## Comandos de mantenimiento

```bash
# Ver todos los contenedores
docker ps

# Reiniciar el nginx del host
kill -HUP $(pgrep -f "nginx: master")

# Verificar config del nginx del host
nginx -t

# Ver logs del nginx del host
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Añadir un nuevo dominio (plantilla)
nano /etc/nginx/sites-available/nuevo-dominio.com
ln -s /etc/nginx/sites-available/nuevo-dominio.com /etc/nginx/sites-enabled/nuevo-dominio.com
nginx -t && kill -HUP $(pgrep -f "nginx: master")

# Renovación de certificados (automática, pero para forzar manualmente)
certbot renew --dry-run
```

---

## Añadir un tercer proyecto en el futuro

1. Crea el contenedor con su app expuesta solo en `127.0.0.1:<puerto_libre>`
2. Apunta el DNS del nuevo dominio a la IP del VPS
3. Crea `/etc/nginx/sites-available/nuevo-dominio.com` con su server block
4. Actívalo con el symlink
5. Saca el certificado: `certbot --nginx -d nuevo-dominio.com`
6. Recarga nginx

No hay que tocar ninguno de los proyectos existentes.
