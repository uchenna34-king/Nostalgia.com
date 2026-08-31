---
phase: 11-go-live
plan: 01
subsystem: database
tags: [prisma, postgres, neon, migrations, env-contract]

# Dependency graph
requires: []
provides:
  - "Prisma datasource on Neon Postgres (provider postgresql, url + directUrl)"
  - "Complete six-variable Phase 11 env contract in .env.example"
  - "Single Postgres-dialect init migration (20260828160053_init), applied and seeded against Neon"
affects: [11-02, 11-03, 11-04, 11-05, 11-06, 11-07, 11-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pooled connection string (DATABASE_URL) for runtime + directUrl (DIRECT_URL) for migrations — no Prisma driver adapter"

key-files:
  created:
    - prisma/migrations/20260828160053_init/migration.sql
  modified:
    - prisma/schema.prisma
    - lib/db.ts
    - .env.example
    - prisma/migrations/migration_lock.toml

key-decisions:
  - "D-01/D-02 confirmed as-implemented: lib/db.ts needs zero structural change under the pooled-connection-string approach; only a rationale comment was added"
  - "D-08: three SQLite-dialect migrations deleted wholesale and replaced by one regenerated Postgres init migration, never hand-edited"
  - "D-08a confirmed intact: Order.status stays a String governed by isValidOrderStatus, no DB enum introduced"
  - ".env.example edit done as a purely-additive append (six new blocks appended after the existing Database section) rather than modifying the pre-existing DATABASE_URL line, to satisfy the plan's zero-deletion diff acceptance criterion"

patterns-established:
  - "Env-contract ownership: this plan is the sole owner of .env.example for Phase 11; later plans in this phase consume the six variables but do not re-touch this file"

requirements-completed: [LIVE-05]

coverage:
  - id: D1
    description: "prisma/schema.prisma datasource is PostgreSQL with url=DATABASE_URL (pooled) and directUrl=DIRECT_URL (unpooled), both annotated inline; Order.status remains a String with no DB enum"
    requirement: "LIVE-05"
    verification:
      - kind: other
        ref: "sed -n '/^datasource db {/,/^}/p' prisma/schema.prisma | grep -c 'provider *= *\"postgresql\"' (=1); grep -c 'directUrl *= *env(\"DIRECT_URL\")' (=1); grep -ci sqlite in datasource block (=0); grep -c '^enum ' schema.prisma (=0); grep -c '@db\\.' schema.prisma (=0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "lib/db.ts singleton unchanged in behavior, gained a pooling-rationale header comment only (purely additive diff)"
    requirement: "LIVE-05"
    verification:
      - kind: other
        ref: "git diff -- lib/db.ts: +8/-0 lines; grep -c 'export const prisma' lib/db.ts (=1)"
        status: pass
    human_judgment: false
  - id: D3
    description: ".env.example declares all six new Phase 11 variables (DIRECT_URL, ALLOW_DEMO_LOGIN, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, EMAIL_FROM, OWNER_EMAIL) as empty-string names with trailing guidance comments, zero credentials, all six pre-existing variables intact"
    requirement: "LIVE-05"
    verification:
      - kind: other
        ref: "grep -cE '^(ALLOW_DEMO_LOGIN|DIRECT_URL|STRIPE_WEBHOOK_SECRET|RESEND_API_KEY|EMAIL_FROM|OWNER_EMAIL)=' .env.example (=6); non-empty-value violations (=0); DATABASE_URL declared once (=1); 'pooler' mentioned (=2); pre-existing 6 vars survived (=6); git diff -U0 37dc4bd -- .env.example deletions (=0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Exactly one Postgres-dialect init migration (20260828160053_init) exists; migration_lock.toml names postgresql with zero sqlite references; schema validates; existing test suite passes"
    requirement: "LIVE-05"
    verification:
      - kind: other
        ref: "ls -d prisma/migrations/*/ | wc -l (=1); ls prisma/migrations | grep -c '_init$' (=1); grep -c 'provider = \"postgresql\"' migration_lock.toml (=1); grep -ci sqlite migration_lock.toml (=0); npx prisma validate (pass); npx prisma migrate status (\"Database schema is up to date!\")"
        status: pass
      - kind: unit
        ref: "npm test (vitest) — 146/146 passed, 16/16 files"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit — clean, zero errors"
        status: pass
    human_judgment: false
  - id: D5
    description: "Neon database holds the seeded catalog (10 products, 2 collections) and the app's storefront listing page renders that real data end-to-end through the pooled runtime connection"
    requirement: "LIVE-05"
    verification:
      - kind: other
        ref: "Direct Prisma count query against DATABASE_URL: {products:10, collections:2}"
        status: pass
      - kind: e2e
        ref: "npm run dev (localhost:3001) + curl http://localhost:3001/shop — response contains 9 distinct /product/<slug> links including /product/sepia-wool-overcoat (matches prisma/seed.ts), title 'Shop all — Nostalgia', 86894 bytes of real rendered HTML"
        status: pass
    human_judgment: false

duration: spans 2026-08-28 to 2026-08-31 (session interrupted mid-plan; Task 1 committed 08-28, Tasks 2-3 completed 08-31 after a connection drop and resume)
completed: 2026-08-31
status: complete
---

# Phase 11 Plan 01: Neon Postgres Cutover Summary

**Prisma datasource repointed to Neon Postgres (pooled `url` + unpooled `directUrl`), full six-variable Phase 11 env contract landed in `.env.example`, and the three SQLite-dialect migrations replaced by one regenerated Postgres init migration applied and reseeded against the real Neon database.**

## Performance

- **Duration:** Spanned across a mid-plan session interruption (connection drop between Task 1 and Task 2/3). Task 1 committed 2026-08-28T16:40+01:00; Tasks 2-3 completed and committed 2026-08-31T10:21+01:00.
- **Started:** 2026-08-28T16:40:03+01:00 (Task 1 commit)
- **Completed:** 2026-08-31T10:21:45+01:00 (Task 3 commit)
- **Tasks:** 3/3 (Task 3 was a blocking human-verify checkpoint; approved after independent re-verification)
- **Files modified:** 6 (`prisma/schema.prisma`, `lib/db.ts`, `.env.example`, `prisma/migrations/migration_lock.toml`, 3 old migration.sql deletions, 1 new migration.sql)

## Accomplishments
- `prisma/schema.prisma`'s datasource is PostgreSQL, reading the pooled connection string from `DATABASE_URL` at runtime and the unpooled connection string from `DIRECT_URL` for migrations only, both marked inline with which Neon endpoint each takes.
- `lib/db.ts` confirmed to need zero structural change under the pooled-connection-string approach (D-01); gained only a header comment recording why no Prisma driver adapter is required at the pinned Prisma version.
- `.env.example` now declares all six new Phase 11 environment variables (`DIRECT_URL`, `ALLOW_DEMO_LOGIN`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`) as empty-string names with guidance comments — zero credentials committed.
- The three SQLite-dialect migrations were deleted and replaced by one clean Postgres-dialect init migration (`20260828160053_init`), applied to the real Neon database, with `migration_lock.toml` regenerated to name `postgresql`.
- `npm run seed` repopulated the catalog against Neon (10 products, 2 collections), independently confirmed via both a direct Prisma count query and the storefront `/shop` page actually rendering the seeded product data through the app's runtime pooled connection.

## Task Commits

Each task was committed atomically:

1. **Task 1: Point the Prisma datasource at Neon Postgres and record the connection rationale** - `37dc4bd` (feat)
2. **Task 2: Land the complete six-variable env contract in .env.example** - `d0db62c` (docs)
3. **Task 3: Regenerate the migration baseline against the real Neon database and reseed** - `2affe4a` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `prisma/schema.prisma` - datasource block: provider `postgresql`, `url`/`directUrl` annotated with pooled/unpooled roles
- `lib/db.ts` - header rationale comment only; zero executable-line changes
- `.env.example` - six new Phase 11 variables appended, all pre-existing variables untouched
- `prisma/migrations/migration_lock.toml` - regenerated, provider `postgresql`
- `prisma/migrations/20260828160053_init/migration.sql` - new Postgres-dialect baseline (replaces the three deleted SQLite migrations)

## Decisions Made
- `.env.example`'s new content was appended as a block after the existing `DATABASE_URL` line rather than restructuring that section, so the edit stays purely additive per the plan's zero-deletion acceptance gate — `DATABASE_URL`'s old `file:./dev.db` example value was deliberately left untouched (it's a template default, not a live credential).
- Migration regeneration followed the plan's prescribed delete-then-regenerate workflow exactly (never hand-edited SQL dialect); the first regeneration attempt (outside this executor session) used `--name init_postgres`, which failed the plan's `_init$` acceptance gate — the migrations folder was deleted a second time and regenerated with the exact required `--name init`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration directory name corrected to satisfy the `_init$` acceptance gate**
- **Found during:** Task 3
- **Issue:** An earlier ad-hoc session (outside normal plan execution, done while helping the owner connect Neon manually) had already run `prisma migrate dev --name init_postgres`, applying a migration to Neon under the wrong name — the plan's acceptance criteria mechanically require the directory to end in `_init`, and `_postgres` fails that check.
- **Fix:** Deleted `prisma/migrations/` (including `migration_lock.toml`) a second time and regenerated with the exact required `--name init`, per the plan's own delete-and-regenerate workflow (never hand-renamed or hand-edited).
- **Files modified:** `prisma/migrations/` (full replace)
- **Verification:** `ls prisma/migrations | grep -c '_init$'` = 1; `npx prisma migrate status` reports "Database schema is up to date!"
- **Committed in:** `2affe4a`

**2. [Rule 3 - Blocking] `DIRECT_URL` connectivity broken mid-session, fixed by the owner**
- **Found during:** independent post-hoc verification of Task 3 (after the reported "resolved" status)
- **Issue:** `npx prisma migrate status` failed twice in a row with `P1001: Can't reach database server at localhost:5432`, while `DATABASE_URL` (pooled, runtime) was confirmed healthy via a direct Prisma count query. The datasource line briefly displayed a garbled connection string (missing its leading `p` in `postgresql://`), consistent with a stray character corrupting the protocol prefix in the owner's local `.env`.
- **Fix:** The owner corrected the stray character in `.env`'s `DIRECT_URL` value directly (I never had `.env` access — this file is outside this plan's `files_modified` scope and is git-ignored). Re-verified independently after the fix: `npx prisma migrate status` now exits 0 with "Database schema is up to date!"
- **Files modified:** none (owner's local `.env`, not a tracked file)
- **Verification:** `npx prisma migrate status` exit code 0, "up to date"; re-ran twice
- **Committed in:** n/a (no tracked-file change)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking). **Impact on plan:** Both were necessary to meet the plan's mechanical acceptance criteria and to actually reach a working migration path; no scope creep — no code outside the plan's declared files was touched.

## Issues Encountered

**Tool-permission blocks on `.env.example` (Task 2):** Read/Write/Edit/Bash access to `.env.example` was denied by a generic `.env*` tooling rule in this environment, exactly as the plan's own `read_first` note anticipated. Per the plan's explicit fallback instruction, this was escalated rather than routed around; the six-variable block was applied by the coordinator and independently re-verified against every one of Task 2's acceptance criteria after landing (commit `d0db62c`).

**Auto-mode classifier blocked `prisma migrate dev` (Task 3):** Running the migration-regeneration command directly against the live Neon database was denied by the Claude Code auto-mode classifier as a destructive/production-DB action. This was escalated rather than bypassed (per the classifier's own explicit instruction to stop and ask). The coordinator ran the command; the resulting state was independently re-verified from disk (migration directory name, lock file contents, `prisma validate`, `prisma migrate status`, `npm test`, `tsc --noEmit`) rather than trusted at face value.

**Credential exposure in tool-call transcript (security note, not a plan deviation):** During independent verification, a full-output `npx prisma migrate status` call printed a live Neon connection string fragment — including what appears to be the database password — into this session's tool-output transcript, before the corrupted `DIRECT_URL` was diagnosed as broken. All subsequent verification commands were switched to exit-code-only / count-only output to avoid repeating this. The coordinator was notified immediately and advised to rotate the Neon database password as a precaution; no credential was sent anywhere outside this local tool-output transcript. This is recorded here for anyone reading project history later — both the `DIRECT_URL` corruption and this exposure were resolved before the plan was marked complete.

## User Setup Required

None beyond what already happened: the owner supplied the Neon project (pooled + unpooled connection strings in their local `.env`) and corrected a stray-character corruption in `DIRECT_URL`. No further action needed for this plan. Later Phase 11 plans (`lib/auth.ts`, the Stripe webhook, `lib/email.ts`) will read the five still-unpopulated env vars declared here (`ALLOW_DEMO_LOGIN`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`) — those remain empty in `.env.example` by design and must be filled in the owner's real `.env` / Vercel env store as each consuming plan lands.

## Known Limitation Carried Forward (D-06a)

`RESEND_API_KEY` and `EMAIL_FROM` are declared in the env contract but no plan yet sends mail. When the email plan lands, with no verified Resend sending domain, delivery will only reach the owner's own Resend account address — accepted and documented per D-06a, not a bug to chase during UAT.

## Follow-up Item (out of this plan's scope, flagged not fixed)

`package.json`/`package-lock.json` carry an added `pg` (`^8.23.0`) dependency that is not part of this plan's `files_modified` and whose origin is unclear (possibly an IDE-extension auto-edit during the manual Neon-connection session). Confirmed via `grep -rn "from \"pg\"|require(\"pg\")|'pg'"` across the codebase (excluding `node_modules`) that it is **not imported anywhere** — Prisma's `postgresql` provider does not need it without the `driverAdapters` preview flag, which this project does not use (RESEARCH explicitly rejects the driver-adapter approach, D-02/Pitfall 3). Left uncommitted and untouched since removing it would mean editing `package.json`, which is outside this plan's declared file scope. A future plan or a direct owner action (`npm uninstall pg`) should clean this up.

## Next Phase Readiness

The Neon Postgres cutover and full Phase 11 env contract are in place. Plans `11-02` through `11-08` (demo-login gate, Stripe webhook, Resend email, order history, deployment) can now read real `DATABASE_URL`/`DIRECT_URL` and rely on all six env-var names already existing in `.env.example`. No blockers for downstream plans.

---
*Phase: 11-go-live*
*Completed: 2026-08-31*

## Self-Check: PASSED

All claimed files and commits verified present on disk / in git history:
- `prisma/schema.prisma` — FOUND
- `lib/db.ts` — FOUND
- `prisma/migrations/20260828160053_init/migration.sql` — FOUND
- `prisma/migrations/migration_lock.toml` — FOUND
- `.planning/phases/11-go-live/11-01-SUMMARY.md` — FOUND
- Commit `37dc4bd` — FOUND
- Commit `d0db62c` — FOUND
- Commit `2affe4a` — FOUND
