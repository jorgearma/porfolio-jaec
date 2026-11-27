# jae-portfolio

Portafolio de **Jorge Armando Escobar**, pentester junior (Active Directory
y web) con base en backend. En línea en
[jorgearmandoescobar.com](https://jorgearmandoescobar.com).

Construido a mano, sin frameworks ni build step, y desplegado en un VPS
propio con un contenedor endurecido según la OWASP Docker Security Cheat Sheet.

## Stack

| Capa        | Tecnología                                                  |
|-------------|-------------------------------------------------------------|
| Contenido   | HTML5 semántico                                             |
| Estilos     | CSS moderno (grid, variables, `clamp()`)                    |
| Interacción | Vanilla JS: scroll reveal, shell interactiva con reto (flag) |
| Tipografía  | Redaction + Commit Mono + Departure Mono (auto-alojadas)    |
| Runtime     | `nginx-unprivileged` (alpine, sin root, fijado por digest)  |
| Exposición  | Cloudflare Tunnel (cloudflared en el mismo compose)         |

Sin `node_modules`, sin bundler y sin framework: el sitio son tres archivos.

## Estructura

```
porfolio/
├── index.html           # una sola página, todas las secciones
├── styles.css           # estética de terminal editorial
├── main.js              # datos (write-ups, logs), shell interactiva, scroll reveal
├── assets/              # imágenes, CV (es/en), fuentes
├── Dockerfile           # nginx-unprivileged, uid 101, fijado por digest
├── docker-compose.yml   # portfolio + cloudflared, read-only, cap_drop ALL, red internal
├── nginx.conf           # config del nginx DENTRO del contenedor (cabeceras, CSP, security.txt)
├── DEPLOY.md            # despliegue en el VPS
├── DOCKER_SECURITY.md   # decisiones de hardening, regla a regla
├── SHELL.md             # cómo funciona la shell del hero (contiene la solución del reto)
├── scripts/             # auditoría Docker del VPS y generador de plantillas
└── .github/             # Dependabot + CI: hadolint, gitleaks, trivy y SBOM
```

## Desarrollo local

```bash
# opción 1: sin Docker, lo más rápido para iterar
python3 -m http.server 8088      # → http://127.0.0.1:8088

# opción 2: igual que en producción
docker compose up --build portfolio
```

## Despliegue

Visitante → Cloudflare (HTTPS + HSTS) → túnel → contenedor `cloudflared` →
red interna → contenedor `jae-portfolio` (nginx sin root, :8080).

El VPS no abre 80 ni 443 y el contenedor del portfolio no publica puertos
ni tiene salida a Internet. Detalles en [`DEPLOY.md`](./DEPLOY.md) y
[`DOCKER_SECURITY.md`](./DOCKER_SECURITY.md).

## Secciones

- **00/tcp · whoami**: perfil del candidato.
- **01/tcp · api-audit**: pentest de API a un cliente real (BOLA, BFLA, IA de pago expuesta), publicado anonimizado.
- **02/tcp · ad-lab**: Nordwind AD Lab, de cero credenciales a Domain Admin y DCSync.
- **03/tcp · panchi-bot**: bot de pedidos por WhatsApp con pagos, en producción.
- **04/tcp · herramientas**: Hardened Docker Deploy, Siege Map y Atalaya.
- **05/tcp · write-ups**: máquinas de Hack The Box.
- **06/tcp · arsenal**: herramientas y método.
- **07/tcp · contacto**.

## Licencia

Código del portafolio: MIT. Contenido (textos, imágenes, datos personales):
© 2026 Jorge Armando Escobar.
