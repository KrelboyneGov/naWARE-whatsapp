// commit-msg hook: reject what release-please cannot parse. Node instead of an inline shell
// script, because lefthook on Windows breaks multi-line `run:` blocks.
// Usage: node scripts/check-commit-msg.mjs <path-to-COMMIT_EDITMSG>
// Arguments are joined back because lefthook passes {1} unquoted and the path can hold spaces.
import { readFileSync } from "node:fs";

// trimStart also drops a UTF-8 BOM that some Windows editors write.
const first =
  readFileSync(process.argv.slice(2).join(" "), "utf8").trimStart().split(/\r?\n/)[0] ?? "";

if (/^(fixup!|squash!|Merge |Revert )/.test(first)) process.exit(0);
if (
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9._/-]+\))?!?: .+/.test(
    first,
  )
) {
  process.exit(0);
}

console.error(
  "Commit message must follow Conventional Commits, e.g. 'feat(web): add recordings page'.",
);
console.error("release-please derives versions and changelogs from these prefixes.");
process.exit(1);
