# Deploy · jae-portfolio

## Arquitectura

```
Visitante ──HTTPS──► Cloudflare ──túnel──► cloudflared (systemd, host)
                                                │ 127.0.0.1:8089
                                                ▼
                                   contenedor jae-portfolio
                                   nginx sin root (uid 101) :8080
```

- **HTTPS y HSTS** los pone Cloudflare. El VPS no abre 80 ni 443: UFW solo permite SSH.
- **cloudflared** corre en el host como servicio systemd y reenvía el dominio a `127.0.0.1:8089`.
- **El contenedor** publica el puerto solo en `127.0.0.1` (Docker se salta UFW, ver `DOCKER_SECURITY.md`).
- **`nginx.conf`** del repo es la config del nginx **del contenedor**: cabeceras de seguridad, CSP,
  security.txt y IP real del visitante (`CF-Connecting-IP`, solo desde la subred `172.30.89.0/24`).
- No hay nginx en el host para el portfolio.

## 1 · Preparar el host (una vez)

```bash
# Logs de nginx al host (los lee siege-map). Dueño = uid del nginx del contenedor.
sudo mkdir -p /var/log/web/portfolio
sudo chown -R 101:101 /var/log/web/portfolio
```

Rotación con logrotate del host, como el uid 101 (el contenedor puede crear symlinks
en ese directorio → nunca procesarlo como root):

```
/var/log/web/portfolio/*.log {
    su 101 101
    daily
    rotate 14
    compress
    missingok
    notifempty
    copytruncate
}
```

## 2 · Subir y levantar

```bash
# en el VPS, dentro del directorio del proyecto
docker compose up -d --build
docker compose ps                         # healthy tras ~30 s
curl -sI http://127.0.0.1:8089/ | grep -i content-security-policy
```

## 3 · Túnel de Cloudflare

En la configuración del túnel (panel de Cloudflare Zero Trust o `config.yml` de cloudflared),
la ruta del dominio apunta a:

```
jorgearmandoescobar.com      → http://127.0.0.1:8089
www.jorgearmandoescobar.com  → http://127.0.0.1:8089
```

## 4 · Comprobaciones

```bash
sudo ss -tlnp            # 8089 solo en 127.0.0.1; nada en :80 ni :443
sudo ufw status verbose  # deny incoming, solo 22
# Desde FUERA del VPS:
nmap -Pn -p 22,80,443,8089 <IP_PUBLICA_VPS>   # solo 22 open
```

Pruebas de endurecimiento del contenedor: ver `DOCKER_SECURITY.md`.
