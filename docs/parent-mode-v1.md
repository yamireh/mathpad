# Parent Mode — Milestone 1 Spec

**Goal:** the smallest end-to-end slice — parent signs up, links the kid's
device by code, the kid's sessions sync to the cloud, and the parent sees
progress. Read-only. No assignments / prizes / subscription yet.

## Scope

**In:** parent auth · family + pairing code · kid device link by code · session
sync · parent dashboard (read-only) · single child per family.

**Out (later milestones):** multiple child profiles · assignments · prizes /
rewards · subscription / billing · push notifications.

## Roles & auth

- **Parent** → real account (email + Apple/Google). Owns the data; provides
  COPPA consent.
- **Kid device** → **Firebase Anonymous Auth** (a stable device identity, *no
  credentials*). Linked to a family via a code.
- The app is **one binary**; the role is chosen at first run and remembered.

## Screens

**Kid device (added to the current app):**

1. **Role picker** (first run only): _"Whose device is this?"_ →
   `[My child's]` / `[I'm a parent]`.
2. `My child's` → straight into the existing practice flow (unchanged).
3. **Settings → "Connect to a parent"** → 6-char code entry → success state
   (_"Connected ✓"_). Optional, non-blocking.

**Parent device (new):**

1. **Sign up / sign in.**
2. **Family setup** (if no device linked yet): shows the **pairing code** +
   instructions.
3. **Dashboard:** child header (streak, last active) · summary cards (sessions,
   accuracy, time practiced) · per-topic breakdown · recent sessions list.
4. **Settings:** show / regenerate pairing code · sign out.

## Firestore data model

```
families/{familyId}
  ownerUid, name, createdAt, pairingCode

pairingCodes/{code}                      // lookup: code → family
  familyId, active

families/{familyId}/devices/{deviceUid}  // linked kid devices
  linkedAt, childId

families/{familyId}/children/{childId}
  name, createdAt

families/{familyId}/children/{childId}/sessions/{sessionId}
  topic, completedAt, totalQuestions,
  correctFirstTry, fixed, durationSec, settingsSummary

families/{familyId}/children/{childId}/summary   // ONE rolling doc — cheap reads
  totalSessions, totalQuestions, totalCorrect,
  byTopic{}, lastActiveAt, streakDays,
  recentSessions[ last ~10 ]
```

**Cost trick:** the parent dashboard reads the **single `summary` doc** (~1–2
reads per open), not every session. The kid device writes 1 session doc + merges
the summary (~2 writes/session). Keeps you inside the Firestore free tier for a
long time.

## Pairing-code logic

- **On parent signup:** create `families/{id}` (client-side, parent-authed) +
  generate a unique 6-char code → write `pairingCodes/{code}`.
- **Kid joins:** call one **Cloud Function `joinFamily(code)`** — validates the
  code server-side, registers `families/{id}/devices/{deviceUid}`, returns
  `familyId` / `childId`. (Server-side so the code is the only shared secret and
  joins can't be forged.)
- The code behaves like a WiFi password: regeneratable from parent settings; the
  old one deactivates.

## Security rules (essence)

- `families/{id}` + subtree: **read** by `ownerUid` OR a uid present in
  `devices`; **write** to `sessions` / `summary` only by a member device uid;
  family metadata only by `ownerUid`.
- `pairingCodes`: not client-readable — only the `joinFamily` function touches
  it.

## Sync logic (kid device)

- On session finish (hook into the existing `usePracticeSession` completion),
  **if linked** → write the session doc + merge the summary. Firestore's
  **offline queue** handles no-connectivity and syncs later.
- **Back-fill:** on first link, batch-upload existing local history so the parent
  sees past sessions too.
- **Unlinked kids** never touch the cloud — pure local, zero cost.

## Tech

- **Firebase JS SDK** (Firestore + Auth) — no extra native config. You already
  do EAS/prebuild, so `@react-native-firebase` (better offline) is an option too
  if wanted later.
- **1 Cloud Function** (`joinFamily`) → Blaze plan (still free-tier priced).
- Apple/Google sign-in via `expo-auth-session` / Firebase.

## COPPA / privacy

- Parent account = consent; the **kid stays anonymous, no PII** (child name is
  parent-entered, optional).
- Store **only session summaries** (scores / topics / timestamps), never answer
  content.
- Update the privacy policy for cloud data; **no kid-facing analytics SDKs**.

## Acceptance criteria

1. Parent signs up on their phone → gets a code.
2. Kid enters the code on the iPad → practices a session → it appears on the
   parent dashboard within seconds.
3. Kid practices offline → syncs when back online.
4. A kid who never links still plays completely normally.
5. Opening the parent dashboard = ~1–2 Firestore reads.

## Suggested build order

1. Firebase project + SDK wired into the app (Auth + Firestore).
2. Parent auth (email, then Apple/Google).
3. Family creation + pairing code + `pairingCodes` lookup.
4. Kid anonymous auth + `joinFamily` Cloud Function + "Connect to a parent" UI.
5. Session sync (write session + merge summary) + local-history back-fill.
6. Parent dashboard (reads the summary doc).
7. Security rules + privacy-policy update.
