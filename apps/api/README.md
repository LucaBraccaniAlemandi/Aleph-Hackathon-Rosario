# API

The backend language is picked on Saturday, together with the idea. Until then the web app talks to a Prism mock of `packages/contracts/openapi.yaml`, so frontend work does not wait on this folder.

## Which recipe

- **Python** when the idea needs data or ML libraries, such as satellite imagery, image classification, or pandas over public CSVs.
- **Node** otherwise. One language means the generated Zod schemas are shared end to end, from the contract to the browser.

Either way, the contract stays the source of truth. Edit `openapi.yaml` first, run `bun run contracts:gen`, then implement the operation. The API serves paths without the `/api` prefix, because the web project's rewrite (`apps/web/vercel.json`) and the Vite dev proxy both strip it.

Both recipes take about ten minutes and end in a `GET /health` that returns `{"status":"ok"}`. Run the commands from the repo root.

## Node: Hono on Vercel

Vercel deploys Hono with zero config when `src/index.ts` default-exports the app.

```sh
mkdir -p apps/api/src
cat > apps/api/package.json <<'EOF'
{
  "name": "api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/contracts": "workspace:*"
  }
}
EOF
cat > apps/api/tsconfig.json <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
EOF
cat > apps/api/src/index.ts <<'EOF'
import { zHealth } from "@repo/contracts/zod";
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json(zHealth.parse({ status: "ok" })));

export default app;
EOF
(cd apps/api && bun add -E hono@4.13.23 @hono/zod-validator@0.9.1 zod@4.6.7 && bun add -d -E typescript@6.0.3)
bun run --filter api dev
```

`curl localhost:3000/health` returns `{"status":"ok"}`. Validate request input with the generated schemas through `@hono/zod-validator`, for example `app.post("/things", zValidator("json", zCreateThingBody), handler)`, and parse responses with the matching `z<OperationId>Response` schema.

Point the web app at it instead of the mock with `API_PROXY_TARGET=http://localhost:3000 bun run --filter web dev`.

Deploy by importing a second Vercel project with `apps/api` as its root directory, then put its production URL in the `/api/:path*` rewrite in `apps/web/vercel.json`. A Hono function importing TypeScript from a workspace package is not yet proven on Vercel, so the first deploy is the check.

## Python: FastAPI on Vercel

Vercel's Python runtime deploys FastAPI with zero config from `app/main.py`. [uv](https://docs.astral.sh/uv/) manages the environment.

```sh
mkdir -p apps/api/app
(cd apps/api && uv init --bare --python 3.12 && uv add "fastapi[standard]==0.165.0")
touch apps/api/app/__init__.py
uvx --from datamodel-code-generator==0.104.0 datamodel-codegen \
  --input packages/contracts/openapi.yaml --input-file-type openapi \
  --output-model-type pydantic_v2.BaseModel --disable-timestamp \
  --output apps/api/app/models.py
cat > apps/api/app/main.py <<'EOF'
from fastapi import FastAPI

from app.models import Health

app = FastAPI()


@app.get("/health", response_model=Health)
def get_health() -> Health:
    return Health(status="ok")
EOF
(cd apps/api && uv run uvicorn app.main:app --reload --port 3000)
```

`curl localhost:3000/health` returns `{"status":"ok"}`. Rerun the `datamodel-codegen` command after every contract change, and commit `app/models.py`.

Point the web app at it with `API_PROXY_TARGET=http://localhost:3000 bun run --filter web dev`, and deploy as a second Vercel project with `apps/api` as its root directory. Python functions cap at 500 MB per bundle, so heavy ML libraries may need Railway or Render instead.

## Database

Both recipes read `DATABASE_URL`. Migrations are plain SQL in `db/migrations`, managed by dbmate from the repo root (`bun run db:new <name>`, `bun run db:migrate`, `bun run db:rollback`), so they do not depend on this choice.
