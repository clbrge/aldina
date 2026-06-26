---
type: project-update
format: "16:9"
slides: ~8
tone: neutral-internal
stresses: status indicator (RAG); metrics table; risk list; decisions; timeline; dense data
lang: en
---

# Atlas Migration — Status
Sprint 14 · June 25, 2026 · Owner: D. Okafor

## Status at a glance
**On track** — green on schedule and scope, amber on staffing.

- Schedule: green
- Scope: green
- Staffing: amber (one backend role open)

## Done this sprint
- Cut over 60% of billing traffic to the new platform
- Retired the legacy reconciliation job
- Closed 14 of 18 migration tickets

## Metrics
| Metric | Last sprint | This sprint | Target |
|---|---|---|---|
| Traffic migrated | 35% | 60% | 100% |
| p99 latency | 820ms | 540ms | < 600ms |
| Error rate | 0.9% | 0.4% | < 0.5% |

## Risks & blockers
1. Open backend role slowing the final cutover — **needs hire by Jul 15**
2. Vendor API rate limits under load — mitigation in test
3. 2023 data backfill still pending

## Decisions needed
- Approve a two-week extension **or** cut the 2023 backfill from v1
- Sign off on the read-only freeze window (proposed Aug 3–4)

## Next milestones
- **Jul 9** — 100% traffic cutover
- **Jul 18** — legacy decommission
- **Aug 4** — final data backfill complete

## Appendix
Detailed ticket list and latency breakdowns in the linked dashboard.
