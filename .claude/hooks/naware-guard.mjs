#!/usr/bin/env node
// Guardia de la matriz naWARE para Claude Code.
// Uso: node naware-guard.mjs <pretool|session-start|stop>  (JSON del hook por stdin)
//
// - pretool: fuerza el diálogo de autorización ("ask") antes de escribir en la
//   base protegida, en los archivos de gobernanza/guardia o en Linear.
// - session-start: recuerda la skill y el estado de linear.json.
// - stop: exige la "Revisión final naWARE" una vez por sesión y de nuevo tras
//   cualquier escritura protegida posterior a la última revisión.
//
// Ante errores inesperados no bloquea (fail-open): la skill sigue aplicando.

import fs from "node:fs";
import path from "node:path";

const REVIEW_RE = /Revisi[oó]n final naWARE/i;
const FILE_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const LINEAR_WRITE_RE =
  /^(create|update|save|delete|archive|unarchive|remove|add|set|move|edit|upsert|post|publish)/i;
// El conector de claude.ai nombra las herramientas mcp__<uuid>__save_document, sin «linear»:
// se reconocen por los nombres de escritura del MCP oficial de Linear.
const LINEAR_WRITE_TOOLS_RE =
  /^(save_(document|issue|project|comment|milestone|status_update|issue_label|project_label|release|release_note|diff_comment)|create_(attachment|attachment_from_upload|issue_label)|delete_(attachment|comment|diff_comment|status_update)|(retire|restore)_(issue|project)_label|(un)?share_issue|update_diff|merge_diff|submit_diff_review|resolve_diff_thread)$/;
const SHELL_WRITE_RE =
  /(>|\btee\b|\bsed\s+-i|\bperl\s+-[a-z]*i|\b(mv|cp|rm|truncate|touch)\b|\bgit\s+(checkout|restore|apply|mv|rm|reset|stash)\b|Set-Content|Add-Content|Out-File|Move-Item|Copy-Item|Remove-Item|Rename-Item|New-Item|WriteAll|\.write)/i;

// Rutas relativas a la raíz (minúsculas, con "/"). KNOWLEDGE.base/proposals/ queda libre para borradores.
const PROTECTED_PREFIXES = [
  "knowledge.base/",
  ".agents/skills/naware-knowledge/",
  ".claude/skills/naware-knowledge/",
  ".claude/hooks/naware-guard.mjs",
  ".claude/settings.json",
  "agents.md",
  "claude.md",
];
const FREE_PREFIXES = ["knowledge.base/proposals/"];

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function projectRoot(input) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

function relKey(root, p) {
  if (!p) return null;
  const abs = path.resolve(root, p);
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/").toLowerCase();
}

function isProtected(key) {
  if (!key) return false;
  if (FREE_PREFIXES.some((f) => key.startsWith(f))) return false;
  return PROTECTED_PREFIXES.some((pre) => key === pre || key.startsWith(pre));
}

function shellTouchesProtected(command) {
  if (!command || !SHELL_WRITE_RE.test(command)) return null;
  const norm = command.replace(/\\/g, "/").toLowerCase();
  const hit = PROTECTED_PREFIXES.find((pre) => {
    const needle = pre.replace(/\/$/, "");
    let i = norm.indexOf(needle);
    while (i !== -1) {
      if (!FREE_PREFIXES.some((f) => norm.startsWith(f, i))) return true;
      i = norm.indexOf(needle, i + 1);
    }
    return false;
  });
  return hit || null;
}

function linearMeta(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "KNOWLEDGE.base", "linear.json"), "utf8"));
  } catch {
    return {};
  }
}

function isLinearWrite(toolName) {
  if (!toolName.startsWith("mcp__")) return false;
  const verb = toolName.split("__").pop() || "";
  if (LINEAR_WRITE_TOOLS_RE.test(verb)) return true;
  return /linear/i.test(toolName) && LINEAR_WRITE_RE.test(verb);
}

