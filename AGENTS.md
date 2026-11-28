# Aleph Hackathon Rosario

Monorepo for our Aleph Hackathon Rosario project, built on 2026-11-28. `README.md` covers setup. This file holds the rules every person and agent follows here.

## Layout

| Path | What lives there |
| --- | --- |
| `apps/web` | The web app. Vite, React 19, TanStack Router and Query, Tailwind v4 |
| `apps/api` | The API. The language is chosen on hackathon day, see its README |
| `packages/contracts` | `openapi.yaml`, the API contract, and the code generated from it |
| `db/migrations` | Plain SQL migrations run by dbmate |
| `docs/adr` | Architecture decision records |
| `CONTEXT.md` | The glossary of domain terms |
| `hackathon/`, `ideas/` | Organizer info, copied as published, and our idea notes |
| `vendor/agents` | The flow role agents, copied from `soundOfff/skills` at its pinned commit. dotagents installs them |

## Rules

- Write everything in English, including docs, code, UI copy, and commits. The organizer text in `hackathon/` stays as copied.
- The contract comes first. Change `packages/contracts/openapi.yaml`, run `bun run contracts:gen`, and commit the generated files with it. Never hand-edit `packages/contracts/src/gen/`.
- Validate external data once, where it enters. The generated SDK parses every API response with its Zod schema, so code inside the app trusts the types.
- Colors come from the `@theme` block in `apps/web/src/styles.css`. `bun run check:design` fails on raw colors anywhere else.
- This repository is public. Never paste code, names, or text from a private or employer codebase, and never commit a secret. `.env` is ignored, and every new variable goes into `.env.example` without its value.
- Record a decision in `docs/adr/` only when it is hard to reverse, surprising without context, and a real tradeoff. Record domain terms in `CONTEXT.md`. `/grill-with-docs` does both while you talk.
- Skills and role agents come from `agents.toml`. Run `bun run skills:install` after it changes. The post-merge hook does this for you. Never edit the installed copies under `.agents/`, `.claude/agents/`, or `.codex/agents/`.

<!-- flow:begin v=f2d518d0fe21 -->
<!-- Managed by /flow-setup. A re-run rewrites everything between these markers. Keep repository notes outside them. -->

## Settings

| Setting | Value |
| --- | --- |
| Base branch | `main` |
| Publish mode | `ready` |
| Merge strategy | `merge` |
| Forge | `github` |
| Tracker | `local` |
| Pull request template | `.github/pull_request_template.md` |
| Closing reference | `Closes <issue id>` |
| Ready label | `ready-for-agent` |

Flow skills read these values from this table and nowhere else. Files in `docs/agents/` name a row instead of repeating its value. To change a value, re-run `/flow-setup`.

## Commands

| Gate | Command |
| --- | --- |
| install | `bun install --frozen-lockfile` |
| dev | `bun run dev` |
| format | `bun run format` |
| lint | `bun run lint` |
| typecheck | `bun run typecheck` |
| test | `bun run test` |
| test-file | `bun run --filter web test <path>` |
| e2e | n/a |
| build | `bun run build` |
| design | `bun run check:design` |
| health | n/a |

The full gate is `lint`, `typecheck`, `test`, and `build`, skipping any that read `n/a`. `test-file` runs one test file, with `<path>` replaced by its path. A gate that reads `n/a` is not configured.

## Sources of truth

| Concern | Path |
| --- | --- |
| Domain language | `CONTEXT.md` |
| Decisions | `docs/adr` |
| Conventions | `AGENTS.md` |
| Design system | none |
| Structure | `AGENTS.md` |

A source that reads `none` does not exist yet. Tracker, ticket, and pull request rules live in `docs/agents/`: `issue-tracker.md`, `ticket-standard.md`, `pr-standard.md`, and `domain.md`.

## Delivery workflow

Tracked work moves through four stages. Each stage is human-invoked, keeps one ledger under the git-ignored `.flow/` folder, and hands control back. No stage starts the next one.

1. `/flow-create`, optional. Turns an idea into a confirmed feature map.
2. `/flow-to-issues`, required for tracked work. Turns settled work into issues that carry the `Ready label`, after the user approves the exact set.
3. `/flow-build <issue>`, optional. Builds one Ready issue up to its review boundary with parallel agents. Direct work on the issue's branch is fine too.
4. `/flow-to-pr <issue>`, required. Rebases, pushes, and opens the pull request in the `Publish mode`.

After publication, `/flow-code-check` reviews code and `/flow-design-check` reviews UI. Their results are advice and never block. Untracked work, such as a quick fix or a spike, runs through `pstack:poteto-mode` directly.

| Skill | Use it to |
| --- | --- |
| `/flow-mode` | Work here with poteto-mode plus this workflow. |
| `/flow-help` | Get a grounded answer, an orientation, or a bug explanation. |
| `/flow-create` | Map a feature and its reuse plan before building it. |
| `/flow-to-issues` | Turn settled work into an approved issue hierarchy. |
| `/flow-build` | Build one Ready issue with focused agents. |
| `/flow-to-pr` | Publish one implemented issue as a pull request. |
| `/flow-code-check` | Review a change for correctness and solution quality. |
| `/flow-design-check` | Review a UI change for design drift and visual antipatterns. |
| `/flow-adv-review` | Challenge a change with a second model, only when asked. |
| `/flow-setup` | Rewrite this block and refresh `docs/agents/`. |

In Codex, type `$flow-help` instead of `/flow-help`, and the same for every skill above.

## Golden rules

- Never add, upgrade, or remove a dependency unless the user asks for it in that message. Always pin the exact version.
- Work on a feature branch. Never commit or push to the `Base branch`.
- Sync with the `Base branch` on `origin` by rebase. Never merge the base branch into a feature branch.
- Force-push only after a rebase, and only with `--force-with-lease`.
- Never merge a pull request unless the user asks for it in that message.
- Never create an issue, parent, or label without a user message you can quote that asks for it. See `## Authorization gate` in `docs/agents/issue-tracker.md`.
- Never put secrets, credentials, or customer data in code, logs, issues, or pull requests.
- Run the full gate before handing off. When a gate cannot run, report why and never claim it passed.
<!-- flow:end -->
