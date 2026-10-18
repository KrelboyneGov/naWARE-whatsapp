# Propuesta: pivote «Cerca WhatsApp» (Mi Clima + Mi Perú, alertas por WhatsApp)

Estado: **propuesta pendiente de autorización humana**. Este archivo no modifica la matriz vigente: ni `KNOWLEDGE.base/01-matriz.md` ni el documento 7 en Linear. Tampoco se escribió nada en Linear ni en el repositorio. Fecha: 2026-10-18 (America/Lima).

---

## 0. Hallazgo previo importante: el pivote ya está parcialmente cargado en Linear

Al leer Linear encontré que **ya existe** un proyecto del pivote, creado el 2026-10-18 entre las 06:05 y las 06:07 UTC por `stivecamposespinoza@gmail.com`:

- Proyecto **Cerca WhatsApp (clon + pivote)** (P-NAW-2).
- Documento **Brief del pivote: Cerca WhatsApp**.
- Issues **NAW-26 a NAW-35**, que cubren onboarding, notificaciones, alertas, cola, zona, Mi Clima, el shell con swipe, privacidad, demo y métricas.
- Relaciones nuevas en NAW-9 y NAW-10 hacia NAW-28 y NAW-29.

En cambio, **la matriz (doc 7) no se ha tocado**: su última edición es de las 03:54:54 UTC y D-03 sigue diciendo «semáforo de lluvias», D-10 «web push». Hoy el backlog del pivote y la matriz se contradicen. En lo que leí no consta una autorización para cambiar el alcance. No asumo que falte; solo lo registro.

Consecuencia para esta propuesta: **no se proponen issues duplicados**. Cada pedido del usuario se asigna al issue que ya existe, con su delta exacto (sección 3), y solo se crean issues para lo que no está cubierto (sección 4).

---

## 1. Base revisada

