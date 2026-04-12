/* ══════════════════════════════════════════════════════════════════
   JAE-PORTFOLIO · interactions
   vanilla js · no deps · no bundler
   ══════════════════════════════════════════════════════════════════ */

(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── 01 · session uptime counter ───────────────────────────── */
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

  /* ── 02 · hero runtime log streamer ────────────────────────── */
  const term   = $("[data-logs]");
  const cursor = $(".hero__terminal-cursor");
  const foot   = $(".hero__terminal-foot");

  if (term && cursor && foot) {
    /* logs reales sobre jorge como candidato.
       formato: [level, tag, message] · level: ok|inf|wrn|err  */
    const LOGS = [
      ["ok",  "init",  "escaneando sujeto: jorge.armando.escobar"],
      ["ok",  "os",    "linux · bash avanzado · scripting ofensivo"],
      ["ok",  "lang",  "python 3.12 · automatización · exploits"],
      ["ok",  "recon", "nmap · enumeración de puertos y servicios"],
      ["ok",  "web",   "burp suite · análisis de tráfico http/s"],
      ["ok",  "web",   "inyecciones · broken auth · owasp top 10"],
      ["ok",  "ad",    "active directory · kerberoasting · bloodhound"],
      ["ok",  "ad",    "pass-the-hash · privilege escalation"],
      ["ok",  "api",   "rest api hacking · jwt abuse · fuzzing"],
      ["ok",  "infra", "docker · redes · pivoting · tunneling"],
      ["ok",  "ctf",   "htb · thm · ctf activo"],
      ["inf", "tools", "metasploit · impacket · crackmapexec"],
      ["inf", "tools", "gobuster · ffuf · hashcat · john"],
      ["inf", "back",  "flask · fastapi · sql · redis"],
      ["wrn", "avail", "candidato activamente buscando"],
      ["ok",  "ready", "sistema listo · esperando oferta"],
    ];

    const TOTAL      = 10;
    const STEP       = 240;  /* ms entre log y log */
    const BOOT_DELAY = 1000; /* ms antes de empezar a escribir */
    const TYPE_SPEED = 55;   /* ms entre carácter y carácter */
    const CMD        = "./scan-candidate.sh --subject=jae";

    const pad    = (n) => String(n).padStart(2, "0");
    const fmtTs  = (s) => `+${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
    const fmtTag = (t) => {
      const w = 5, sp = w - t.length;
      const l = Math.floor(sp / 2), r = sp - l;
      return "[" + "\u00a0".repeat(l) + t + "\u00a0".repeat(r) + "]";
    };
    const pick   = LOGS.slice(0, TOTAL);

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

          /* fase 2 · pausa corta, "enter", empieza el output */
          setTimeout(() => {
            cursor.classList.remove("blink");
            cursor.style.opacity = "0";

            let t = 0;
            pick.forEach(([lvl, tag, msg], i) => {
              t += 1 + Math.floor(Math.random() * 3);
              const ts = t;
              setTimeout(() => {
                const li = document.createElement("li");
                li.className = "log";
                li.innerHTML =
                  `<span class="log__ts">[${fmtTs(ts)}]</span>` +
                  `<span class="log__lvl log__lvl--${lvl}">${lvl.toUpperCase()}</span>` +
                  `<span class="log__tag">${fmtTag(tag)}</span>` +
                  `<span class="log__msg">${msg}</span>`;
                term.appendChild(li);
              }, i * STEP);
            });
          }, 400);
        }
      }, TYPE_SPEED);
    }, BOOT_DELAY);
  }

  /* ── 03 · scroll reveal (sections + features) ─────────────── */
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

  /* ── 04 · arch diagram tabs ────────────────────────────────── */
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
        const active = panels.find(p => p.dataset.archPanel === target);
        if (active) active.classList.add("is-active");
      });
    });
  });

  /* ── 05 · lightbox ─────────────────────────────────────────── */
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

  /* ── 06 · console easter egg ───────────────────────────────── */
  if (typeof console !== "undefined") {
    const style = "color:#ffb627;font:600 12px/1.4 JetBrains Mono,monospace;";
    console.log("%c// jae-portfolio · v1.0.0", style);
    console.log(
      "%cSi estás leyendo esto por curiosidad, ya nos entenderíamos. → hola@ejemplo.com",
      "color:#a59d89;font:400 12px/1.5 JetBrains Mono,monospace;"
    );
  }
})();
