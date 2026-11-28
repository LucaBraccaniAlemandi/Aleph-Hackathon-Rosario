# Repo setup plan

This plan turns the ideas repo into a bun monorepo the team can build on tomorrow. It adds a web app shell, an OpenAPI contract with generated Zod schemas, a Postgres setup, a Vercel deploy path, and a shared agent layer for Claude Code and Codex (skills, role agents, ADRs, glossary, design checks). It adds no product code. The hackathon judges only what we build on Saturday, so everything here is tooling, and a git tag marks where the scaffold ends.

Status. Implemented on 2026-11-27 in two pull requests, after one Codex review whose findings are all folded in (Appendix F).

Settled with you on 2026-11-27.

- bun as the package manager.
- Claude Code and Codex as the agent targets.
- Everything in English, docs and UI copy alike.
- dotagents for skills and agents, with no Sentry error monitoring tonight.
- No track or idea picked yet, so the glossary starts empty.
- No GitHub issues. The flow profile uses the local tracker, and the daily route skips issues.
- Vercel lives on Luca's account. You bring the keys later, so nothing deploys tonight.
- Tag the scaffold `pre-hackathon-scaffold` and say so in the README.
- No `DESIGN.md` tonight. It gets written Saturday from the chosen idea.

## How to read this

The body lists the work in the order it runs. Each step ends in the check that proves it. The appendices hold the decisions, the skill list, the risks, the research sources, and the review.

Execution is two pull requests. PR 1 is the code scaffold. PR 2 is the agent and docs layer, branched from PR 1 because `/flow-setup` reads the commands PR 1 creates. You merge both.

## Ground rules

1. **No product code before Saturday.** The rules say "solo se evalúa lo hecho durante el hackathon" and ask teams to disclose prior work. The scaffold ships one placeholder route and one `/health` operation, nothing domain-specific. The last step tags the commit `pre-hackathon-scaffold`, and the README says so, so the jury can run `git diff pre-hackathon-scaffold..main`.
2. **Nothing from private repos.** This repo is public. The agent layer comes from your public kit (`soundOfff/skills` at `d90454a`) and public third-party skills. The structure follows patterns you already use, but no file, name, or text is copied from a private codebase. A pre-commit leak check enforces this (step 1.6).
3. **Every rule a person would forget is a script.** Lint, format, typecheck, contract lint, stale codegen, design tokens, and the leak check all run as commands in git hooks or CI, not as advice in a doc.

## Target layout

```text
apps/
  web/                 Vite + React 19 + TanStack Router + TanStack Query + Tailwind v4
  api/                 README with the Node and Python recipes; language chosen Saturday
packages/
  contracts/           openapi.yaml (source of truth) + generated Zod schemas, SDK, query options
db/
  migrations/          plain SQL migrations (dbmate), language neutral
vendor/
  agents/              the five public role agents, in native Claude and Codex formats
docs/
  adr/                 architecture decision records, 0001-...
  agents/              flow standards written by /flow-setup
  plans/               this file
hackathon/ ideas/      unchanged (organizer text stays in Spanish, as copied)
CONTEXT.md             glossary (domain language), owned by domain-modeling
AGENTS.md CLAUDE.md    repo rules and the flow profile
agents.toml            dotagents manifest for skills and role agents
compose.yml            local Postgres
biome.json lefthook.yml tsconfig.base.json .nvmrc .github/workflows/ci.yml
```

## PR 1. Scaffold the monorepo, web app, contract, and database

### 1.1 Set up the workspace root

