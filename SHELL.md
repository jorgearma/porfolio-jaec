# Shell interactiva del hero

El terminal del hero es una shell simulada: al terminar la animación inicial se puede hacer clic en él y escribir. Nada se ejecuta de verdad; todo vive en `main.js` (bloque `02b · shell interactiva`) y los estilos en `styles.css` (bloque `shell interactiva`).

> **Aviso:** este documento contiene la solución del reto. Si el repositorio es público, cualquiera puede leerla aquí (y también en `main.js`).

## Cómo se usa

- **Clic en el terminal** para darle foco y escribir. En móvil abre el teclado.
- **`help`** lista los comandos.
- **Los nombres que saca `ls` se pueden pulsar:** un directorio hace `cd` + `ls`, un fichero hace `cat` y un script lo ejecuta. No abre el teclado, así que en móvil se puede recorrer casi todo sin escribir.

## Atajos de teclado

| Tecla | Qué hace |
|---|---|
| `Tab` | Autocompleta comandos y rutas; si hay varias opciones, las lista |
| `↑` / `↓` | Recorre el historial (viene precargado) |
| `Ctrl+C` | Corta la línea o la animación en curso (`$?` = 130) |
| `Ctrl+L` | Limpia la pantalla sin perder lo escrito |
| `Ctrl+U` | Borra la línea |
| `Ctrl+A` / `Ctrl+E` | Inicio / final de línea |

## Sistema de ficheros

```
/
├── home/jae/                   (~)
│   ├── proof.txt               logros
│   ├── status.txt              disponibilidad y foco
│   ├── contacto.txt            email, github, linkedin (enlaces)
│   ├── notas.txt               TODO con la primera pista del reto
│   ├── hire_me.sh*             ejecutable
│   ├── scan.sh*                ejecutable
│   ├── projects/               panchi-bot.md, atalaya.md, dogscan.md
│   ├── writeups/               un .md por máquina (sale del array WRITEUPS)
│   ├── .zsh_history            historial en vivo
│   └── .flag.txt               root, 600 → el objetivo del reto
├── etc/
│   ├── hostname
│   ├── passwd
│   └── shadow                  solo root
└── root/                       solo root
    └── nota.txt
```

## Comandos

### Navegación y ficheros

| Comando | Notas |
|---|---|
| `ls [-l] [-a] [ruta…]` | Los ocultos solo salen con `-a` |
| `cat <fichero…>` | Respeta permisos |
| `cd [dir]` | Acepta `~`, `..`, rutas absolutas; sin argumento va a `~` |
| `pwd` | |
| `find [ruta…] [-name glob] [-exec <shell> \;]` | Recorre el FS respetando permisos |
| `./fichero` o `/ruta/fichero` | Ejecuta si tiene permiso `x` |
| `clear` | |

### Información

| Comando | Notas |
|---|---|
| `whoami`, `id`, `hostname`, `uname [-a]`, `date` | Cambian al ser root donde corresponde |
| `echo <texto>` | Expande `$?`, `$USER`, `$HOME`, `$PWD`, `$SHELL`, `$HOSTNAME` (no entre comillas simples) |
| `history` | Historial numerado |
| `help` | |

### Contenido del portfolio

| Comando | Qué muestra |
|---|---|
| `neofetch` | Ficha con el arsenal (lenguajes, frameworks, infra, seguridad, foco, estado) |
| `./scan.sh` | Salida estilo nmap: los puertos abiertos son los proyectos |
| `./hire_me.sh` | Checks animados y veredicto "contratable" con el email |
| `git log` | Trayectoria en commits (formato de una línea) |
| `git status` | "Falta un commit: primer trabajo como pentester" |
| `ps aux` | Procesos: estudiar CRTP, buscar trabajo… |
| `man jorge` | Página de manual del candidato |
| `open <sección>` | Hace scroll a `panchi-bot`, `atalaya`, `dogscan`, `writeups`, `arsenal`, `contacto` o `whoami` |

### Privilegios

| Comando | Notas |
|---|---|
| `sudo -l` | Lista lo que se puede ejecutar como root |
| `sudo <comando>` | Solo está permitido `find`; el resto da "no está autorizado" |
| `su` | Fallo de autenticación (con pista hacia sudo) |
| `exit` | Sale de la shell de root; como usuario normal responde con una broma |

