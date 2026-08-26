// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Map a failure to copy-pasteable next steps printed on stderr, so a CLI user gets a command instead
// of only an error.

export function hintsForError (err) {
  const msg = String(err?.message || '')
  const hints = []

  if (/theme .* not found/i.test(msg)) hints.push('→ run:  aldina themes              # list available themes')
  if (/does not cover class|has no '/i.test(msg)) hints.push('→ run:  aldina themes              # pick a theme that covers this class')
  if (/declares no class/i.test(msg)) hints.push('→ add `class: letter|folio|deck|ledger|brief` to the front matter')
  if (/malformed config/i.test(msg)) hints.push('→ check the config.json named above, or remove it to use defaults')
  if (/node_modules/.test(msg)) hints.push('→ run:  npm install               # install dependencies')
  if (/failed to launch|DevTools (endpoint|WebSocket)|validator did not run/i.test(msg)) hints.push('→ install Chromium, or set CHROMIUM=/path/to/chromium')

  return hints
}