- [ ] Root `package.json`, private, with `workspaces: ["apps/*", "packages/*"]`, `packageManager: "bun@1.4.2"`, and `engines.node >= 24.18.0`. `.nvmrc` pins the same Node 24 patch, and CI uses it. Prism 5.16 needs 24.18.0 and hey-api needs 22.18.0. Your machine runs 24.13.0, so `nvm install` comes first.
- [ ] Pin `typescript@6.0.3` exactly. A fresh install otherwise resolves TypeScript 7.0.2, and hey-api 0.99.0 crashes on it. Every tool gets an exact pin, and the root `bun.lock` is committed.
- [ ] `tsconfig.base.json`, strict, with `noUncheckedIndexedAccess`.
- [ ] `biome.json` for lint and format across the workspace, with `css.parser.tailwindDirectives: true` so `@theme` parses. Generated files are ignored.
- [ ] `lefthook.yml`. Pre-commit runs `biome check --write` on staged files with `stage_fixed`, then the leak check on the staged blobs after restaging. Post-merge reruns the skills install only when `git diff --name-only ORIG_HEAD HEAD -- agents.toml` is non-empty. Pushes stay unblocked.
- [ ] Root scripts. `dev` (Prism mock plus the web dev server), `lint`, `format`, `typecheck`, `test`, `build`, `check` (every gate), `check:design`, `contracts:gen`, `contracts:lint`, `contracts:stale`, `api:mock`, `db:up`, `db:wait`, `db:new`, `db:migrate`, `db:rollback`, `skills:install`.
- [ ] Extend `.gitignore` with `dist/`, `.vercel/`, `.flow/`, `.scratch/`, `.env`, `.leak-patterns.local`, `.claude/settings.local.json`, and whatever dotagents asks to ignore. Today `.claude/settings.local.json` is ignored only by your global git config, which teammates do not share.
- Check. `bun install --frozen-lockfile && bun run check` exits 0 on a clean clone.

### 1.2 Scaffold `apps/web`

- [ ] Vite + React 19 + TypeScript. TanStack Router with its Vite plugin listed before the React plugin, file-based routes in `src/routes/`, and `routeTree.gen.ts` committed so a clean clone typechecks. TanStack Query with one `QueryClient` passed through the router context, so loaders call `queryClient.ensureQueryData(...)`. Tailwind v4 through `@tailwindcss/vite`, with every token in one `@theme` block in `src/styles.css`.
- [ ] One route, `/`, that renders the app name and the API health status. No product screens.
- [ ] shadcn/ui initialized (`components.json`, `cn` helper). No components added until someone needs one.
- [ ] Vite dev server proxies `/api/*` to Prism on port 4010 and strips the `/api` prefix. Without the proxy, Vite answers `/api/health` with `200 text/html`, and the SDK accepts that HTML as a successful response.
- [ ] Vitest + Testing Library + jsdom. One behavior test for `/` that renders the health status from a mocked JSON response.
- [ ] `apps/web/vercel.json` with the `/api/:path*` rewrite to the API project's `/:path*` first and the SPA fallback (`/(.*)` to `/index.html`) after it, so the browser never needs CORS.
- Check. `bun run dev` serves `/`, and a browser screenshot shows "ok". `curl -i localhost:5173/api/health` returns `200 application/json` with `{"status":"ok"}`. `test` and `build` pass for `web`.

### 1.3 Add the contract package

- [ ] `packages/contracts/openapi.yaml`, OpenAPI 3.1, with `servers: [{url: /api}]`, top-level `security: []` (the health check is public), and one operation, `GET /health`, with a stable `operationId` and an example. The response references a named `components.schemas.Health`. Redocly fails a minimal file on `no-empty-servers` and `security-defined`, and the Python generator finds no models in an inline-only schema.
- [ ] Codegen with `@hey-api/openapi-ts` pinned to `0.99.0`. Plugins `zod` (Zod v4), `@hey-api/sdk` with `validator: true`, and `@tanstack/react-query` (query options and keys, not hooks). Output goes to `packages/contracts/src/gen/` and is committed, so a Python teammate and Vercel builds never run the generator.
- [ ] `contracts:lint` runs `@redocly/cli@2.84.0 lint` with the default `recommended` rules.
- [ ] `contracts:stale` regenerates, then fails when `git status --porcelain --untracked-files=all -- packages/contracts/src/gen` prints anything. `git diff --exit-code` alone misses a newly generated file that was never added.
- [ ] `api:mock` serves the contract with Prism 5.16 on port 4010.
- [ ] `apps/web` declares the contracts package as `workspace:*` and reads `/health` through the generated query options. The SDK parses each response with the generated Zod schema at the fetch boundary, and code inside the app trusts the types without re-validating.
- Check. Two `contracts:gen` runs leave the tree clean. Deleting a generated file makes `contracts:stale` fail. `contracts:lint` passes.

