/* ══════════════════════════════════════════════════════════════════
   JAE-PORTFOLIO · interactions
   vanilla js · no deps · no bundler
   ══════════════════════════════════════════════════════════════════ */

(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── icono flecha diagonal (enlaces externos) ─────────────────── */
  const ICON_EXT = (w = 11, h = 11) =>
    `<svg viewBox="0 0 24 24" width="${w}" height="${h}" aria-hidden="true">` +
    `<path d="M7 17L17 7M17 7H7M17 7v10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

  /* ══════════════════════════════════════════════════════════════════
     DATOS · edita aquí para actualizar el contenido del sitio
     ══════════════════════════════════════════════════════════════════ */

  /* ── features de Panchi-Bot ────────────────────────────────────── */
  const FEATURES = [
    {
      idx:   "f/01",
      title: "WhatsApp provider-agnóstico",
      body:  "Twilio y Meta Cloud API son intercambiables mediante una variable " +
             "de entorno. Los controladores, managers y BD no saben cuál está " +
             "activo. Una interfaz común, dos implementaciones, verificación " +
             "HMAC específica para cada una.",
      code:  "WHATSAPP_PROVIDER=meta&nbsp;·&nbsp;twilio",
    },
    {
      idx:   "f/02",
      title: "Arquitectura en capas",
      body:  '<span class="mono">blueprints → controllers → managers → services.</span> ' +
             "Una regla de importación estricta: nadie importa hacia arriba. " +
             "Los tests aíslan cada capa y la capa de services es el único " +
             "punto de contacto con el mundo exterior.",
      doc:   {
        href: "https://github.com/jorgearma/panchi-bot/blob/master/docs/backend/controllers.md",
        text: "ver docs",
      },
    },
    {
      idx:   "f/03",
      title: "Máquina de estados en Redis",
      body:  "El flujo de registro y de pedido vive en Redis como estado " +
             "efímero. Transiciones validadas, TTL por conversación, y " +
             "recuperación elegante si el usuario desaparece a mitad del flujo.",
      doc:   {
        href: "https://github.com/jorgearma/panchi-bot/blob/master/docs/backend/managers/gestor_redis.md",
        text: "ver docs",
      },
    },
    {
      idx:   "f/04",
      title: "Triple verificación HMAC",
      body:  'Tres webhooks entrantes, tres algoritmos de firma distintos: ' +
             'Twilio (<span class="mono">X-Twilio-Signature</span>), ' +
             'Meta (<span class="mono">HMAC-SHA256</span> con app secret), ' +
             'Monei (<span class="mono">HMAC</span> con webhook secret). Ningún ' +
             "endpoint confía en el cliente.",
      doc:   {
        href: "https://github.com/jorgearma/panchi-bot/blob/master/docs/backend/blueprints.md",
        text: "ver docs",
      },
    },
    {
      idx:   "f/05",
      title: "Validación geoespacial",
      body:  "Las direcciones pasan por Google Maps → Shapely → polígono de " +
             "zona de reparto. Si un cliente cae fuera del polígono, la " +
             "conversación lo explica antes de que la cocina se entere.",
    },
    {
      idx:   "f/06",
      title: "NLP en español",
      body:  'SpaCy con <span class="mono">es_core_news_sm</span> más un ' +
             "pase por OpenAI para intenciones ambiguas. Rapidfuzz para " +
             "tolerar erratas en nombres de productos. El cliente escribe " +
             "como habla; el bot entiende.",
    },
    {
      idx:   "f/07",
      title: "Workers y colas",
      body:  "Tareas largas (notificaciones, métricas, integraciones pesadas) " +
             "salen del request cycle vía RQ. El webhook responde en " +
             "milisegundos; el trabajo real ocurre detrás.",
    },
    {
      idx:   "f/08",
      title: "Paneles por rol",
      body:  "Cliente, empleado, cocina, repartidor, picker. Cada uno con " +
             "su vista, sus permisos JWT, sus métricas. No es un bot: es " +
             "el sistema operativo del restaurante.",
    },
  ];

  /* ── diagramas de arquitectura (ASCII) ────────────────────────── */
  const ARCH_PANELS = [
    {
      tab: "arquitectura",
      content: `
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║        PANCHI-BOT · WhatsApp Restaurant Bot · Flask + SQL Server        ║
  ╚══════════════════════════════════════════════════════════════════════════╝

  WhatsApp Client
  (Twilio / Meta Cloud API)
         │
         ▼
  ┌──────────────────────┐     ┌───────────────────────┐     ┌─────────────────────┐
  │  FLASK BLUEPRINTS    │────►│  CONTROLLERS          │────►│  MANAGERS           │
  ├──────────────────────┤     ├───────────────────────┤     ├─────────────────────┤
  │ /webhook → messages  │     │ registro (state mach) │     │ usuarios · pedidos  │
  │ /menu    → cart      │     │ pedido   (lifecycle)  │     │ productos · dashboard│
  │ /dashboard → ops     │     │ pago     (Monei)      │     │ empleado            │
  │ /cocina  → kitchen   │     └───────────────────────┘     └──────┬────────┬─────┘
  │ /api     → payments  │                                          │        │
  └──────────────────────┘                                   ┌──────▼──┐  ┌──▼─────┐
                                                             │ SQL SVR │  │ REDIS  │
                                                             │  (DB)   │  │(State) │
                                                             └─────────┘  └───┬────┘
                                                                              ▼
                                                                          RQ Worker
`,
    },
    {
      tab: "flujo de pedido",
      content: `
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║              ORDER FLOW: From WhatsApp to Delivery                       ║
  ╚═══════════════════════════════════════════════════════════════════════════╝

  Cliente WhatsApp → "Hola" → Registro NLP
         │
         ▼
      PENDIENTE ── Generate menu token (Redis TTL)
         │
         ▼
      ENLACE ◄──── (user can revoke & restart)
         │  GET /menu/<token> · JS cart builder
         ▼
      ENLACE2
         │  POST /api/confirmacion · save cart → Redis
         ▼
  ┌─────────────────────┐
  │   CONFIRMANDO_PAGO  │
  └──────┬──────────────┘
         │
         ├──────────────────────────────────────────────────────┐
         │                                                      │
  ONLINE PAYMENT (Monei)                              CASH PAYMENT
  ──────────────────────                              ────────────
  POST /api/agregar_pedido                            POST /api/agregar_pedido_efectivo
  └─ Validate prices vs DB                            (skip Monei)
  └─ Create Monei payment session                          │
         │                                                  ▼
  PAGADO ◄── POST /webhook/monei (HMAC verified)    CONTRA_REEMBOLSO
         │                                                  │
         └───────────────────┬──────────────────────────────┘
                             │
                      EN_PREPARACION
                             │
                             ▼
                         PREPARADO
                             │
                             ▼
                        EN_REPARTO
                             │
                             ▼
                       ENTREGADO ✓

  CANCELLATION: Any state → POST /cancelar → CANCELADO → REEMBOLSADO ✓ (if paid)
`,
    },
    {
      tab: "roles",
      content: `
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║                          ROLES & PERMISSIONS                             ║
  ╚═══════════════════════════════════════════════════════════════════════════╝

  CUSTOMER (WhatsApp)          STAFF (Dashboard)            KITCHEN (Cocina PWA)
  ───────────────────          ─────────────────            ────────────────────
  ✓ Register via NLP           ✓ View all active orders     ✓ View prep queue
  ✓ Browse menu & cart         ✓ Change order states        ✓ Mark items PREPARADO
  ✓ Pay online or cash         ✓ View metrics & KPIs        ✓ See special instructions
  ✓ Track order status         ✓ Manage own shift           ✗ View payment info
  ✓ Cancel order               ✓ See picking/reparto queues ✗ Assign delivery
  ✗ Access dashboard           ✗ Modify prices              ✗ Access dashboard
  ✗ View other orders          ✗ Manage other staff

  PICKER (Warehouse)           DELIVERY (Repartidor)        ADMIN (not yet impl.)
  ──────────────────           ─────────────────────        ─────────────────────
  ✓ View picking queue         ✓ View delivery queue        ✓ Create/edit products
  ✓ Mark items picked          ✓ Accept delivery            ✓ Manage prices & staff
  ✓ Log picking incidents      ✓ Update location (map)      ✓ View all analytics
  ✗ Change order state         ✓ Mark ENTREGADO             ✓ Configure app settings
  ✗ View delivery queue        ✓ Handle NO_ENTREGADO        ✓ View payment history
  ✗ Access kitchen             ✗ Modify order details       ✓ (needs role_id in BD)
                               ✗ View prices / picking

                                    JWT por rol · sesión propia
                                    estado sincronizado vía Redis
`,
    },
    {
      tab: "base de datos",
      content: `
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║           PANCHI-BOT: Database Schema (SQL Server)                       ║
  ╚═══════════════════════════════════════════════════════════════════════════╝

  CORE CHAIN ──────────────────────────────────────────────────────────────────────────
  ┌─────────┐ 1:N ┌──────────────────────┐ 1:N ┌────────────────────┐ 1:1 ┌──────────┐
  │usuarios │────►│      pedidos         │────►│ pedido_detalles    │────►│picking   │
  ├─────────┤     ├──────────────────────┤     ├────────────────────┤     ├──────────┤
  │ id (PK) │     │ PedidoID (PK)        │     │ DetalleID (PK)     │     │ id (PK)  │
  │ nombre  │     │ ClienteID (FK)       │     │ PedidoID (FK)      │     │ estado   │
  │ numero  │◄WA  │ Estado ◄─ state mach │     │ ProductoID (FK)    │     │ubicacion │
  │direccion│     │ Total · forma_pago   │     │ Cantidad           │     │◄warehouse│
  │verified │     │ DireccionEntrega     │     │ PrecioUnitario     │     └──────────┘
  └─────────┘     │ lat/lng·cancelled_by │     │ Notas (comments)   │
                  └──────────────────────┘     └────────────────────┘

  CATALOG                         PAYMENTS & AUDIT              OPERATIONS
  ───────                         ────────────────              ──────────
  ┌────────┐  ┌──────────┐        ┌────────┐  ┌─────────────┐  ┌──────────────┐
  │categorias  │productos │        │ pagos  │  │historial_  │  │ empleados    │
  ├────────┤  ├──────────┤        ├────────┤  │estados_ped │  ├──────────────┤
  │id (PK) │  │ProductoID│        │id (PK) │  ├─────────────┤  │ EmpleadoID   │
  │nombre  │1:N│categoria │        │pedido_ │  │ id (PK)    │  │ nombre       │
  │orden   │◄►│Nombre    │        │id (FK) │  │ pedido_id  │  │ rol ◄─ tipos │
  │activa  │  │Precio    │        │proveedor  │ estado_nuevo│  │ activo       │
  └────────┘  │Stock     │        │estado  │  │ cambiado_en│  └──────────────┘
              │Disponible│        │importe │  └─────────────┘
              └──────────┘        └────────┘  1:N pagos · 1:N cambios estado

  REPARTO & PICKING
  ─────────────────
  ┌──────────┐          ┌─────────────────┐
  │ reparto  │          │ picking_pedido  │
  ├──────────┤          ├─────────────────┤
  │id (PK)   │          │ id (PK)         │
  │pedido_id │          │ pedido_id (FK)  │
  │repartidor│          │ estado ◄─────┐  │
  │estado    │          │ actualizado  │  │
  │lat/lng   │          └─────────────────┘
  └──────────┘               PENDIENTE · EN_PROCESO · COMPLETADO
                             warehouse mode (item-level)
                             restaurant mode (simplified queue)
`,
    },
    {
      tab: "validación de dirección",
      content: `
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║         ADDRESS VALIDATION: Microservice-Ready Module                    ║
  ║              (currently embedded, extractable to sidecar)                 ║
  ╚═══════════════════════════════════════════════════════════════════════════╝

  INPUT: "Calle Principal 45, Tarancón"
         │
         ▼
  maps_module.validar_direccion()
         │
         ├─────────────────────────────────────────────────────────┐
         │                                                         │
         ▼                                                         ▼
    NORMALIZE                                      LOOKUP IN STREET CATALOG
    ──────────                                      ──────────────────────
    ├─ regex rules from territories.json           ├─ territories.json
    ├─ "Cll." → "Calle"                            ├─ calles_tarancon.json
    ├─ lowercase + strip spaces                    ├─ 311 streets indexed
    └─ prepare for lookup                          └─ Reject if: not found
                                                       or number missing

         │                                                         │
         └─────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
                          GEOCODE (Google Maps API)
                          ────────────────────────
                          ├─ lat/lng coordinates
                          ├─ formatted address
                          └─ Retry on rate-limit

                                   │
                                   ▼
                        POLYGON CHECK (Shapely)
                        ─────────────────────
                        ├─ Load delivery zone polygon from config
                        ├─ point-in-polygon test (vincenty distance)
                        └─ Reject if: outside zone or API error

                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
                  VALID                        INVALID
                   ✓                            ✗
              (True, cleaned)              (False, reason)
              lat/lng ready                ├─ no_encontrada
              address to save              ├─ fuera_zona
              geocoded                     ├─ sin_numero
                                           ├─ demasiado_generica
                                           └─ error_api
`,
    },
    {
      tab: "registro (state machine)",
      doc: {
        href: "https://github.com/jorgearma/panchi-bot/blob/master/docs/backend/managers/gestor_redis.md",
        text: "RedisManager docs",
      },
      content: `
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║         REGISTRATION: Redis State Machine + NLP                          ║
  ║        (stored as: <phone_number> → current_state · TTL per step)        ║
  ╚═══════════════════════════════════════════════════════════════════════════╝

  WhatsApp message
         │
         ▼
  ┌────────────────────────┐       ┌──────────────────────┐
  │ SALUDO_INICIAL         │       │ ESPERANDO_           │
  │ "Hola, ¿cómo estás?"   │       │ CONFIRMACION         │
  ├────────────────────────┤       │ "¿Deseas             │
  │ Waiting: sí | no       │       │  registrarte?"       │
  └──────┬─────────────────┘       ├──────────────────────┤
         │                         │ Waiting: sí | no     │
         └──────────┬──────────────┘
                    │
            ┌───────┴─────────┐
            │                 │
  ┌─────────▼──────────┐  ┌─────▼────────────────────┐
  │ ESPERANDO_NOMBRE   │  │ ESPERANDO_DIRECCION      │
  │ "¿Cuál es tu       │  │ "¿Cuál es tu             │
  │  nombre?"          │  │  dirección?"             │
  ├────────────────────┤  ├────────────────────────────┤
  │ Validate:          │  │ Validate:                  │
  │ • length 2-60      │  │ • maps_module.validar_dir  │
  │ • regex [A-Zá-úñ]  │  │ • polygon boundary         │
  │ • spaCy NLP (es)   │  │ • street catalog           │
  │                    │  │                            │
  │ ├─ valid ──┐       │  │ ├─ valid ────────┐        │
  │ └─ invalid─┤       │  │ └─ invalid ──────┤        │
  └────────────┤───────┘  └──────────────────┤────────┘
               │                             │
               └──────────┬──────────────────┘
                          │
                          ▼
             ┌─────────────────────────────────┐
             │ CONFIRMANDO_DIRECCION           │
             │ "¿Es correcto? Calle X, 123"    │
             ├─────────────────────────────────┤
             │ • sí → save                     │
             │ • no → back to ESPERANDO_       │
             │ • new address → re-validate     │
             └──────────┬──────────────────────┘
                        │
                ┌───────┴─────────┐
                │                 │
                ▼                 ▼
           ┌──────────┐      (retry)
           │CONFIRMADO│
           ├──────────┤
           │ Save BD: │
           │ usuario  │
           │ estado   │
           │ Clear    │
           │ Redis    │
           │          │
           │ Send     │
           │ menu     │
           │ link     │
           └──────────┘

  ─────────────────────────────────────────────────────────────────────────────
  PERSISTENCE LAYER: RedisManager (Singleton)
  ─────────────────────────────────────────────────────────────────────────────

  Key: <phone_number>          Value: <current_state>    TTL: step-dependent
       └─ Unique per user           └─ SALUDO_INICIAL           ├─ SALUDO: 120s
          from WhatsApp             └─ ESPERANDO_NOMBRE         ├─ NOMBRE: 300s
                                    └─ ESPERANDO_DIRECCION      └─ DIRECCION: 300s

  RedisManager Operations
  ├─ get(key) ────────────► None on failure (don't block user)
  ├─ set(key, value, ttl) ─► 3-attempt retry (2s intervals) · critical for state
  ├─ delete(key) ──────────► cleanup on exit or timeout
  ├─ esta_bloqueado() ─────► anti-flood: 4s block per user
  ├─ ya_procesado_wamid() ─► deduplication: atomic SET NX (300s window)
  └─ adquirir_lock() ──────► fail-open semantics (no indefinite blocking)

  Connection: 3s socket timeout · retry-enabled · mandatory at startup
  Source: https://github.com/jorgearma/panchi-bot/blob/master/docs/backend/managers/gestor_redis.md
`,
    },
  ];

  /* ── write-ups CTF ─────────────────────────────────────────────── */
  const WRITEUPS = [
    { platform: "HTB", diff: "easy",   os: "linux",   name: "Broker",  tags: ["activemq", "cve-2023-46604", "nginx"],              href: "https://panchi.gitbook.io/untitled/broker/broker_report" },
    { platform: "HTB", diff: "easy",   os: "windows", name: "Blue",    tags: ["ms17-010", "eternalblue", "smb"],                   href: "#" },
    { platform: "HTB", diff: "medium", os: "linux",   name: "Bastard", tags: ["drupal", "web", "privesc"],                         href: "#" },
    { platform: "HTB", diff: "easy",   os: "linux",   name: "Shocker", tags: ["shellshock", "cgi", "sudo"],                        href: "#" },
    { platform: "HTB", diff: "medium", os: "windows", name: "Optimum", tags: ["httpfileserver", "cve-2014-6287", "privesc"],       href: "#" },
    { platform: "HTB", diff: "hard",   os: "linux",   name: "Valentine", tags: ["heartbleed", "openssl", "ssh"],                   href: "#" },
    { platform: "HTB", diff: "easy",   os: "linux",   name: "Nibbles", tags: ["web", "php", "sudo"],                               href: "#" },
    { platform: "HTB", diff: "medium", os: "windows", name: "Active",  tags: ["active-directory", "gpp", "kerberoasting"],         href: "#" },
    { platform: "HTB", diff: "easy",   os: "linux",   name: "Bashed",  tags: ["web", "sudo", "cron"],                              href: "#" },
    { platform: "HTB", diff: "hard",   os: "windows", name: "Silo",    tags: ["oracle", "odat", "volatility"],                     href: "#" },
    { platform: "HTB", diff: "easy",   os: "linux",   name: "Lame",    tags: ["smb", "samba", "metasploit"],                       href: "#" },
    { platform: "HTB", diff: "medium", os: "linux",   name: "Beep",    tags: ["lfi", "elastix", "sudo"],                           href: "#" },
    { platform: "HTB", diff: "easy",   os: "windows", name: "Legacy",  tags: ["smb", "ms08-067", "xp"],                            href: "#" },
    { platform: "HTB", diff: "medium", os: "linux",   name: "Cronos",  tags: ["dns", "sqli", "cron"],                               href: "#" },
    { platform: "HTB", diff: "hard",   os: "linux",   name: "Jail",    tags: ["nfs", "buffer-overflow", "kernel"],                  href: "#" },
  ];

  /* ══════════════════════════════════════════════════════════════════
     RENDERIZADO · genera HTML a partir de los arrays de datos
     ══════════════════════════════════════════════════════════════════ */

  /* ── arch diagrams ─────────────────────────────────────────────── */
  const archContainer = $("[data-arch]");
  if (archContainer) {
    const tabsHTML = ARCH_PANELS.map((p, i) =>
      `<button class="arch__tab${i === 0 ? " is-active" : ""}" role="tab" ` +
      `aria-selected="${i === 0}" data-arch-tab="${i}">${p.tab}</button>`
    ).join("");

    const panelsHTML = ARCH_PANELS.map((p, i) => {
      const pre = document.createElement("pre");
      pre.className = `arch__ascii mono arch__panel${i === 0 ? " is-active" : ""}`;
      pre.setAttribute("role", "tabpanel");
      pre.setAttribute("data-arch-panel", i);
      pre.textContent = p.content;
      return pre.outerHTML;
    }).join("");

    // añade links de documentación a los paneles que los tengan
    const docsLinks = ARCH_PANELS
      .map((p, i) => {
        if (!p.doc) return "";
        return (
          `<a class="arch__doc mono" data-arch-doc="${i}" href="${p.doc.href}" ` +
          `target="_blank" rel="noopener noreferrer" style="display:none;">` +
          `📄 ${p.doc.text} ${ICON_EXT()}</a>`
        );
      })
      .join("");

    archContainer.innerHTML =
      `<div class="arch__head mono">` +
        `<div class="arch__tabs" role="tablist">${tabsHTML}</div>` +
        `<span class="arch__file">panchi-bot/diagrams.txt</span>` +
      `</div>${panelsHTML}${docsLinks}`;
  }

  /* ── feature cards ─────────────────────────────────────────────── */
  const featContainer = $("[data-features]");
  if (featContainer) {
    featContainer.innerHTML = FEATURES.map((f) => {
      const code = f.code
        ? `<p class="feat__code mono">${f.code}</p>`
        : "";
      const doc = f.doc
        ? `<a class="feat__doc mono" href="${f.doc.href}" target="_blank" rel="noopener noreferrer">` +
          `${f.doc.text} ${ICON_EXT()}</a>`
        : "";
      return (
        `<article class="feat">` +
          `<span class="feat__idx mono">${f.idx}</span>` +
          `<h3 class="feat__title">${f.title}</h3>` +
          `<p class="feat__body">${f.body}</p>` +
          code + doc +
        `</article>`
      );
    }).join("");
  }

  /* ── write-up cards ────────────────────────────────────────────── */
  const wuContainer = $("[data-writeups]");
  if (wuContainer) {
    wuContainer.innerHTML = WRITEUPS.map((w) => {
      const tags = w.tags.map((t) => `<li>${t}</li>`).join("");
      return (
        `<article class="wu">` +
          `<header class="wu__head mono">` +
            `<span class="wu__platform">${w.platform}</span>` +
            `<span class="wu__diff wu__diff--${w.diff}">● ${w.diff}</span>` +
            `<span class="wu__os">${w.os}</span>` +
          `</header>` +
          `<h3 class="wu__name">${w.name}</h3>` +
          `<ul class="wu__tags mono">${tags}</ul>` +
          `<a class="wu__link mono" href="${w.href}" target="_blank" rel="noopener noreferrer">` +
            `ver write-up ${ICON_EXT()}` +
          `</a>` +
        `</article>`
      );
    }).join("");
  }

  /* ══════════════════════════════════════════════════════════════════
     INTERACCIONES
     ══════════════════════════════════════════════════════════════════ */

  /* ── 00 · whoami header timestamp ─────────────────────────────── */
  const whoamiTs = $("#whoami-ts");
  if (whoamiTs) {
    const pad = (n) => String(n).padStart(2, "0");
    const tickTs = () => {
      const d = new Date();
      whoamiTs.textContent =
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    tickTs();
    setInterval(tickTs, 1000);
  }

  /* ── 00b · dossier HUD clock ───────────────────────────────────── */
  const dossierTime = $("#dossier-time");
  if (dossierTime) {
    const pad = (n) => String(n).padStart(2, "0");
    const tickHud = () => {
      const d = new Date();
      dossierTime.textContent =
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    tickHud();
    setInterval(tickHud, 1000);
  }

  /* ── 01 · session uptime counter ───────────────────────────────── */
  const uptimeEl = $("[data-uptime]");
  if (uptimeEl) {
    const start = performance.now();
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const s = Math.floor((performance.now() - start) / 1000);
      uptimeEl.textContent =
        `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ── 02 · hero terminal: cat jae_perfil.txt ─────────────────── */
  const term   = $("[data-logs]");
  const cursor = $(".hero__terminal-cursor");
  const foot   = $(".hero__terminal-foot");

  if (term && cursor && foot) {
    const CMD        = "cat jae_perfil.txt";
    const BOOT_DELAY = 900;  /* ms antes de empezar a escribir */
    const CMD_SPEED  = 62;   /* ms entre carácter del comando */

    /* helpers de marcado de color */
    const k   = (s) => `<span class="jl__key">"${s}"</span>`;
    const v   = (s) => `<span class="jl__val">"${s}"</span>`;
    const p   = (s) => `<span class="jl__pun">${s}</span>`;
    const arr = (items) =>
      p("[") + items.map((i) => v(i)).join(p(", ")) + p("]");

    /* cada entrada tiene el texto plano (para tipear) y el html coloreado */
    const LINES = [
      { plain: `{`,                                                                                                          html: p(`{`) },
      { plain: `  "name": "Jorge Armando",`,                                                                                html: `  ${k("name")}${p(":")} ${v("Jorge Armando")}${p(",")}` },
      { plain: `  "role": "Junior Cybersecurity Candidate",`,                                                               html: `  ${k("role")}${p(":")} ${v("Junior Cybersecurity Candidate")}${p(",")}` },
      { plain: `  "focus": "Pentesting & Web Security",`,                                                                   html: `  ${k("focus")}${p(":")} ${v("Pentesting &amp; Web Security")}${p(",")}` },
      { plain: `  "skills": ["Web Pentesting", "Linux", "Nmap", "Burp Suite", "Python"],`,                                 html: `  ${k("skills")}${p(":")} ${arr(["Web Pentesting", "Linux", "Nmap", "Burp Suite", "Python"])}${p(",")}`, mobileHide: true },
      { plain: `  "ad": ["Active Directory", "BloodHound", "Kerberoasting", ],`,                                           html: `  ${k("ad")}${p(":")} ${arr(["Active Directory", "BloodHound", "Kerberoasting", "Pass-the-Hash", "LDAP enum"])}${p(",")}`, mobileHide: true },
      { plain: `  "tools": ["Metasploit", "Impacket", "CrackMapExec", "Gobuster", "ffuf",],`,                              html: `  ${k("tools")}${p(":")} ${arr(["Metasploit", "Impacket", "CrackMapExec", "Gobuster", "ffuf",])}${p(",")}`, mobileHide: true },
      { plain: `  "projects": ["Panchi-Bot", "VPS Hardening", "Atalaya"],`,                                                html: `  ${k("projects")}${p(":")} ${arr(["Panchi-Bot", "VPS Hardening", "Atalaya"])}${p(",")}` },
      { plain: `  "goal": "Start as a junior pentester and grow fast"`,                                                    html: `  ${k("goal")}${p(":")} ${v("Start as a junior pentester and grow fast")}` },
      { plain: `}`,                                                                                                          html: p(`}`) },
    ];

    /* tipea una línea carácter a carácter; al terminar llama a cb */
    const typeLine = (li, plain, html, cb) => {
      let ci = 0;
      const next = () => {
        if (ci < plain.length) {
          ci++;
          /* muestra texto plano + cursor de bloque al final */
          li.innerHTML = escHtml(plain.slice(0, ci)) + `<span class="jl__caret">█</span>`;
          setTimeout(next, 13 + Math.floor(Math.random() * 14));
        } else {
          /* línea completa: aplica colores y elimina caret */
          li.innerHTML = html;
          cb();
        }
      };
      next();
    };

    /* escapa HTML básico para el texto plano durante la escritura */
    const escHtml = (s) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    /* en móvil omite las líneas marcadas con mobileHide */
    const isMobile = () => window.innerWidth <= 860;
    const visibleLines = (lines) =>
      isMobile() ? lines.filter((l) => !l.mobileHide) : lines;

    /* tipea todas las líneas en secuencia */
    const typeAll = (lines, idx = 0) => {
      if (idx >= lines.length) return;
      const { plain, html } = lines[idx];
      const li = document.createElement("li");
      li.className = "log jl";
      term.appendChild(li);
      typeLine(li, plain, html, () => {
        /* pausa corta entre líneas (imita al hacker que respira) */
        setTimeout(() => typeAll(lines, idx + 1), 35 + Math.floor(Math.random() * 55));
      });
    };

    /* span donde se escribe el comando, insertado antes del cursor */
    const cmdSpan = document.createElement("span");
    cmdSpan.className = "hero__terminal-cmd";
    foot.insertBefore(cmdSpan, cursor);

    /* fase 1 · escribir el comando carácter a carácter */
    setTimeout(() => {
      let ci = 0;
      const typer = setInterval(() => {
        cmdSpan.textContent += CMD[ci++];
        if (ci >= CMD.length) {
          clearInterval(typer);

          /* fase 2 · "enter" → tipear JSON línea a línea */
          setTimeout(() => {
            cursor.classList.remove("blink");
            cursor.style.opacity = "0";
            typeAll(visibleLines(LINES));
          }, 380);
        }
      }, CMD_SPEED);
    }, BOOT_DELAY);
  }

  /* ── 03 · scroll reveal (sections + features) ──────────────────── */
  /* nota: .feat y .wu se renderizan antes de llegar aquí          */
  const targets = [
    ...$$(".section__head"),
    ...$$(".whoami__card"),
    ...$$(".whoami__copy"),
    ...$$(".case__lede"),
    ...$$(".metrics"),
    ...$$(".arch"),
    ...$$(".feat"),
    ...$$(".stack"),
    ...$$(".proj"),
    ...$$(".skills__col"),
    ...$$(".contact__box"),
  ];
  targets.forEach((el, i) => {
    el.setAttribute("data-reveal", "");
    el.style.setProperty("--d", `${(i % 8) * 60}ms`);
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add("is-in"));
  }

  /* ── 04 · arch diagram tabs ─────────────────────────────────────── */
  $$("[data-arch]").forEach((arch) => {
    const tabs   = $$("[data-arch-tab]",   arch);
    const panels = $$("[data-arch-panel]", arch);
    const docs   = $$("[data-arch-doc]",   arch);

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.archTab;
        tabs.forEach((t)   => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
        panels.forEach((p) => p.classList.remove("is-active"));
        docs.forEach((d)   => d.style.display = "none");
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        const active = panels.find((p) => p.dataset.archPanel === target);
        if (active) active.classList.add("is-active");
        const activeDoc = docs.find((d) => d.dataset.archDoc === target);
        if (activeDoc) activeDoc.style.display = "inline-block";
      });
    });
  });

  /* ── 05 · carrusel de paneles ──────────────────────────────────── */
  const carousels = [];

  $$("[data-carousel]").forEach((carousel) => {
    const track   = carousel.querySelector(".proj__carousel-track");
    const imgs    = Array.from(track.querySelectorAll("img"));
    const dots    = Array.from(carousel.querySelectorAll(".proj__carousel-dot"));
    const btnPrev = carousel.querySelector(".proj__carousel-btn--prev");
    const btnNext = carousel.querySelector(".proj__carousel-btn--next");
    let current = 0;

    const goTo = (idx) => {
      current = (idx + imgs.length) % imgs.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("is-active", i === current));
    };

    // los dots también son clicables
    dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));

    btnPrev.addEventListener("click", () => goTo(current - 1));
    btnNext.addEventListener("click", () => goTo(current + 1));

    // swipe táctil
    let startX = 0;
    carousel.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
    });

    // exponemos estado para que el lightbox pueda navegar
    carousels.push({ imgs, getCurrent: () => current, goTo });
  });

  /* ── 06 · lightbox ──────────────────────────────────────────────── */
  const lightbox  = $("#lightbox");
  const lbImg     = $("#lightbox-img");
  const lbClose   = $("#lightbox-close");
  const lbPrev    = $("#lightbox-prev");
  const lbNext    = $("#lightbox-next");

  // carrusel activo cuando el lightbox está abierto
  let lbCarousel  = null;

  const lbUpdateNav = () => {
    const hasNav = lbCarousel !== null;
    lbPrev.classList.toggle("is-hidden", !hasNav);
    lbNext.classList.toggle("is-hidden", !hasNav);
  };

  const lbOpen = (src, alt, carousel = null) => {
    lbImg.src = src;
    lbImg.alt = alt;
    lbCarousel = carousel;
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
    lbUpdateNav();
  };
  const lbShut = () => {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    lbCarousel = null;
  };

  const lbNavigate = (dir) => {
    if (!lbCarousel) return;
    const next = lbCarousel.getCurrent() + dir;
    lbCarousel.goTo(next);
    const idx = lbCarousel.getCurrent();
    lbImg.src = lbCarousel.imgs[idx].src;
    lbImg.alt = lbCarousel.imgs[idx].alt;
  };

  lbPrev.addEventListener("click", (e) => { e.stopPropagation(); lbNavigate(-1); });
  lbNext.addEventListener("click", (e) => { e.stopPropagation(); lbNavigate(1); });

  // cada imagen del carrusel abre el lightbox con referencia al carrusel
  carousels.forEach((c) => {
    c.imgs.forEach((img) => {
      img.addEventListener("click", () => lbOpen(img.src, img.alt, c));
    });
  });

  // imágenes sueltas (sin carrusel)
  $$(".proj__demo-screen img:not([data-carousel] img)").forEach((img) => {
    img.addEventListener("click", () => lbOpen(img.src, img.alt, null));
  });

  lbClose.addEventListener("click", lbShut);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target === lightbox.querySelector(".lightbox__content")) lbShut();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") lbShut();
    if (lightbox.classList.contains("is-open")) {
      if (e.key === "ArrowLeft")  lbNavigate(-1);
      if (e.key === "ArrowRight") lbNavigate(1);
    }
  });

  /* ── 07 · console easter egg ────────────────────────────────────── */
  if (typeof console !== "undefined") {
    const style = "color:#ffb627;font:600 12px/1.4 JetBrains Mono,monospace;";
    console.log("%c// jae-portfolio · v1.0.0", style);
    console.log(
      "%cSi estás leyendo esto por curiosidad, ya nos entenderíamos. → jorgesiemprearmando@gmail.com",
      "color:#a59d89;font:400 12px/1.5 JetBrains Mono,monospace;"
    );
  }
})();
