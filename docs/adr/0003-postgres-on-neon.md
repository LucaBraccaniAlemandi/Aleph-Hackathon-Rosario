# Postgres runs on Neon, with plain SQL migrations

The database is Postgres, local through `compose.yml` and hosted on Neon through the Vercel Marketplace, which replaced Vercel Postgres and injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. Migrations are plain SQL files run by dbmate instead of an ORM's migration tool such as Drizzle or Alembic, because the schema must survive whichever backend language we pick. Previews and production share one database for the hackathon, so treat it as the demo database.