### 1.4 Prepare the database

- [ ] `compose.yml` with Postgres 17 on port 5432 and a named volume.
- [ ] `.env.example` with a local `DATABASE_URL` that carries `sslmode=disable`, and a note that Neon on Vercel injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, for migrations). Onboarding starts with `cp .env.example .env`.
- [ ] `db/migrations/` managed by dbmate. `db:wait` runs `dbmate wait`. `db:migrate` succeeds with zero migrations instead of failing on "no migration files found". Migrations against Neon run with `dbmate -e DATABASE_URL_UNPOOLED`.
- Check. On an empty database, `db:up`, `db:wait`, and `db:migrate` succeed. In a scratch copy, a throwaway migration applies and rolls back, and the throwaway is deleted.

### 1.5 Document the API choice without making it

- [ ] `apps/api/README.md` with two ten-minute recipes. Each ends in a deployed `GET /health` that satisfies the contract.
  - Node. Hono on Vercel, which deploys zero-config when `src/index.ts` exports the app. The contracts package is a `workspace:*` dependency, and requests and responses are validated with its generated Zod schemas.
  - Python. FastAPI on Vercel's Python runtime, zero-config from `app/main.py`, managed with `uv`. Pydantic v2 models come from the same yaml with `uvx --from datamodel-code-generator==0.104.0 datamodel-codegen --input packages/contracts/openapi.yaml --input-file-type openapi --output-model-type pydantic_v2.BaseModel --output apps/api/app/models.py`.
- [ ] The decision rule. Python when the idea needs data or ML libraries (satellite imagery, image classification, pandas over public CSVs). Node otherwise, because one language shares the Zod types end to end.
- Check. I run both recipes in a scratch folder to a local `GET /health` that returns the contract's shape, then delete them.

### 1.6 Add CI and the leak check

- [ ] `.github/workflows/ci.yml` on pull requests and `main`, on the `.nvmrc` Node version. Install, `bun run check`, `contracts:lint`, `contracts:stale`.
- [ ] `scripts/check-leaks.mjs` reads regexes from the git-ignored `.leak-patterns.local` and fails on any match in the staged blobs. Lefthook runs it when the file exists. You keep the private names in that file on your machine, never in the repo or a log. CI and teammates without the file skip it, so it guards your commits only.
- [ ] Before the first push, run the leak check over every tracked file once, not just the staged ones.
- Check. A planted match in a staged file blocks the commit. The full-repo scan is clean. CI is green on the PR.

## PR 2. Add the shared agent layer and the docs structure

### 2.1 Install skills and role agents with dotagents

- [ ] `agents.toml` with `agents = ["claude", "codex"]`. Every remote entry carries a full commit SHA as `ref`, because dotagents does not commit its lockfile. Kit skills come from `soundOfff/skills` at `d90454a5e97a7a33597c081350e2bb024f160e65`. Third-party skills reuse the pins already in your kit's `agents.toml`.
- [ ] The skill set. Appendix B says why each one is in.
  - Delivery. `flow-mode`, `flow-setup`, `flow-help`, `flow-create`, `flow-to-issues`, `flow-build`, `flow-to-pr`, `flow-subagent`, `flow-tdd`, `whats-next`.
  - Review. `flow-code-check`, `flow-code-review`, `flow-code-quality-review`, `flow-design-check`, `flow-adv-review`.
  - Thinking and docs. `grill-me`, `grill-with-docs`, `grilling`, `domain-modeling`, `prototype`, `research`, `diagnose`, `test-audit`.
  - UI. `impeccable`, `frontend-design`, `make-interfaces-feel-better`, `react-best-practices`, `react-composition-patterns`.
  - Team hygiene. `resolving-merge-conflicts`.
