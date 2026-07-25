# Parent Pro — Targets & Stars (feature spec)

First buildable slice of Parent Pro (`docs/parent-pro.md`). Parents set practice
**goals**; kids earn **stars** for meeting them; stars are redeemable for
real-world rewards agreed offline. The app **tracks** stars — it never *is* the
reward.

Builds on shipped Parent Mode (`docs/parent-mode-v1.md`): Firestore, parent email
auth, kid anonymous auth (`childId == uid`), per-session sync.

---

## 1. User stories

- **Parent** sets a goal per child — daily / weekly / monthly — as a **total**
  question count and optional **per-topic** counts (e.g. weekly: 50 add + 50 sub
  + 50 mul + 50 div = 200).
- When a child meets a period's goal, they **earn 1 star** for that period.
- **Parent sees** each child's **stars earned all-time** and **current
  balance**, and can **redeem** (reset the balance) — logged as history — when the
  family trades stars for a reward.
- **Kid** sees their **star count** (read-only, celebratory) — but NOT in the
  calm practice/score/review flow (SPEC: stars stay out of kid practice).

---

## 2. Progress: computed from sessions, not the lifetime aggregate

The child-doc `byTopic` aggregate is **lifetime cumulative** — it can't answer
"how many questions this week." Period progress is derived from **session docs**,
which each carry `{ topic, completedAt (ISO), totalQuestions }`:

```
progress(period, window) = Σ session.totalQuestions
  for sessions where window.start ≤ completedAt < window.end
  (grouped by topic for per-topic goals)
```

Feasible today: sessions are already `orderBy('completedAt')`-queryable, so a
range query per window is cheap (a week/month of a kid's sessions is small).

**Windows** (proposed): computed in the **parent device's local time** (the parent
app is authoritative — §4).
- **daily** — local midnight → next midnight
- **weekly** — configurable week start (default Monday) → +7 days
- **monthly** — calendar month
Store `windowStart` as ISO for idempotency keys. _Caveat:_ a kid in a very
different timezone could see a window edge shift; acceptable for v1 (flag in open
questions).

---

## 3. Award logic — idempotent, parent-authoritative

Stars are awarded by the **parent app** (§4) on dashboard open:

```
for each child, each active target:
  for each window from (last-checked) up to now:
    if window is complete OR (current window AND goal already met):
      key = `${period}:${windowStartISO}`
      if key not in awards ledger AND progress(window) meets goal:
        create awards/{key}; starsLifetime += 1; starsBalance += 1
```

- **Idempotency:** the `awards/{windowKey}` ledger guarantees **one star max per
  window per period** — re-opening the dashboard never double-awards.
