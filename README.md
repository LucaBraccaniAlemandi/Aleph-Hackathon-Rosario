# Aleph Hackathon Rosario

Our team's repo for Aleph Hackathon Rosario, Saturday 2026-11-28 at UAI, Av. Carlos Pellegrini 1620, Rosario. The organizer's info is in [`hackathon/`](hackathon/), and our idea notes are in [`ideas/`](ideas/).

> **Pre-hackathon scaffold.** Everything up to the `pre-hackathon-scaffold` tag is tooling we set up on 2026-11-27. It holds an empty web app with one health check, an API contract, a database setup, CI, and shared agent skills, and it has no product code. Everything after the tag was built during the hackathon. Run `git diff pre-hackathon-scaffold..main` to see it.

## Getting started

Install these first.

| Tool | Why | Install |
| --- | --- | --- |
| Node 24.18 or later | Codegen and the API mock | `nvm install` (reads `.nvmrc`) |
| bun 1.4 | Package manager and scripts | `curl -fsSL https://bun.sh/install \| bash` |
| Docker | Local Postgres | Docker Desktop |
| Python 3 | The flow skills' setup scripts | ships with macOS |
| `gh` | Opening pull requests | `brew install gh` |
| `uv` | Only for a Python API | `brew install uv` |

Then run the app.

```bash
nvm use
cp .env.example .env
bun install
bun run skills:install
bun run db:up && bun run db:wait && bun run db:migrate
bun run dev
```

Open http://localhost:5173. It shows "API status: ok", served by a mock of the API contract on port 4010.

## Agent setup, once per machine

`bun run skills:install` puts 29 skills and 5 role agents into `.claude/` and `.codex/` from [`agents.toml`](agents.toml). The flow skills also need the pstack plugin.

- **Claude Code.** Trust the folder when asked. Run `claude plugin install pstack@cursor-plugins --scope project`, then `/pstack:setup-pstack` in a session.
- **Codex.** Run `codex plugin marketplace add michael-denyer/pstack-claude`, then `codex plugin add pstack@pstack-claude`, then `$setup-pstack` in a session. Codex may ask you to trust the pstack hook when it starts. Trust it.

Start a new agent session after installing so the skills load. In Codex, type `$name` instead of `/name`.

## How we work

| Moment | Run |
| --- | --- |
| Pick the idea, and record its terms and decisions as we argue | `/grill-with-docs` |
| Stress-test a plan without writing docs | `/grill-me` |
| Set the look once the idea is picked | `/impeccable document --seed`, then `/flow-setup` |
| Plan a feature against the code | `/flow-create` |
| Build test-first | `/flow-tdd`, or `/pstack:poteto-mode` for the whole task |
| Try a risky idea cheaply | `/prototype` |
| Something is broken | `/diagnose` |
| Open a pull request | `gh pr create`, which fills in the template |
| Review code | `/flow-code-check` |
| Review UI | `/flow-design-check` |
| Fix a merge conflict | `/resolving-merge-conflicts` |

[`AGENTS.md`](AGENTS.md) holds the rules every person and agent follows here, plus the commands each skill runs.

## Commands

| Command | What it does |
| --- | --- |
| `bun run dev` | API mock on 4010 plus the web app on 5173 |
| `bun run check` | Every gate: lint, typecheck, tests, build, contract lint, design tokens |
| `bun run contracts:gen` | Regenerate the Zod schemas, SDK, and query options from `openapi.yaml` |
| `bun run contracts:stale` | Fail when the generated code is out of date |
| `bun run db:new <name>` | Create a SQL migration in `db/migrations/` |
| `bun run db:migrate` | Apply pending migrations |
| `bun run skills:install` | Install or update the skills and role agents |

## Decisions and glossary

Architecture decisions live in [`docs/adr/`](docs/adr/). Domain terms live in [`CONTEXT.md`](CONTEXT.md). `/grill-with-docs` writes both while the team talks. The API language (Node or Python) gets picked on Saturday, see [`apps/api/README.md`](apps/api/README.md).

## Deploy

The web app and the API deploy as two Vercel projects from this repo, with `apps/web` and `apps/api` as root directories. The web project rewrites `/api/*` to the API project. Replace the placeholder host in [`apps/web/vercel.json`](apps/web/vercel.json) with the API's production URL before the first deploy. Postgres comes from the Neon integration in the Vercel Marketplace.

## Adding an idea

Copy [`ideas/_TEMPLATE.md`](ideas/_TEMPLATE.md) to `ideas/<track>/<idea-name>.md`.
