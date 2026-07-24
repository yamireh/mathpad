# Release notes

One file per shipped version — **`<version>.md`** (e.g. `1.2.6.md`) — listing
that version's fixes and changes. This is the source of truth for "what changed
in each release," so we don't have to reconstruct it from git history.

## Convention

- **New version → new file.** When the app version is bumped (`app.json`),
  create `docs/releases/<new-version>.md` and record fixes there as they land.
- **Group by area** (Division, Clock, Multiplication, Feedback, …) with short,
  plain-language bullets.
- Keep an optional **Store "What's New"** draft at the bottom for the App
  Store / Play Console listing.
- Older files are never rewritten — each is a frozen record of that release.

See `1.2.6.md` for the format to follow.