- [ ] Role agents. Copy the five public role agents from the pinned kit commit in their native formats, `agents/claude/flow-*.md` into `vendor/agents/.claude/agents/` and `agents/codex/flow-*.toml` into `vendor/agents/.codex/agents/`. Each `[[subagents]]` entry uses `source = "path:vendor/agents"` with no `path`. Sourcing the kit's `agents/roles/` instead makes dotagents drop each agent's `tools`, `model`, effort, and read-only sandbox without an error.
- [ ] `bun run skills:install` runs `bunx @sentry/dotagents@3.5.0 --project install`. It is not a `postinstall` hook, so installs on Vercel never fetch skills.
- [ ] `.claude/settings.json` registers the `cursor/plugins` marketplace and enables `pstack@cursor-plugins`, because `flow-mode` loads `poteto-mode`. The README gives the one install command each teammate runs.
- Check. On a fresh clone in a temp folder, `skills:install` produces every skill for Claude Code and Codex. Each installed role agent still has its `tools` and `model` for Claude, and its model, effort, and read-only sandbox for Codex. `.claude/settings.json` still holds the marketplace keys. A new Claude Code session lists the skills and agents.

### 2.2 Create the decision, glossary, and design sources before profiling

These files come first so the profile in 2.3 names them as sources and finds the `design` gate it points at.

- [ ] `docs/adr/` with the scaffold decisions that pass the ADR threshold (hard to reverse, surprising without context, a real tradeoff). One paragraph each, per the kit's format.
  - 0001 Client-only SPA on Vite, not SSR.
  - 0002 Contract-first API. `openapi.yaml` is the source of truth, and the backend language is deferred.
  - 0003 Postgres on Neon through the Vercel Marketplace, with plain SQL migrations.
  - 0004 Web and API deploy as two Vercel projects from one repo, joined by a rewrite.
- [ ] `CONTEXT.md` with a two-line description and an empty `## Language` section. Terms land on Saturday through `/grill-with-docs` once the idea is picked.
- [ ] `scripts/check-design.mjs` behind `check:design`. It fails on raw hex or rgb colors and on arbitrary color values in class names outside `src/styles.css`, so colors come from the `@theme` tokens whatever the design turns out to be.
- [ ] No `DESIGN.md` yet. `flow-design-check`, `flow-design-mapper`, `impeccable`, and the `design` gate are installed. Until `DESIGN.md` exists, the design check judges UI against the nearest comparable screens and records the missing authority as a finding.
- Check. `check:design` fails on a planted `bg-[#ff0000]` and passes on the scaffold.

### 2.3 Write the repo profile with `/flow-setup`

- [ ] Restart the agent session so the installed skills and role agents load, then run `/flow-setup` in repo mode. It writes the managed block in `AGENTS.md`, a `CLAUDE.md` that imports it, `docs/agents/` (domain, PR, ticket, and tracker standards), the PR template, and the `.flow/` ignore.
- [ ] Answers. Forge `github`. Tracker `local`, the kit's no-remote option, so nothing touches GitHub issues. Publish mode `ready`, because nobody has time for draft cycles on Saturday. Gates come from the PR 1 scripts. `design` is `bun run check:design`. `e2e` is `n/a`. Sources point at `CONTEXT.md` and `docs/adr/`. The design authority is skipped for now.
- Check. `doctor.py repo .` reports 0 failed. `/flow-design-check --base 99d9a29` covers the PR 1 UI and returns a verdict, not `BLOCKED`. A base of merged PR 1 would hold no UI diff, and the skill blocks on an empty UI inventory.