**Linear: conectado.** El workspace verificado es **naWARE** (`0148d892-948f-4064-ad64-1a091692b56a`, https://linear.app/naware), igual que en `linear.json`. El equipo es NAW (`df17ce1e-…`).

| Objeto                                            | ID                                                              | Enlace                                                                                              | updatedAt                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 7. Matriz de decisiones (canónica)                | `449710b0-6203-469d-a315-d29b813975ec` (= linear.json)          | https://linear.app/naware/document/7-matriz-de-decisiones-5c43332e1ae1                              | **2026-10-18T03:54:54.062Z** (v0.3)                                               |
| 0. Base de conocimiento y gobernanza              | `3efe7e66-…` (= linear.json)                                    | https://linear.app/naware/document/0-base-de-conocimiento-y-gobernanza-para-asistentes-95d0bdc2afd2 | 2026-10-17T23:21:50.301Z (metadatos; no releí el contenido)                       |
| Proyecto Cerca — Hack the Andes 2026 (P-NAW-1)    | `e0c0dbc3-…` (= linear.json)                                    | https://linear.app/naware/project/cerca-hack-the-andes-2026-track-clima-ea7d50ab7c71                | 2026-10-17T22:53:04.164Z                                                          |
| Proyecto Cerca WhatsApp (clon + pivote) (P-NAW-2) | `ad7b68ce-6447-4619-a0c3-32fb1af7bbe2` (no está en linear.json) | https://linear.app/naware/project/cerca-whatsapp-clon-pivote-b07f552dac94                           | 2026-10-18T06:05:21.698Z                                                          |
| Brief del pivote: Cerca WhatsApp                  | `067d7e81-4a75-44aa-b8d0-6ce480a79d35`                          | https://linear.app/naware/document/brief-del-pivote-cerca-whatsapp-44f9408de76a                     | 2026-10-18T06:07:02.755Z                                                          |
| Docs 1 a 6 y «7. Roadmap técnico de backend»      | —                                                               | (recursos de P-NAW-1)                                                                               | 22:52–22:53Z del 17-oct y 00:09Z del 18-oct (solo metadatos; no leí su contenido) |

Issues leídos, con su updatedAt (todos de 2026-10-18 salvo que se indique otra fecha):

- NAW-26: 06:05:39Z
- NAW-27: 06:05:46Z
- NAW-28: 06:05:53Z
- NAW-29: 06:05:58Z
- NAW-30: 06:06:04Z
- NAW-31: 06:06:09Z
- NAW-32: 06:06:14Z
- NAW-33: 06:06:22Z
- NAW-34: 06:06:28Z
- NAW-35: 06:06:33Z
- NAW-9: 06:05:53Z
- NAW-10: 06:05:58Z
- NAW-20: 03:53:36Z
- NAW-19: 03:53:30Z
- NAW-8: 03:53:24Z
- NAW-6: 03:52:00Z
- NAW-23: 02:19:00Z
- NAW-17 (Done): 02:18:24Z
- NAW-22: 01:51:06Z
- NAW-13: 01:49:22Z
- NAW-24 (Done): 01:49:18Z
- NAW-18: 01:49:18Z
- NAW-25: 01:49:14Z
- NAW-7: 01:41:39Z
- NAW-21 (Done): 01:40:48Z
- NAW-5 (Done): 01:35:49Z
- NAW-16, NAW-15, NAW-14, NAW-12 y NAW-11: del 17-oct entre 22:53:15Z y 22:53:24Z
- NAW-1 a NAW-4 (plantillas de Linear): 17-oct 19:52:38Z

**Copia local frente a Linear.** `linear.json` registra `remote_updated_at` 2026-10-18T01:52:28Z, pero el documento 7 cambió después (03:54:54Z). La copia `01-matriz.md` está **desactualizada** en:

- **D-07:** en Linear, camilamcr97 figura sin tickets y krelboyne con ingesta, API y base de datos.
- **D-09:** Linear menciona la ingesta con el runner `apps/ingest` y «ADR 0009». En el repo local, la ADR 0009 es otra: _community-signals-move-situation-not-review_.

Esta propuesta toma como base **Linear 03:54:54Z**.

**Repositorio local:** HEAD `79d14ba` (merge del PR #12). Lo consulté para contrastar:

- ADR 0008: mapa por capas, sin puntuación agregada.
- `apps/web-hono/src/components/weather/use-weather.ts`: Open-Meteo ya se llama desde el navegador.
- La tabla `emergency_map_territory` tiene `ubigeo`, `centroid` y `geometry`, pero solo con datos de demo.

**Propuesta previa pendiente** que se cruza con esta: `KNOWLEDGE.base/proposals/2026-10-18-matriz-v0.3-mapa-por-capas.md`, que cambia D-03 y D-04 a «mapa por capas». En Linear no se aplicó: D-03 sigue siendo «semáforo». Esta propuesta **la absorbe**. Si se aprueba, esa queda reemplazada.

---

## 2. Cambios a la matriz (antes → después)

Destino: documento 7 en Linear y después `KNOWLEDGE.base/01-matriz.md`. Los IDs se conservan. Se proponen tres filas nuevas (D-11 a D-13) y un antecedente nuevo (P-04). No se borra ninguna fila.

| Fila / campo                                               | Valor actual (Linear, v0.3, 03:54:54Z)                                                                                                                                                                                                    | Valor propuesto (v0.4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encabezado / versión                                       | «Versión 0.3 … D-09 actualizado … D-06 …»                                                                                                                                                                                                 | Añadir: «v0.4 (2026-10-18): **pivote Cerca WhatsApp**: D-01, D-03, D-04, D-06 a D-10 modificados; D-11 a D-13 y P-04 nuevos; absorbe la propuesta v0.3 de mapa por capas (D-03/D-04). Aprobado por: _[nombre del aprobador humano]_».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **D-01 Fuente de verdad**                                  | Linear: workspace naWARE, proyecto Cerca (verificado el 2026-10-17)                                                                                                                                                                       | Linear, workspace naWARE. **Proyecto vigente: Cerca WhatsApp (clon + pivote) (P-NAW-2).** El proyecto Cerca original (P-NAW-1) queda como antecedente congelado. Repositorio del pivote: **KrelboyneGov/naWARE-whatsapp**; **csdev19/naWARE se conserva sin cambios**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **D-03 Producto elegido / propuesta de valor / alcance**   | **Cerca: semáforo de lluvias de tu comunidad**. Mapa de colores por distrito, alertas cuando sube el color, comunidades, reportes confirmados por varias personas y puntos de ayuda                                                       | **Cerca WhatsApp: el aviso oficial de tu zona llega a tu WhatsApp.** La web por sí sola no genera valor; el valor está en WhatsApp. Flujo: (1) la persona se registra; (2) define su zona de interés, automática por geolocalización o manual por distrito; (3) deja un **número de WhatsApp obligatorio** para recibir alertas de su zona; (4) usa la app como un **feed vertical tipo TikTok** con dos secciones: **Mi Clima** (vista principal: temperatura, pronóstico y avisos oficiales vigentes de su zona) y **Mi Perú** (el mapa por capas de eventos naturales que ya existe). Cada fuente se muestra como capa con su propio nivel y leyenda; no hay un color combinado (ADR 0008). La ayuda climática sigue siendo solidaria. |
| **D-04 Piloto y amenaza**                                  | Amenaza: lluvias (avisos de SENAMHI cruzados con SIGRID, INDECI y Sutran). Distrito piloto: **pendiente**                                                                                                                                 | Amenaza: lluvias. **Solo los avisos de SENAMHI (capa `official_notices`, con su nivel amarillo/naranja/rojo) disparan alertas** en el MVP. SIGRID, INDECI y Sutran son capas de consulta en Mi Perú y no disparan alertas. Cobertura: la zona de interés de cada persona (distrito). Distrito(s) para la demo: **pendiente** (conviene uno con aviso vigente).                                                                                                                                                                                                                                                                                                                                                                            |
| D-05 Reglas del track                                      | Rúbrica …; entrega domingo 18-oct a las 09:00 (Lima), con URL pública, demo y repositorio …                                                                                                                                               | Sin cambios en la rúbrica. Añadir: «Repositorio de entrega: **pendiente** (csdev19/naWARE o KrelboyneGov/naWARE-whatsapp; confirmar en las bases si se puede cambiar el repo registrado)».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **D-06 Fuentes de datos**                                  | SENAMHI (ArcGIS de INDECI sin verificar; HTML como respaldo frágil; Open-Meteo de reserva), Sutran, INDECI (ODbL), SIGRID; directorio de ayuda APCI y MIMP por verificar en NAW-22; OSM solo mapa base; no raspar Google Maps; Koru fuera | Igual para avisos e incidentes, con estos cambios. (a) **Pronóstico de Mi Clima: Open-Meteo como fuente principal** del pronóstico, ya integrado en `use-weather.ts`. Siempre es capa `forecast` y nunca aviso oficial. Su plan gratuito es para uso no comercial: con modelo de negocio hace falta plan pagado (**a verificar**). El pronóstico por ciudad de SENAMHI no tiene API verificada. (b) **Límites distritales** para resolver punto → distrito: fuente **por verificar** (INEI/IGN u otra, con licencia). (c) Directorio de ayuda (APCI/MIMP, NAW-22/23): **fuera del MVP del pivote**.                                                                                                                                       |
| **D-07 Responsables**                                      | cristiansotomayor.dev: monorepo, CI/CD, contratos, UI y notificaciones. krelboyne: ingesta, semáforo, alertas, API, base de datos y comunidades. camilamcr97: sin tickets. Detalle en NAW-5 a NAW-25                                      | **Pendiente de asignar en P-NAW-2** (NAW-26 a NAW-35 están sin asignar). Sugerencia coherente con el D-07 vigente, a confirmar por el equipo: **cristiansotomayor.dev**: feed/shell (NAW-32), UI de Mi Clima (NAW-31), UI de onboarding (NAW-26), notificaciones y cola (NAW-27, NAW-29), plan B de la demo (NAW-34). **krelboyne**: ingesta SENAMHI (NAW-8), motor de alertas (NAW-9, NAW-28), zona/PostGIS (NAW-30), privacidad (NAW-33), métricas (NAW-35), API y base. **camilamcr97**: sin tickets. El brief del pivote la propone para ingesta/semáforo, lo que contradice D-07; debe aclararse.                                                                                                                                    |
| **D-08 Fuera de alcance**                                  | Sin seguimiento de donaciones ni de dinero                                                                                                                                                                                                | Sin seguimiento de donaciones ni de dinero. Fuera del MVP del pivote: cobro o pagos de usuarios, **marketing por WhatsApp**, chat conversacional (el bot solo atiende alta/verificación, BAJA y ayuda mínima), app nativa, nuevas comunidades o reportes ciudadanos (NAW-18) y directorio de ayuda (NAW-22/23).                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **D-09 Arquitectura**                                      | TanStack Start + Cloudflare Workers + Neon … Ingesta automatizada … (ADR 0009). Fuente: repo csdev19/naWARE                                                                                                                               | Igual (misma arquitectura en el clon). Añadir: **Mensajería** con `NotificationPort` en `packages/application` y un adaptador WhatsApp en `infra-*` (**Meta WhatsApp Business Cloud API** directo o un BSP; Zavu es candidato a verificar). Webhook entrante en `apps/server-hono`. Envíos por Cloudflare Queues, con plan B de tabla `notification_log` como cola. Secretos con el deploy (`--secrets-file`). Fuente: «Decisión del usuario; repo KrelboyneGov/naWARE-whatsapp (clon de csdev19/naWARE)». Además, resolver la referencia «ADR 0009», que choca con la ADR 0009 local.                                                                                                                                                    |
| **D-10 Canal de alertas (canal principal)**                | Web push de la PWA. Canal adicional (Telegram o correo): **pendiente**                                                                                                                                                                    | **WhatsApp: canal principal y obligatorio.** Fuera de la ventana de 24 h, las alertas salen como **plantilla aprobada por Meta** (categoría utility); dentro de la ventana se usan mensajes de servicio. Alta verificada y baja con «BAJA». Se disparan **por capa**: un aviso de SENAMHI emitido o elevado que abarque el distrito de la zona, con el nivel y la leyenda del emisor. No hay color combinado (ADR 0008). Web push: **despriorizado**. SMS de respaldo: **pendiente** por costo. Telegram y correo: descartados por ahora.                                                                                                                                                                                                 |
| **D-11 (nueva) Registro, verificación y datos personales** | —                                                                                                                                                                                                                                         | Registro con **número de WhatsApp obligatorio** (E.164, +51 por defecto) y **verificado**. Método **pendiente**: código entrante «Hola <código>» (gratis, ya planteado en NAW-26) u OTP saliente por plantilla de autenticación (pagado). **Consentimiento expreso**, con casilla no premarcada, texto versionado y evidencia guardada. Finalidad única: alertas de clima de la zona. Número cifrado en reposo + HMAC para buscar. Zona a nivel distrito (centroide), nunca la ubicación exacta. Baja con «BAJA» y opción «Borrar mis datos». Requisitos de la Ley 29733 y su reglamento: **por verificar** con fuente oficial (no es asesoría legal).                                                                                    |
| **D-12 (nueva) Vista principal y navegación**              | —                                                                                                                                                                                                                                         | Tras el onboarding, la vista inicial es **Mi Clima**. **Navegación vertical tipo TikTok** (deslizar arriba/abajo) entre Mi Clima y Mi Perú, con pestañas/teclado como alternativa en escritorio. En Mi Perú, el gesto del feed no debe capturar el arrastre del mapa.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **D-13 (nueva) Modelo de negocio**                         | — (el brief del repo lo dejaba «pendiente»)                                                                                                                                                                                               | **Pendiente.** Hipótesis del usuario: el valor está en la base de personas registradas con WhatsApp verificado por zona. Restricciones conocidas: costo por mensaje de plantilla de WhatsApp; licencia comercial de Open-Meteo; Ley 29733 (otro uso del número, como marketing, exige otro consentimiento); la ayuda climática no se cobra.                                                                                                                                                                                                                                                                                                                                                                                               |
| **P-04 (nuevo antecedente)**                               | —                                                                                                                                                                                                                                         | «Cerca web: mapa por capas sin WhatsApp (csdev19/naWARE, P-NAW-1). Preservado como respaldo; no es el producto vigente».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Pendientes abiertos                                        | Distrito piloto, canal de alertas adicional, verificación de Sutran y del ArcGIS de SENAMHI/INDECI, fuente del directorio de ONG                                                                                                          | Distrito(s) de demo; método de verificación del número; proveedor de WhatsApp (Meta directo o BSP) y **plantilla utility aprobada**; modelo de negocio; repositorio de entrega; fuente de límites distritales; licencia de Open-Meteo; verificación del ArcGIS de SENAMHI/INDECI (sigue siendo crítico, porque es lo que dispara las alertas); Sutran (ya no crítico); requisitos de la Ley 29733; asignación de responsables en P-NAW-2.                                                                                                                                                                                                                                                                                                 |

### 2.1 Qué contradice el pivote, o qué contradice al pivote

1. **El «semáforo de la zona» frente a la ADR 0008 y el brief.** El brief del pivote, NAW-28, NAW-31 y NAW-34 hablan de «cuando sube el semáforo de la zona». NAW-19 define el semáforo como aviso × exposición × historial × bloqueos × reportes, es decir, una **puntuación combinada de riesgo**. Eso viola el invariante del brief («nunca un _risk score_ combinado») y la ADR 0008, que ya está aceptada en el repo y dice: «Alerts trigger per layer and per source, not on a combined color». **Propuesta:** la alerta se dispara por capa, con el aviso de SENAMHI y su nivel. Hay que reescribir esos issues (sección 3).
2. **D-10 web push frente a WhatsApp obligatorio.** Se resuelve con el nuevo D-10.
3. **NAW-16 («las suscripciones no guardan datos personales»)** contradice el número obligatorio. Lo sustituye NAW-33 en el pivote.
4. **La ventana de 24 h.** NAW-26, NAW-29 y el brief del pivote proponen «no enviar fuera de ventana». Pero las alertas de clima llegan cuando la persona no ha escrito en días, así que **la mayoría de las alertas no saldría** y se rompe la propuesta de valor. Hacen falta plantillas utility, que tienen costo. Esto toca D-10 y D-13.
5. **Navegación:** NAW-32 y el brief del pivote fijan «swipe horizontal por defecto», pero el usuario pidió **tipo TikTok (vertical)**.
6. **Verificación:** el usuario pidió verificación del número. NAW-26 eligió «Hola» entrante en lugar de OTP. Es válido como verificación por posesión, pero debe quedar como decisión explícita en D-11.
7. **El modelo de negocio frente a D-08 y la finalidad del dato.** No hay contradicción directa con D-08 (donaciones), pero monetizar la base de números choca con la finalidad única del consentimiento. Se registra en D-13.
8. **Open-Meteo «no comercial»** frente a un modelo de negocio (brief del repo, sección _Public data sources_).

### 2.2 Invariantes de datos del brief: cómo los toca el pivote

| Invariante                                                      | ¿Lo toca?                                        | Regla propuesta para el pivote                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nivel y leyenda del emisor; sin puntuación combinada            | **Sí, en riesgo** (por el «semáforo de la zona») | Mi Clima y cada WhatsApp muestran el aviso de SENAMHI con **su** nivel (amarillo/naranja/rojo), su texto, su vigencia y su fuente. El pronóstico de Open-Meteo se rotula «pronóstico, no es aviso oficial». No se envía un color propio.                                                   |
| Precisión distrital; no inventar puntos                         | Sí (geolocalización)                             | La geolocalización solo sirve para **resolver el distrito**. Se guarda el `ubigeo` y el centroide, nunca el punto exacto. Un aviso cuyo polígono toca el distrito se comunica como «aviso que abarca (parte de) tu distrito», no como «tu calle».                                          |
| Sin registros = «no hay información disponible», nunca «seguro» | **Sí** (Mi Clima y WhatsApp)                     | Sin avisos vigentes, Mi Clima dice «Sin avisos oficiales vigentes registrados para tu distrito · última consulta HH:MM». Si la fuente cae: «fuente no disponible». **Nunca** «zona segura» ni verde. El bot **no envía** mensajes de «todo tranquilo».                                     |
| Un seguimiento actualiza el evento, no lo duplica               | Sí (alertas)                                     | Una actualización del mismo aviso de SENAMHI (mismo número o identificador) **actualiza** el registro. Solo genera un WhatsApp nuevo si **sube el nivel** o se amplía el área al distrito. La deduplicación usa `persona + aviso + nivel`, no solo `persona + distrito + color + ventana`. |

---

## 3. Cambios por issue

Criterio para P-NAW-1: el repo original y su proyecto se **conservan sin cambios**. Para los issues originales, la recomendación es **no reescribir su contenido**: basta con una relación o un comentario desde el pivote y su clasificación respecto al pivote. Las excepciones se señalan. Los issues de P-NAW-2 sí se modifican.

### 3.1 Issues del pivote (P-NAW-2): mapeo de lo pedido y deltas

| Pedido del usuario                                                   | Issue existente        | Acción                                                  |
| -------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| Registro + onboarding con WhatsApp obligatorio, OTP y consentimiento | NAW-26 + NAW-33        | Modificar los dos                                       |
| Zona de interés (geo automática + manual)                            | NAW-30                 | Modificar                                               |
| Feed de Mi Clima (temperatura + pronóstico)                          | NAW-31                 | Modificar                                               |
| Navegación vertical tipo TikTok                                      | NAW-32                 | Modificar                                               |
| Mi Perú = mapa existente                                             | NAW-32 (lo incluye)    | Modificar; no hace falta un issue aparte                |
| Pipeline de notificaciones de WhatsApp                               | NAW-27, NAW-28, NAW-29 | Modificar + issue nuevo N-2 (alta en Meta y plantillas) |
| Registro de decisión del pivote                                      | —                      | Issue nuevo N-1                                         |

**NAW-26: modificar** (Urgent, se mantiene)

- Título nuevo: `[Onboarding] Registro + WhatsApp obligatorio + verificación por código entrante ('Hola <código>') + consentimiento`
- Delta en la descripción:
  - (1) El **código corto pasa a ser obligatorio**, no «si hace falta»: `wa.me/<bot>?text=Hola%20<código>`, con caducidad de 15 min y un solo uso. Esto vincula el número con la sesión, de modo que «Hola» desde otro número no verifica una cuenta ajena.
  - (2) Decisión registrada en D-11: código entrante frente a OTP saliente por plantilla de autenticación. Se elige el código entrante por costo, salvo que el equipo decida otra cosa.
  - (3) **Consentimiento antes de mostrar el QR**: la casilla de NAW-33 bloquea el paso.
  - (4) Decidir si la identidad de Better Auth es el teléfono (plugin de número de teléfono, **a verificar**) o correo + teléfono. El formulario actual `sign-up-form.tsx` es de correo.
  - (5) «Zavu» pasa a ser «proveedor detrás de NotificationPort (NAW-27)».
  - (6) El mensaje de bienvenida muestra los avisos oficiales vigentes con su nivel, o «sin avisos oficiales vigentes registrados», en lugar de «semáforo actual».

**NAW-27: modificar** (Urgent)

- Título nuevo: `[Notificaciones] NotificationPort + adaptador WhatsApp (Meta Cloud API o BSP; Zavu a evaluar) con plantillas`
- Delta:
  - Añadir `sendTemplate(to, templateName, params)` además de `sendWhatsApp` (texto libre dentro de la ventana).
  - Resultado tipado `sent | failed | window_closed | template_rejected`.
  - Evaluar en la primera hora Meta Cloud API directo (número de prueba, límites de destinatarios **a verificar**) frente a Zavu.
  - El **SMS de respaldo pasa a opcional**: fuera del MVP salvo decisión de costo (D-10).
  - Anotar en un comentario el precio por mensaje utility y de autenticación para Perú (**a verificar**).
  - Quitar «WhatsApp gratis hasta 2.000 msgs/mes» como supuesto: no está verificado y probablemente no corresponde al esquema actual de Meta.

**NAW-28: modificar** (Urgent)

- Título nuevo: `[Alertas] WhatsApp cuando SENAMHI emite o eleva un aviso que abarca el distrito de la zona (capa official_notices, ADR 0008)`
- Delta:
  - Sustituir «sube el semáforo / color» por «aviso de SENAMHI nuevo o con nivel mayor que intersecta el `ubigeo` de la zona».
  - El mensaje lleva el nivel y la leyenda del emisor, el tipo de aviso, la vigencia, la fuente y el enlace, más la línea «BAJA para dejar de recibir».
  - Fuera de la ventana de 24 h se usa la **plantilla utility** de N-2; ya no se omite el envío.
  - Nivel mínimo configurable sobre el nivel del emisor (por defecto naranja o más; **a decidir**).
  - Una actualización del mismo aviso no reenvía, salvo que suba el nivel.
  - Nunca se envían mensajes de «zona segura».
  - El disparo manual de la demo inserta un aviso de demo rotulado como tal, sin falsificar un aviso oficial.
  - Depende de: NAW-8, NAW-9 (modificado), NAW-27, NAW-29 y N-2.

**NAW-29: modificar** (High → **Urgent**, porque las alertas no salen sin cola o equivalente)

- Delta:
  - Clave de idempotencia `persona + aviso_id + nivel`, en lugar de `persona + distrito + color + ventana`.
  - «Ventana cerrada → plantilla utility», en lugar de «se omite o SMS».
  - Tope diario por persona y **tope global de gasto diario** configurable.
  - El plan B de la tabla como cola se mantiene.

**NAW-30: modificar** (High)

- Delta:
  - Hoy `emergency_map_territory.geometry` solo tiene polígonos de demo (`packages/domain/src/demo`), así que el modo automático depende de N-3 (límites distritales).
  - Para la demo, priorizar el **selector manual** por ubigeo (departamento → provincia → distrito), que funciona sin polígonos.
  - La geolocalización solo resuelve el distrito y descarta las coordenadas.
  - Sustituir «zona por defecto = Lima» por «sin zona, pedir selección»: una zona por defecto asignaría alertas de un lugar que la persona no eligió.

**NAW-31: modificar** (High → **Urgent**, porque es la vista principal)

- Título nuevo: `[Mi Clima] Vista principal (tarjetas del feed): temperatura, pronóstico y avisos oficiales vigentes de mi zona`
- Delta:
  - Reutilizar `apps/web-hono/src/components/weather/use-weather.ts` (Open-Meteo ya integrado, con respaldo de demo). Moverlo al servidor con caché, para no exponer la cuota y para poder cachear.
  - Añadir el pronóstico horario y diario, que hoy solo trae `current`.
  - Sustituir «color actual del semáforo de la zona» por «avisos oficiales vigentes (capa `official_notices`) con el nivel y la leyenda del emisor».
  - Estados vacíos: «Sin avisos oficiales vigentes registrados…» o «Fuente no disponible», nunca «seguro».
  - Rótulo fijo: «Pronóstico (Open-Meteo), no es aviso oficial».
  - Verificar los términos comerciales de Open-Meteo (D-13).

**NAW-32: modificar** (High → **Urgent**, porque es la navegación principal)

- Título nuevo: `[UI] Feed vertical tipo TikTok: 'Mi Clima' ↕ 'Mi Perú' (Mi Perú = mapa por capas existente)`
- Delta:
  - Navegación **vertical** (scroll-snap en Y), según lo pidió el usuario; deja de ser «horizontal por defecto».
  - En Mi Perú, el mapa captura todos los gestos. Se vuelve a Mi Clima con un tirador o botón superior, o desde el borde, porque el conflicto de gestos es mayor en vertical.
  - Mi Perú monta el mapa por capas actual (`routes/mapa.tsx` y los componentes `map/`) sin reescribirlo.
  - Pestañas/teclado en escritorio.

**NAW-33: modificar** (High → **Urgent**, porque se recogen números desde el primer registro)

- Delta:
  - Añadir la verificación con fuente oficial de: (a) el reglamento vigente de la Ley 29733 (**a verificar** si es el D.S. 016-2024-JUS); (b) la inscripción del banco de datos ante la Autoridad Nacional de Protección de Datos Personales; (c) el **flujo transfronterizo** (Meta/BSP procesan fuera del Perú), que debe informarse en el consentimiento; (d) el plazo de conservación; (e) cómo ejercer los derechos ARCO.
  - El mínimo para la demo (casilla, cifrado, BAJA, política) va junto con NAW-26.

**NAW-34: mantener, con un delta menor** (Urgent)

- Añadir:
  - Si se usa el número de prueba de Meta, comprobar si acepta mensajes entrantes y salientes de números no registrados como destinatarios de prueba (**a verificar**). Si no, el QR del jurado falla y hay que precargar teléfonos.
  - El disparo usa un aviso de demo rotulado como tal.
- Absorbe NAW-14 (ver 3.2).

**NAW-35: mantener, con un delta menor** (Medium)

- Añadir:
  - Métricas de gasto (mensajes de plantilla enviados por categoría).
  - Excluir de `/metrics` los envíos de demo.

### 3.2 Issues del proyecto original (P-NAW-1) respecto al pivote

| Issue                                      | Estado actual   | Acción para el pivote                                                                   | Delta / motivo                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NAW-1 a NAW-4 (plantillas de Linear)       | Todo            | **Cancelar/archivar** (higiene, prioridad mínima)                                       | No son trabajo del producto; ensucian el backlog.                                                                                                                                                                                                                                                                                                                                                                                                            |
| NAW-5 Monorepo + deploy                    | Done            | **Mantener**                                                                            | Base heredada por el clon. Sin delta.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| NAW-6 Ingestor SIGRID + INDECI             | Backlog, Urgent | **Despriorizar** (→ Medium en el pivote)                                                | Alimenta capas de Mi Perú, pero no dispara alertas (D-04 propuesto).                                                                                                                                                                                                                                                                                                                                                                                         |
| NAW-7 UI mapa con semáforo                 | Backlog, Urgent | **Mantener en el original; en el pivote lo sustituye NAW-32 (Mi Perú)**                 | Su texto («colores verde/amarillo/naranja/rojo», «fórmula») ya choca con la ADR 0008. Si el equipo decide editarlo, título: `[Cristian] UI: mapa por capas (cada fuente con su nivel), «aquí ya pasó» y ¿qué hago?`, quitando la «fórmula» del panel.                                                                                                                                                                                                        |
| NAW-8 Ingestor avisos SENAMHI + Sutran     | Backlog, Urgent | **Mantener (crítico) y añadir un delta**                                                | Es lo que dispara las alertas de WhatsApp. Añadir: «La capa `official_notices` alimenta NAW-28. Hay que conservar el identificador y número del aviso para actualizar en lugar de duplicar». Separar Sutran como parte despriorizada.                                                                                                                                                                                                                        |
| NAW-9 Motor de alertas                     | Backlog, Urgent | **Modificar**                                                                           | Título: `[krelboyne] Motor de alertas: detectar aviso oficial nuevo o con nivel mayor por distrito (por capa, ADR 0008)`. Delta: sustituir «compara el semáforo anterior con el nuevo… cuando el color sube» por «compara los avisos vigentes de `official_notices` por distrito (nivel del emisor) y genera `AlertEvent` ante un aviso nuevo o con nivel mayor». Quitar la dependencia de NAW-19. Esta corrección vale también para el original (ADR 0008). |
| NAW-10 CI/CD + Cron + /estado              | Backlog, High   | **Mantener**                                                                            | El cron de ingesta es necesario para las alertas reales. Añadir los secretos del proveedor de WhatsApp al `worker-secrets.json` de la release.                                                                                                                                                                                                                                                                                                               |
| NAW-11 Instrumentar tracción y /metrics    | Backlog, Urgent | **Cancelar en el pivote (duplicado de NAW-35)**                                         | Mismo objetivo; NAW-35 está adaptado a registros verificados.                                                                                                                                                                                                                                                                                                                                                                                                |
| NAW-12 Envíos a personas externas          | Backlog, Urgent | **Modificar**                                                                           | Mensaje nuevo: «Recibe en tu WhatsApp los avisos oficiales de lluvia de tu distrito», con el QR. La métrica es registros con WhatsApp verificado (NAW-35).                                                                                                                                                                                                                                                                                                   |
| NAW-13 Tests, README, secretos             | Backlog, High   | **Mantener + delta**                                                                    | README del nuevo repo (pivote y enlace al original), gitleaks y tests de NotificationPort con el adaptador falso.                                                                                                                                                                                                                                                                                                                                            |
| NAW-14 Ensayo de demo                      | Backlog, High   | **Cancelar en el pivote (duplicado de NAW-34)**                                         | NAW-34 contiene el guion nuevo y el plan B.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| NAW-15 Verificar fuentes                   | Backlog, High   | **Modificar** (→ Urgent)                                                                | Añadir: (5) términos comerciales de Open-Meteo; (6) fuente de límites distritales; (7) viabilidad de Meta Cloud API o el BSP y del número de prueba. Hacerlo en la primera hora.                                                                                                                                                                                                                                                                             |
| NAW-16 Ética / Ley 29733                   | Backlog, Medium | **Sustituido por NAW-33 en el pivote**                                                  | Su premisa («las suscripciones no guardan datos personales») ya no vale con el número obligatorio.                                                                                                                                                                                                                                                                                                                                                           |
| NAW-17 Contratos                           | Done            | **Mantener**                                                                            | Hará falta añadir contratos (perfil, zona, consentimiento, `notification_log`) dentro de NAW-26 y NAW-33.                                                                                                                                                                                                                                                                                                                                                    |
| NAW-18 UI comunidad, reportes, preparación | Backlog, High   | **Despriorizar** (→ Low)                                                                | Fuera del MVP del pivote (D-08 propuesto).                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NAW-19 Motor de semáforo                   | Backlog, Urgent | **Modificar** (o cancelar si el equipo prefiere)                                        | Hoy describe una **puntuación combinada**, que contradice la ADR 0008 y el brief. Título: `[krelboyne] Estado por capa y distrito (SemaforoCell) sin puntuación agregada`. Delta: quitar «aviso × exposición × historial × bloqueos × reportes → color» y dejar «cada capa conserva su nivel y estado (`has_data` / `no_information` / `source_unavailable`)». Prioridad → Medium (en el pivote no bloquea las alertas).                                     |
| NAW-20 API incidents/semaforo              | Backlog, Urgent | **Mantener**                                                                            | Mi Perú y Mi Clima la consumen. Opcional: un endpoint de resumen por `ubigeo` para Mi Clima (se puede hacer dentro de NAW-31).                                                                                                                                                                                                                                                                                                                               |
| NAW-21 Esquema Neon/PostGIS                | Done            | **Mantener**                                                                            | Las tablas nuevas (perfil/zona, consentimiento, `notification_log`) van como migraciones en NAW-26, NAW-29 y NAW-33.                                                                                                                                                                                                                                                                                                                                         |
| NAW-22 Fuentes del directorio de ayuda     | Backlog, Urgent | **Despriorizar** (→ Low)                                                                | Fuera del MVP del pivote.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| NAW-23 Importador de organizaciones        | Backlog, High   | **Despriorizar** (→ Low)                                                                | Depende de NAW-22; fuera del MVP.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| NAW-24 API de ayuda y eventos              | Done            | **Mantener**                                                                            | Sin delta.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NAW-25 Web push PWA                        | Backlog, High   | **Cancelar en el pivote (lo sustituyen NAW-27 y NAW-28)**; en el original, despriorizar | D-10 propuesto. Puede volver más adelante como canal secundario.                                                                                                                                                                                                                                                                                                                                                                                             |

---

## 4. Issues nuevos a crear en P-NAW-2 (solo para lo que no está cubierto)

### N-1. `[Decisión] Registro del pivote Cerca WhatsApp (ADR 0010 + matriz v0.4)`

- **Prioridad:** Urgent. **Depende de:** la autorización humana de esta propuesta.
- **Descripción:** documentar el pivote como decisión durable en el nuevo repo (`docs/adr/0010-pivote-whatsapp.md`, o el siguiente número libre). Contenido: contexto («la web sola no genera valor; WhatsApp no necesita presentación»), la decisión (flujo registro → zona → WhatsApp obligatorio → feed Mi Clima/Mi Perú), las alternativas descartadas (web push, Telegram/correo, solo web) y sus consecuencias (costo por mensaje, Ley 29733, ventana de 24 h, licencia de Open-Meteo). Enlazarla desde la matriz v0.4 y desde la ADR 0008 (las alertas siguen siendo por capa).
- **Criterios de aceptación:**
  - La ADR está fusionada en KrelboyneGov/naWARE-whatsapp.
  - La matriz v0.4 está publicada en Linear con autorización registrada.
  - `linear.json` del clon apunta a P-NAW-2.
  - Las ADR 0008 y 0009 no tienen referencias contradictorias.
  - El `CLAUDE.md` y el `docs/product-brief.md` del clon reflejan el pivote.

### N-2. `[WhatsApp] Alta en WhatsApp Business (Meta) + plantillas utility y autenticación + opt-in`

- **Prioridad:** Urgent (tiene plazo externo). **Bloquea:** NAW-27, NAW-28 y la demo NAW-34.
- **Descripción:**
  - Crear o usar la cuenta Meta Business y la WABA.
  - Registrar el número del bot (o usar el número de prueba para la demo) y su nombre visible.
  - Enviar a aprobación la plantilla utility `aviso_oficial_zona` (parámetros: tipo de aviso, nivel del emisor, distrito, vigencia, enlace; pie «Responde BAJA para dejar de recibir»).
  - Opcional: plantilla de autenticación para OTP, si D-11 la elige.
  - Documentar la política de opt-in de Meta (consentimiento previo a mensajes iniciados por la empresa) y cómo la cumple el onboarding.
  - Configurar el webhook (verify token y firma `X-Hub-Signature-256`) apuntando a `apps/server-hono`.
  - Todo **a verificar** en la documentación vigente de Meta.
- **Criterios de aceptación:**
  - Hay un número operativo que recibe «Hola <código>» en el webhook desplegado.
  - La plantilla utility está aprobada (o, si no lo está a tiempo, el plan B queda documentado en NAW-34).
  - Hay un envío real de plantilla a un teléfono del equipo fuera de la ventana de 24 h.
  - El precio por categoría para Perú y los límites de mensajería quedan anotados.
  - Los secretos solo están en `worker-secrets.json` y `.dev.vars`.

### N-3. `[Datos] Límites distritales oficiales en emergency_map_territory (punto → distrito)`

- **Prioridad:** High. **Bloquea:** el modo automático de NAW-30 (el manual no). **Relacionado:** NAW-28 (intersección aviso ↔ distrito).
- **Descripción:**
  - Elegir y verificar la fuente de polígonos distritales (INEI, IGN u otra) y comprobar licencia, fecha y formato.
  - Cargar con migración o seed los cerca de 1 890 distritos (**a verificar** la cifra) con `ubigeo`, `parent_ubigeo`, `centroid` y `geometry`.
  - Añadir un índice GiST para `ST_Contains` (punto → distrito) y `ST_Intersects` (aviso → distritos).
- **Criterios de aceptación:**
  - Tres coordenadas reales resuelven el distrito correcto.
  - Se registran fuente y fecha en `data_source`.
  - Hay test de la resolución.
  - Cada consulta tarda menos de 200 ms.

### N-4. `[Negocio] Modelo de costos: WhatsApp por mensaje + Open-Meteo comercial + topes`

- **Prioridad:** High. **Depende de:** N-2 (precios). **Alimenta:** D-13.
- **Descripción:**
  - Estimar el costo mensual por cada 1 000 personas registradas según el número de avisos de SENAMHI por distrito y temporada (con datos históricos, si NAW-8 los tiene).
  - Comparar el precio de las plantillas utility frente a los mensajes de servicio.
  - Revisar el plan comercial de Open-Meteo.
  - Proponer topes por persona y globales (ya previstos en NAW-29).
  - Formular hipótesis de quién paga, sin cobrar la ayuda (por ejemplo patrocinio, municipalidades o empresas): son hipótesis para el equipo, no decisiones.
- **Criterios de aceptación:**
  - Hay una hoja de costos con supuestos y fuentes enlazadas.
  - Hay una recomendación de topes.
  - Se definen los insumos para decidir D-13 (se decide en la matriz con autorización).

> No hacen falta issues nuevos para «registro/onboarding» (NAW-26 + NAW-33), «zona» (NAW-30), «Mi Clima» (NAW-31), «feed vertical» ni «Mi Perú» (NAW-32): ya existen y se modifican según la sección 3.1.

**Orden sugerido:**

1. N-2 y NAW-15, en la primera hora, por el plazo externo.
2. NAW-27, NAW-26 + NAW-33.
3. NAW-31, NAW-32 y NAW-30 (selector manual).
4. NAW-8 y NAW-9 (modificado).
5. NAW-28 y NAW-29.
6. NAW-35.
7. NAW-34 (ensayo dos veces).

N-1 va en paralelo, en cuanto haya autorización; N-3 y N-4 después de la demo si no hay tiempo.

---

## 5. Preguntas abiertas y riesgos para el equipo

1. **Plazo.** La entrega es hoy a las 09:00 de Lima (D-05). El pivote se cargó en Linear alrededor de las 01:05 de Lima, así que quedan pocas horas para el alta en Meta, las plantillas, el onboarding y el feed. ¿Se recorta a «onboarding + Mi Clima + una alerta en vivo + plan B»?
2. **Repositorio de entrega.** ¿Las bases permiten entregar KrelboyneGov/naWARE-whatsapp si el registrado era csdev19/naWARE? ¿Cuál cuenta para «calidad de código»?
3. **Aprobación de la WhatsApp Business API.** La verificación del negocio, el nombre visible y la aprobación de plantillas pueden tardar más que el plazo (**a verificar**). El número de prueba de Meta podría limitar los destinatarios (**a verificar**), lo que rompe el QR abierto al jurado.
4. **Ventana de 24 h y costo.** Sin plantilla utility, las alertas fuera de ventana no salen. Meta pasó de cobrar por conversación a cobrar por mensaje de plantilla (cambio de 2025, **a verificar** junto con las tarifas para Perú). Es el principal riesgo del modelo de negocio: el costo crece con el número de personas y de avisos, y las temporadas de lluvia concentran el gasto.
5. **Proveedor.** Meta Cloud API directo (sin margen, más trámite) o un BSP (Zavu u otro: más rápido, con margen y dependencia). Zavu y sus cifras (SMS a ~US$0,235; «2 000 msgs gratis») están **sin verificar**.
6. **Verificación del número.** Código entrante «Hola <código>» (gratis, fricción baja, prueba la posesión) u OTP saliente por plantilla de autenticación (pagado, flujo más conocido).
7. **Ley 29733 y su reglamento** (**a verificar**, no es asesoría legal): consentimiento previo, libre, expreso e informado; finalidad única; inscripción del banco de datos; transferencia internacional a Meta o al BSP; derechos ARCO; plazo de conservación; medidas de seguridad. Si el modelo de negocio usa los números para otra cosa, hace falta otro consentimiento.
8. **«Semáforo» frente a capas.** ¿El equipo confirma que la alerta se dispara por el aviso de SENAMHI (nivel del emisor) y no por un color propio? Si se quiere un color propio, hace falta reabrir la ADR 0008 y explicar el cálculo sin sustituir el nivel oficial.
9. **Verificación de la fuente de avisos.** El ArcGIS de SENAMHI/INDECI sigue sin verificar (NAW-8 y NAW-15). Sin esa fuente no hay alertas reales: solo la demo con un aviso simulado y rotulado.
10. **Open-Meteo comercial.** El plan gratuito no cubre uso comercial y exige atribución.
11. **Responsables.** NAW-26 a NAW-35 están sin asignar, y el brief del pivote contradice D-07 respecto a camilamcr97.
12. **Gobernanza.** El proyecto P-NAW-2 y sus issues existen, pero la matriz no refleja el pivote. ¿Se aprueba esta v0.4 para alinear las dos cosas? ¿La matriz del pivote vive en el mismo documento 7 (recomendado: una sola fuente de verdad, con P-04 como antecedente) o en un documento propio de P-NAW-2?
13. **Coherencia del repo.** La matriz D-09 en Linear cita «ADR 0009» para la ingesta, pero la ADR 0009 local trata de señales comunitarias. Además, `01-matriz.md` y `linear.json` están desfasados respecto a Linear (03:54:54Z).
14. **Riesgo ético.** Un WhatsApp con «aviso rojo» genera más reacción que un mapa. El mensaje debe decir siempre «aviso oficial de SENAMHI», con la vigencia y un enlace a la fuente, y no dar instrucciones de evacuación sin una fuente oficial.

---

## 6. Alerta naWARE

> **ALERTA naWARE — autorización requerida para modificar la matriz**
>
> Destino: workspace **naWARE** (`0148d892-948f-4064-ad64-1a091692b56a`). Documento [7. Matriz de decisiones](https://linear.app/naware/document/7-matriz-de-decisiones-5c43332e1ae1) (`449710b0-6203-469d-a315-d29b813975ec`). Después, `KNOWLEDGE.base/01-matriz.md` y `KNOWLEDGE.base/linear.json` en el repo del pivote, KrelboyneGov/naWARE-whatsapp. csdev19/naWARE no se toca.
> Base revisada: matriz v0.3 en Linear, `updatedAt` **2026-10-18T03:54:54.062Z**, leída en esta sesión. La copia local está desfasada (`remote_updated_at` 01:52:28Z). Proyecto P-NAW-2 a las 06:05:21Z y brief del pivote a las 06:07:02Z.
> Cambios (v0.3 → v0.4; detalle exacto en la tabla de la sección 2):
>
> - **D-01**: «proyecto Cerca» → proyecto vigente **Cerca WhatsApp (P-NAW-2)**, repo KrelboyneGov/naWARE-whatsapp; P-NAW-1 y csdev19/naWARE pasan a antecedente congelado.
> - **D-03**: «Cerca: semáforo de lluvias…» → **Cerca WhatsApp**: registro → zona (geo o manual) → WhatsApp obligatorio → feed vertical Mi Clima (vista principal) / Mi Perú (mapa por capas existente), sin color combinado. Absorbe la propuesta v0.3 de mapa por capas.
> - **D-04**: «avisos SENAMHI cruzados con SIGRID, INDECI y Sutran; piloto pendiente» → solo los avisos de SENAMHI (nivel del emisor) disparan alertas; las demás fuentes son capas de Mi Perú; zona por persona; distrito de demo pendiente.
> - **D-05**: se añade «repositorio de entrega: pendiente».
> - **D-06**: Open-Meteo pasa de reserva a fuente principal del pronóstico de Mi Clima (licencia comercial a verificar); límites distritales por verificar; directorio de ayuda fuera del MVP.
> - **D-07**: responsables vigentes → P-NAW-2 pendiente de asignar, con la sugerencia de la sección 2; la contradicción sobre camilamcr97 queda señalada.
> - **D-08**: se añaden fuera del MVP: pagos, marketing por WhatsApp, chat conversacional, app nativa, comunidades/reportes nuevos y directorio de ayuda.
> - **D-09**: se añade la mensajería (NotificationPort, adaptador WhatsApp Meta Cloud API/BSP, webhook, Queues) y el repo del clon; queda por resolver la referencia a «ADR 0009».
> - **D-10**: «Web push PWA; adicional pendiente» → **WhatsApp principal y obligatorio** (plantilla utility fuera de la ventana de 24 h, BAJA), disparo por capa (ADR 0008); web push despriorizado; SMS pendiente.
> - **D-11 (alta)**: registro con WhatsApp verificado (método pendiente), consentimiento expreso, cifrado, zona distrital, BAJA y borrado, Ley 29733 a verificar.
> - **D-12 (alta)**: vista inicial Mi Clima; navegación vertical tipo TikTok hacia Mi Perú.
> - **D-13 (alta)**: modelo de negocio pendiente, con sus restricciones (costo de WhatsApp, Open-Meteo comercial, finalidad del dato).
> - **P-04 (alta)**: «Cerca web» preservado como antecedente.
> - **Pendientes abiertos**: reemplazados por la lista de la sección 2.
> - **Borrados**: ninguno.
>
> Motivo, fuentes e impacto: pedido del product owner en esta sesión («la web sola no genera valor; WhatsApp no necesita presentación»). Se apoya en el proyecto P-NAW-2, el brief del pivote y la ADR 0008 del repo. Impacto en el alcance: el MVP pasa a onboarding con WhatsApp, Mi Clima, el feed y las alertas por WhatsApp. Impacto en prioridades: NAW-29, NAW-31, NAW-32, NAW-33 y NAW-15 suben a Urgent; NAW-6, NAW-18, NAW-19, NAW-22 y NAW-23 bajan; NAW-11, NAW-14 y NAW-25 se cancelan en el pivote; NAW-9, NAW-19 y NAW-28 se reescriben «por capa». Impacto en responsables: P-NAW-2 sin asignar. Trabajo nuevo: N-1 a N-4. Riesgos: plazo de hoy a las 09:00, aprobación de Meta, costo por mensaje y Ley 29733.
> Estado: **propuesta pendiente; la matriz vigente no se ha modificado** (ni en Linear ni en local). Tampoco se ha modificado ningún issue.
>
> ¿Autorizas aplicar exactamente estos cambios a la matriz y publicarlos en Linear?

_(La autorización de la matriz no cubre las ediciones de issues de la sección 3 ni la creación de N-1 a N-4: si se desean, hay que pedirlas aparte, por cada destino.)_

---

## 7. Revisión final naWARE

- **Fecha y tarea:** 2026-10-18. Preparación de solo lectura de la propuesta del pivote a WhatsApp.
- **Linear:** conectado. Workspace naWARE verificado contra `linear.json`. Leí el documento 7 (03:54:54Z), los proyectos P-NAW-1 y P-NAW-2, el brief del pivote y los issues NAW-1 a NAW-35.
- **Matriz:** propuesta pendiente (v0.4). Sin cambios aplicados.
- **Cambios y autorización:** no aplica. No hubo escrituras en Linear ni en el repo; esto es un borrador.
- **Pendientes:**
  - El pivote ya está cargado en P-NAW-2 sin reflejo en la matriz.
  - La copia local está desfasada respecto a Linear.
  - La propuesta v0.3 de mapa por capas sigue sin aplicarse (esta la absorbe).
  - Hay contradicciones semáforo ↔ ADR 0008, horizontal ↔ vertical y responsables ↔ D-07.
  - Todo lo marcado **a verificar** en la sección 5.

---

## 8. Registro de aplicación (2026-10-18)

- **Matriz:** autorizada por escrito en el chat por el usuario de la sesión de Claude Code (git KrelboyneGov): «Autorizo aplicar exactamente los cambios de la ALERTA naWARE a la matriz (v0.3 → v0.4) y publicarlos en Linear. Los issues todavía no.» Publicada en el documento 7 con ediciones parciales (base 03:54:54.062Z → 07:02:59.547Z) y verificada por lectura. Copia local sincronizada en el commit 078ea3f.
- **Issues:** autorizados aparte: «Autorizo aplicar exactamente los cambios de issues de la sección 3 de la propuesta (prioridades, cancelaciones, archivados y reescrituras por capa) y crear N-1 a N-4 en P-NAW-2.» Aplicados y verificados por lectura entre 07:11Z y 08:12Z:
  - 3.1: NAW-26 a NAW-35, con delta «Delta pivote v0.4», títulos y prioridades. NAW-28 bloqueado por NAW-8, NAW-9, NAW-27, NAW-29 y NAW-37.
  - 3.2: NAW-1 a NAW-4, NAW-11, NAW-14 y NAW-25 cancelados. NAW-6 a Medium; NAW-18, NAW-22 y NAW-23 a Low. NAW-9, NAW-12, NAW-15 y NAW-19 modificados. Comentarios en NAW-7, NAW-8, NAW-10, NAW-13, NAW-16, NAW-17, NAW-20 y NAW-21. NAW-5 y NAW-24 sin cambios.
  - Sección 4: N-1 = NAW-36, N-2 = NAW-37, N-3 = NAW-38 y N-4 = NAW-39, en P-NAW-2.
- **Desviaciones conocidas:**
  - Linear creó por su cuenta relaciones «relacionado con» de NAW-39 hacia NAW-8 y NAW-29.
  - NAW-9 → NAW-28 pasó de «relacionado» a «bloquea», porque Linear admite una sola relación por par.
  - Los issues nuevos no llevan la etiqueta «Feature».
  - Quedan textos antiguos no cubiertos por la sección 3.1: «2.000 msgs gratis» en NAW-26, «clima/semáforo» en NAW-33, «Camila (semáforo)» en NAW-28 y el QR `?text=Hola` en NAW-34.
