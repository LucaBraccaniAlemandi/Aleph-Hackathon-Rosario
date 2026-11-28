# The web app is a client-only SPA on Vite

The web app is a demo built in one day, so we ship it as a static single-page app built with Vite, routed with TanStack Router, and fed by TanStack Query. We chose this over an SSR framework such as Next.js or TanStack Start because search ranking and first-paint SEO do not matter for a hackathon demo, a static build deploys anywhere in seconds, and the API stays in its own project behind the contract in ADR 0002.
