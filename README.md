# Teneo — housing & roommate platform (frontend)

Teneo is a two-sided rental platform for Bangladesh: identity-checked owners list rooms, verified tenants apply,
both sign a digital lease, and rent, utilities and repairs are handled in one place. This repository is the
**Next.js frontend**; it consumes the Teneo REST API (Express + Prisma + PostgreSQL, built for B7A6).

| | |
|---|---|
| Live frontend | https://teneo-frontend-alpha.vercel.app |
| Live API | https://teneo-api.onrender.com |
| Backend repo | https://github.com/mohammadirfan90/teneo |

## Demo accounts

The login page has one-click **Quick demo login** buttons for each role. Credentials, if you prefer typing them:

| Email | Password | Role | KYC |
|---|---|---|---|
| `demo@admin.local` | `Demo123!@#` | ADMIN | — |
| `owner1@demo.local` | `Demo123!@#` | OWNER | APPROVED |
| `owner2@demo.local` | `Demo123!@#` | OWNER | APPROVED |
| `tenant1@demo.local` | `Demo123!@#` | TENANT | APPROVED |
| `tenant2@demo.local` | `Demo123!@#` | TENANT | APPROVED |

Stripe runs in **test mode** — pay invoices with card `4242 4242 4242 4242`, any future expiry, any CVC.

## What each role can do

**Visitors** — search live rooms (city, area/keyword, rent range, move-in date, amenities, sort; every filter is in
the URL), open room details with photos, facts and similar rooms, read how the platform works, contact the team.

**Tenants** — verify identity (KYC document upload), apply for rooms, follow applications through screening,
viewings and approval, sign the lease and confirm move-in, pay invoices by card (Stripe Payment Element) with
success/cancel handling, see utility bill shares and payment history, raise and track maintenance tickets, set
roommate preferences and get scored matches, manage saved searches.

**Owners** — verify identity, create listings with a multi-step wizard (property → building → flats → rooms →
photos → publish), manage applications (screen, propose viewings, shortlist, approve/reject), sign and amend
leases, generate invoices, record utility meter readings, see earnings, work the maintenance queue.

**Admins** — overview charts derived from the audit log, user search and deactivation, KYC review queue with
document access, listing takedown/reinstate, invoice waivers and refunds, a filterable audit log with CSV export.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components, `proxy.ts`), React 19, TypeScript (strict, no `any`) |
| UI | Tailwind CSS v4, shadcn/ui (Radix), Lucide icons, custom design tokens (light + dark) |
| Data | Server Components + `fetch` for reads; TanStack Query for client mutations, polling and optimistic updates |
| Client state | Zustand (multi-step wizard drafts) |
| Forms | React Hook Form + Zod (rules mirror the API's validation) |
| Auth | Custom: API tokens kept in HTTP-only cookies behind a Next.js BFF; route protection in `proxy.ts` |
| Payments | Stripe Payment Element (`@stripe/react-stripe-js`), test mode |
| Charts | Recharts |
| Toasts | Sonner |

## Architecture notes

- **Tokens never reach the browser.** Login/registration run as Server Actions that call the API and store the
  access and refresh tokens in HTTP-only cookies. Server Components call the API directly with the token;
  Client Components call `/api/proxy/*`, a thin authenticated pass-through.
- **Refresh tokens rotate** and the API revokes a whole session if an old one is reused, so refreshing is
  single-flight and happens ahead of time in `proxy.ts` (Server Components can't write cookies).
- **Role-based access** is enforced three times: `proxy.ts` redirects by role, each workspace layout re-checks the
  session, and the API authorizes every call.
- **Cache Components**: public listing reads (`/rooms`, room detail, home) are cached with `'use cache'` and tags;
  everything user-specific streams inside `<Suspense>` with skeletons from `loading.tsx`.
- **No fake data**: counts the API can't total show as `20+`; charts are computed from real audit logs and invoices.

## Pages

Public: `/`, `/rooms`, `/rooms/[id]`, `/how-it-works`, `/owners`, `/faq`, `/about`, `/contact`
Auth: `/login`, `/register`, `/account`
Tenant: `/dashboard`, `/dashboard/applications[/id]`, `/dashboard/lease`, `/dashboard/payments`, `/dashboard/tickets[/id]`,
`/dashboard/roommates`, `/dashboard/profile`
Owner: `/owner`, `/owner/properties[/new|/id]`, `/owner/applications[/id]`, `/owner/leases`, `/owner/billing`,
`/owner/tickets[/id]`, `/owner/profile`
Admin: `/admin`, `/admin/users[/id]`, `/admin/kyc[/id]`, `/admin/listings`, `/admin/payments`, `/admin/audit`
Payment: `/payment/success`, `/payment/cancel` · Utility: custom 404, error boundaries per workspace

## Running locally

Requirements: Node 20.9+, a running Teneo API.

```bash
cp .env.example .env.local   # then fill in the values below
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `API_BASE_URL` | Teneo API base, e.g. `http://localhost:4000/api/v1` (server-side only) |
| `NEXT_PUBLIC_SITE_URL` | Public URL of this site (metadata, Stripe return URL) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe test publishable key — same Stripe account as the API |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional; address the contact form writes to |
| `DEMO_PASSWORD`, `DEMO_*_EMAIL` | Optional overrides for the demo-login accounts |

The API must allow this site's origin in `CORS_ORIGINS` only if the browser calls it directly; with the BFF,
all calls are server-to-server.

Quality checks: `npm run typecheck`, `npx eslint src`, `npm run format:check`.
