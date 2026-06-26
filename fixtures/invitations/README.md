# Invitation fixtures (English)

The `invite-card` **class** — split out of `letter` because it breaks the flowing-letter
assumptions: content is **sparse, centered, and non-flowing**, anchored to the **center**
of a small card rather than flowing from the top.

Parked for now (one seed fixture). When we design this class, its constraint set will
differ from letters on at least: `flow` (off), `anchor` (center, both axes), `form`
(centered alignment), and likely a discrete **event-detail** role (date / time / venue /
RSVP as distinct centered lines rather than prose).

Convention is the same as `../letters/`: front-matter = fixture annotation only; body =
content as loose markdown.
