# Parent Pro — design & plan (marketing version 2.0.0)

**Parent Pro** expands Parent Mode from a passive progress dashboard into an
active tool: parents set **goals** their kids earn **stars** for, and assign
**custom exams**. It is a **paid subscription** layered on top of the existing
(free) dashboard.

Grounding: builds directly on the shipped Parent Mode (`docs/parent-mode-v1.md`)
— Firebase/Firestore, parent email auth, kid anonymous auth (`childId == uid`),
per-session sync with a rolling aggregate on the child doc.

---

## Why this is a subscription (and the modules aren't)

Decided jointly (see the `pricing` skill, Parent Pro section):

- **Kid learning modules stay one-time IAPs** — offline, owned forever. The
  pricing skill's anti-subscription rule (no backend / no accounts / offline)
  applies to the **kid app**, and still holds there.
- **Parent Pro is a subscription** — it is inherently **online, account-based,
  multi-device, and server-backed** (goals, stars, assigned exams, cloud sync).
  Parent Mode already crossed the "no backend" line with Firebase, so the
  subscription objection doesn't apply to this surface. It also carries an
  ongoing cost to us (Firebase) and delivers ongoing value (assignments) — the
  textbook profile of a subscription.
- **The basic dashboard stays free** — it already shipped; Pro is purely
  additive. Free = *see* progress. Pro = *direct* it.

Framing for the store / parents: we are **not** renting anyone their kid's math
learning (that's buy-once, offline). We charge recurring for an **ongoing parent
service**. Clean story, avoids the "why am I subscribing to a worksheet?"
backlash. All subscription surfaces stay in the **parent-authenticated** context
(COPPA + Apple kids rules) — never kid-facing.

Price point + period: **still open** (floated ~$3–5/mo or ~$20–30/yr,
annual-forward; buyer compares to Kumon $100–150/mo). Enable Apple Family
Sharing on the sub.

---

## SPEC reconciliation (stars)

`SPEC.md` bans "stars, streaks, achievements" — **for the calm kid practice**.
Parent Pro stars are different: **parent-configured, parent-visible, redeemable
for real-world rewards** — a motivation contract between parent and child, not
in-practice gamification. Carve-out (added to SPEC): parent-directed rewards are
in scope **in Parent Mode**, and stars **stay off** the kid's practice / score /
review screens.

---

## Feature 1 — Targets & Stars (build first)

Rides on the session aggregates already stored, so it's the smaller slice.

**Product loop:** parent sets a goal → kid practices → meets goal → earns a star
→ family redeems stars for real-world rewards (agreed offline, e.g. "5 stars = a
toy"). The app **tracks** stars; it never *is* the reward.

**Targets** (per child): `{ period: daily | weekly | monthly, goal: { total,
byTopic: { addition, subtraction, … } }, window }`. Progress derives from the
existing `byTopic` session aggregates.

**Two star counters (never conflated):**
- `starsLifetime` — never decremented. The history / bragging number.
- `starsBalance` — redeemable; what a **reset (redemption)** spends.
- A redemption logs an event (`children/{id}/redemptions`) so we keep the full
  history of earned *and* cashed-in.

**Award authority (no server / no Cloud Functions):** the **parent app is
authoritative** — it computes window progress and awards the star on dashboard
open. The kid app shows stars **read-only**. Avoids trusting the kid device
clock and prevents double-awards.

**Proposed data model (extends parent-mode-v1):**
```
families/{id}/children/{childId}                     // + starsLifetime, starsBalance
families/{id}/children/{childId}/targets/{period}    { period, goal, window, ... }
families/{id}/children/{childId}/redemptions/{id}    { amount, note, at, by }
```

---

## Feature 2 — Assigned exams (build second)

The premium hook: turns MathPad into "parent assigns homework / tests." An exam
is essentially **a session with a fixed question list + assignment metadata +
blind results** — reuses the practice workspace, recognition, and sync.

**Authoring:** parent picks **mode + settings + count** and we generate the
questions via the existing `generateSession`; optionally add specific
hand-entered problems. Reuse the `Question` type.

**Blind results:** the kid sees a neutral **"Submitted ✓ — nice work!"** (no
score); the parent gets the full breakdown. A real assessment, without feeling
punishing.

**Flow:** parent creates + assigns → kid sees **pending exams** → runs it in the
existing workspace → submits → parent sees the result.

**Proposed data model:**
```
families/{id}/exams/{examId}                 { createdBy, assignedTo[], title,
                                               questions[], dueAt, status }
families/{id}/children/{childId}/examResults/{examId}
                                             { answers, score, submittedAt }
```

---

## Sequencing

1. **Targets & Stars** — smaller, rides on existing aggregates.
2. **Assigned exams** — larger; new authoring + blind-result + pending-exam sync.

Gate **both** behind a `parentPro` entitlement flag from day one. Option: launch
free to gather feedback, then flip on payment once proven.

---

## Open decisions (pin before/while building)

- **Price + period** (monthly vs annual-forward, and the number).
- **Free/paid boundary specifics** — confirm the basic dashboard stays fully
  free; which exact features are Pro-only.
- **Star award authority** — confirm parent-app-authoritative (recommended).
- **Subscription entitlement storage/validation** — StoreKit receipt +
  Firebase (Parent Mode already talks to both).
- **Redemption UX** — how a parent "spends" stars and what the kid sees.

## Rules for working in Parent Pro scope

1. **Reuse, don't fork.** Exams run in the existing practice workspace; stars
   ride on the existing session aggregates and sync.
2. **Parent-authenticated only.** No subscription or Pro surface is kid-facing.
3. **Keep stars out of kid practice.** Practice / score / review stay calm and
   un-gamified per SPEC.
4. **Everything behind `parentPro`** so we can ship dark and flip payment on.
