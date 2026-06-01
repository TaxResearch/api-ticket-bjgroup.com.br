#!/bin/sh
set -e

if [ -n "${DATABASE_URL}" ]; then
  echo "Aplicando migrações Prisma..."
  npx prisma migrate deploy
fi

exec "$@"
