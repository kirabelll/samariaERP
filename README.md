# Samaria ERP — Developer Guide

This guide explains how to run the project on your own laptop, make
changes, and submit them for review. You do **not** need access to the
production server or any real data — you will work against a fresh
sample database that you generate locally.

## Tech stack

| Part | Technology |
|------|------------|
| Framework | Next.js 14 (full-stack: UI + API routes) + TypeScript |
| Database | PostgreSQL, accessed through the Prisma ORM |
| Auth | NextAuth |
| Styling | Tailwind CSS |

The whole app (frontend and API) is one Next.js server on port **3000**.

## 1. Prerequisites

- **Node.js 20** or newer — https://nodejs.org
- **Git** — https://git-scm.com
- **Docker** — https://docs.docker.com/get-docker/ (used to run a local
  PostgreSQL database; skip if you already have PostgreSQL installed)

Check your versions:

```bash
node -v      # v20.x or higher
git --version
docker -v
```

## 2. Get the code

```bash
git clone https://github.com/henamulu/samariaERP.git
cd samariaERP
git checkout develop      # do your work on the develop branch
```

## 3. Start a local database

If you have Docker, this one command gives you a PostgreSQL database
matching the default connection string in `.env.example`:

```bash
docker run -d --name samaria-dev-db \
  -e POSTGRES_USER=samaria \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=samaria_erp \
  -p 5432:5432 \
  postgres:15-alpine
```

(You can stop/start it later with `docker stop samaria-dev-db` /
`docker start samaria-dev-db`.)

If you already run your own PostgreSQL, just create a database and note
its connection string for the next step.

## 4. Configure and install

```bash
# create your local env file from the template
cp .env.example .env       # Windows PowerShell: copy .env.example .env
# open .env and set NEXTAUTH_SECRET to a long random value
# (generate one with: openssl rand -hex 32)
# If you used your own database, update DATABASE_URL too.

# install dependencies
npm install

# create the database tables from the schema
npm run db:push

# fill the database with sample data (includes an admin user)
npm run db:seed
```

## 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

**Seeded login for testing:**
- Email: `admin@samaria.com`
- Password: `admin123`

Handy commands:
- `npm run db:studio` — open Prisma Studio, a visual database browser
- `npm run db:push` — re-apply the schema after editing
  `prisma/schema.prisma`
- `npm run lint` — check code style

## 6. Where things live

```
app/ or src/     Next.js routes (pages and API endpoints)
prisma/
  schema.prisma  database schema — edit here to change tables/columns
  seed.ts        sample-data generator
components/       shared UI components
lib/ , utils/     shared helpers
```

If you change `prisma/schema.prisma`, run `npm run db:push` again to
apply it to your local database.

## 7. Making changes and submitting them for review

Please do **not** commit directly to `main` — that branch is what runs
in production. Work like this:

1. Start from an up-to-date develop branch:
   ```bash
   git checkout develop
   git pull
   ```

2. Create a branch for your task:
   ```bash
   git checkout -b feature/short-description
   ```

3. Commit your changes:
   ```bash
   git add -A
   git commit -m "Describe what you changed"
   ```

4. Push your branch:
   ```bash
   git push -u origin feature/short-description
   ```

5. On GitHub, open a **Pull Request** from your branch into `main`,
   describe what you changed and why, and wait for review. The project
   owner will review, comment if needed, and merge it. Please do not
   merge your own pull request.

## 8. Important rules

- **Never commit `.env` / `.env.local` or any real database dump.** They
  are gitignored. Your sample database is generated locally and must not
  be pushed.
- **Never commit `node_modules/` or `.next/`.** They are gitignored;
  run `npm install` instead.
- You always work against your own local sample data. You do not have,
  and do not need, the production database.
- If unsure about anything, open a draft Pull Request early and ask
  questions there rather than guessing.
