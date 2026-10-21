# Demo del formato recordado

Esta es una grabación de terminal del **manejador real de mensajes** (`handleInboundMessage`). Usa los repositorios en memoria de prueba del proyecto y un doble local del puerto de Atomic Memory. El contrato HTTP se verifica por separado contra un servidor HTTP local en `atomic-memory.test.ts`.

**No es una captura del cliente de WhatsApp. No se enviaron mensajes externos ni se usaron credenciales o datos de producción.** La pantalla del video reproduce exclusivamente la salida y los tiempos registrados en `demo.cast`. `player.html` permite repetir esa grabación sin dependencias; `transcript.txt` conserva el texto.

- `remembered.png`: la misma consulta antes y después de recordar respuestas por puntos.
- `demo.gif`: primeros doce segundos, para vista previa en el PR.
- `demo.webm`: grabación completa, incluye revisión, corrección a párrafos y borrado.
- `forgotten.png`: confirmación del borrado y consulta sin memoria guardada.

Para repetir el flujo desde la raíz:

```sh
pnpm install --frozen-lockfile
RECORD_MEMORY_DEMO=1 CI=1 TERM=dumb NO_COLOR=1 \
  pnpm --filter @emergency-map/application exec vitest run \
  src/messaging/__tests__/messaging.test.ts \
  -t 'recorded real WhatsApp' --disableConsoleIntercept --reporter=dot --no-color
```

El test ejecuta y comprueba guardar, aplicar el formato, revisar, corregir y borrar. Verifica además que todas las frases de la respuesta original se conservan. La prueba de grabación es optativa para evitar sus pausas de lectura en cada ejecución de `pnpm run verify`.
