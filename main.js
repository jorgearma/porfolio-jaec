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
    { platform: "HTB", diff: "medium", os: "windows", name: "Hospital", href: "https://github.com/jorgearma/Pentesting-Reports/tree/main/hospital",
      desc: "DC Windows con una VM Ubuntu: subida de .phar, LPE de kernel en la VM y phishing con Ghostscript hasta SYSTEM." },
    { platform: "HTB", diff: "medium", os: "linux",   name: "Surveillance", href: "https://github.com/jorgearma/Pentesting-Reports/tree/main/surveillance",
      desc: "RCE en CraftCMS, credenciales en un backup, túnel SSH hasta ZoneMinder y sudo mal configurado hasta root." },
    { platform: "HTB", diff: "medium", os: "linux",   name: "Pit", href: "https://github.com/jorgearma/Pentesting-Reports/tree/main/pit",
      desc: "SNMP filtra usuario y ruta, RCE en SeedDMS, terminal de Cockpit y script de SNMP extend hasta root." },
    { platform: "HTB", diff: "medium", os: "linux",   name: "Node", href: "https://github.com/jorgearma/Pentesting-Reports/tree/main/node",
      desc: "API Express que filtra hashes, backup cifrado con credenciales de Mongo y binario SUID hasta root." },
    { platform: "HTB", diff: "easy",   os: "linux",   name: "Broker", href: "https://github.com/jorgearma/Pentesting-Reports/tree/main/broker",
      desc: "RCE en Apache ActiveMQ (CVE-2023-46604) y sudo sobre nginx para escalar a root." },
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
          `target="_blank" rel="noopener noreferrer">` +
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

  /* ── write-up cards ────────────────────────────────────────────── */
  const wuContainer = $("[data-writeups]");
  if (wuContainer) {
    wuContainer.innerHTML = WRITEUPS.map((w) => {
      return (
        `<a class="wu" href="${w.href}" target="_blank" rel="noopener noreferrer" aria-label="Write-up de ${w.name} (se abre en otra pestaña)">` +
          `<header class="wu__head mono">` +
            `<span class="wu__platform">${w.platform}</span>` +
            `<span class="wu__diff wu__diff--${w.diff}">● ${w.diff}</span>` +
            `<span class="wu__os">${w.os}</span>` +
          `</header>` +
          `<h3 class="wu__name">${w.name}</h3>` +
          `<p class="wu__desc">${w.desc}</p>` +
          `<span class="wu__link mono" aria-hidden="true">ver write-up ${ICON_EXT()}</span>` +
        `</a>`
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

  /* ── 02 · hero terminal: prompt estilo Kali + comandos ─────────── */
  const term = $("[data-logs]");
  const foot = $(".hero__terminal-foot");

  if (term) {
    /* el prompt final vive ahora dentro del historial → ocultamos el pie viejo */
    if (foot) foot.style.display = "none";

    const USER       = "jorgearmando@vps";
    let   PATH       = "~";     /* lo actualiza `cd` */
    const BOOT_DELAY = 900;   /* ms antes de empezar */

    const escHtml = (s) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    /* ── contenido de salida ── */
    const COL = 6;
    const sp  = (n) => " ".repeat(Math.max(1, COL - [...n].length));
    const PROOF = [
      ["52",   "HTB machines owned"],
      ["32k★", "web-check — PR merged (RFC 9116)"],
      ["3",    "security tools shipped"],
      ["→",    "CRTP / OSCP · in progress"],
    ];
    const proofOut = PROOF.map(([n, t]) =>
      `  <span class="jl__key">${n}</span>${sp(n)}<span class="jl__lbl">${t}</span>`
    );
    const statusOut = [
      `  <span class="jl__key">▸</span> open to work · <span class="jl__lbl">Madrid / remote</span>`,
      `  <span class="jl__key">▸</span> focus: <span class="jl__lbl">Active Directory (CRTP) · nordwind-ad-lab</span>`,
    ];

    /* secuencia de comandos "ejecutados" en la shell */
    const SCRIPT = [
      { cmd: "cat proof.txt",  out: proofOut  },
      { cmd: "cat status.txt", out: statusOut },
    ];

    /* ── helpers de render ── */
    const frame = (s) => `<span class="kp__frame">${s}</span>`;
    const promptTop = () => {
      const root = state.user === "root";
      return frame("┌──(") +
        `<span class="kp__user${root ? " kp__user--root" : ""}">${root ? "root@vps" : USER}</span>` +
        frame(")-[") + `<span class="kp__path">${PATH}</span>` + frame("]");
    };
    /* 2ª línea del prompt: └─$ (usuario) o └─# en rojo (root) */
    const promptSym = () => state.mode === "vim" ? frame("~")     /* dentro de vim no hay prompt */
      : state.user === "root"
      ? frame("└─") + `<span class="kp__root">#</span>`
      : frame("└─$");
    const CARET = `<span class="jl__caret">█</span>`;

    const addLi = (html, cls) => {
      const li = document.createElement("li");
      li.className = cls || "log jl";
      li.innerHTML = html;
      term.appendChild(li);
      term.scrollTop = term.scrollHeight;   /* siempre pegado al final */
      return li;
    };

    /* tipea el comando carácter a carácter en la 2ª línea del prompt */
    const typeCmd = (li, cmd, cb) => {
      let ci = 0;
      const step = () => {
        if (ci < cmd.length) {
          ci++;
          li.innerHTML = frame("└─$") + " " +
            `<span class="kp__cmd">${escHtml(cmd.slice(0, ci))}</span>` + CARET;
          setTimeout(step, 40 + Math.floor(Math.random() * 55));
        } else {
          li.innerHTML = frame("└─$") + " " +
            `<span class="kp__cmd">${escHtml(cmd)}</span>`;
          setTimeout(cb, 320);
        }
      };
      step();
    };

    /* revela las líneas de salida con un pequeño escalonado */
    const showOut = (lines, i, cb) => {
      if (i >= lines.length) { setTimeout(cb, 300); return; }
      addLi(lines[i], "log jl");
      setTimeout(() => showOut(lines, i + 1, cb), 95);
    };

    /* ejecuta un bloque: prompt → comando tipeado → salida */
    const runBlock = (block, done) => {
      addLi(promptTop(), "log kp");
      const cmdLi = addLi(frame("└─$") + " " + CARET, "log kp");
      typeCmd(cmdLi, block.cmd, () => showOut(block.out, 0, done));
    };

    /* ══ 02b · shell interactiva (fase 1) ═════════════════════════════
       FS falso + parser + comandos básicos. Nada se ejecuta de verdad:
       cada fichero es un array de líneas HTML (contenido propio, de
       confianza); todo lo que teclea el visitante pasa por escHtml().
       Mensajes: coreutils en español (locale es_ES) y zsh en inglés,
       igual que en un Kali real.
       ══════════════════════════════════════════════════════════════ */
    const ME    = "jorgearmando";
    const HOME  = ["home", ME];
    const home  = () => (state.user === "root" ? ["root"] : HOME);   /* ~ depende de quién seas */
    const state = { cwd: HOME.slice(), user: ME, code: 0, denied: 0, mode: null };   /* code = $? */
    const has   = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const plain = (s) => s.replace(/<[^>]*>/g, "");
    /* marca el exit code y devuelve las líneas de error */
    const fail  = (code, lines) => { state.code = code; return lines; };
    /* historial vivo, precargado como si la sesión viniera de antes:
       lo usan ↑/↓, `history` y `cat .zsh_history` */
    const hist = [
      "nmap -sC -sV -p- 10.10.10.3",
      "smbclient -L //10.10.10.3 -N",
      "ssh vps",
      "docker compose up -d --build",
      "cat proof.txt",
      "sudo -l",
      "ls -la",
    ];

    /* nodos del FS: D = directorio, F = fichero */
    const D = (ch, o) => Object.assign({ t: "d", ch, own: ME, mode: "drwxr-xr-x" }, o);
    const F = (out, o) => Object.assign({ t: "f", out, own: ME, mode: "-rw-r--r--" }, o);
    const link = (href, label) =>
      `<a class="sh__a" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    const key = (s) => `<span class="jl__key">${s}</span>`;
    const dim = (s) => `<span class="jl__lbl">${s}</span>`;

    /* writeups/ se genera del array WRITEUPS (una sola fuente de verdad) */
    const wuFiles = {};
    WRITEUPS.forEach((w) => {
      wuFiles[w.name.toLowerCase() + ".md"] = F([
        `  ${key("# " + w.name)}`,
        `  ${dim(`${w.platform} · ${w.diff} · ${w.os}`)}`,
        `  ${w.desc}`,
        w.href !== "#" ? `  ${link(w.href, "leer write-up →")}` : `  ${dim("write-up aún sin publicar")}`,
      ]);
    });

    /* ── scripts ejecutables: `cat` enseña el fuente, `./x` lanza run() ── */
    const ok = (s) => `<span class="jl__val">${s}</span>`;
    const MAIL = "jorgesiemprearmando@gmail.com";
    const dots = (label) => `${label} ${".".repeat(Math.max(3, 30 - [...label].length))} `;
    const hireRun = () => anim([
      `${key("[*]")} comprobando candidato…`,
      `${ok("[+]")} ${dots("python · bash · sql")}${ok("OK")}`,
      `${ok("[+]")} ${dots("linux · docker · nginx")}${ok("OK")}`,
      `${ok("[+]")} ${dots("metodología de pentesting")}${ok("OK")}`,
      `${ok("[+]")} ${dots("52 máquinas HTB")}${ok("OK")}`,
      `${ok("[+]")} ${dots("ganas de aprender")}${ok("OK")} ${dim("(sobran)")}`,
      `${key("[!]")} ${dots("experiencia laboral")}${key("404")} ${dim("— ahí entras tú")}`,
      `&nbsp;`,
      `${key("[*]")} veredicto: ${ok("contratable")}`,
      `    → ${link("mailto:" + MAIL, MAIL)}`,
      `    → ${dim("o escribe:")} open contacto`,
    ], 230);
    const scanRun = () => anim([
      `Starting Nmap 7.95 ( https://nmap.org )`,
      `Nmap scan report for jorge.local (127.0.0.1)`,
      `Host is up (0.00042s latency).`,
      dim(`Not shown: 65529 closed tcp ports (cosas que aún no sé)`),
      `&nbsp;`,
      key(`PORT     STATE    SERVICE`),
      `22/tcp   ${ok("open")}     linux · docker · nginx`,
      `80/tcp   ${ok("open")}     panchi-bot (flask, en prod)`,
      `443/tcp  ${ok("open")}     atalaya (detección en VPS)`,
      `8000/tcp ${ok("open")}     api-audit (caso real, nov 2025)`,
      `3389/tcp ${key("filtered")} crtp (en progreso)`,
      `&nbsp;`,
      `Service detection performed. 1 candidato listo para contratar.`,
      `Nmap done: 1 IP address (1 host up) scanned in 2.04 seconds`,
      dim(`# para ver un servicio de cerca: open atalaya`),
    ], 110);
    const X = { mode: "-rwxr-xr-x" };

    /* .zsh_history refleja `hist` en vivo (escapado: contiene texto del visitante) */
    const ZH = F([]);
    Object.defineProperty(ZH, "out", { get: () => hist.map(escHtml) });

    const ROOT = D({
      home: D({
        [ME]: D({
          "proof.txt":  F(proofOut),
          "status.txt": F(statusOut),
          "contacto.txt": F([
            `  ${key("email")}     ${link("mailto:jorgesiemprearmando@gmail.com", "jorgesiemprearmando@gmail.com")}`,
            `  ${key("github")}    ${link("https://github.com/jorgearma", "github.com/jorgearma")}`,
            `  ${key("linkedin")}  ${link("https://www.linkedin.com/in/jorge-arma/", "linkedin.com/in/jorge-arma")}`,
          ]),
          "notas.txt": F([
            `  ${key("TODO")}`,
            `  [x] desplegar el portfolio en mi VPS`,
            `  [x] endurecer nginx (CSP sin inline)`,
            `  [ ] revisar sudoers: creo que dejé algo demasiado abierto`,
            `  [ ] terminar el CRTP`,
            `  [ ] que quien esté leyendo esto me contrate`,
          ]),
          "hire_me.sh": F([
            "#!/usr/bin/env zsh",
            "# hire_me.sh — comprueba si el candidato es contratable",
            "# spoiler: sí. Ejecútalo con ./hire_me.sh",
          ], Object.assign({ run: hireRun }, X)),
          "scan.sh": F([
            "#!/usr/bin/env zsh",
            "# scan.sh — enumera los servicios del candidato",
            "nmap -sV -p- jorge.local",
          ], Object.assign({ run: scanRun }, X)),
          projects: D({
            "panchi-bot.md": F([
              `  ${key("# Panchi-Bot")}`,
              `  Bot de pedidos por WhatsApp para un restaurante o almacén.`,
              `  Gestiona el ciclo completo: del primer mensaje al cobro y la entrega.`,
              `  ${link("https://www.panchibot.es", "panchibot.es →")}`,
            ]),
            "atalaya.md": F([
              `  ${key("# Atalaya")}`,
              `  Observabilidad y seguridad de host en tiempo real.`,
              `  Dashboard para un VPS en producción.`,
              `  ${link("https://github.com/jorgearma/atalaya", "github.com/jorgearma/atalaya →")}`,
            ]),
          }),
          writeups: D(wuFiles),
          ".zsh_history": ZH,
          /* sí: si has llegado aquí leyendo main.js, también cuenta como método válido */
          ".flag.txt": F([
            `  ${key("flag{pr1v3sc_3n_m1_p0rtf0l10}")}`,
            `  Acabas de escalar privilegios en mi portfolio.`,
            `  Imagina lo que hago en un lab. ¿Hablamos?`,
            `  ${link("mailto:jorgesiemprearmando@gmail.com", "jorgesiemprearmando@gmail.com")}`,
          ], { own: "root", mode: "-rw-------" }),
        }),
      }, { own: "root" }),
      etc: D({
        hostname: F(["vps"], { own: "root" }),
        passwd: F([
          "root:x:0:0:root:/root:/usr/bin/zsh",
          "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
          `${ME}:x:1000:1000:Jorge Armando,,,:/home/${ME}:/usr/bin/zsh`,
          "recruiter:x:1001:1001:tú, probablemente:/home/recruiter:/usr/bin/zsh",
        ], { own: "root" }),
        shadow: F([
          "root:$y$j9T$n1_lo_1nt3nt3s$...:19999:0:99999:7:::",
          `${ME}:$y$j9T$3st0_n0_3s_un_h4sh$...:19999:0:99999:7:::`,
        ], { own: "root", mode: "-rw-r-----" }),
      }, { own: "root" }),
      root: D({
        "nota.txt": F([
          "  Si lees esto, ya eres root. Bien jugado.",
          `  Lo que buscas está en /home/${ME}/.flag.txt`,
        ], { own: "root", mode: "-rw-------" }),
      }, { own: "root", mode: "drwx------" }),
    }, { own: "root" });

    /* ── permisos y rutas ── */
    const isOwner = (n) => n.own === state.user;
    const canR = (n) => state.user === "root" || n.mode[isOwner(n) ? 1 : 7] === "r";
    const canX = (n) => state.user === "root" || n.mode[isOwner(n) ? 3 : 9] === "x";
    const size = (n) => (n.t === "d" ? 4096 : n.out.map(plain).join("\n").length + 1);

    /* "~/x", "../x", "/etc" → array de segmentos absolutos */
    const resolve = (p) => {
      let parts = state.cwd.slice();
      if (p === "~" || p.startsWith("~/")) { parts = home().slice(); p = p.slice(1); }
      else if (p.startsWith("/")) parts = [];
      p.split("/").forEach((s) => {
        if (!s || s === ".") return;
        if (s === "..") parts.pop(); else parts.push(s);
      });
      return parts;
    };
    /* → { node } | { err: "noent" | "notdir" | "perm" } */
    const lookup = (parts) => {
      let n = ROOT;
      for (const s of parts) {
        if (n.t !== "d") return { err: "notdir" };
        if (!canX(n))    return { err: "perm" };
        if (!has(n.ch, s)) return { err: "noent" };
        n = n.ch[s];
      }
      return { node: n };
    };
    const pathStr = () => {
      const c = state.cwd, h = home();
      return h.every((s, i) => c[i] === s)
        ? "~" + c.slice(h.length).map((s) => "/" + s).join("")
        : "/" + c.join("/");
    };

    const ERR_ES = {
      noent:  "No existe el fichero o el directorio",
      notdir: "No es un directorio",
      perm:   "Permiso denegado",
    };
    const CLEAR = Symbol("clear");
    const SHELL_RE = /^(\/(usr\/)?bin\/)?(sh|bash|zsh|dash)$/;
    /* salida animada: las líneas se revelan cada `ms` (ver play() en startShell) */
    const anim = (lines, ms) => { lines.delay = ms; return lines; };
    const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* `open <algo>` → sección de la página a la que hace scroll */
    const SECTIONS = {
      "panchi-bot": "panchibot", panchibot: "panchibot",
      "api-audit": "apiaudit", apiaudit: "apiaudit", auditoria: "apiaudit",
      atalaya: "atalaya",
      herramientas: "herramientas",
      nordwind: "adlab", "ad-lab": "adlab", adlab: "adlab", "nordwind-ad-lab": "adlab",
      "siege-map": "siege-map", siegemap: "siege-map",
      writeups: "writeups", arsenal: "stack", stack: "stack",
      contacto: "contact", contact: "contact", whoami: "whoami",
    };
    const openCmd = (args) => {
      const raw = args[0] || "";
      const name = raw.replace(/\/+$/, "").split("/").pop().replace(/\.(md|txt)$/, "").toLowerCase();
      const el = has(SECTIONS, name) && document.getElementById(SECTIONS[name]);
      if (!el) return fail(1, [
        raw ? escHtml(`open: no sé abrir '${raw}'`) : "uso: open &lt;sección&gt;",
        dim("prueba: api-audit · panchi-bot · atalaya · writeups · arsenal · contacto"),
      ]);
      setTimeout(() => el.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" }), 350);
      return [`abriendo ${escHtml(name)}…`];
    };

    const pretty = (parts) => {
      const h = home();
      return h.every((s, i) => parts[i] === s)
        ? "~" + parts.slice(h.length).map((s) => "/" + s).join("")
        : "/" + parts.join("/");
    };
    /* nombre coloreado según tipo, como `ls --color`. Con `at` (ruta absoluta)
       además es clicable: lanza cd/cat/ejecución — pensado para móvil */
    const paint = (name, n, at) => {
      const exe = n.t === "f" && n.mode.includes("x");
      const cls = n.t === "d" ? "sh__dir" : exe ? "sh__exe" : "";
      const p   = at && pretty(at);
      const run = !at ? "" : n.t === "d" ? `cd ${p} && ls` : exe ? p : `cat ${p}`;
      return `<span class="${cls}${run ? " sh__click" : ""}"` +
        (run ? ` data-run="${escHtml(run)}"` : "") + `>${escHtml(name)}</span>`;
    };
    const byName = (a, b) => a.replace(/^\./, "").localeCompare(b.replace(/^\./, ""));

    /* ── comandos: reciben args y devuelven líneas HTML ── */
    const CMDS = {
      help: () => [
        `  ${key("comandos disponibles")}`,
        `  ls [-la] [ruta]    lista ficheros`,
        `  cat &lt;fichero&gt;      muestra un fichero`,
        `  cd [dir]           cambia de directorio`,
        `  pwd · whoami · id · echo · history · clear`,
        `  ./&lt;fichero&gt;        ejecuta (si tienes permisos)`,
        `  neofetch           ficha del sistema (y mía)`,
        `  git log            trayectoria, en commits`,
        `  ps aux             en qué ando ahora`,
        `  open &lt;sección&gt;     salta a esa parte de la página`,
        `  ${dim("Tab autocompleta · ↑↓ historial · Ctrl+C · Ctrl+L")}`,
        `  man jorge          el manual del candidato`,
        `  ${dim("los nombres que saca ls se pueden pulsar")}`,
        `  ${dim("pista: no todo aparece con un simple ls")}`,
        `  ${dim("reto: consigue leer .flag.txt (empieza por notas.txt)")}`,
      ],

      ls: (args) => {
        const flags = args.filter((a) => a.startsWith("-")).join("");
        const all = flags.includes("a"), long = flags.includes("l");
        const targets = args.filter((a) => !a.startsWith("-"));
        if (!targets.length) targets.push(".");
        const out = [];
        targets.forEach((p) => {
          const base = resolve(p);
          const r = lookup(base);
          if (r.err) { state.code = 2; out.push(escHtml(`ls: no se puede acceder a '${p}': ${ERR_ES[r.err]}`)); return; }
          const n = r.node;
          let rows;
          if (n.t === "d") {
            if (!canR(n)) { state.code = 2; out.push(escHtml(`ls: no se puede abrir el directorio '${p}': ${ERR_ES.perm}`)); return; }
            rows = Object.keys(n.ch).filter((k) => all || !k.startsWith(".")).sort(byName)
              .map((k) => [k, n.ch[k], base.concat(k)]);
            if (all) rows.unshift([".", n, null], ["..", n, null]);
            if (targets.length > 1) out.push(escHtml(p) + ":");
            if (long) out.push(`total ${rows.length * 4}`);
          } else rows = [[p, n, base]];
          if (long) {
            rows.forEach(([k, c, at]) => out.push(
              `${c.mode} ${c.t === "d" ? 2 : 1} ${c.own.padEnd(12)} ${String(size(c)).padStart(4)} ${paint(k, c, at)}`
            ));
          } else if (rows.length) out.push(rows.map(([k, c, at]) => paint(k, c, at)).join("  "));
        });
        return out;
      },

      cat: (args) => {
        if (!args.length) return fail(1, ["uso: cat &lt;fichero&gt;"]);
        const out = [];
        args.forEach((p) => {
          const r = lookup(resolve(p));
          const e = r.err ? ERR_ES[r.err]
            : r.node.t === "d" ? "Es un directorio"
            : !canR(r.node)    ? ERR_ES.perm : null;
          if (e) {
            state.code = 1;
            out.push(escHtml(`cat: ${p}: ${e}`));
            if (e === ERR_ES.perm && /(^|\/)\.flag\.txt$/.test(p) && ++state.denied >= 3)
              out.push(dim("# pista: mira qué te deja `sudo -l` y busca ese binario en GTFOBins"));
          }
          else out.push(...r.node.out);
        });
        return out;
      },

      cd: (args) => {
        if (args.length > 1) return fail(1, ["cd: too many arguments"]);
        const p = args[0] || "~";
        const parts = resolve(p);
        const r = lookup(parts);
        const e = r.err === "noent" ? "no such file or directory"
          : r.err === "notdir" || (r.node && r.node.t !== "d") ? "not a directory"
          : r.err === "perm" || !canX(r.node) ? "permission denied" : null;
        if (e) return fail(1, [escHtml(`cd: ${e}: ${p}`)]);
        state.cwd = parts;
        PATH = pathStr();
        return [];
      },

      pwd:    () => ["/" + state.cwd.join("/")],
      whoami: () => [state.user],
      id:     () => [state.user === "root"
        ? "uid=0(root) gid=0(root) grupos=0(root)"
        : `uid=1000(${ME}) gid=1000(${ME}) grupos=1000(${ME}),27(sudo),988(docker)`],
      echo:   (args) => [escHtml(args.join(" "))],
      neofetch: () => {
        const info = [
          `${ok(ME)}@${ok("vps")}`,
          dim("─".repeat(ME.length + 4)),
          `${key("OS")}: Kali GNU/Linux Rolling`,
          `${key("Host")}: portfolio (nginx en Docker)`,
          `${key("Uptime")}: ${Math.max(1, Math.round(performance.now() / 60000))} min (tu visita)`,
          `${key("Shell")}: zsh simulada · 0 dependencias`,
          `${key("Rol")}: pentester junior · backend`,
          `${key("Recon")}: nmap gobuster ffuf feroxbuster`,
          `${key("Web/API")}: burp curl owasp-api-top-10`,
          `${key("AD")}: bloodhound impacket netexec hashcat`,
          `${key("Scripting")}: python bash scapy pwntools`,
          `${key("Foco")}: Active Directory (CRTP)`,
          `${key("Estado")}: ${ok("open to work")} · Madrid / remote`,
        ];
        if (term.clientWidth < 460) return info;            /* móvil: sin logo, no cabe */
        const logo = ["┌────────┐", "│ >_     │", "│        │", "└────────┘"];
        return info.map((l, i) => key(logo[i] || " ".repeat(10)) + "   " + l);
      },

      /* siempre formato --oneline: sin fechas que inventar */
      git: (args) => {
        const sub = args[0];
        const h = (s) => key(s);
        if (sub === "log") return [
          `${h("a3f9c1e")} ${dim("(")}${ok("HEAD -> main")}${dim(")")} wip: CRTP — Active Directory en nordwind-ad-lab`,
          `${h("7d2e4b0")} feat: 52 máquinas HTB comprometidas (con permiso)`,
          `${h("c41a9f3")} merge: PR aceptado en web-check (32k★) — RFC 9116`,
          `${h("5b8c2a6")} feat: atalaya — detección de amenazas en mi VPS`,
          `${h("e17f3d9")} fix: CSP sin inline en este portfolio (auto-auditoría)`,
          `${h("2c6d8f1")} feat: panchi-bot en producción (pedidos por WhatsApp)`,
          `${h("0000001")} init: curiosidad por cómo se rompen las cosas`,
        ];
        if (sub === "status") return [
          "En la rama main",
          "nada para hacer commit, el árbol de trabajo está limpio",
          dim("# (falta un commit: 'feat: primer trabajo como pentester')"),
        ];
        if (!sub) return fail(1, ["uso: git log | git status"]);
        return fail(1, [escHtml(`git: '${sub}' no es un comando de git. Prueba: git log`)]);
      },

      ps: () => [
        key("USER       PID %CPU COMMAND"),
        "root         1  0.0 /sbin/init",
        "root       412  0.1 nginx: master process",
        "www-data   413  0.3 nginx: worker (sirviéndote esto)",
        "jorgear+  1337 42.0 python3 estudiar_crtp.py",
        "jorgear+  2024 12.5 ./buscar_trabajo --rol pentester",
        "jorgear+  3001  0.7 atalaya --watch /var/log",
        "jorgear+  4242  0.0 -zsh (tú, ahora mismo)",
      ],

      /* find [ruta…] [-name glob] [-exec <shell> \;] — lo justo para el reto */
      find: (args) => {
        const i = args.findIndex((a) => a.startsWith("-"));
        const paths = i < 0 ? args.slice() : args.slice(0, i);
        const opts  = i < 0 ? [] : args.slice(i);
        if (!paths.length) paths.push(".");
        const ei = opts.indexOf("-exec");
        if (ei >= 0) {
          if (!SHELL_RE.test(opts[ei + 1] || ""))
            return fail(1, ["find: -exec: aquí solo se pueden lanzar shells (p. ej. /bin/sh)"]);
          if (state.user !== "root")
            return [dim("# shell nueva, mismos permisos de antes. Te falta algo delante.")];
          const won = [dim("# uid=0(root). Ya sabes qué fichero te quedaba por leer.")];
          won.spawn = true;
          return won;
        }
        const ni = opts.indexOf("-name");
        const re = ni >= 0 && opts[ni + 1]
          ? new RegExp("^" + opts[ni + 1].replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$")
          : null;
        const out = [];
        const walk = (n, label, name) => {
          if (!re || re.test(name)) out.push(n.t === "d" ? `<span class="sh__dir">${escHtml(label)}</span>` : escHtml(label));
          if (n.t !== "d") return;
          if (!canR(n) || !canX(n)) { state.code = 1; out.push(escHtml(`find: ‘${label}’: ${ERR_ES.perm}`)); return; }
          Object.keys(n.ch).sort(byName).forEach((k) => walk(n.ch[k], label.replace(/\/$/, "") + "/" + k, k));
        };
        paths.forEach((p) => {
          const r = lookup(resolve(p));
          if (r.err) { state.code = 1; out.push(escHtml(`find: ‘${p}’: ${ERR_ES[r.err]}`)); return; }
          walk(r.node, p, p.split("/").filter(Boolean).pop() || p);
        });
        return out;
      },

      sudo: (args) => {
        if (!args.length) return fail(1, ["uso: sudo -l | sudo &lt;comando&gt;"]);
        if (state.user === "root") return exec(args.join(" "));       /* root no necesita sudo */
        if (args[0] === "-l") return [
          `El usuario ${ME} puede ejecutar los siguientes comandos en vps:`,
          `    (root) ${key("NOPASSWD")}: /usr/bin/find`,
        ];
        if (args[0] === "find" || args[0] === "/usr/bin/find") {
          state.user = "root";                                        /* find corre como root… */
          const r = CMDS.find(args.slice(1));
          if (r.spawn) PATH = pathStr();                              /* …y si lanzó una shell, te la quedas */
          else state.user = ME;
          return r;
        }
        const bin = args[0].includes("/") ? args[0] : "/usr/bin/" + args[0];
        return fail(1, [escHtml(
          `Lo sentimos, el usuario ${ME} no está autorizado para ejecutar «${[bin, ...args.slice(1)].join(" ")}» como root en vps.`
        )]);
      },

      su: () => (state.user === "root" ? [] : fail(1, [
        "su: Fallo de autenticación",
        dim("# la contraseña no la vas a adivinar. Mira qué te deja hacer sudo."),
      ])),

      exit: () => {
        if (state.user !== "root") return ["no hay escapatoria: esto es un portfolio. Sigue haciendo scroll."];
        state.user = ME;                                              /* sales de la shell de root */
        PATH = pathStr();
        return [];
      },

      /* ── huevos de pascua ── */
      rm: (args) => {
        const flags = args.filter((a) => a.startsWith("-")).join("");
        const targets = args.filter((a) => !a.startsWith("-"));
        if (!targets.length) return fail(1, ["rm: falta un operando"]);
        if (/r/i.test(flags) && targets.some((t) => ["/", "/*", "~", "~/", "*", "."].includes(t))) {
          state.code = 1;
          return anim([
            "rm: borrando /etc …",
            `rm: borrando /home/${ME}/projects …`,
            "rm: borrando write-ups de 52 máquinas …",
            "rm: borrando tu confianza en mí …",
            "&nbsp;",
            `${key("es broma.")} Sistema de ficheros de solo lectura. Buen intento.`,
          ], 320);
        }
        return fail(1, targets.map((t) =>
          escHtml(`rm: no se puede borrar '${t}': Sistema de ficheros de solo lectura`)));
      },

      vim: (args) => {
        state.mode = "vim";                       /* de aquí solo se sale con :q! (ver submit) */
        return [
          frame("~"), frame("~"),
          `${escHtml(args[0] ? `"${args[0]}"` : "[Sin nombre]")} ${dim("— has entrado en vim. Suerte saliendo.")}`,
        ];
      },
      vi:    (args) => CMDS.vim(args),
      nano:  () => fail(127, ["zsh: command not found: nano", dim("# en esta casa se usa vim")]),
      emacs: () => fail(127, ["zsh: command not found: emacs", dim("# un sistema operativo dentro de un portfolio era demasiado")]),

      man: (args) => {
        if (!args.length) return fail(1, ["¿Qué página de manual desea?", dim("por ejemplo: man jorge")]);
        if (!["jorge", "jae", ME].includes(args[0].toLowerCase()))
          return fail(16, [escHtml(`No hay ninguna página sobre ${args[0]}`), dim("prueba: man jorge")]);
        const h = (s) => key(s);
        return [
          `JORGE(1)   ${dim("Manual del candidato")}   JORGE(1)`,
          "&nbsp;",
          h("NOMBRE"),
          "    jorge — pentester junior con base de backend",
          h("SINOPSIS"),
          "    jorge [--madrid | --remoto] [--aprender]",
          h("DESCRIPCIÓN"),
          "    Enumera, explota y documenta. Monta sus propios",
          "    labs, ataca sus propios VPS y luego los endurece.",
          h("OPCIONES"),
          "    --aprender  activa por defecto; no se puede quitar",
          h("ERRORES"),
          "    Se emociona demasiado cuando consigue una shell.",
          h("VÉASE TAMBIÉN"),
          "    ./hire_me.sh, git log, open contacto",
        ];
      },

      nmap: () => fail(1, ["nmap: aquí no hay red que escanear.", dim("# pero hay algo parecido: ./scan.sh")]),
      uname: (args) => [args.join("").includes("a")
        ? "Linux vps 6.12.0-kali-amd64 #1 SMP x86_64 GNU/Linux" : "Linux"],
      hostname: () => ["vps"],
      date: () => [escHtml(new Date().toLocaleString("es-ES", { dateStyle: "full", timeStyle: "medium" }))],
      reboot:   () => fail(1, ["reboot: este portfolio no se reinicia. Lleva arriba desde que lo desplegué."]),
      shutdown: () => fail(1, ["shutdown: ni lo sueñes."]),

      open: openCmd,
      "xdg-open": openCmd,

      history: () => hist.map((h, i) => `${String(i + 1).padStart(5)}  ${escHtml(h)}`),
      clear:  () => CLEAR,
    };

    ["ping", "ssh", "nc", "curl", "wget", "telnet", "ftp"].forEach((c) => {
      CMDS[c] = () => fail(1, [`${c}: La red es inaccesible`, dim("# esto es un portfolio, no un pivote")]);
    });

    /* ./algo o /ruta/algo → intento de ejecución */
    const runPath = (cmd, args) => {
      const r = lookup(resolve(cmd));
      if (r.err === "noent" || r.err === "notdir")
        return fail(127, [escHtml(`zsh: no such file or directory: ${cmd}`)]);
      if (r.err || r.node.t === "d" || !r.node.mode.includes("x") || !canX(r.node))
        return fail(126, [escHtml(`zsh: permission denied: ${cmd}`)]);
      return r.node.run ? r.node.run(args) : [];
    };

    /* $? y unas pocas variables de entorno (las comillas simples no expanden) */
    const expand = (t) => {
      const v = {
        "?": String(state.code), USER: state.user, HOME: "/" + home().join("/"),
        PWD: "/" + state.cwd.join("/"), SHELL: "/usr/bin/zsh", HOSTNAME: "vps",
      };
      return t.replace(/\$(\?|[A-Za-z_]\w*)/g, (m, k) => (has(v, k) ? v[k] : ""));
    };

    /* un comando simple → líneas HTML (o CLEAR); deja el exit code en state.code */
    const exec = (line) => {
      const tok = (line.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((t) =>
        t[0] === "'" ? t.replace(/^'(.*)'$/, "$1") : expand(t.replace(/^"(.*)"$/, "$1")));
      if (!tok.length || !tok[0]) return [];
      const [cmd, ...args] = tok;
      state.code = 0;
      if (cmd.includes("/")) return runPath(cmd, args);
      if (has(CMDS, cmd))    return CMDS[cmd](args);
      return fail(127, [escHtml(`zsh: command not found: ${cmd}`)]);
    };

    /* línea completa: encadena con ; && || según el exit code */
    const execLine = (line) => {
      /* el `\;` (o ';') que cierra un -exec no es un separador: se protege antes de partir */
      const parts = line.replace(/\\;|';'|";"/g, "\u0001")
        .split(/\s*(&&|\|\||;)\s*/)                    /* [cmd, op, cmd, op, …] */
        .map((s) => s.replace(/\u0001/g, "\\;"));
      let lines = [], clear = false, delay = 0;
      for (let i = 0; i < parts.length; i += 2) {
        const op = parts[i - 1];
        if ((op === "&&" && state.code !== 0) || (op === "||" && state.code === 0)) continue;
        const r = exec(parts[i]);
        if (r === CLEAR) { clear = true; lines = []; delay = 0; }
        else if (r) { lines.push(...r); delay = Math.max(delay, r.delay || 0); }
      }
      return { clear, lines, delay };
    };

    /* ── entrada: <input> invisible (necesario para el teclado en móvil);
          lo tecleado se refleja en la 2ª línea del prompt ── */
    const startShell = () => {
      const box = term.closest(".hero__terminal");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "sh__input";
      input.setAttribute("aria-label", "shell interactiva: escribe un comando");
      input.setAttribute("autocomplete", "off");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("enterkeyhint", "send");
      input.spellcheck = false;
      box.appendChild(input);
      box.classList.add("is-shell");

      let lineLi = null;
      let busy = false, abort = false;   /* busy = hay una salida animada en curso */
      const cmdSpan = (s) => `<span class="kp__cmd">${escHtml(s)}</span>`;

      /* pinta la línea activa con el cursor de bloque en su posición */
      const render = () => {
        if (busy) return;
        const v = input.value;
        const pos = input.selectionStart == null ? v.length : input.selectionStart;
        lineLi.innerHTML = promptSym() + " " + cmdSpan(v.slice(0, pos)) +
          `<span class="sh__cur">${pos < v.length ? escHtml(v[pos]) : " "}</span>` +
          cmdSpan(v.slice(pos + 1));
        term.scrollTop = term.scrollHeight;   /* la línea ya tiene alto: ahora sí, al fondo */
      };
      const newPrompt = () => {
        if (!state.mode) addLi(promptTop(), "log kp");
        lineLi = addLi("", "log kp sh__line");
        lineLi.setAttribute("aria-hidden", "true");   /* el lector ya lee el <input> */
        render();
      };

      /* congela la línea activa tal cual (sin cursor) en el historial visible */
      const freeze = (suffix) => {
        lineLi.innerHTML = promptSym() + " " + cmdSpan(input.value + (suffix || ""));
        lineLi.removeAttribute("aria-hidden");
        term.scrollTop = term.scrollHeight;
      };
      const cls = () => { term.innerHTML = ""; term.classList.add("is-cleared"); };
      const toEnd = () => input.setSelectionRange(input.value.length, input.value.length);

      /* ── historial ↑/↓ (guarda lo que estabas tecleando) ── */
      let hi = hist.length, draft = "";
      const recall = (d) => {
        const n = hi + d;
        if (n < 0 || n > hist.length) return;
        if (hi === hist.length) draft = input.value;
        hi = n;
        input.value = hi === hist.length ? draft : hist[hi];
        toEnd();
        render();
      };

      const submit = () => {
        const line = input.value.trim();
        freeze();
        input.value = "";
        if (state.mode === "vim") {               /* atrapado en vim hasta :q! */
          if (/^(:?(q|wq|x|qa)!?|ZZ)$/.test(line)) {
            state.mode = null;
            addLi(dim("# has salido de vim. Eso también cuenta como habilidad."), "log jl sh");
            addLi("&nbsp;", "log");
          } else {
            addLi(line
              ? escHtml(`E492: No es una orden del editor: ${line.replace(/^:/, "")}`)
              : dim("-- INSERTAR --"), "log jl sh");
          }
          newPrompt();
          return;
        }
        if (line && hist[hist.length - 1] !== line) hist.push(line);
        hi = hist.length; draft = "";
        const r = execLine(line);
        if (r.clear) cls();
        play(r.lines, r.delay, () => {
          if (!r.clear || r.lines.length) addLi("&nbsp;", "log");
          newPrompt();
        });
      };

      /* imprime la salida; si lleva delay, línea a línea y cancelable con Ctrl+C */
      const play = (lines, delay, done) => {
        if (!delay || REDUCE) { lines.forEach((l) => addLi(l, "log jl sh")); done(); return; }
        busy = true; abort = false;
        let i = 0;
        const step = () => {
          if (abort) { addLi("^C", "log jl sh"); state.code = 130; }
          else if (i < lines.length) { addLi(lines[i++], "log jl sh"); setTimeout(step, delay); return; }
          busy = false;
          input.value = "";
          done();
        };
        step();
      };

      /* Ctrl+C: descarta la línea, como una shell real ($? = 130) */
      const interrupt = () => {
        freeze("^C");
        input.value = "";
        hi = hist.length; draft = "";
        if (state.mode === "vim") {               /* el mensaje real de vim ante Ctrl+C */
          addLi(escHtml("Escriba  :qa!  y pulse <Intro> para salir de Vim"), "log jl sh");
          newPrompt();
          return;
        }
        state.code = 130;
        addLi("&nbsp;", "log");
        newPrompt();
      };

      /* ── Tab: completa comandos (1ª palabra) o rutas del FS ── */
      const lcp = (a) => a.reduce((p, s) => {
        let i = 0;
        while (i < p.length && p[i] === s[i]) i++;
        return p.slice(0, i);
      });
      const complete = () => {
        const v = input.value;
        if (state.mode) return;
        if (input.selectionStart !== v.length) return;          /* solo al final de línea */
        const seg   = v.split(/&&|\|\||;/).pop().replace(/^\s+/, "");
        const words = seg.split(/\s+/);
        const isCmd = words.length === 1 || (words.length === 2 && words[0] === "sudo");
        const word  = words[words.length - 1];
        let base, cands;                                        /* cands: [nombre, sufijo, html] */
        if (isCmd && !word.includes("/")) {
          if (!word) return;
          base  = word;
          cands = Object.keys(CMDS).filter((k) => k.startsWith(word)).sort()
            .map((k) => [k, " ", escHtml(k)]);
        } else {
          const cut = word.lastIndexOf("/") + 1;
          base = word.slice(cut);
          const r = lookup(resolve(word.slice(0, cut) || "."));
          if (r.err || r.node.t !== "d" || !canR(r.node)) return;
          const ch = r.node.ch;
          const onlyDirs = words[0] === "cd";
          cands = Object.keys(ch)
            .filter((k) => k.startsWith(base)
              && (base.startsWith(".") || !k.startsWith("."))
              && (!onlyDirs || ch[k].t === "d"))
            .sort(byName)
            .map((k) => [k, ch[k].t === "d" ? "/" : " ", paint(k, ch[k])]);
        }
        if (!cands.length) return;
        const stem = v.slice(0, v.length - base.length);
        if (cands.length === 1) { input.value = stem + cands[0][0] + cands[0][1]; render(); return; }
        const common = lcp(cands.map((c) => c[0]));
        if (common.length > base.length) { input.value = stem + common; render(); return; }
        /* ambiguo y sin avance → lista las opciones y repite el prompt */
        freeze();
        addLi(cands.map((c) => c[2]).join("  "), "log jl sh");
        newPrompt();
      };

      input.addEventListener("input", () => { if (busy) input.value = ""; render(); });
      input.addEventListener("keydown", (e) => {
        const k = e.key;
        if (busy) {                                             /* solo se atiende Ctrl+C */
          if (e.ctrlKey && k.toLowerCase() === "c" && !String(window.getSelection())) abort = true;
          if (!e.ctrlKey && !e.metaKey) e.preventDefault();
          return;
        }
        if (k === "Tab")   { e.preventDefault(); complete(); return; }
        if (k === "Enter") { e.preventDefault(); submit();   return; }
        if (k === "ArrowUp" || k === "ArrowDown") {
          e.preventDefault();
          recall(k === "ArrowUp" ? -1 : 1);
          return;
        }
        if (e.ctrlKey && !e.altKey && !e.metaKey) {
          const c = k.toLowerCase();
          if (c === "c") {
            if (String(window.getSelection())) return;          /* hay texto seleccionado → copiar */
            e.preventDefault(); interrupt(); return;
          }
          if (c === "l") { e.preventDefault(); cls(); newPrompt(); return; }
          if (c === "u") { e.preventDefault(); input.value = ""; render(); return; }
          if (c === "a") { e.preventDefault(); input.setSelectionRange(0, 0); render(); return; }
          if (c === "e") { e.preventDefault(); toEnd(); render(); return; }
        }
        requestAnimationFrame(render);                          /* ←/→, inicio, fin… */
      });
      input.addEventListener("focus", () => box.classList.add("is-focus"));
      input.addEventListener("blur",  () => box.classList.remove("is-focus"));

      /* clic en el terminal → foco (salvo enlaces o selección de texto) */
      box.addEventListener("click", (e) => {
        const t = e.target.closest("[data-run]");               /* nombre de ls pulsado → lo lanza */
        if (t) {
          if (!busy && !state.mode) { input.value = t.dataset.run; submit(); }
          return;                                               /* sin foco: no abre el teclado en móvil */
        }
        if (e.target.closest("a")) return;
        if (String(window.getSelection())) return;
        input.focus({ preventScroll: true });
      });

      addLi("&nbsp;", "log");
      addLi(`<span class="sh__hint"># hay un reto: captura la bandera (.flag.txt)</span>`, "log jl sh");
      addLi("&nbsp;", "log");
      newPrompt();
    };

    /* fin de la animación → la shell pasa a ser interactiva */
    const finish = () => startShell();

    const runAll = (idx) => {
      if (idx >= SCRIPT.length) { finish(); return; }
      if (idx > 0) addLi("&nbsp;", "log");          /* línea en blanco entre comandos */
      runBlock(SCRIPT[idx], () => runAll(idx + 1));
    };

    setTimeout(() => runAll(0), BOOT_DELAY);
  }

  /* ── 02b · nombre del hero: se "desclasifica" al cargar ─────────
     Redaction 70 → 35 → 0 (de pixelado a limpio). Los tres grados
     comparten métricas, así que no hay salto de layout. Sin JS o con
     reduced-motion el nombre se queda directamente en el grado 0.   */
  const heroName = $(".hero__name");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroName && !calm && document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('400 1em "Redaction 70"'),
      document.fonts.load('400 1em "Redaction 35"'),
    ]).then(() => {
      heroName.classList.add("is-g70");
      setTimeout(() => heroName.classList.replace("is-g70", "is-g35"), 520);
      setTimeout(() => heroName.classList.remove("is-g35"), 900);
    }).catch(() => {});
  }

  /* ── 03 · scroll reveal (sections + features) ──────────────────── */
  /* nota: .wu se renderiza antes de llegar aquí          */
  const targets = [
    ...$$(".section__head"),
    ...$$(".whoami__head"),
    ...$$(".whoami__card"),
    ...$$(".whoami__copy"),
    ...$$(".case__lede"),
    ...$$(".adlab__shot"),
    ...$$(".chain__step"),
    ...$$(".adlab__credit"),
    ...$$(".metrics"),
    ...$$(".arch"),
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

    // la altura del marco sigue a la imagen activa (evita huecos si varían de proporción)
    const fitHeight = () => {
      const h = imgs[current].getBoundingClientRect().height;
      if (h) carousel.style.height = `${h}px`;
    };

    const goTo = (idx) => {
      current = (idx + imgs.length) % imgs.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("is-active", i === current));
      fitHeight();
    };

    // reajusta cuando cada imagen (lazy) termina de cargar y al redimensionar
    imgs.forEach((im) => { if (!im.complete) im.addEventListener("load", fitHeight); });
    window.addEventListener("resize", fitHeight);
    fitHeight();

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

  /* ── 06b · carrusel de shells simuladas (03d · contenedor.sh, host.sh)
     Cada <pre data-typer> trae su salida completa en el HTML (sin JS
     se ven todas seguidas). Con JS: una shell visible a la vez; al
     mostrarse por primera vez teclea el comando y vuelca las líneas
     una a una con autoscroll. Pestañas y flechas cambian de shell. */
  // puede haber varios carruseles (03d Docker Deploy, 01/tcp pentest de API)
  document.querySelectorAll("[data-shells]").forEach((shells) => {
    const calm   = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pres   = Array.from(shells.querySelectorAll("[data-typer]"));
    const tabs   = Array.from(shells.querySelectorAll("[data-shell-tab]"));
    const count  = shells.querySelector("[data-shell-count]");
    const CMD    = /(<b data-cmd[^>]*>)[^<]*(<\/b>)/;
    const cursor = '<span class="proj__term-cursor"></span>';
    const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));

    // prepara cada shell. Solo la primera se anima (prompt vacío → teclea →
    // vuelca); el resto aparece ya impreso, con el prompt final esperando.
    const runs = pres.map((pre, idx) => {
      if (calm) return () => {};
      const lines     = pre.innerHTML.split("\n");
      const promptLen = lines.findIndex((l) => l.includes("data-cmd")) + 1;
      const cmd       = pre.querySelector("[data-cmd]")?.textContent || "";
      const head      = lines.slice(0, promptLen).join("\n");
      const empty     = head.replace(CMD, "$1$2");
      const out       = lines.slice(promptLen);
      if (idx > 0) {
        // prompt final sin los comentarios que pueda llevar delante (# H-01 …)
        const prompt = empty.split("\n").slice(-2).join("\n");
        pre.innerHTML += "\n\n" + prompt + cursor;
        return () => {};
      }
      let started = false;
      pre.innerHTML = empty + cursor;

      return async () => {
        if (started) return;
        started = true;
        await sleep(400);
        const cmdNode = pre.querySelector("[data-cmd]");
        for (let i = 1; i <= cmd.length; i++) {
          cmdNode.textContent = cmd.slice(0, i);
          await sleep(38 + Math.random() * 50);
        }
        await sleep(450);
        let buf = head;
        for (const ln of out) {
          buf += "\n" + ln;
          pre.innerHTML = buf;
          pre.scrollTop = pre.scrollHeight;
          await sleep(ln.trim() ? 45 : 140);
        }
        pre.innerHTML = buf + "\n\n" + empty + cursor;   // línea en blanco antes del prompt final
        pre.scrollTop = pre.scrollHeight;
      };
    });

    let current = 0;
    let visible = false;   // no animar hasta que el bloque entre en pantalla
    const goTo = (idx) => {
      current = (idx + pres.length) % pres.length;
      pres.forEach((p, i) => { p.hidden = i !== current; });
      tabs.forEach((t, i) => {
        t.classList.toggle("is-active", i === current);
        t.setAttribute("aria-selected", String(i === current));
      });
      if (count) count.textContent = `${current + 1}/${pres.length}`;
      if (visible) runs[current]();
    };

    tabs.forEach((t, i) => t.addEventListener("click", () => goTo(i)));
    shells.querySelector("[data-shell-prev]")?.addEventListener("click", () => goTo(current - 1));
    shells.querySelector("[data-shell-next]")?.addEventListener("click", () => goTo(current + 1));
    shells.classList.add("is-ready");
    goTo(0);

    if ("IntersectionObserver" in window) {
      const sio = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          sio.disconnect();
          visible = true;
          runs[current]();
        }
      }, { threshold: 0.35 });
      sio.observe(shells);
    } else {
      visible = true;
      runs[current]();
    }
  });

  /* ── 07 · console easter egg ────────────────────────────────────── */
  if (typeof console !== "undefined") {
    const style = "color:#ffb627;font:600 12px/1.4 Commit Mono,monospace;";
    console.log("%c// jae-portfolio · v1.0.0", style);
    console.log(
      "%cSi estás leyendo esto por curiosidad, ya nos entenderíamos. → jorgesiemprearmando@gmail.com",
      "color:#a59d89;font:400 12px/1.5 Commit Mono,monospace;"
    );
  }
})();
