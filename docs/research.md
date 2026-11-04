# Karm Karo — product research

Date: 4 November 2026 (Asia/Kolkata)

## How this was researched

- Cloned [morluto/rea](https://github.com/morluto/rea) (shallow) and read its docs and disclaimer.
- REA is a reverse-engineering toolkit. Its own disclaimer forbids copying proprietary software or reproducing protected code and assets. It was not pointed at Todoist’s application bundles, and none of Todoist’s code, icons, copy, or visual assets were extracted or reused.
- Public product surface reviewed instead: [todoist.com](https://www.todoist.com/) (marketing, team, and Assist positioning) and the public help center index. The notes below describe widely visible product behavior so Karm Karo can take inspiration without cloning the product.

## What Todoist does well

- Capture is fast. A single line turns into a task, and natural-language dates (“tomorrow”, “every Monday”) are the habit that makes the product stick.
- The information architecture is calm: Inbox, Today, and Upcoming answer “where does this go?” and “what do I do now?” without a ceremony.
- A task row stays quiet: complete control, title, date, priority, labels. Detail (description, subtasks, comments, activity) opens only when you ask for it.
- Keyboard use is a first-class path (quick add, search, command-style actions), so the mouse is optional.
- Projects, sections, labels, filters, recurring schedules, and a board/calendar option cover personal planning without looking like enterprise software.
- The visual tone is minimal, high-contrast, and fast. Empty space is doing real work.

## Where it is weak for a team that has a manager

- The product is still a personal list that learned to share. Assignment exists, but there is no real manager console: no workload picture, no bulk assign across people, no deactivate/reactivate, no role ladder with an owner above admins.
- Status is mostly open or done. A team that reviews work (To Do → In Progress → In Review → Done) has to fake that with sections or labels.
- Admin control is thin: no audit trail of who assigned, deleted, or changed a role; no org working-hours; no CSV invite as a normal admin job; reports are not something a manager can hand to someone else as CSV and PDF.
- AI (Todoist Assist, email/voice capture, MCP) helps capture and tidy. It does not sit inside permissions, explain an assignment, break a task down with estimates, or answer “what is overdue for my team?” as a colleague who can also do the work.
- Language and locale stop at a global default. A Hindi or Hinglish sentence is not a first-class way to create a task.
- Team and personal work share one mental model, so “my job today” and “what I assigned the team” are easy to mix up.

## How Karm Karo is better

Karm Karo keeps the calm capture loop and replaces the team layer.

| Job | Karm Karo choice |
| --- | --- |
| Identity | Original mark and wordmark, indigo rail, saffron accent, Fraunces + Outfit. No borrowed icon, name, or layout skin. |
| Roles | Super Admin, Admin/Manager, Employee. Enforced on the server for every mutation, scoped to one organization. |
| Work model | Status workflow, many assignees, reporter, estimates, time tracked, checklist, nested subtasks, sections. |
| Manager | Dashboard, workload heatmap, bulk assign, people admin, project membership, reports (CSV + PDF), audit log, org settings. |
| Capture | One box for English, Hindi, and Hinglish, with a preview the human confirms. Voice input. Manual form when AI is down. |
| Assistant | Tool-calling chat that searches, creates, updates, assigns, and completes, inside the caller’s role. Deletes wait for confirmation. |
| Language | English and Hindi UI, India-first timezone and working hours. |
| Trust | Verification, reset, lockout, rate limits, same-origin checks, soft delete, audit, per-user AI limits, zod on every AI payload. |

The bar for the interface: as few pixels as Todoist between thought and task, and a manager view Todoist does not have.
