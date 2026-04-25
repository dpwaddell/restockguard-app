#!/bin/sh
set -e
PGPASS=$(grep ^POSTGRES_PASSWORD .env | cut -d= -f2)
export DATABASE_URL="postgresql://restock:${PGPASS}@localhost:5435/restock"
npx prisma migrate deploy
