# Florandes

Identificación de flora del bosque andino de Antioquia, para usar **parado frente a
la planta, con o sin señal**. PWA de archivos estáticos, sin build ni backend.
Implementa la **Fase 1** de `../spec.md` sobre el design system `florandes-design-system`.

## Cómo abrirla

- **Local:** doble clic en `index.html` no basta para el service worker, pero la app
  funciona igual. Para PWA completa, sírvela por http:
  ```bash
  npx http-server . -p 4178 -c-1
  ```
  y abre `http://localhost:4178`.
- **Celular:** al abrirla en el navegador, «Agregar a pantalla de inicio». Queda
  instalada y arranca sin conexión.

## Claves de API (cada quien la suya, en su dispositivo)

Perfil › **Claves de API**:
- **Anthropic (Claude)** — necesaria para la identificación asistida. `console.anthropic.com`.
- **PlantNet** — opcional, añade el paso de reconocimiento visual. `my.plantnet.org`.

Las claves se guardan **solo en el dispositivo** y nunca salen al exportar aportes.

## Lo que hace la Fase 1

1. **Identificación que no se pierde por falta de señal.** La foto, el GPS, la nota y
   los caracteres se guardan de inmediato; la identificación con IA se **encola** y se
   resuelve sola al reconectar (`js/ia.js`).
2. **Candidatos anclados a la región.** El ranking se prioriza contra las especies
   documentadas para Antioquia y su rango altitudinal; lo que cae fuera se muestra
   **señalado**, no se oculta (`js/clave.js`).
3. **Resultado verificable.** Cada candidato trae confianza y los caracteres
   diagnósticos que lo sostienen o descartan, con salto directo a la clave.
4. **Dataset corregible en campo.** Los datos viven en `data/dataset.js` (dato puro).
   Las correcciones son locales y **reversibles**, pendientes de consolidar, y se
   comparten por archivo JSON (Perfil › Aportes).

## Estructura

```
index.html            armazón + orden de carga
manifest.webmanifest  PWA
sw.js                 service worker (shell offline; APIs pasan a la red)
css/  tokens.css      tokens del design system (color, tipo, espaciado, efectos)
      app.css         componentes y pantallas
data/ dataset.js      526 especies (233 con caracteres) — extraídas de Flora_andina_v14
js/   util almacen datos clave observaciones ia ui app
js/pantallas/         onboarding, inicio, especies, especie, clave, capturar,
                      observaciones, observacion, perfil
```

## Datos

`data/dataset.js` se generó del dataset embebido en `Flora_andina_v14.html`:
- 233 registros con caracteres diagnósticos estructurados (alimentan la clave),
- flora de bosques montanos de Medellín (Alzate et al., 2012) para rango y hábito.

Para regenerarlo tras editar la fuente, es dato editable a mano: sube `version` en
la cabecera del archivo cuando cambies algo.

## Fuera de alcance (Fase 2, ver `../spec.md`)

Modo estudiante guiado, base compartida entre los 5, registro de desempeño,
notificaciones del sistema, ampliación a otras regiones.