- A **current** in-progress window can award as soon as the goal is met (kid
  isn't made to wait for the window to close).
- Goal is **snapshotted** into the award, so later target edits don't retro-change
  past awards.

---

## 4. Why the parent app awards (not the kid)

No backend logic / no Cloud Functions (per Parent Mode). Evaluating windows +
awarding on the **kid** device would mean trusting the kid's clock and risking
double-awards across devices. The **parent app is authoritative**: it computes
and writes awards; the **kid app reads stars read-only**. Trade-off: a star may
appear only when a parent next opens the dashboard — acceptable, and can be
softened later (e.g. award-on-sync).

---

## 5. Data model (proposed)

Stars/targets live in **subcollections of the child doc** — NOT on the child doc
itself — so `resetChild` (which full-replaces the child doc + deletes the
`sessions` subcollection) **leaves stars and targets intact**. A progress reset
must never wipe earned stars.

```
families/{fid}/children/{cid}                         // unchanged lifetime aggregate
families/{fid}/children/{cid}/sessions/{sid}          // unchanged; source of period progress
families/{fid}/children/{cid}/targets/{targetId}
    { period: 'daily'|'weekly'|'monthly',
      goal: { total: number, byTopic?: { [topic]: number } },
      weekStart?: 0-6, active: boolean, createdAt, updatedAt }
families/{fid}/children/{cid}/rewards/summary         // single doc
    { starsLifetime: number, starsBalance: number, lastEvaluatedAt }
families/{fid}/children/{cid}/awards/{windowKey}      // idempotency ledger
    { period, windowStart, windowEnd, goalSnapshot, progressSnapshot, awardedAt }
families/{fid}/children/{cid}/redemptions/{id}
    { amount: number, note?: string, at, byParentUid }
```

- **Two counters, never conflated:** `starsLifetime` (only ever `increment(+1)`)
  and `starsBalance` (`+1` on award, `-amount` on redemption).
- **Redemption** = parent spends balance → `starsBalance -= amount` + a
  `redemptions` doc. Lifetime is untouched (the history/bragging number).

---

## 6. Firestore rules (new — re-deploy required)

Mirror the existing child-subtree rules (`uid == childId` OR family member):
- `targets/**`, `rewards/**`, `awards/**`, `redemptions/**`: **read** if
  `uid == childId` OR `isMember(familyId)`; **write** by family members
  (parents). Kid device is read-only on stars/targets (it never writes awards).
- Keep it consistent with the shipped session rules so a shared/single test
  device (signed in as parent) can still write.

---

## 7. UI surfaces

**Parent (in the dashboard / per-child):**
- **Set goals** — period selector + total + optional per-topic breakdown.
- **Stars card** — lifetime ⭐ and current balance per child; a small progress
  bar toward the active goal.
- **Redeem** — "Redeem stars" action (spend N from balance, optional note),
  with the redemption history visible.

**Kid (separate, celebratory, OUT of practice flow):**
- A read-only **"My stars"** view (e.g. on the home screen or a dedicated tile)
  showing their star count. No target editing, no redemption.

All parent surfaces are **parent-authenticated**; gate the whole feature behind
the `parentPro` entitlement (§9).

---

## 8. Interaction with existing actions (gotchas)

- **`resetChild` (Reset progress):** deletes sessions + replaces the child doc.
  With stars/targets in subcollections, they **survive** — correct: resetting
  progress shouldn't erase earned stars. (An award already in the ledger stays;
  future window progress just recomputes from remaining sessions.)
- **`removeChild`:** should also delete the new subcollections (targets, rewards,
  awards, redemptions) to avoid orphans.
- **Account deletion:** extend `deleteParentData` to remove the new
  subcollections family-wide.
- **Target edits:** goal snapshots on awards prevent retro-changes to past stars.

---

## 9. Entitlement gating

- New `parentPro` entitlement (subscription — `pricing` skill §0). Until wired,
  gate behind a **feature flag** (`PARENT_PRO_ENABLED`, default `false`) so we can
  build + merge dark and flip on later.
- Reuse the `usePurchases` pattern (StoreKit + Play Billing); store the sub
  entitlement so Parent Mode can read it. (Detailed subscription wiring is its
  own slice — this spec assumes the flag/entitlement gate exists.)

---

## 10. Build slices (suggested order)

1. **Pure logic + tests** — `lib/rewards/` (framework-free): window math
   (`windowFor(period, date, weekStart)`), `progressInWindow(sessions, window)`,
   `evaluateAwards(targets, sessions, existingAwards, now)`. Fully unit-testable,
   no Firebase.
2. **Firestore layer** — `lib/firebase/rewards.ts`: read/write targets, summary,
   awards, redemptions; `evaluateAndAward(familyId, childId)`.
3. **Rules** — add + deploy the new-collection rules.
4. **Parent UI** — set goals, stars card, redeem + history.
5. **Kid UI** — read-only "My stars".
6. **Gating** — `PARENT_PRO_ENABLED` flag; later the real subscription.

Keep each slice green (type-check + tests) and behind the flag.

---

## 11. Open decisions

- **Star rate:** exactly 1 star per met period? Or bonus for per-topic-complete
  vs total-only? (Proposed: 1 per met period; keep simple.)
- **Window timezone** for cross-timezone families (proposed: parent-local).
- **Week start** default (proposed: Monday; make it configurable).
- **Partial credit / streaks:** none for v1 (SPEC bans streaks; keep it binary
  met/not-met).
- **Where the kid sees stars** (home tile vs dedicated screen) + whether it's
  gated when the sub lapses (proposed: keep earned stars visible read-only even
  if the sub lapses; only *setting new goals* is Pro-gated).
- **Multiple concurrent targets** (e.g. a daily AND a weekly) — supported by the
  model (targets is a collection); confirm the UI allows it.
