# Aleph Hackathon Rosario

Our team's repo for Aleph Hackathon Rosario, Saturday 2026-11-28 at UAI, Av. Carlos Pellegrini 1620, Rosario. The organizer's info is in [`hackathon/`](hackathon/), and our idea notes are in [`ideas/`](ideas/).

> **Pre-hackathon scaffold.** Everything up to the `pre-hackathon-scaffold` tag is tooling we set up on 2026-11-27. It holds an empty web app with one health check, an API contract, a database setup, CI, and shared agent skills, and it has no product code. Everything after the tag was built during the hackathon. Run `git diff pre-hackathon-scaffold..main` to see it.

## Setup

Every teammate does this once. It takes about ten minutes on a fresh machine.

### 1. Install the tools

| Tool | Why | Install |
| --- | --- | --- |
| nvm and Node 24.18 or later | Codegen and the API mock | [nvm](https://github.com/nvm-sh/nvm), then step 3 installs the pinned Node |
| bun 1.4 | Package manager and scripts | `curl -fsSL https://bun.sh/install \| bash` |
| Docker Desktop | Local Postgres | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Python 3 | The flow skills' setup scripts | ships with macOS |
| `gh` | Opening pull requests | `brew install gh`, then `gh auth login` |
| `uv` | Only if the API is Python | `brew install uv` |

Check. `bun --version` prints 1.4 or later, and `docker info` prints server details instead of an error.

### 2. Clone the repo

```bash
git clone git@github.com:LucaBraccaniAlemandi/Aleph-Hackathon-Rosario.git
cd Aleph-Hackathon-Rosario
```

### 3. Install Node and the dependencies

```bash
nvm install
cp .env.example .env
bun install
```

`nvm install` reads `.nvmrc` and switches to that Node. Run `nvm use` in every new terminal afterwards. `bun install` also sets up the git hooks, which format staged files and refresh skills after a pull.

Check. `node --version` prints the version in `.nvmrc`.

### 4. Start the database

Open Docker Desktop first.

```bash
bun run db:up
bun run db:wait
bun run db:migrate
```

Check. `db:wait` returns without an error, and `db:migrate` applies the migrations or says there are none yet.

### 5. Run the app

```bash
bun run dev
```

Check. http://localhost:5173 shows "API status: ok". The data comes from a mock of the API contract on port 4010, so no backend is needed yet.

### 6. Install the agent skills

```bash
bun run skills:install
```

This puts 29 skills and 5 role agents into `.claude/` and `.codex/` from [`agents.toml`](agents.toml). The flow skills also need the pstack plugin, once per machine.

**Claude Code.**

```bash
claude plugin marketplace add cursor/plugins
claude plugin install pstack@cursor-plugins --scope project
```

Then open a new Claude Code session in the repo, trust the folder, and run `/pstack:setup-pstack`.

**Codex.**

```bash
codex plugin marketplace add michael-denyer/pstack-claude
codex plugin add pstack@pstack-claude
```

Then open a new Codex session and run `$setup-pstack`. Codex may ask you to review hooks on start. Trust the pstack hook.

Check. In a new session, `/flow-help` (or `$flow-help` in Codex) answers a question about the repo.

### 7. Before you commit

```bash
bun run check
```

It runs lint, typecheck, tests, build, contract lint, and the design gate, the same as CI. After you change `packages/contracts/openapi.yaml`, run `bun run contracts:gen` and commit the generated files with it.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `nvm: command not found` | Install nvm, then open a new terminal |
| Prism or codegen complains about the Node version | `nvm install`, then `nvm use` |
| `Cannot connect to the Docker daemon` | Open Docker Desktop and wait until it says it is running |
| `db:up` fails because port 5432 is in use | Stop your local Postgres, for example `brew services stop postgresql` |
| `bun run dev` fails because port 5173 or 4010 is in use | `lsof -ti:5173,4010 \| xargs kill` |
| `/api/health` shows "unreachable" | The mock is not running. Start the app with `bun run dev` from the repo root |
| `bun install --frozen-lockfile` fails in CI | Someone changed a dependency without committing `bun.lock`. Run `bun install` and commit the lockfile |
| Skills are missing in the agent | Run `bun run skills:install`, then start a new session |
| A commit is blocked by the leak check | Remove the flagged text. It matched a private pattern on your machine |

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

## Deploy setup

The Vercel account owner does this once, after the API language is picked. The web app and the API are two Vercel projects from this repo, and the web project forwards `/api/*` to the API, so the browser talks to one origin.

1. **Web project.** Add a new Vercel project from this repo with Root Directory `apps/web`. Keep "Include files outside the root directory" on, because the web app imports `packages/contracts`.
2. **API project.** Once `apps/api` has its entry point (see [`apps/api/README.md`](apps/api/README.md)), add a second project from the same repo with Root Directory `apps/api`.
3. **Database.** In the API project, add Neon from the Vercel Marketplace. It injects `DATABASE_URL` (pooled, for the app) and `DATABASE_URL_UNPOOLED` (direct, for migrations). Run migrations against it with `DATABASE_URL_UNPOOLED=<neon direct url> bunx dbmate -e DATABASE_URL_UNPOOLED --no-dump-schema up`.
4. **Rewrite.** Replace `API_PROJECT_URL_SET_ON_SATURDAY` in [`apps/web/vercel.json`](apps/web/vercel.json) with the API project's production domain, then commit and push.
5. **Check.** `https://<web domain>/api/health` returns `{"status":"ok"}`.

Previews and production share one API and one database, so treat the database as the demo database.

## Adding an idea

Copy [`ideas/_TEMPLATE.md`](ideas/_TEMPLATE.md) to `ideas/<track>/<idea-name>.md`.
