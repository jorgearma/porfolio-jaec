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
    },
    {
      idx:   "f/04",
      title: "Triple verificación HMAC",
      body:  'Tres webhooks entrantes, tres algoritmos de firma distintos: ' +
             'Twilio (<span class="mono">X-Twilio-Signature</span>), ' +
             'Meta (<span class="mono">HMAC-SHA256</span> con app secret), ' +
             'Monei (<span class="mono">HMAC</span> con webhook secret). Ningún ' +
             "endpoint confía en el cliente.",
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
   cliente whatsapp            stripe/monei               google maps
         │                         ▲                           ▲
         │ mensajes                │ webhook pago              │ geocoding
         ▼                         │                           │
 ┌───────────────┐  verify HMAC  ┌─┴───────────────────────────┴─┐
 │  BLUEPRINTS   │◄─────────────►│        SERVICES (adapters)    │
 │  webhook/meta │                │  whatsapp · monei · maps ·   │
 │  webhook/twil │                │  tokens · auth · sessions    │
 │  /api  /menu  │                └─┬─────────────────────────────┘
 │  /dashboard   │                  │
 │  /cocina /rep │                  ▼
 └──────┬────────┘           ┌──────────────┐
        │                    │ CONTROLLERS  │    lógica de negocio
        │                    │  registro    │    (carrito, pago,
        │                    │  carrito     │     pedido, notifiers)
        │                    │  pago        │
        │                    └──────┬───────┘
        │                           │
        ▼                           ▼
 ┌──────────────────────────────────────────────────┐
 │   MANAGERS     ·   acceso a estado y persistencia │
 │   gestor_pedidos · gestor_productos · gestor_redis│
 │   gestor_usuarios · gestor_metricas · dashboard   │
 └──────┬──────────────────────────┬─────────────────┘
        │                          │
        ▼                          ▼
   ┌─────────┐               ┌───────────┐
   │ SQL SVR │               │   REDIS   │   state machine
   │  ORM    │               │   queues  │   ephemeral state
   └─────────┘               └───────────┘   RQ workers
`,
    },
    {
      tab: "flujo de pedido",
      content: `
  WhatsApp (Meta Cloud API)
        │
        │  POST /webhook/meta  ←  HMAC-SHA256 verificado
        ▼
  ┌─────────────────┐
  │   blueprint     │   webhook recibe mensaje del cliente
  │   webhook/meta  │──► Redis Queue (RQ worker)
  └─────────────────┘        │
                             │  ¿cliente registrado?
                    ┌────────┴────────┐
                   no                sí
                    │                 │
                    ▼                 ▼
           máquina de estados    menú / carrito
           Redis · TTL/conv.          │
                    │                 │
           enviar SMS verif.    selección de productos
           número confirmado         │
                    │                 ▼
                    └────────►  introducir dirección
                                      │
                               geofencing + catálogo calles
                               ¿dentro del polígono de reparto?
                                  ┌───┴───┐
                                 sí       no → rechazar con msg
                                  │
                                  ▼
                            pago online · Monei
                            webhook pago verificado
                                  │
                                  ▼
                       pedido confirmado en BD (SQL Server)
                                  │
                       ┌──────────┼──────────┐
                       ▼          ▼          ▼
                    cocina      picker   repartidor
                  notificado  notificado  asignado
`,
    },
    {
      tab: "roles",
      content: `
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │    DASHBOARD     │  │      COCINA       │  │      PICKER      │  │    REPARTIDOR    │
  │    /admin        │  │      PWA          │  │    /almacen      │  │    /reparto      │
  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
  │ pedidos del día  │  │ cola de pedidos   │  │ lista de items   │  │ pedidos asign.   │
  │ ingresos / ticket│  │ en tiempo real    │  │ a preparar       │  │ nombre cliente   │
  │ mapa de reparto  │  │ líneas de producto│  │ cantidad / ubic. │  │ dirección exacta │
  │ gestión usuarios │  │ marcar listo      │  │ en almacén       │  │ ubicación en map │
  │ catálogo productos│ │ tiempo por pedido │  │ marcar preparado │  │ marcar entregado │
  │ zonas de reparto │  │                  │  │                  │  │ historial ruta   │
  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
           │                    │                      │                      │
           └────────────────────┴──────────────────────┴──────────────────────┘
                                               │
                                    JWT por rol · sesión propia
                                    estado sincronizado vía Redis
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

    archContainer.innerHTML =
      `<div class="arch__head mono">` +
        `<div class="arch__tabs" role="tablist">${tabsHTML}</div>` +
        `<span class="arch__file">panchi-bot/diagrams.txt</span>` +
      `</div>${panelsHTML}`;
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
      { plain: `  "skills": ["Web Pentesting", "Linux", "Nmap", "Burp Suite", "Python"],`,                                 html: `  ${k("skills")}${p(":")} ${arr(["Web Pentesting", "Linux", "Nmap", "Burp Suite", "Python"])}${p(",")}` },
      { plain: `  "ad": ["Active Directory", "BloodHound", "Kerberoasting", ],`,                                           html: `  ${k("ad")}${p(":")} ${arr(["Active Directory", "BloodHound", "Kerberoasting", "Pass-the-Hash", "LDAP enum"])}${p(",")}` },
      { plain: `  "tools": ["Metasploit", "Impacket", "CrackMapExec", "Gobuster", "ffuf",],`,                              html: `  ${k("tools")}${p(":")} ${arr(["Metasploit", "Impacket", "CrackMapExec", "Gobuster", "ffuf",])}${p(",")}` },
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
            typeAll(LINES);
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

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.archTab;
        tabs.forEach((t)   => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
        panels.forEach((p) => p.classList.remove("is-active"));
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        const active = panels.find((p) => p.dataset.archPanel === target);
        if (active) active.classList.add("is-active");
      });
    });
  });

  /* ── 05 · lightbox ──────────────────────────────────────────────── */
  const lightbox  = $("#lightbox");
  const lbImg     = $("#lightbox-img");
  const lbClose   = $("#lightbox-close");

  const lbOpen = (src, alt) => {
    lbImg.src = src;
    lbImg.alt = alt;
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };
  const lbShut = () => {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  $$(".proj__demo-screen img").forEach((img) => {
    img.addEventListener("click", () => lbOpen(img.src, img.alt));
  });

  lbClose.addEventListener("click", lbShut);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lbShut(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") lbShut(); });

  /* ── 06 · console easter egg ────────────────────────────────────── */
  if (typeof console !== "undefined") {
    const style = "color:#ffb627;font:600 12px/1.4 JetBrains Mono,monospace;";
    console.log("%c// jae-portfolio · v1.0.0", style);
    console.log(
      "%cSi estás leyendo esto por curiosidad, ya nos entenderíamos. → hola@ejemplo.com",
      "color:#a59d89;font:400 12px/1.5 JetBrains Mono,monospace;"
    );
  }
})();
