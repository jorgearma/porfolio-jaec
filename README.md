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
| Tipografía  | Fraunces + JetBrains Mono (Google)    |
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
├── Dockerfile          # nginx:alpine
├── docker-compose.yml  # expone 127.0.0.1:8088
├── nginx.conf          # config dentro del contenedor
├── .dockerignore
├── DEPLOY.md           # pasos completos para VPS
└── README.md
```

## Desarrollo local

```bash
# opción 1 — sin docker, un servidor estático de 30 líneas:
python3 -m http.server 8088
# → http://127.0.0.1:8088

# opción 2 — igual que en producción:
docker compose up --build
# → http://127.0.0.1:8088
```

## Deploy en el VPS

Instrucciones completas en [`DEPLOY.md`](./DEPLOY.md).
Resumen:

```bash
rsync -avz --delete ./ usuario@tu-vps:/opt/jae-portfolio/
ssh usuario@tu-vps "cd /opt/jae-portfolio && docker compose up -d --build"
```

## Secciones

- **§ 00 · whoami** — perfil técnico como archivo de dossier.
- **§ 01 · Panchi-Bot** — case study detallado del proyecto insignia:
  plataforma completa de operaciones para restaurante, WhatsApp
  provider-agnóstico (Twilio ⟷ Meta), arquitectura en capas,
  máquina de estados en Redis, triple verificación HMAC, NLP en
  español con SpaCy + OpenAI, workers RQ, paneles por rol.
- **§ 02 · Otros sistemas** — VPS Control, Cyber Toolkit.
- **§ 03 · Arsenal** — stack técnico por capas.
- **§ 04 · Contacto** — canal directo.

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
