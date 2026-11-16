#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Reglas OWASP Docker que dependen del HOST (no del Dockerfile/compose):
#   #0  host y Docker actualizados
#   #1  socket del daemon no expuesto
#   #10 log-level del daemon = info
#   #11 rootless / userns-remap
#   + estado real del contenedor jae-portfolio (#3 #4 #7 #8)
# Uso en el VPS:  bash scripts/vps-docker-audit.sh [--bench]
#   --bench  además lanza Docker Bench for Security (auditoría CIS completa)
# Solo lee, no cambia nada.
# ─────────────────────────────────────────────────────────────
set -u
ok()   { printf '  \e[32m[OK]\e[0m   %s\n' "$*"; }
warn() { printf '  \e[33m[WARN]\e[0m %s\n' "$*"; }
bad()  { printf '  \e[31m[FAIL]\e[0m %s\n' "$*"; }

echo "== #0 Host y Docker actualizados"
echo "  kernel: $(uname -r)"
echo "  docker: $(docker version --format '{{.Server.Version}}' 2>/dev/null)"
if command -v apt >/dev/null; then
  n=$(apt list --upgradable 2>/dev/null | grep -c -- '-security' || true)
  [ "$n" -eq 0 ] && ok "sin actualizaciones de seguridad pendientes" \
                 || bad "$n paquetes de seguridad pendientes (apt upgrade)"
  dpkg -s unattended-upgrades >/dev/null 2>&1 && ok "unattended-upgrades instalado" \
                                              || warn "unattended-upgrades no instalado"
fi
[ -f /var/run/reboot-required ] && warn "reinicio pendiente (kernel nuevo sin cargar)"

echo "== #1 Socket del daemon"
if ps -eo args | grep -E '[d]ockerd.*-H *tcp://' >/dev/null \
   || grep -qs '"hosts".*tcp://' /etc/docker/daemon.json; then
  bad "dockerd escucha por TCP"
else
  ok "dockerd no escucha por TCP"
fi
m=$(docker ps -q | xargs -r docker inspect --format '{{.Name}} {{range .Mounts}}{{.Source}} {{end}}' | grep docker.sock || true)
[ -z "$m" ] && ok "ningún contenedor monta docker.sock" || bad "montan docker.sock: $m"

echo "== #10 Log level del daemon"
lvl=$(grep -so '"log-level" *: *"[a-z]*"' /etc/docker/daemon.json | grep -o '"[a-z]*"$' | tr -d '"')
flag=$(ps -eo args | grep -o '[d]ockerd.*--log-level[= ][a-z]*' | grep -o '[a-z]*$')
lvl=${flag:-${lvl:-info}}
[ "$lvl" = info ] && ok "log-level=info" || warn "log-level=$lvl (OWASP recomienda info)"

echo "== #11 Rootless / userns"
sec=$(docker info --format '{{json .SecurityOptions}}' 2>/dev/null)
echo "$sec" | grep -q rootless && ok "Docker rootless" \
  || { echo "$sec" | grep -q userns && warn "userns-remap activo (daemon sigue como root)" \
       || warn "daemon como root, sin userns-remap (opcional según OWASP)"; }
echo "$sec" | grep -q seccomp  && ok "seccomp activo"  || bad "seccomp NO activo"
echo "$sec" | grep -qE 'apparmor|selinux' && ok "AppArmor/SELinux activo" || warn "sin AppArmor/SELinux"

echo "== Contenedor jae-portfolio"
if docker inspect jae-portfolio >/dev/null 2>&1; then
  f='{{.Config.User}}|{{.HostConfig.ReadonlyRootfs}}|{{.HostConfig.CapDrop}}|{{.HostConfig.SecurityOpt}}|{{.HostConfig.Memory}}|{{.HostConfig.PidsLimit}}|{{.HostConfig.Privileged}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}'
  IFS='|' read -r user ro capd sopt mem pids priv health <<<"$(docker inspect jae-portfolio --format "$f")"
  [ "$user" != "" ] && [ "$user" != root ] && [ "$user" != 0 ] && ok "#2 user=$user" || bad "#2 corre como root"
  [ "$priv" = false ] && ok "#3 no privileged" || bad "#3 --privileged"
  echo "$capd" | grep -qi all && ok "#3 cap_drop ALL" || bad "#3 cap_drop=$capd"
  echo "$sopt" | grep -q no-new-privileges && ok "#4 no-new-privileges" || bad "#4 falta no-new-privileges"
  echo "$sopt" | grep -q unconfined && bad "#6 perfil unconfined: $sopt" || ok "#6 sin perfiles unconfined"
  [ "$mem" -gt 0 ] 2>/dev/null && ok "#7 memoria=$((mem/1024/1024))MB" || bad "#7 sin límite de memoria"
  [ "${pids:-0}" -gt 0 ] 2>/dev/null && ok "#7 pids_limit=$pids" || bad "#7 sin pids_limit"
  [ "$ro" = true ] && ok "#8 read-only" || bad "#8 raíz escribible"
  [ "$health" = healthy ] && ok "healthcheck: $health" || warn "healthcheck: ${health:-sin healthcheck}"
else
  warn "jae-portfolio no está corriendo"
fi

if [ "${1:-}" = "--bench" ]; then
  echo "== Docker Bench for Security"
  # Monta docker.sock: contenedor puntual de auditoría, se borra al terminar.
  docker run --rm --net host --pid host --userns host --cap-add audit_control \
    -e DOCKER_CONTENT_TRUST="${DOCKER_CONTENT_TRUST:-}" \
    -v /etc:/etc:ro -v /lib/systemd/system:/lib/systemd/system:ro \
    -v /usr/bin/containerd:/usr/bin/containerd:ro -v /usr/bin/runc:/usr/bin/runc:ro \
    -v /usr/lib/systemd:/usr/lib/systemd:ro -v /var/lib:/var/lib:ro \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    --label docker_bench_security \
    docker/docker-bench-security
fi
