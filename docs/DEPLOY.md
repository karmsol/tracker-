# Deploy Karm Karo

This app is ready to host. It is not pointed at a public domain from this repository, because that needs your DNS and your secrets. Pick one path below. Both serve HTTPS and use the same environment variables.

Health check: `GET /api/health` returns `{ "ok": true, "db": "up" }` when Postgres answers. Use it for the load balancer and for uptime checks.

## Environment variables

Copy `.env.example`. Every variable the app reads is listed there.

Generate secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # CRON_SECRET
```

Required in production:

- `APP_URL` and `AUTH_URL` — the public https origin, no trailing slash
- `AUTH_SECRET`
- `DATABASE_URL`
- `CRON_SECRET`
- `EMAIL_FROM`

Recommended:

- `REDIS_URL` — BullMQ on a VPS. On Vercel, the cron route is enough.
- `RESEND_API_KEY` or `SMTP_HOST` — otherwise mail stays in `EmailOutbox` and invite links are only in the API response
- `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` — otherwise the built-in parser and local assistant run
- `S3_*` — otherwise uploads stay on local disk, which does not survive a Vercel function
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` — then set `NEXT_PUBLIC_GOOGLE=1`
- `VAPID_*` — optional browser push
- `SENTRY_DSN` — optional. Errors are always written as JSON logs. Install `@sentry/nextjs` in your deploy if you want them forwarded.
- `AI_DAILY_LIMIT` — default 40 model calls per user per day

Set `NEXT_PUBLIC_DEMO=0` on a real workspace so the login page does not print the demo password.

## Database

Migrations live in `prisma/migrations`.

```bash
npx prisma migrate deploy
```

Seed the demo workspace only on a fresh demo database:

```bash
npm run db:seed
```

The seed is idempotent for the slug `indus-collective`. It does not reset a workspace that already exists.

## Path A — Vercel, Neon or Supabase, Upstash

1. Create a Postgres database on [Neon](https://neon.tech) or [Supabase](https://supabase.com). Copy the pooled connection string into `DATABASE_URL`. If the host requires SSL, keep the `sslmode=require` parameter the provider gives you.
2. Create an Upstash Redis database and set `REDIS_URL`. This is optional on Vercel because scheduled work uses Cron, not a long-lived worker. The server skips the in-process scheduler when `VERCEL` is set.
3. Create a Cloudflare R2 bucket (or any S3-compatible bucket). Set `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_REGION=auto`.
4. Push this repository to GitHub and import it in Vercel. Framework preset: Next.js. Root directory: the repository root.
5. Add every production variable in the Vercel project settings. `CRON_SECRET` must match the bearer token Vercel sends to Cron Jobs.
6. `vercel.json` schedules `GET /api/cron` once daily at 02:30 UTC (08:00 IST) so it works on the Hobby plan. That route runs reminders, the morning digest, payroll-day alerts, and the weekly admin report. Protect it with `CRON_SECRET`. On Pro you can tighten the schedule if you need more frequent reminder delivery.
7. Deploy. Then run migrations against the production database from your machine or a one-off job:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

8. Domain and DNS:
   - In Vercel, open the project → Domains → add `app.example.com`.
   - At your DNS host, create the records Vercel shows. For a subdomain that is usually a `CNAME` from `app` to `cname.vercel-dns.com`. For an apex domain, use the `A` record `76.76.21.21` or the `ALIAS`/`ANAME` Vercel prints.
   - Wait until the domain shows as valid. Vercel requests the certificate automatically. HTTPS is then on, and HTTP redirects to HTTPS.
9. Set `APP_URL` and `AUTH_URL` to `https://app.example.com` and redeploy so invite and reset links use the real origin.
10. Google login: in Google Cloud, add the authorized redirect `https://app.example.com/api/auth/callback/google`.

Backups on Neon or Supabase: turn on the provider’s daily point-in-time or scheduled backups in their dashboard, and keep at least 7 days. You can also run `scripts/backup.sh` from a trusted machine that has `DATABASE_URL` and `pg_dump`.

GitHub Actions deploys to Vercel on pushes to `main` when `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are set as repository secrets. Without those secrets the deploy job exits successfully and leaves production untouched. Lint, unit tests, the production build, and Playwright still run on every push.

## Path B — VPS, Docker, Nginx, Let’s Encrypt

A small Ubuntu VM is enough. Open ports 22, 80, and 443.

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo usermod -aG docker "$USER"
git clone <your-repo> /opt/karm-karo
cd /opt/karm-karo
cp .env.example .env
# Edit .env: real AUTH_SECRET, CRON_SECRET, APP_URL=https://app.example.com, AUTH_URL the same.
docker compose up -d --build
```

The app container runs `prisma migrate deploy` before it listens on port 43123. Set `SEED_ON_BOOT=1` only for the first boot of a demo.

Nginx site `/etc/nginx/sites-available/karmkaro`:

```nginx
server {
  listen 80;
  server_name app.example.com;
  location / {
    proxy_pass http://127.0.0.1:43123;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 1d;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/karmkaro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.example.com
```

Certbot installs the certificate and the HTTP → HTTPS redirect. Renewal is on the certbot timer.

DNS: an `A` record from `app.example.com` to the VM’s public IPv4. Add `AAAA` if you have IPv6. Wait for it to resolve, then run certbot.

The Compose file already runs a BullMQ worker inside the app process when `REDIS_URL` points at the `redis` service. You do not need Vercel Cron. If you still want an external poke, call the health of the job route from cron:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://app.example.com/api/cron
```

### Daily backups

```bash
chmod +x /opt/karm-karo/scripts/backup.sh
sudo crontab -e
```

```
15 2 * * * cd /opt/karm-karo && DATABASE_URL='postgresql://karm:karm@127.0.0.1:5432/karmkaro?schema=public' ./scripts/backup.sh >> /var/log/karm-backup.log 2>&1
```

`scripts/backup.sh` writes a custom-format `pg_dump` into `backups/` and deletes dumps older than 14 days. Copy that directory off the VM (restic, rclone, or an object bucket). Restore with:

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" backups/karmkaro-YYYYMMDDTHHMMSSZ.dump
```

## After either path

1. `curl -fsS https://app.example.com/api/health`
2. Sign up a workspace, or seed and sign in as `arjun.mehta@karmkaro.dev`.
3. Invite one person and confirm the mail (or the logged link) opens `/invite/...`.
4. Create a project, assign a task, and download a CSV report from the admin desk.
5. Confirm an employee cannot open `/api/v1/admin/dashboard` (403).
