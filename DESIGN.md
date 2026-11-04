# Karm Karo design language

Visual thesis: **Ink & Ember** — a precise assignment desk. Deep ink structure, warm stone canvas, saffron as the single action color.

Guided by [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (flat productivity SaaS), [ui-skills](https://github.com/ibelick/ui-skills) (baseline craft), and [awesome-copilot](https://github.com/github/awesome-copilot) UX/design agents.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Ink | `#10101f` | Sidebar, primary controls, brand ground |
| Ember / saffron | `#e85d04` | CTAs, active dots, payroll accents |
| Canvas | `#f4f3ef` | Page background |
| Surface | `#ffffff` | Cards, inputs, dialogs |
| Muted text | `#5c5968` | Supporting copy |

## Typography

- **Plus Jakarta Sans** for UI and display (weights 400–800)
- **Noto Sans Devanagari** for Hindi
- Headings: `text-balance`, bold, tight tracking
- Body: `text-pretty`
- Money and counts: `tabular-nums`

## Motion

- Entrance: `karm-rise` (520ms ease-out, staggered)
- Hero product: gentle `karm-float`
- Controls: 150ms color/opacity transitions
- Respect `prefers-reduced-motion`

## Rules

- One accent per view (saffron)
- No purple marketing gradients, no cream+serif ledger look
- Cards only for interactive or content containers that need grouping
- Visible focus rings, `cursor-pointer` on controls
- Empty states include one clear next action
