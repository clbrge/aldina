# Part I — the derivation loop

Make a forme (a validated layout) from a class spec + a fixture, by *proposing* HTML/CSS and letting
the admission gate accept it or return reasons to repair:

```
  propose ──▶ gate ──▶ fail? ──▶ feed findings back ──▶ re-propose
                 │
                 └── pass ──▶ admitted forme
```

The grammar is defined extensionally: a layout is admissible **iff** it passes the gate. The
generator is **pluggable** — a human stand-in now, an LLM call next (that step costs API tokens).

## Inputs the generator is given (the prompt is assembled from these)

- `constraints/<class>.yaml` — canvas, zones, validators, tokens
- `roles/<class>.yaml` — the closed role set (the frozen interface)
- a token set — the brand skin
- a fixture (ChoirMark) — the content to lay out
- on repair iterations: the accumulated `✗` findings from the gate

## Generator rules (the static brief)

1. Output **one static-complete HTML file**. No JS — PDF is the floor.
2. Every content element carries `data-role` from the role set; CSS targets `[data-role]`, never positions.
3. **Tokens only** — design values via CSS custom properties; structural CSS literal.
4. Honor the constraints: page/aspect, margins/safe-area, flow vs pinned zones (window → pin the
   recipient to `--win-*`), letterhead/footer chrome, `signature-space`.
5. The layout MUST pass the gate. On failure, the `✗` findings are appended and you re-propose.

## Run the loop

```
node src/harness/validate.js <forme>      # exit 0 = admitted · 1 = repair
```

Repeat, feeding each `✗` finding into the next proposal, until admitted. Admitted formes land in
`derive/out/`; the iteration log is `derive/RUN-LOG.md`.
