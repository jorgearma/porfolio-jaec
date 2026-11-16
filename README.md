# jae-portfolio

Portafolio personal de **Jorge Armando Escobar** — backend / sistemas /
ciberseguridad. Construido a mano, sin frameworks, servido con
`nginx:alpine` dentro de un contenedor Docker.

## Stack del portafolio

| Capa        | Tecnología                            |
|-------------|---------------------------------------|
| Contenido   | HTML5 semántico                       |
| Estilos     | CSS moderno (grid, variables, clamp)  |
| Interacción | Vanilla JS (IntersectionObserver)     |
| Tipografía  | Redaction + Commit Mono + Departure Mono (auto-alojadas) |
| Runtime     | `nginx:1.27-alpine`                   |
| Contenedor  | Docker + Docker Compose               |
| Proxy       | Nginx del VPS + Let's Encrypt         |

Sin build step. Sin `node_modules`. Sin bundler. Sin framework.
El dossier completo cabe en tres archivos y pesa menos que una
imagen de stock.

## Estructura

```
porfolio/
├── index.html          # una sola página, todas las secciones
├── styles.css          # terminal editorial · ≈ 900 líneas
├── main.js             # uptime, typed prompt, scroll reveal
├── Dockerfile          # nginx-unprivileged, sin root, fijado por digest
├── docker-compose.yml  # expone 127.0.0.1:8089, endurecido (OWASP)
├── nginx.conf          # config dentro del contenedor
├── .dockerignore
├── DEPLOY.md           # deploy en el VPS (Cloudflare Tunnel)
└── README.md
```

## Desarrollo local

```bash
# opción 1 — sin docker, un servidor estático de 30 líneas:
python3 -m http.server 8088
# → http://127.0.0.1:8088

# opción 2 — igual que en producción:
docker compose up --build
# → http://127.0.0.1:8089
```

## Deploy en el VPS

Cloudflare (HTTPS) → túnel → cloudflared → `127.0.0.1:8089` → contenedor.
Sin nginx en el host ni puertos web abiertos. Instrucciones en [`DEPLOY.md`](./DEPLOY.md).

## Secciones

- **00/tcp · whoami** — perfil técnico como archivo de dossier.
- **01/tcp · Panchi-Bot** — case study detallado del proyecto insignia:
  plataforma completa de operaciones para restaurante, WhatsApp
  provider-agnóstico (Twilio ⟷ Meta), arquitectura en capas,
  máquina de estados en Redis, triple verificación HMAC, NLP en
  español con SpaCy + OpenAI, workers RQ, paneles por rol.
- **02/tcp · Nordwind AD Lab** — laboratorio de Active Directory: de cero credenciales a Domain Admin.
- **03/tcp · Herramientas de seguridad** — Dogscan, Atalaya, Siege Map.
- **04/tcp · Write-ups** — field reports de CTF.
- **05/tcp · Arsenal** — stack técnico por capas.
- **06/tcp · Contacto** — canal directo.

## Cosas a personalizar antes de publicar

Los siguientes placeholders están marcados y hay que reemplazarlos:

- `hola@ejemplo.com` → tu email real
- `github.com/tu-usuario` → tu GitHub
- `linkedin.com/in/tu-usuario` → tu LinkedIn
- `jae-cv.pdf` → enlace al CV
- La descripción de VPS Control / Cyber Toolkit es provisional:
  cuando me pases detalles, afino el copy.

## Licencia

Código del portafolio: MIT. Contenido (textos, datos personales):
© 2026 Jorge Armando Escobar.
