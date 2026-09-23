#!/bin/sh
# FoodCycle — one-shot setup. Run from the project root:  sh setup.sh
#
# Dependencies are declared in package.json, so `npm install` is all that is
# needed to fetch them. Do not pin them here as well — the two lists drift.
set -e

# ---------------------------------------------------------------------------
# 1. Environment file
# ---------------------------------------------------------------------------
# `.env` is gitignored (it holds the session secret), so a fresh clone has none.
# Copy the example across so the app has something to read.
if [ ! -f .env ]; then
  echo "==> No .env found — creating one from .env.example"
  cp .env.example .env
  echo "    Generate a real secret before deploying:"
  echo "      node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
fi

# ---------------------------------------------------------------------------
# 2. Database
# ---------------------------------------------------------------------------
# `migrate deploy` applies the migrations already committed to prisma/migrations.
# It is used instead of `migrate dev` because `dev` is interactive and tries to
# author new migrations — wrong for someone setting the project up for the first
# time, and it fails outright against a database that is not empty.
if command -v docker >/dev/null 2>&1; then
  if ! docker compose ps --status running 2>/dev/null | grep -q foodcycle-pg; then
    echo "==> Starting PostgreSQL (docker compose up -d)"
    docker compose up -d
  fi
else
  echo "!! Docker not found. Start a PostgreSQL 16 server yourself and set"
  echo "   DATABASE_URL in .env to point at it."
fi

echo "==> Installing dependencies (runtime + dev, from package.json)"
npm install

echo "==> Generating Prisma client"
npx prisma generate

echo "==> Applying migrations"
npx prisma migrate deploy

echo "==> Seeding database"
npx prisma db seed

echo "==> Type checking"
npx tsc --noEmit

echo "==> Done. Start the app with: npm run dev"