### 2.4 Onboard the team and tag the scaffold

- [ ] Rewrite the root README in English. `Getting started` lists the prerequisites, which are Node 24.18 or later through `nvm install`, bun 1.4, Docker, Python 3 (the flow scripts), `uv` (only for a Python API), and `gh` (PRs). Then `cp .env.example .env`, `bun install`, `bun run skills:install`, `bun run db:up`, `bun run dev`. Plugin setup per tool is its own section, separate from starting the app.
- [ ] README `How we work`. One table that maps a moment to a skill, with no issues anywhere in the route.
  - Pick the idea, and record its terms and decisions, with `/grill-with-docs`.
  - Set the look once the idea is picked with `/impeccable document --seed`, then re-run `/flow-setup` so the profile points at `DESIGN.md`. Impeccable first runs its short `teach` interview, because there is no `PRODUCT.md`.
  - Plan a feature with `/flow-create`.
  - Build test-first with `/flow-tdd`, or hand the task to `/pstack:poteto-mode`.
  - Open the PR with `gh pr create`, which fills in the template. `flow-to-pr` publishes only tracked work, so the route skips it.
  - Review with `/flow-code-check` and, for UI, `/flow-design-check`.
- [ ] After both PRs merge, tag `pre-hackathon-scaffold` on `main` and push the tag.
- Check. A fresh clone in a temp folder follows the README to a running app showing "ok" in under ten minutes. If time runs short tonight, cut ADR polish before this check.

## Manual steps that need a person

These are account actions. I prepare everything, and you or the repo owner click.

- [ ] Vercel, on Luca's account. Luca imports the web project with `apps/web` as its root directory and installs the Vercel GitHub app. "Include files outside the root directory" stays on, the default, so the contracts package builds.
- [ ] The API project gets imported Saturday, after the language pick gives `apps/api` an entrypoint. Then the web rewrite gets the API's production URL.
- [ ] Previews and production share one API and one database. A fixed rewrite sends every web preview to the production API, and per-preview API routing is not worth building for one day. So skip Neon's preview branching, and treat the database as the demo database.
- [ ] Keys. You bring a Vercel token and any env values later. I wire them in then, and the first deploy waits for your go. A CLI deploy needs both projects linked, and the public demo URL needs `--prod`.
- [ ] Neon. Add the Neon integration from the Vercel Marketplace to the API project.
- [ ] Each Claude Code teammate. Trust the folder, run `claude plugin install pstack@cursor-plugins --scope project`, then `/pstack:setup-pstack`.
- [ ] Each Codex teammate. Run `codex plugin marketplace add michael-denyer/pstack-claude`, then `codex plugin add pstack@pstack-claude`, then `$setup-pstack`. Expect a hooks review prompt on start. Trust the pstack hook once per session.

## Saturday logistics

These are team tasks, not code. They come from the hackathon rules in `hackathon/README.md`.

- [ ] Confirm all four Luma registrations.
- [ ] Name one person for the 18:00 Hacki submission and one for the on-site pitch.
- [ ] The submission names the scaffold as disclosed prior work, links the `pre-hackathon-scaffold` tag, and shows what changed after 10:30.
- [ ] Keep the local mock demo runnable in case hosting slips. The rules accept a repo link.

## Appendix A. Decisions and defaults

