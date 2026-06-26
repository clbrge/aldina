# Licensing — Aldina

Aldina is **open-core**, dual-licensed.

## Open source — AGPL-3.0-or-later

The engine in this repository is free software under the **GNU Affero General Public License, version 3
or later** (see `LICENSE`). You may self-host, study, modify, and redistribute it under those terms.

Because Aldina is normally run as a **network service**, the AGPL's **section 13** applies: if you run
a modified version and let others interact with it over a network, you must offer those users the
complete corresponding source of your modified version. This is the deliberate effect of the
choice — it keeps the engine open and means a competing hosted service cannot be built on a *closed*
fork.

## Commercial license

The AGPL doesn't fit everyone — e.g. you want to embed Aldina in a closed-source product, or run a
hosted service without releasing your modifications. A **commercial license** lifts the AGPL
obligations under separate terms.

> Contact: **hithere@ai4verticals.com**

Dual licensing is possible because the copyright is held by a single party; outside contributions are
governed by `CLA.md`, which preserves that right.

## What is and isn't covered here

**Open (AGPL), in this repository** — the engine: role inference, `compose`, the quality **gate**,
`project` (PDF), the pipeline driver, and the **reference** themes and grammars.

**Separate and commercial (not under the AGPL)** — curated **premium themes**, hosted services, and a
**theme marketplace**. These are licensed separately and live outside this repository.

**ChoirMark** — the `.cmk` format and its reference parser — is a *separate* project under its own
permissive licenses (spec CC BY-SA, code MIT); Aldina depends on it and does not relicense it.

## Per-file header

Every source file should carry this notice:

```
Aldina — <short description>
Copyright (C) 2026 Christophe Le Bars
SPDX-License-Identifier: AGPL-3.0-or-later

This program is free software: you can redistribute it and/or modify it under the
terms of the GNU Affero General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.
This program is distributed WITHOUT ANY WARRANTY; see the GNU AGPL for details
<https://www.gnu.org/licenses/>.
```

For machine readability, an `SPDX-License-Identifier: AGPL-3.0-or-later` line alone is sufficient in
files where the full header is too heavy.

The full AGPL-3.0 text is in `LICENSE`.
