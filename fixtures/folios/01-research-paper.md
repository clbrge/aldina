---
type: research-paper
class-variant: article        # the shallow end of the report axis (no chapters, no matter-division)
title: Sublinear Indexing for Streaming Document Stores
authors: Sofia Reyes (Lumen Research) · Daniel Okafor (Lumen Research) · Helena Marsh (Westbrook University)
length: short
hierarchy: section > subsection
toc: false
stresses: abstract; labeled figure float + cross-ref; labeled table; citations + GENERATED bibliography; generated section numbers
lang: en
---

## Abstract
We present a sublinear indexing scheme for append-only document stores that cuts p99 query
latency by an order of magnitude while bounding memory growth. Across three production workloads
the approach reduces p99 from 900ms to 84ms (see [@fig:latency]) without growing the index beyond
1.3× baseline.

# Introduction {#sec:intro}
Document stores that ingest continuously face a tension between index freshness and query cost.
Prior approaches [@chen2021; @kumar2022] rebuild indexes in batches, trading latency for staleness.
We instead maintain a tiered structure, described in [@sec:method].

# Method {#sec:method}
Our index partitions the keyspace into hot and cold tiers. Incoming documents land in the hot tier,
which is periodically merged into cold storage.

## Merge policy {#sec:merge}
We merge when the hot tier exceeds a threshold τ, chosen to balance latency against memory.

![End-to-end query latency before and after the tiered index, across three workloads.](img:latency-chart){#fig:latency}

# Results {#sec:results}
[@tbl:results] summarizes latency and memory. As [@fig:latency] shows, the tiered index dominates
the baseline at every percentile.

| Workload | p50 (ms) | p99 (ms) | Index size |
|---|---|---|---|
| Ingest-heavy | 12 | 84 | 1.3× |
| Read-heavy | 9 | 61 | 1.1× |
| Mixed | 11 | 77 | 1.2× |

: Latency and index size by workload. {#tbl:results}

# Conclusion
The tiered scheme is a practical path to sublinear indexing for streaming stores. Future work
includes adaptive thresholds and multi-region merge.

# References {.unnumbered}
::: {#refs}
<!-- generated from [@chen2021; @kumar2022] -->
:::
