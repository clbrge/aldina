---
type: technical-talk
format: "16:9"
slides: ~11
tone: technical-practical
stresses: multi-line code blocks; architecture diagrams; monospace; before/after metrics; repo link
lang: en
---

# Cutting Our p99 in Half
### How we rebuilt the ingestion path · Sofia Reyes · InfraCon 2026

## The symptom
p99 latency crept from 200ms to **900ms** over six months — and nobody touched the hot path.

## The architecture (before)
![](visual:arch-before)

## The culprit
Every request re-parsed the full config on the hot path:

```js
function handle(req) {
  const cfg = parseConfig(readFileSync('config.yaml'))  // every. single. call.
  return route(req, cfg)
}
```

## The fix
Parse once, cache, invalidate on change:

```js
let cfg = loadConfig()
watch('config.yaml', () => { cfg = loadConfig() })
function handle(req) { return route(req, cfg) }
```

## The architecture (after)
![](visual:arch-after)

## Results
| | Before | After |
|---|---|---|
| p99 | 900ms | 420ms |
| CPU | 71% | 38% |
| Cost / month | $9.2K | $5.1K |

## What we learned
- Profile the hot path — don't guess
- "Cheap" calls aren't cheap at the p99
- Cache invalidation beats cache avoidance

## Try it yourself
Repo + flamegraphs: `github.com/lumen/ingest-talk`
