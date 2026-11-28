# Web and API deploy as two Vercel projects joined by a rewrite

The repo deploys as two Vercel projects, `apps/web` and `apps/api`, so the API can be Node or Python without touching the web build. The web project rewrites `/api/:path*` to the API project, so the browser talks to one origin and needs no CORS, and the contract's `servers` entry is `/api` in every environment. A fixed rewrite sends every web preview to the production API, which we accept for one day instead of building per-preview routing.
