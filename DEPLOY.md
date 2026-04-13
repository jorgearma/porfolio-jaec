# Deploy · jae-portfolio

Guía corta para poner el portafolio en tu VPS Ubuntu + Docker + Nginx.

## 1 · Subir al VPS

```bash
# en tu máquina
rsync -avz --delete \
  ~/Desktop/porfolio/ \
  usuario@tu-vps:/opt/jae-portfolio/
```

## 2 · Build + run (en el VPS)

```bash
cd /opt/jae-portfolio
docker compose up -d --build
docker compose ps
curl -I http://127.0.0.1:8089/
```

El contenedor queda escuchando en `127.0.0.1:8088` (no expuesto al
exterior). El nginx del host hace de reverse-proxy delante.

## 3 · Reverse-proxy con el nginx del host

Crea `/etc/nginx/sites-available/jae-portfolio`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tudominio.com www.tudominio.com;

    # Let's Encrypt usa este path
    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tudominio.com www.tudominio.com;

    ssl_certificate     /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS (activar solo cuando confirmes que todo va por https)
    # add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

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

Activar:

```bash
sudo ln -s /etc/nginx/sites-available/jae-portfolio \
          /etc/nginx/sites-enabled/jae-portfolio
sudo nginx -t && sudo systemctl reload nginx
```

## 4 · TLS con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
sudo systemctl status certbot.timer   # auto-renew
```

## 5 · Actualizar

```bash
cd /opt/jae-portfolio
git pull                  # si lo tienes versionado
docker compose up -d --build
```

O, más rápido, si solo cambiaste html/css/js y no quieres rebuild:

```bash
docker cp index.html jae-portfolio:/usr/share/nginx/html/
docker cp styles.css jae-portfolio:/usr/share/nginx/html/
docker cp main.js    jae-portfolio:/usr/share/nginx/html/
```

## 6 · Logs y salud

```bash
docker compose logs -f --tail=100 portfolio
docker inspect --format='{{.State.Health.Status}}' jae-portfolio
```

## 7 · Rollback rápido

```bash
docker compose down
git checkout <commit-anterior>
docker compose up -d --build
```

---

## Notas

- El puerto `8089` es arbitrario; cámbialo si ya lo usas.
- Si prefieres saltarte el nginx del host, abre `80:80` / `443:443`
  directamente en `docker-compose.yml` y monta certificados.
- `HSTS` solo cuando esté 100% vivo por HTTPS — si no, te clavas.
