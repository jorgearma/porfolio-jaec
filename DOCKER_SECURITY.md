# Docker Security — reglas OWASP aplicadas a jae-portfolio

Referencia: [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
Auditoría: 2026-11-16 (Dockerfile + docker-compose.yml + nginx.conf, probado construyendo y arrancando la imagen en local).

Leyenda: ✅ cumple · ⚠️ parcial · ❌ falta · ❓ depende del VPS (no verificado)

## Resumen

Estado tras aplicar los cambios (2026-11-16, verificado en local con `docker compose up`):

| # | Regla | Estado | Dónde |
|---|---|---|---|
| 0 | Host y Docker actualizados | ❓ VPS | `scripts/vps-docker-audit.sh` lo comprueba |
| 1 | No exponer el socket de Docker | ✅ | compose (no se monta) |
| 2 | Usuario sin privilegios | ✅ | `Dockerfile` → `USER 101` |
| 3 | Limitar capabilities | ✅ | compose → `cap_drop: [ALL]` (CapEff=0) |
| 4 | `no-new-privileges` | ✅ | compose → `security_opt` (NoNewPrivs=1) |
| 5 | Conectividad entre contenedores | ✅ | compose → red `portfolio_net` 172.30.89.0/24 + `nginx.conf` real_ip |
| 5a | Puertos publicados y UFW | ✅ | compose → `127.0.0.1:8089` |
| 6 | seccomp/AppArmor/SELinux | ✅ | perfiles por defecto, sin `unconfined` |
| 7 | Limitar recursos | ✅ | compose → mem 128m, cpus 0.5, pids 100, nofile |
| 8 | Read-only | ✅ | compose → `read_only` + tmpfs `/tmp`; Dockerfile → `/etc/nginx` de root |
| 9 | Escaneo y lint en CI/CD | ✅ | `.github/workflows/docker-security.yml` (hadolint, gitleaks, trivy) + digest fijado + Dependabot |
| 10 | Log level del daemon en `info` | ❓ VPS | `scripts/vps-docker-audit.sh` |
| 11 | Docker rootless | ❓ VPS | opcional; el script informa |
| 12 | Gestión de secretos | ✅ | `.dockerignore`, COPY explícito, gitleaks en CI |
| 13 | Supply chain | ⚠️ | SBOM CycloneDX en CI + digest fijado. Sin firma de imagen (no se usa registry) |

**Fallos detectados en la auditoría y corregidos:**

1. **Healthcheck roto**: `localhost` → `::1` y nginx solo escucha IPv4. Ahora usa `127.0.0.1`.
2. **Config de nginx escribible por el uid 101** (la imagen base deja `/etc/nginx` con dueño nginx y `g+w`). Ahora `chown root` + `chmod go-w` en el build, y además raíz read-only.
3. **13 CVEs HIGH/CRITICAL con parche** en la imagen base oficial (musl, zlib, libexpat, brotli, curl, libxslt). Ahora `apk upgrade` en el build → Trivy: 0 HIGH/CRITICAL. Además se elimina `curl`.

**Pruebas hechas en el contenedor endurecido:**
```
uid=101(nginx)                       CapEff: 0000000000000000    NoNewPrivs: 1
touch /etc/nginx/conf.d/x            → Read-only file system
touch /usr/share/nginx/html/x        → Read-only file system
touch /tmp/ok                        → OK (tmpfs)
curl -H 'CF-Connecting-IP: 1.2.3.4'  → HTTP 200, log con IP 1.2.3.4
docker ps                            → (healthy)
hadolint                             → OK
trivy image (HIGH,CRITICAL, fixed)   → 0
```

---

## RULE #0 — Mantener host y Docker actualizados ❓

**Qué dice:** actualizar el kernel del host y Docker Engine con regularidad.

**Por qué:** los contenedores **comparten el kernel del host**. No es una VM: una vulnerabilidad en el kernel (p. ej. Dirty COW) o en el runtime (p. ej. *Leaky Vessels*, CVE-2024-21626 en runc) permite escapar del contenedor da igual lo bien configurado que esté.

**Cómo comprobarlo en el VPS:**
```bash
uname -r
docker version
sudo apt update && apt list --upgradable
```
Recomendable: `unattended-upgrades` para parches de seguridad.

---

## RULE #1 — No exponer el socket del daemon ✅

**Qué dice:** no montar `/var/run/docker.sock` dentro de contenedores ni exponer el daemon por TCP (`-H tcp://0.0.0.0:...`) sin TLS.

**Por qué:** quien habla con el socket controla Docker, y quien controla Docker es **root en el host** (puede lanzar un contenedor con `-v /:/host --privileged`). Montarlo con `:ro` **no** sirve: el modo de montaje no limita las llamadas a la API.

**En este proyecto:** el compose no monta el socket. ✅

---

## RULE #2 — Definir un usuario sin privilegios ✅

**Qué dice:** no ejecutar el proceso como root dentro del contenedor (`USER` en el Dockerfile, `-u` en runtime, o `--userns-remap` en el daemon).

**Por qué:** si se compromete la aplicación, el atacante obtiene los permisos del proceso. Como root dentro del contenedor, cualquier fallo de aislamiento lo convierte en root en el host mucho más fácilmente.

**En este proyecto:**
- Imagen `nginxinc/nginx-unprivileged`, proceso como `uid=101(nginx)` (comprobado).
- Escucha en 8080 (>1024, no necesita privilegios).
- `USER root` solo durante el build y `USER 101` al final.

---

## RULE #3 — Limitar capabilities ✅

**Qué dice:** quitar todas las capabilities de Linux y añadir solo las imprescindibles: `--cap-drop ALL --cap-add <la_necesaria>`. Nunca `--privileged`.

**Por qué:** las capabilities dividen los poderes de root en trozos (`NET_BIND_SERVICE`, `CHOWN`, `SETUID`, `NET_RAW`...). Docker da por defecto un conjunto de ~14. Por ejemplo `NET_RAW` permite crear paquetes crudos (ARP spoofing contra otros contenedores de la red). Cuantas menos tenga el contenedor, menos puede hacer un atacante dentro.

**En este proyecto:** nginx como uid 101 en el puerto 8080 **no necesita ninguna**. Probado con `--cap-drop ALL`: funciona.

```yaml
    cap_drop:
      - ALL
```

---

## RULE #4 — Impedir escalada de privilegios ✅

**Qué dice:** arrancar con `--security-opt=no-new-privileges`.

**Por qué:** activa el flag del kernel `no_new_privs`: un proceso no puede ganar privilegios mediante binarios **SUID/SGID** (como `su`, `sudo`, `passwd`) ni capabilities de ficheros. Es la escalada clásica que buscas con `find / -perm -4000` en un pentest.

**En este proyecto:** la imagen no tiene binarios SUID (comprobado), pero es defensa en profundidad gratis: si algún día la imagen base añade uno, ya estás cubierto.

```yaml
    security_opt:
      - no-new-privileges:true
```

---

## RULE #5 — Conectividad entre contenedores ✅

**Qué dice:** por defecto todos los contenedores de la red `docker0` se ven entre sí. Crear redes propias y conectar solo los contenedores que necesiten hablar.

**Por qué:** si se compromete un contenedor, la red compartida permite movimiento lateral (escanear y atacar a los demás servicios).

**En este proyecto:** compose crea una red propia del proyecto (`porfolio_default`), lo cual ya aísla de otros proyectos compose. Revisar en el VPS que no haya otros servicios en la misma red.

Ojo relacionado: `set_real_ip_from 172.16.0.0/12` en `nginx.conf` confía en la cabecera `CF-Connecting-IP` de **cualquier** origen en ese rango. Cualquier contenedor de una red Docker podría falsear la IP que aparece en los logs. Afinar a la IP del gateway de la red si se quiere precisión.

---

## RULE #5a — Puertos publicados y UFW ✅

**Qué dice:** Docker escribe sus propias reglas de iptables/nftables y **se salta UFW**. Un `-p 8080:8080` queda abierto a Internet aunque UFW diga `deny`. Solución: publicar en `127.0.0.1` o usar `ufw-docker`.

**Por qué:** es un error muy común creer que el firewall protege un puerto que en realidad está expuesto.

**En este proyecto:** `"127.0.0.1:8089:8080"` → solo accesible desde el propio VPS (cloudflared). Exactamente lo que recomienda OWASP. ✅

Comprobación desde fuera:
```bash
nmap -p 8089 <IP_VPS>     # debe salir closed/filtered
```

---

## RULE #6 — Usar un módulo de seguridad Linux ✅

**Qué dice:** no desactivar seccomp, AppArmor ni SELinux (`--security-opt seccomp=unconfined` o `apparmor=unconfined` son banderas rojas). Opcionalmente crear perfiles más estrictos y monitorizar en runtime (Falco, Tetragon).

**Por qué:** seccomp filtra **syscalls**. El perfil por defecto de Docker bloquea unas ~40 peligrosas (`mount`, `kexec_load`, `ptrace` en kernels antiguos...) que se usan en escapes de contenedor. AppArmor restringe acceso a ficheros y recursos.

**En este proyecto:** no se desactiva nada, se aplican los perfiles por defecto. Comprobar en el VPS:
```bash
docker inspect jae-portfolio --format '{{.HostConfig.SecurityOpt}}'
docker info | grep -iA3 security
```

---

## RULE #7 — Limitar recursos ✅

**Qué dice:** limitar memoria, CPU, número de procesos (pids), descriptores de fichero (`ulimit nofile`) y reinicios (`--restart=on-failure:N`).

**Por qué:** sin límites, un contenedor comprometido o atacado (DoS, fork bomb, fuga de memoria) puede consumir todos los recursos del VPS y tumbar **el resto de servicios**.

**En este proyecto:** no hay límites. Valores propuestos (OWASP no da cifras; probado con 128m y 100 pids sin problemas):

```yaml
    mem_limit: 128m
    cpus: 0.5
    pids_limit: 100
    ulimits:
      nofile: { soft: 1024, hard: 2048 }
```

Sobre `restart`: OWASP sugiere `on-failure:N` para evitar bucles infinitos de reinicio. Para una web pública `unless-stopped` es razonable (prioriza disponibilidad); se deja como está conscientemente.

---

## RULE #8 — Sistema de ficheros read-only ✅

**Qué dice:** `--read-only` (compose: `read_only: true`) y `--tmpfs` solo donde haga falta escribir. Volúmenes en `:ro` cuando no necesiten escritura.

**Por qué:** si un atacante consigue ejecución, no puede **dejar persistencia** (webshell, binario descargado, modificar la config o la web). Una web estática no necesita escribir nada salvo temporales y logs.

**En este proyecto:** falta. Probado con `--read-only --tmpfs /tmp`: arranca y sirve bien. `nginx-unprivileged` guarda PID y cachés en `/tmp`. El volumen de logs debe quedarse en escritura (nginx escribe ahí). Esto además corrige el fallo 2 (config escribible por 101).

```yaml
    read_only: true
    tmpfs:
      - /tmp:size=16m,mode=1777
```

Refuerzo en el Dockerfile (por si algún día se arranca sin `read_only`):
```dockerfile
RUN chown -R root:root /etc/nginx && chmod -R go-w /etc/nginx
```

---

## RULE #9 — Escaneo y lint en CI/CD ✅

**Qué dice:** integrar en el pipeline:
- **Lint del Dockerfile**: que haya `USER`, versiones de imagen base y paquetes fijadas, `COPY` en vez de `ADD`, nada de `curl | bash`.
- **Escáner de vulnerabilidades de imagen**: Trivy, Grype, Clair (gratis); Snyk, Docker Scout... (comerciales).
- **Escáner de secretos**: Gitleaks, TruffleHog, ggshield.
- **Auditoría del host Docker**: Docker Bench for Security.

**Por qué:** la imagen base trae paquetes de Alpine que acumulan CVEs con el tiempo. Sin escanear, no te enteras.

**En este proyecto:** versión fijada (`1.30-alpine`) ✅, `COPY` ✅, sin `curl | bash` ✅. Falta automatizarlo y fijar por digest (`@sha256:...`).

```bash
docker run --rm -i hadolint/hadolint < Dockerfile
trivy image jae-portfolio:latest
gitleaks detect --source .
```

---

## RULE #10 — Log level del daemon en `info` ❓

**Qué dice:** mantener `log-level` del daemon en `info` (por defecto). Evitar `debug` salvo para depurar.

**Por qué:** con un nivel demasiado bajo pierdes eventos de auditoría; con `debug` generas ruido y puedes filtrar información sensible en logs.

**Comprobar en el VPS:**
```bash
cat /etc/docker/daemon.json 2>/dev/null
ps aux | grep '[d]ockerd.*--log-level'
```

---

## RULE #11 — Docker en modo rootless ❓

**Qué dice:** ejecutar el **daemon** de Docker sin root. A diferencia de `userns-remap` (que remapea usuarios pero deja el daemon como root), en rootless ni el daemon ni los contenedores tienen root en el host.

**Por qué:** si un atacante escapa del contenedor o compromete el daemon, cae en un usuario normal, no en root. No protege contra vulnerabilidades del kernel.

**En este proyecto:** opcional. Tiene limitaciones (puertos <1024, algunos drivers de red/almacenamiento). Alternativa: Podman, que es rootless por diseño.

---

## RULE #12 — Gestión de secretos ✅

**Qué dice:** no meter credenciales en `ENV`, `ARG` ni con `COPY` + `rm` (quedan en las capas de la imagen). Usar Docker secrets o `RUN --mount=type=secret` en build, y `.dockerignore` para no copiar `.env`.

**Por qué:** cualquiera con la imagen puede hacer `docker history` o extraer capas y recuperar lo que se borró en una capa posterior.

**En este proyecto:** no hay secretos. `.dockerignore` excluye `.env`, `.env.*` y `.git`, y el Dockerfile copia ficheros concretos (no `COPY . .`). ✅

---

## RULE #13 — Seguridad de la cadena de suministro ⚠️

**Qué dice:** procedencia de la imagen (SLSA), SBOM (CycloneDX), firma de imágenes (Notary/cosign), registry de confianza y políticas de despliegue (OPA).

**Por qué:** garantiza que la imagen que corre es la que construiste y saber exactamente qué contiene cuando sale un CVE nuevo.

**En este proyecto:** opcional para un portfolio, pero suma en el CV. Mínimo viable:
```bash
trivy image --format cyclonedx -o sbom.json jae-portfolio:latest
```

---

## Despliegue y verificación en el VPS

```bash
# antes de levantar: comprobar que la subred no choca con otra red Docker
docker network inspect $(docker network ls -q) --format '{{.Name}} {{range .IPAM.Config}}{{.Subnet}}{{end}}' | grep 172.30.89

# el directorio de logs debe ser escribible por el uid 101
sudo chown 101:101 /var/log/web/portfolio

docker compose up -d --build
bash scripts/vps-docker-audit.sh            # reglas de host + estado del contenedor
bash scripts/vps-docker-audit.sh --bench    # + Docker Bench for Security (CIS)
```

Mantenimiento:
- **Dependabot** abrirá PR cuando cambie el digest de la imagen base → merge y redeploy.
- El workflow corre **cada lunes**: si aparece un CVE nuevo con parche, falla → `docker compose build --no-cache && docker compose up -d` (el `apk upgrade` lo recoge).
- `restart: unless-stopped` se mantiene a propósito (OWASP #7 sugiere `on-failure:N`; para una web pública se prioriza que vuelva tras un reinicio del VPS).
