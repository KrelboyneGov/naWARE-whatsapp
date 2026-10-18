# Gobernanza del conocimiento

## Autoridad

El usuario solicitó el 2026-10-17 mantener Linear como fuente de verdad y que los asistentes muestren una alerta para autorizar modificaciones a la matriz, con revisión al terminar cada sesión. La implementación de esa regla está en [SKILL.md](../.agents/skills/naware-knowledge/SKILL.md).

Las decisiones humanas registradas y verificadas en Linear prevalecen sobre la memoria del asistente y propuestas locales. La publicación inicial debe conservar explícitamente el estado pendiente de las propuestas; no significa que el equipo haya elegido P-01.

## Flujo de cambios

Leer Linear → preparar borrador separado → mostrar antes/después y alerta → esperar autorización humana concreta → releer Linear y resolver concurrencia → aplicar únicamente lo autorizado → verificar mediante lectura → actualizar copia local autorizada → revisión final.

Sin respuesta: propuesta pendiente. Rechazo: no aplicar. Sin conexión: trabajo provisional offline. Error o publicación parcial: declarar exactamente qué se verificó; no declarar sincronización completa. Una autorización para un cambio no se reutiliza para otro ni para otra sesión.

## Revisión final por sesión

Registrar fecha/tarea, conexión real a Linear, documento y versión consultados, estado de la matriz, cambios propuestos/aplicados, autorización o «no aplica», y pendientes. Si no hubo cambios, indicar «Matriz sin cambios; no se requiere autorización».

## Alcance de la protección

La skill y `AGENTS.md` son instrucciones para asistentes; no son un bloqueo técnico universal. En Claude Code, `.claude/settings.json` activa `.claude/hooks/naware-guard.mjs` (Node.js), que pide confirmación antes de escribir en esta base (excepto `proposals/`), en los archivos de skill/guardia o en Linear, y exige la revisión final de la sesión. El hook es local a cada asistente: no actúa sobre otros LLM, editores manuales ni integraciones con permiso directo, y si falta Node.js no se ejecuta. No se han cambiado permisos de Linear, instalado webhooks ni configurado automatizaciones remotas. El equipo debe decidir aparte si necesita restricciones técnicas adicionales.
