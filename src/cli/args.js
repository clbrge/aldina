// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Argument helpers shared by every verb; each consumes what it reads from the args array in place.

export function flag (args, name) {
  const i = args.indexOf(name)
  if (i === -1) return false
  args.splice(i, 1)
  return true
}

export function flagVal (args, name) {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}

export function flagVals (args, name) {
  const out = []
  let i
  while ((i = args.indexOf(name)) !== -1) {
    out.push(args[i + 1])
    args.splice(i, 2)
  }
  return out
}

export function parseJsonFlag (args) {
  return flag(args, '--json')
}

export async function readStdin () {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}
