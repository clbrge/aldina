---
type: technical-report
class-variant: report          # the canonical middle — chapters, TOC, running heads
title: Atlas Migration — Technical Report
authors: Platform Engineering
date: June 2026
length: long
hierarchy: chapter > section > subsection
toc: true                      # GENERATED table of contents
running-heads: true
stresses: chapters; generated TOC; multiple floats; cross-refs ACROSS chapters; deep hierarchy; generated numbering
lang: en
---

<!-- title page + generated TOC precede the body -->

# Background {#ch:background}
The Atlas platform reached the limits of its original billing architecture in early 2026. This
report documents the migration, its results, and the risks that remain.

## The legacy system {#sec:legacy}
The legacy billing path re-parsed configuration on every request (see [@fig:legacy]), a design
that scaled poorly past 10k requests per second.

![Legacy billing architecture.](img:legacy){#fig:legacy}

## Goals {#sec:goals}
We set three goals: halve p99 latency, clear the reconciliation backlog, and enable multi-region
failover.

# The new architecture {#ch:new}
The redesigned path caches parsed configuration and invalidates on change. [@fig:new] contrasts it
with the legacy design from [@fig:legacy] in [@ch:background] — a cross-chapter reference.

![Redesigned billing architecture.](img:new){#fig:new}

## Results {#sec:results}
Latency fell as projected ([@tbl:metrics]).

| Metric | Before | After |
|---|---|---|
| p99 | 900ms | 420ms |
| CPU | 71% | 38% |

: Before/after metrics. {#tbl:metrics}

## Open risk {#sec:risk}
One key-person dependency remains in the platform team — see [@ch:next].

# Risks and next steps {#ch:next}
As noted in [@sec:risk], staffing is the main open risk. We recommend cross-training two engineers
before the legacy decommission.