| Decision | Default | Why | Main alternative |
| --- | --- | --- | --- |
| Package manager | bun workspaces | Your call. Fast installs and test runs | pnpm |
| Node | 24.18 or later, pinned in `.nvmrc` | Prism 5.16 and hey-api require it | none |
| TypeScript | 6.0.3, exact | hey-api 0.99.0 crashes on TypeScript 7 | TypeScript 7 once hey-api supports it |
| Lint and format | Biome | One fast tool, one config, safe autofix in the hook | ESLint + Prettier, which adds the TanStack lint plugins at the cost of two configs |
| Build orchestration | none (`bun run --filter`) | Two packages do not need a task graph | Turborepo, worth it past four or five packages |
| Router | TanStack Router, file-based | Typed routes and search params, loader integration with Query | TanStack Start, which adds SSR we do not need |
| Contract to code | `@hey-api/openapi-ts` 0.99.0 | Zod v4 schemas usable by a Node API too, query options that fit router loaders | orval 8, a stable major, but it emits hooks and needs two output targets |
| Contract lint | Redocly CLI | Works with no config | Spectral, which needs a ruleset file first |
| API mock | Prism from the contract, behind the Vite proxy | Frontend and backend work in parallel from minute one, on the same `/api` paths as production | MSW handlers, which need hand-written fixtures |
| Database | Neon Postgres via the Vercel Marketplace | Vercel Postgres is retired and moved to Neon. Free tier and injected env vars | Supabase, if we want auth and file storage out of the box |
| Environments | one shared API and database | One day does not need preview isolation | Per-preview APIs through Vercel Related Projects |
| Migrations | dbmate, plain SQL | Works with Node and Python, so it survives the language choice | Drizzle (Node) or Alembic (Python), picked with the language |
| Role agents | vendored native files | dotagents keeps their model and tool limits only in native format | sourcing the kit's `agents/roles/`, which loses them silently |
| Hosting | Vercel, two projects | Fastest path, a preview URL per PR | Railway or Render for a long-running or heavy Python server |
| Error monitoring | none tonight | Your call. A demo does not need it | `@sentry/react` with a DSN, about ten minutes on Saturday |

## Appendix B. Why each skill is in, and what stays out

In. The full `flow-*` set, because the flow skills call each other (`flow-build` hands off to `flow-to-pr`, `flow-code-check` dispatches its two review workers) and a partial set leaves dead references. `whats-next` is in for the same reason, because `flow-mode` routes to it. `flow-to-issues`, `flow-build`, and `flow-to-pr` stay installed even though the README route skips issues, because `flow-mode` routes to them and the local tracker keeps them usable if someone wants a checklist. `grill-me` and `grill-with-docs` both wrap `grilling`. `grill-with-docs` also runs `domain-modeling`, so it writes ADRs and glossary terms while the team argues, which is the "work the same way" layer. `impeccable` writes `DESIGN.md` on Saturday and critiques screens. `resolving-merge-conflicts` earns its place with four people pushing to one repo for eight hours.

Out. The seven `better-*` skills, because `impeccable` and `make-interfaces-feel-better` cover the same ground and extra skills dilute routing. `test-master`, because `flow-tdd` and `test-audit` cover testing. `handoff`, which is personal workflow. The interview-drill agent.

## Appendix C. What this plan skips from the pstack multi-PR template

The pstack template asks for an hourly audit loop, one owner agent per PR, and ten live verification lanes plus a perf gate per PR. That machinery is for multi-day programs. This is about two hours of scaffolding tonight, so each step ends in one concrete check instead, and I verify the web app in a real browser with screenshots before handing back. The plan checker reports the missing template headings for this reason.

## Appendix D. Risks

- `enabledPlugins` does not install pstack on its own. Each teammate runs the install command, which is why it is in the README and the manual steps.
- The pstack Codex session-start hook's content hash changes between launches on your machine, so Codex asks to trust it again at each start. That is a pstack or Codex issue outside this repo.
- Vercel's GitHub integration needs Luca. If that blocks on Saturday, deploy from the CLI with `bunx vercel` and his token.
- Hono importing TypeScript from a workspace package on Vercel is unconfirmed. The first API deploy on Saturday proves it.
- Python functions on Vercel cap at 500 MB per bundle. Heavy ML libraries may not fit, which is the main reason to pick Railway or Render for a Python API.
- hey-api is pre-1.0, and Prism and TypeScript set the Node and TypeScript floors. Exact pins keep the toolchain stable until we choose to upgrade.
- The leak check guards only commits made on your machine. A teammate who pastes private content would not be caught, so the rule also lives in `AGENTS.md`.
- Cloud deployment and fresh interactive agent sessions were not verified in review. The first Saturday deploy and the 2.1 fresh-clone check cover them.