// Devuelve una descripción del objetivo protegido o null.
function protectedTarget(toolName, toolInput, root) {
  if (FILE_TOOLS.has(toolName)) {
    const p = toolInput.file_path || toolInput.notebook_path;
    const key = relKey(root, p);
    return isProtected(key) ? key : null;
  }
  if (SHELL_TOOLS.has(toolName)) {
    const hit = shellTouchesProtected(toolInput.command);
    return hit ? `${hit} (vía ${toolName})` : null;
  }
  if (isLinearWrite(toolName)) {
    const meta = linearMeta(root);
    const blob = JSON.stringify(toolInput || {});
    const matrixId = meta.matrix_document_id;
    const touchesMatrix = (matrixId && blob.includes(matrixId)) || /matriz|matrix/i.test(blob);
    return touchesMatrix ? `Linear — MATRIZ (${toolName})` : `Linear (${toolName})`;
  }
  return null;
}

function pretool(input) {
  const root = projectRoot(input);
  const target = protectedTarget(input.tool_name || "", input.tool_input || {}, root);
  if (!target) return;
  const reason =
    `ALERTA naWARE — autorización requerida. Esta acción escribe en: ${target}. ` +
    "Antes de aprobar, comprueba que el asistente mostró la alerta con el antes/después " +
    "(skill naware-knowledge). Aprobar autoriza solo esta escritura; rechaza si no viste el diff.";
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: reason,
      },
    }),
  );
}

function sessionStart(input) {
  const root = projectRoot(input);
  const meta = linearMeta(root);
  const status = meta.publication_status || "desconocido";
  const context = [
    "Proyecto naWARE: aplica la skill naware-knowledge durante toda la sesión",
    "(lee .agents/skills/naware-knowledge/SKILL.md y KNOWLEDGE.base/README.md antes de trabajar).",
    `Linear es la fuente de verdad; estado de publicación en linear.json: ${status}.`,
    "Cualquier cambio a la matriz o decisiones exige la ALERTA naWARE con antes/después y",
    "autorización humana explícita antes de escribir (localmente o en Linear).",
    'Cierra la sesión con la sección "Revisión final naWARE" aunque no haya cambios.',
  ].join(" ");
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context },
    }),
  );
}

// Recorre el transcript y devuelve si hay revisión vigente.
function reviewState(transcriptPath, root) {
  const lines = fs.readFileSync(transcriptPath, "utf8").split("\n");
  let sawReview = false;
  let dirtySinceReview = false;
  for (const line of lines) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== "assistant") continue;
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === "text" && REVIEW_RE.test(block.text || "")) {
        sawReview = true;
        dirtySinceReview = false;
      } else if (
        block.type === "tool_use" &&
        protectedTarget(block.name || "", block.input || {}, root)
      ) {
        dirtySinceReview = true;
      }
    }
  }
  return { sawReview, dirtySinceReview };
}

function stop(input) {
  if (input.stop_hook_active || !input.transcript_path) return;
  const root = projectRoot(input);
  const { sawReview, dirtySinceReview } = reviewState(input.transcript_path, root);
  let reason = null;
  if (dirtySinceReview) {
    reason =
      "Hubo escrituras protegidas (matriz/base/Linear) después de la última revisión. " +
      'Antes de terminar, añade la sección "Revisión final naWARE" definida en la skill naware-knowledge, ' +
      "indicando qué cambió, la autorización humana recibida y el estado real de Linear.";
  } else if (!sawReview) {
    reason =
      'Esta sesión aún no tiene la "Revisión final naWARE" que exige la skill naware-knowledge. ' +
      "Añádela ahora (fecha/tarea, Linear, Matriz, Cambios y autorización, Pendientes). " +
      "Si no hubo cambios, indica «Matriz sin cambios; no se requiere autorización».";
  }
  if (reason) process.stdout.write(JSON.stringify({ decision: "block", reason }));
}

const handlers = { pretool, "session-start": sessionStart, stop };
try {
  const handler = handlers[process.argv[2]];
  if (handler) handler(readStdin());
} catch (err) {
  process.stderr.write(`naware-guard: ${err?.message || err}\n`);
}
process.exit(0);
