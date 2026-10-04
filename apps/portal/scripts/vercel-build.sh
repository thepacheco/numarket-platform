#!/bin/sh
# Vercel build for the Portal (Root Directory: apps/portal).
# Only production builds change the database: migrate, then refresh the demo.
# Preview builds compile the app and leave the database alone.
set -e
cd ../..
if [ "$VERCEL_ENV" = "production" ]; then
  npm run db:migrate
  npm run db:seed
else
  echo "Not a production build: skipping migrations and seed."
fi
cd apps/portal
npx next build
