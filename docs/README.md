# Documentation

Plain Markdown, no docs site. Everything a contributor or an agent needs to understand the
product and the repository lives here; reusable, product-agnostic knowledge lives in the
[general-knowledge hub](https://github.com/csdev19/general-knowledge) and is linked, not copied.

| Path               | What goes here                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `product-brief.md` | Product, users, data sources, MVP scope and open decisions                                                      |
| `deployment.md`    | Environments, secrets, release procedure, moving the repo                                                       |
| `adr/`             | Architecture decision records (`NNNN-slug.md`): context, decision, alternatives, consequences, reopen condition |
| `specs/`           | Design specs (`YYYY-MM-DD-slug.md`), each opening with a one-minute summary block                               |
| `plans/`           | Working implementation plans; the PR links them, the shipping PR deletes them                                   |
| `backlog/`         | Deferred work and epics broken into runner-sized docs                                                           |
| `features/`        | Feature docs as memory: one folder per feature area, plus a changelog                                           |

Conventions: English only, one idea per file, link related pages with relative paths. The
feature-docs and plan-to-backlog skills under `.claude/skills/` are configured for these paths.
