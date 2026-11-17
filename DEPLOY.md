# Deploy · jae-portfolio

## Arquitectura

```
Visitante ──HTTPS──► Cloudflare ──túnel──► contenedor jae-portfolio-tunnel (cloudflared, uid 65532)
                                              │  red tunnel_egress (con salida, solo hacia Cloudflare)
                                              │  red portfolio_internal (internal: true, 172.30.89.0/24)
                                              ▼  http://portfolio:8080
                                   contenedor jae-portfolio
                                   nginx sin root (uid 101) :8080 · sin salida · sin puertos en el host
```

- **HTTPS y HSTS** los pone Cloudflare. El VPS no abre 80 ni 443: UFW solo permite SSH.
- **cloudflared** corre en un contenedor del propio compose, sin root, con su **propio túnel**
  (el de los demás proyectos sigue en el host). El token va como Docker secret.
- **El portfolio no publica ningún puerto** y está en una red `internal`: no puede iniciar
  conexiones hacia Internet.
- **`nginx.conf`** del repo es la config del nginx **del contenedor**: cabeceras de seguridad, CSP,
  security.txt y IP real del visitante (`CF-Connecting-IP`, solo desde la subred `172.30.89.0/24`,
  que es la red interna donde está cloudflared).
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

## 2 · Túnel de Cloudflare (una vez)

Zero Trust → Networks → Tunnels → **Create a tunnel** (tipo Cloudflared), nombre `portfolio`.
Copiar el token y guardarlo en el VPS, dentro del directorio del proyecto:

```bash
mkdir -m 700 secrets
nano secrets/tunnel_token          # pegar SOLO el token, sin "cloudflared ... --token"
chmod 444 secrets/tunnel_token     # lo lee el uid 65532 del contenedor
git status --short                 # secrets/ NO debe aparecer (está en .gitignore)
```

Rutas del túnel `portfolio`:

```
jorgearmandoescobar.com      → http://portfolio:8080
www.jorgearmandoescobar.com  → http://portfolio:8080
```

(`portfolio` es el nombre del servicio en el compose; el DNS interno de Docker lo resuelve.)

## 3 · Subir y levantar

```bash
# en el VPS, dentro del directorio del proyecto
docker compose up -d --build
docker compose ps                         # los dos healthy tras ~30 s
docker compose logs cloudflared | grep -i 'registered tunnel connection'
```

## 4 · Comprobaciones

```bash
sudo ss -tlnp | grep 8089                 # nada: el portfolio no publica puertos
docker compose exec portfolio wget -q -T 5 -O /dev/null http://example.com; echo $?   # ≠ 0: sin salida
sudo ufw status verbose                   # deny incoming, solo 22
# Desde FUERA del VPS:
nmap -Pn -p 22,80,443,8089 <IP_PUBLICA_VPS>   # solo 22 open
curl -sI https://www.jorgearmandoescobar.com | grep -i content-security-policy
```

Pruebas de endurecimiento del contenedor: ver `DOCKER_SECURITY.md`.
