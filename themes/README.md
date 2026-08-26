# Themes

A **theme** is the user-facing identity unit — what a user picks or owns. It bundles the things
Aldina keeps separate internally, so that all of a user's documents (letters · decks · folios) come
out **coherent**:

```
theme = { tokens (shared skin)  +  grammars[per class]  +  assets }
```

- **tokens** — the cross-class skin (type, ink, brand colour, rhythm). Shared by *every* grammar in
  the theme; this is what makes a letter and a deck from the same theme feel related.
- **grammars** — one per class (`letter.css`, `deck.*`, `folio.css`), designed as a coherent *family*.
- **assets** — logo, letterhead, etc.

A theme is the deliverable of the **layout flow** run across classes under one token set + one design
intent. The **output flow** (`src/run.js`, via the `aldina` CLI) *consumes* a theme: it loads the theme's tokens + the
class grammar and routes content into them. Swapping tokens within a theme is **free reskin**;
switching to a theme with different *grammars* needs a re-route.

> Printing-native synonym: a press's consistent identity across all its output is its **house style**.

## Layout

```
themes/<name>/
  theme.yaml        manifest — name, classes covered, token/grammar files, assets
  tokens.css        the shared skin (:root brand tokens)
  letter.css        the letter grammar (structure; targets [data-role]; references the tokens)
  deck.* / folio.*  per-class grammars, as they're built
  assets/           logo, letterhead
```

A theme covers **one or many** classes. The minimal theme is one grammar for one class; a full theme
covers letter + deck + folio with shared tokens.

## Run

```bash
aldina <src.cmk> --theme oxford [--pdf out.pdf]   # or: node src/cli/index.js <src.cmk> …
```

Without `--theme`, `compose` falls back to the self-contained `grammar/<class>.css` (legacy).
