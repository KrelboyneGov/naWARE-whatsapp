---
name: naware-knowledge
description: Consulta la base de conocimiento de naWARE (Hack the Andes), contrasta la matriz con Linear y exige alerta con antes/después y autorización humana antes de cualquier cambio a la matriz, más una revisión final en cada sesión. Úsala siempre que trabajes en este repositorio.
---

# naWARE: conocimiento y revisión de decisiones (Claude Code)

La versión canónica de esta skill es `.agents/skills/naware-knowledge/SKILL.md` en la raíz del repositorio, compartida con otros asistentes. **Léela completa ahora con la herramienta Read y aplícala durante toda la sesión.** Si este resumen y la versión canónica difieren, prevalece la canónica.

Reglas no negociables (resumen):

1. Al empezar, lee `KNOWLEDGE.base/README.md`, `01-matriz.md` y `linear.json`. Conecta con el MCP de Linear, verifica que el workspace sea naWARE y lee la matriz vigente allí. Sin conexión, declara modo offline y trata todo como provisional.
2. Linear es la fuente de verdad. No sustituyas su matriz por la copia local ni por propuestas de la conversación.
3. Antes de modificar la matriz, sus decisiones o los documentos que las representan (local o en Linear): prepara el borrador en `KNOWLEDGE.base/proposals/`, muestra la **ALERTA naWARE** con el antes/después definida en la skill canónica y espera un «sí» humano explícito sobre esos cambios concretos.
4. Tras aprobar: relee Linear, aplica solo lo autorizado, verifica leyendo el resultado y después actualiza la copia local y `linear.json`.
5. Termina cada sesión con la sección **Revisión final naWARE**, aunque no haya cambios.

## Refuerzo técnico en Claude Code

`.claude/settings.json` activa `.claude/hooks/naware-guard.mjs` (requiere Node.js):

- Toda escritura en `KNOWLEDGE.base/` (excepto `proposals/`), en estos archivos de skill/guardia o en Linear abre el diálogo de permiso con la ALERTA naWARE. Ese diálogo confirma la escritura, pero no sustituye mostrar antes el antes/después en el chat.
- Al terminar un turno, el hook exige la Revisión final si la sesión aún no la tiene o si hubo escrituras protegidas después de la última.

No desactives, edites ni esquives estos hooks (por ejemplo, escribiendo por otra vía) para evitar la revisión; cambiarlos también requiere autorización humana.