### Huevos de pascua

| Comando | Respuesta |
|---|---|
| `rm -rf /` | Finge borrarlo todo y luego "es broma" |
| `rm <fichero>` | Sistema de ficheros de solo lectura |
| `vim` / `vi` | Te atrapa hasta `:q!`, `:wq`, `:x` o `ZZ` |
| `nano`, `emacs` | `command not found` con comentario |
| `ping`, `ssh`, `nc`, `curl`, `wget`, `telnet`, `ftp` | "La red es inaccesible" |
| `nmap` | Te manda a `./scan.sh` |
| `reboot`, `shutdown` | Se niegan |
| `cat /etc/passwd` | Incluye un usuario `recruiter` |

### Encadenado y códigos de salida

- `;`, `&&` y `||` funcionan y respetan el código de salida.
- `echo $?` devuelve el código del último comando:

| Código | Cuándo |
|---|---|
| 0 | Todo bien |
| 1 | Error de `cat`, `cd`, `find`, `sudo`, `rm`… |
| 2 | Error de `ls` |
| 126 | Permiso denegado al ejecutar |
| 127 | Comando o fichero no encontrado |
| 130 | Ctrl+C |

### Lo que no existe

- Tuberías (`|`) y redirecciones (`>`, `<`).
- Escribir, crear o borrar ficheros.
- Cualquier comando que no esté en las tablas: `zsh: command not found`.

## Reto: leer `.flag.txt`

### Pistas que da la propia shell

1. `help` menciona el reto y manda a `notas.txt`.
2. `cat notas.txt` → "revisar sudoers: creo que dejé algo demasiado abierto".
3. El historial precargado contiene `sudo -l` (sale con `↑` o con `history`).
4. `su` falla y sugiere mirar qué permite sudo.
5. Al tercer `Permiso denegado` sobre `.flag.txt`: "mira qué te deja `sudo -l` y busca ese binario en GTFOBins".

### Solución paso a paso

```
ls -la                              # aparece .flag.txt, propiedad de root (-rw-------)
cat .flag.txt                       # cat: .flag.txt: Permiso denegado
sudo -l                             # (root) NOPASSWD: /usr/bin/find
sudo find . -exec /bin/sh \; -quit  # el prompt pasa a root@vps, en rojo y con #
cat .flag.txt                       # flag{pr1v3sc_3n_m1_p0rtf0l10} + mensaje + email
```

Es la técnica clásica de GTFOBins: `find` con sudo puede lanzar una shell mediante `-exec`, y esa shell hereda los privilegios de root.

### Variantes que también valen

- Shell: `/bin/sh`, `/bin/bash`, `/bin/zsh`, `/bin/dash` o sin ruta (`sh`, `bash`…).
- Binario: `sudo find` o `sudo /usr/bin/find`.
- Cierre del `-exec`: `\;`, `';'` o `";"`. Un `;` a secas también da root (útil en móvil), pero si va seguido de `-quit` imprime un `command not found: -quit` de más.
- `-quit` es opcional.

### Siendo root

- `whoami`, `id`, `$USER` y `$HOME` cambian.
- `cat /etc/shadow` se puede leer (hashes de broma).
- `cd` lleva a `/root`, donde `nota.txt` apunta a la flag.
- `exit` devuelve al usuario normal.

### Atajo no previsto (pero válido)

La flag está en claro en `main.js`. Quien abra el código fuente la encuentra; hay un comentario al lado que lo da por bueno.

## Mantenimiento

- **Añadir un fichero:** un nodo `F([...líneas HTML...])` dentro de `ROOT`.
- **Añadir un comando:** una entrada en `CMDS` que devuelva un array de líneas HTML. Para error, `fail(código, líneas)`; para salida animada, `anim(líneas, ms)`.
- **Añadir un ejecutable:** un `F(...)` con `mode: "-rwxr-xr-x"` y una función `run`.
- **Texto del visitante:** siempre por `escHtml()` antes de pintarlo.
- **`writeups/`** se genera del array `WRITEUPS`; no hay que tocarlo a mano.