## Appendix E. Research sources (checked 2026-11-27)

- hey-api get started, Zod and TanStack Query plugins. https://heyapi.dev/openapi-ts/get-started, https://heyapi.dev/docs/openapi/typescript/plugins/tanstack-query.md
- Redocly lint. https://redocly.com/docs/cli/commands/lint
- datamodel-code-generator. https://pypi.org/project/datamodel-code-generator/
- Vercel root directory, Vite SPA rewrite, rewrites, monorepos, Hono, FastAPI, limits. https://vercel.com/docs/builds/configure-a-build, https://vercel.com/docs/frameworks/frontend/vite, https://vercel.com/docs/routing/rewrites, https://vercel.com/docs/monorepos, https://vercel.com/docs/frameworks/backend/hono, https://vercel.com/docs/frameworks/backend/fastapi, https://vercel.com/docs/functions/limitations
- Vite dev proxy. https://vite.dev/config/server-options#server-proxy
- Vercel Postgres retirement and Neon integration. https://vercel.com/docs/postgres, https://neon.com/docs/guides/vercel-managed-integration
- dbmate. https://github.com/amacneil/dbmate
- TanStack Router with Vite. https://tanstack.com/router/latest/docs/installation/with-vite
- Claude Code project plugin settings. https://code.claude.com/docs/en/settings-reference.md
- dotagents. https://github.com/getsentry/dotagents, https://dotagents.sentry.dev/cli/

## Appendix F. Review record

A Codex worker (GPT-6.2-Astra, xhigh, fast, through Orca) reviewed the plan read-only on 2026-11-27. It probed each step in a scratch folder and returned "ready with fixes". Every finding below is now in the body.

| Finding | Severity | Where it landed |
| --- | --- | --- |
| hey-api 0.99.0 crashes on TypeScript 7.0.2, and Prism needs Node 24.18 | blocker | 1.1, Appendix A |
| dotagents drops role agent model and tool limits from `agents/roles/` | blocker | 2.1 vendored native files |
| Vite serves HTML for `/api/health` and the SDK accepts it | blocker | 1.2 proxy, 1.3 `servers` |
| dbmate fails on an empty migrations folder | blocker | 1.4 |
| A fixed rewrite sends previews to the production API | important | Manual steps, one shared environment |
| `/flow-setup` before `check:design` exists fails the doctor, and a PR 2 base has no UI diff | important | 2.2 before 2.3, `--base 99d9a29` |
| A minimal contract fails Redocly, and an inline schema gives Python no models | important | 1.3 |
| Biome rejects `@theme` without `tailwindDirectives`, and the router plugin order and route tree matter | important | 1.1, 1.2 |
| The leak check skips CI and teammates, and `.claude/settings.local.json` relies on a global ignore | important | 1.1, 1.6, Appendix D |
| `git diff --exit-code` misses an untracked generated file | important | 1.3 `contracts:stale` |
| `flow-mode` routes to the excluded `whats-next`, and impeccable runs `teach` without `PRODUCT.md` | nit | Appendix B, 2.4 |

Verified correct in review, so not re-checked. The bun-filtered Vite, React 19, Router, Query, and Tailwind build with a Vitest smoke test. Byte-identical hey-api regeneration across 18 files. Full-SHA GitHub skill sources. dotagents keeping the marketplace keys in `.claude/settings.json`. Lefthook restaging Biome fixes. dbmate applying and rolling back a migration on Postgres 17. Code and design review running without an issue or `DESIGN.md`.
