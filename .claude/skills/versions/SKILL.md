---
name: versions
description: MathPad version scopes — what's in each release, what's deferred, mandatory work before each prod deployment. Use whenever the user asks about V1 scope, V2 plans, what's in the next release, what's deferred, what's blocking launch, prod readiness, App Store submission, or "what do we need to ship X." Load the relevant version doc (V1.md, V2.md, …) before answering.
---

# MathPad — Version Scopes

This skill tracks the scope of each MathPad release. Each version has its own doc in this folder. When the user asks about a specific version, read the matching file first.

## Index

- **[V1.md](V1.md)** — First production deployment. Free download; Addition free + live $9.99 Operations IAP (the rest); other modules "Coming Soon."
- **[V1.1.md](V1.1.md)** — Post-launch update. Committed: best-effort remote-config loader (tunables, force-update gate) with bundled-default fallback.
- **[V2.0.md](V2.0.md)** — The **Clock** module (read an analog clock; answer Digital/Pattern/Mixed; complexity 15s/5s/Minutes). Full design in `docs/clock.md`.
- *V3 onwards — not yet defined.*

## Rules

1. **Read the version-specific doc before answering scope questions.** The index above only names the versions; the actual scope lives in each version's file.
2. **Don't conflate versions.** "Is X in V1?" means looking only at V1.md. Don't pull in V2 plans unless the user explicitly asks.
3. **Update the relevant version doc — never SKILL.md — when scope changes.** SKILL.md is just an index.
4. **When the user opens a new version of work**, create a new sibling file (V2.md, V3.md, …) and add a line to the index here.
5. **Cross-reference other skills** where they overlap — `pricing` for monetization decisions, `sections` for module catalog, `develop` for build rules.
