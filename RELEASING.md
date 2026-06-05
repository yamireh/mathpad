# MathPad — Releasing & Versioning

How we ship and how we keep a live version healthy while building the next one.
Short version: **one healthy trunk + tags + feature flags.** We do *not* maintain
long-lived parallel version branches.

## The mental model

An App Store / Play app has **one live version at a time** — users just update to
the latest. So "maintain V1 while building V2" really means:
1. Be able to ship a **V1 patch** quickly, without shipping half-built V2 work.
2. Keep building V2 without that blocking a V1 patch.

We solve both with feature flags, not branches.

## Branching

- **`main` is always shippable.** Never leave it half-broken.
- Work on short-lived **feature branches**, merge back to `main` when green
  (type-check + tests pass).
- **Tag every store release:** when a build is submitted to Apple/Google, tag the
  exact commit — `git tag v1.0.0 && git push --tags`. Tags are the release layer;
  the `versions` skill docs (V1/V1.1/V2.0) are the planning layer.

## Feature flags (how we hide unfinished work)

Big in-progress work stays behind a flag so `main` stays releasable. We already do
this — keep doing it:

- **Whole modules:** `enabled: false` in `components/panels/MainPanel/topics.ts`
  keeps a topic as "Coming Soon" until it's done (e.g. build the **Clock** module
  on `main` while it stays invisible; flip `enabled: true` for V2.0).
- **Behaviors:** simple constants like `TIPS_ENABLED`, `SCRATCH_SOUND_ENABLED`,
  `DEMO_SCRATCH_SOUND`, and the `__DEV__`-gated purchase toggle.

Because the next version's headline feature is flag-hidden, a V1 patch is just
"`main` as-is (feature still off) + the fix."

## Versioning (semver)

In `app.json`:
- `version` — `1.0.0` → `1.0.1` (patch / bug fix) → `1.1.0` (minor) → `2.0.0`
  (Clock). Matches the `versions` skill docs.
- Bump the **build number** on every submission (even resubmits).

## Hotfix flow

- **If `main` is safe to ship** (next-version work is all flag-hidden) → fix on
  `main`, bump to e.g. `1.0.1`, build, submit, tag `v1.0.1`. Done.
- **If `main` can't ship yet** (a risky change that isn't flag-hideable) → branch
  from the live tag: `git switch -c hotfix/1.0.1 v1.0.0`, fix, ship, tag, then
  merge/cherry-pick the fix back into `main`. Feature flags should make this rare.

## Builds

- EAS builds + store submissions are **manual / on request** — never automated
  (see the project's EAS rule). Tagging is done at submit time.

## The one golden rule

**Never let `main` become un-shippable.** If a feature can't land in one go, hide
it behind a flag rather than leaving `main` broken. That single rule is what lets
us patch the live version anytime while V2 is mid-flight.
