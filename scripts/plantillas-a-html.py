#!/usr/bin/env python3
"""Mete las plantillas de hardened-docker-deploy en el carrusel de shells (sección 03d).

Uso:  python3 scripts/plantillas-a-html.py [ruta/al/repo/hardened-docker-deploy]
      (por defecto ~/docker-nginx-conf)

Genera un <pre data-typer> por fichero ("cat <fichero>" + contenido coloreado y escapado)
y lo escribe en index.html entre <!-- plantillas:inicio --> y <!-- plantillas:fin -->.
Las pestañas de esas shells están en index.html, a mano (no las toca este script).
"""
import html
import re
import sys
from pathlib import Path

REPO = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "docker-nginx-conf")
INDEX = Path(__file__).resolve().parent.parent / "index.html"

# (id del <pre>, etiqueta de la pestaña, ruta dentro del repo, tipo)
FICHEROS = [
    ("shell-dockerfile", "Dockerfile", "dockerfile/Dockerfile.python", "docker"),
    ("shell-compose", "compose.yml", "compose/compose.proxy-app-db.yml", "yaml"),
    ("shell-nginx", "nginx.conf", "nginx/proxy.conf", "nginx"),
]

INICIO, FIN = "<!-- plantillas:inicio -->", "<!-- plantillas:fin -->"
esc = lambda s: html.escape(s, quote=False)
span = lambda cls, s: f'<span class="{cls}">{esc(s)}</span>' if s else ""

DOCKER_INSTR = re.compile(r"^(\s*)(FROM|RUN|COPY|ADD|ENV|ARG|WORKDIR|USER|EXPOSE|CMD|ENTRYPOINT|"
                          r"HEALTHCHECK|LABEL|SHELL|VOLUME|STOPSIGNAL|ONBUILD)\b(.*)$")
YAML_KEY = re.compile(r"^(\s*(?:-\s+)?)([A-Za-z_<][\w.<-]*)(:)((?:\s.*)?)$")   # "clave:" + espacio o fin
NGINX_DIR = re.compile(r"^(\s*)([a-z_]+)\b(.*)$")
CADENA = re.compile(r'("[^"]*"|\'[^\']*\')')
COMENTARIO_FINAL = re.compile(r"^(.*?\S)(\s+)(#\s.*)$")


def cadenas(s):
    """Texto normal con las cadenas entre comillas en ámbar."""
    return "".join(span("t-am", p) if CADENA.fullmatch(p) else esc(p) for p in CADENA.split(s))


def codigo(s, tipo):
    m = {"docker": DOCKER_INSTR, "yaml": YAML_KEY, "nginx": NGINX_DIR}[tipo].match(s)
    if not m:
        return cadenas(s)
    if tipo == "yaml":
        return esc(m[1]) + span("t-cy", m[2]) + esc(m[3]) + cadenas(m[4])
    return esc(m[1]) + span("t-cy", m[2]) + cadenas(m[3])


def linea(s, tipo):
    if s.lstrip().startswith("#"):
        return span("t-mute", s)
    m = COMENTARIO_FINAL.match(s)
    if m:
        return codigo(m[1], tipo) + m[2] + span("t-mute", m[3])
    return codigo(s, tipo)


def bloque(id_, etiqueta, ruta, tipo):
    texto = (REPO / ruta).read_text(encoding="utf-8").rstrip("\n").split("\n")
    prompt = (f'<b class="t-ok">jorge@ubuntu</b>:<b class="t-cy">~/hardened-docker-deploy</b>$ '
              f"<b data-cmd>cat {esc(ruta)}</b>")
    cuerpo = "\n".join(linea(l.rstrip(), tipo) for l in texto)
    return (f'<pre class="proj__term proj__term--audit mono" data-typer id="{id_}" role="tabpanel" '
            f'aria-label="{esc(etiqueta)}">{prompt}\n{cuerpo}</pre>')


def main():
    nuevo = "\n".join(bloque(*f) for f in FICHEROS)
    doc = INDEX.read_text(encoding="utf-8")
    if doc.count(INICIO) != 1 or doc.count(FIN) != 1:
        sys.exit(f"index.html necesita exactamente un {INICIO} y un {FIN}")
    antes, resto = doc.split(INICIO)
    _, despues = resto.split(FIN)
    INDEX.write_text(f"{antes}{INICIO}\n{nuevo}\n{FIN}{despues}", encoding="utf-8")
    print(f"index.html: {len(FICHEROS)} plantillas desde {REPO}")


if __name__ == "__main__":
    main()
