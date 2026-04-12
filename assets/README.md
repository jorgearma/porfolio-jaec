# assets

Aquí va tu foto para el dossier del hero.

## Cómo añadirla

1. **Guarda la imagen** en esta carpeta como `portrait.jpg`
   (o `portrait.webp` · funciona cualquiera de los dos).
   - Proporciones recomendadas: **5:6** (ej. 600×720 px)
   - Fondo neutro mejor — el CSS aplica un duotono ámbar por encima,
     así que no importa si el original es a color.
   - No te preocupes por el blanco y negro: el filtro CSS ya lo hace.

2. **Edita `index.html`**, busca el bloque marcado `<!-- ───── dossier photo card ───── -->`
   dentro de la sección `.hero__right`, y haz estos dos cambios:

   - **Borra** el bloque completo `<svg class="dossier__placeholder">…</svg>`
     (14 líneas, fácil de ver).
   - **Descomenta** la línea que está justo encima:
     ```html
     <img class="dossier__img" src="assets/portrait.jpg" alt="Jorge Armando Escobar" />
     ```

3. Guarda, recarga. Listo.

## Efectos aplicados por CSS (no tocas la imagen)

- Grayscale + contraste + sepia + hue-rotate → acabado fosforescente frío
- Duotono ámbar (`mix-blend-mode: color`) — tinte de archivo clasificado
- Vignette radial → oscurece los bordes
- Scanlines horizontales sutiles (multiply)
- Glow ámbar en la parte superior (screen)
- Esquinas tipo reticle
- Hover: ligero zoom + saturación

Si el efecto queda demasiado naranja con tu foto, abre `styles.css`
y baja los valores de `sepia()` y el alpha del `.dossier__frame::before`.
