# Karm Karo — build plan

## Folder structure

```
src/app/                  App Router pages (marketing, auth, workspace, admin)
src/app/api/              Route handlers (auth, health, v1 resources, SSE, cron)
src/components/           Shell, task views, admin, AI, shadcn-style primitives
src/lib/                  Auth, RBAC, Prisma, validation, AI parse, jobs, i18n
src/server/               Use-cases shared by routes and the assistant
prisma/schema.prisma      Models, indexes
prisma/seed.ts            Demo organization
docs/                     Research, this plan, deployment
e2e/                      Playwright
.github/workflows/ci.yml  Lint, test, build
```

## Data model

Organization → Membership(role) → User.
Project → Section, ProjectMember.
Task (soft delete, parentId, status, priority, dates, estimate, time) → TaskAssignee, Label, ChecklistItem, Comment, Attachment, Reminder, RecurringRule.
Notification, ActivityLog, Invite, SavedFilter, AiUsage, EmailOutbox.
Auth.js Account, Session, VerificationToken, plus password-reset and email-verification tokens.

Every task and project row carries `organizationId`. Queries always include it.

## Phases

1. Foundation — Next.js, Prisma, Auth.js credentials + Google, roles, security headers, seed.
2. Tasks and projects — views, board, calendar, timeline, comments, shortcuts, en/hi.
3. Admin — dashboard, people, assign, workload, reports, audit, settings.
4. AI — quick add, breakdown, smart assign, chat tools, digest, weekly report.
5. Notifications, reminders, recurrence, PWA, email.
6. Tests, Docker, CI, deployment guide.

## Demo access

Organization: Indus Collective
Password for every seeded account: `KarmKaro#2026`

- aanya.sharma@karmkaro.dev — Super Admin
- arjun.mehta@karmkaro.dev — Admin
- rahul.verma@karmkaro.dev, priya.nair@karmkaro.dev, ananya.das@karmkaro.dev, vikram.singh@karmkaro.dev, meera.iyer@karmkaro.dev — Employees
