# Propuesta — nombre KlAimate, agente y Zavu elegido

Estado: **pendiente**. No modifica `01-matriz.md` ni el documento 7 de Linear.

Base revisada: matriz v0.4, documento 7, `updatedAt` 2026-10-18T07:02:59.547Z, leído en esta sesión.

> **ALERTA naWARE — autorización requerida para modificar la matriz**
>
> Destino: workspace naWARE (`0148d892-948f-4064-ad64-1a091692b56a`), documento 7 [Matriz de decisiones](https://linear.app/naware/document/7-matriz-de-decisiones-5c43332e1ae1), copia local `KNOWLEDGE.base/01-matriz.md`.
> Base revisada: v0.4, actualizada el 2026-10-18T07:02:59.547Z.
> Cambios:
>
> - D-03 nombre visible: «Cerca WhatsApp» → «KlAimate» en la interfaz y el README. El flujo de registro, zona y avisos por WhatsApp se mantiene. Mi Clima / feed tipo TikTok no entra en este cambio.
> - D-08: el chat conversacional deja de estar fuera del MVP. El bot responde consultas de clima de una zona (herramientas sobre avisos, histórico y pronóstico), además de alta, BAJA y ayuda mínima.
> - D-09 mensajería: «Meta Cloud API o un BSP; Zavu es candidato» → Zavu elegido. Sender de WhatsApp explícito Achalau HCO `kd7b3sknk6z3xvn5pykzgkc7a58ghwe7` (no es el default; el default es SMS). `fallbackEnabled` desactivado. Cola: tabla `notification_job` + cron (el plan B de D-09). No se agrega Cloudflare Queues.
> - D-11 método de verificación: «pendiente (Hola &lt;código&gt; u OTP)» → la persona escribe desde el número registrado (el «Hola» abre la ventana de 24 h). Se mantienen cifrado + HMAC, consentimiento no premarcado y baja inmediata. BAJA programa anonimización a 30 días. Sigue pendiente la verificación de la Ley 29733 y la opción separada «Borrar mis datos» si el equipo la quiere además de BAJA.
>
> Motivo: el build de la entrega usa ese nombre, ese sender real y un agente con herramientas. El default SMS de Zavu enviaría por el canal equivocado si el adaptador no fija el sender. `canSendTemplates=false` obliga a texto libre dentro de la ventana y a no reintentar plantillas sin pago.
> Impacto: el código de esta rama ya implementa lo propuesto. La matriz vigente no cambia hasta esta autorización.
> Estado: propuesta pendiente; la matriz vigente no se ha modificado.
>
> ¿Autorizas aplicar exactamente estos cambios a la matriz y publicarlos en Linear?

## Qué no propone esta nota

No cambia D-04 (solo SENAMHI dispara alertas), D-06 (Open-Meteo sigue siendo pronóstico) ni ADR 0008 (sin color combinado). El nivel que viaja en la plantilla es el del aviso del emisor, o `sin_informacion` si no hay aviso.
