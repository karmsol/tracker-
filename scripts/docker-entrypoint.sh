#!/bin/sh
set -eu
npx prisma migrate deploy
if [ "${SEED_ON_BOOT:-0}" = "1" ]; then
  npx tsx prisma/seed.ts
fi
exec npm run start
