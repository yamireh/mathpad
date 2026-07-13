# Parent Mode — Milestone 1 (living doc)

**What it is:** a parent signs up, links the kid's device with a 6-char code, the
kid's practice sessions sync to Firestore, and the parent sees read-only progress.
One child per family. No assignments / prizes / subscription yet.

> This doc is the **source of truth for intent + status**. The **code is the
> source of truth for implementation** — where they disagree, trust the code and
> fix this doc. It is written so a fresh terminal session can resume with zero
> prior context.

---

## Status (updated 2026-07-12)

- **Branch:** `parent-mode` (6 commits, based on `main`). NOT merged to `main`.
- **Milestone 1 is functionally built and committed** end-to-end: role picker →
  parent auth → family + code → kid join → session sync → dashboard.
- **Firestore security rules are written but NOT yet deployed** (`firestore.rules`,
  uncommitted). Until deployed, the database is running on default/open rules.
- Firebase project **`mathpen-6869d`** is live; Email + Anonymous auth enabled;
  Firestore in production mode (region: nam5 / North America).

### Uncommitted working changes (on `parent-mode`, not yet committed)

Held back per the user's rule: **no commit until the user tests on-device (iOS
first) and says "commit."**

| File | Change |
|---|---|
| `firestore.rules` | **New** — security rules, needs console deploy. |
| `components/panels/parent/ParentAuthForm.tsx` | Forgot-password **reset mode** (hides password, email-only). |
| `app/connect.tsx` | Child can **edit their own name** from the connected state. |
| `components/panels/MainPanel/MainPanel.tsx` | **Personalized greeting** ("Hi Zaina, ready for math?"). |
| `components/panels/ParentPanel.tsx` | Signed-in parent gets an **"Open practice mode"** button (`setRole('child')`, stays signed in) + a **"Hi {name} 👋"** greeting from `user.displayName`. |
| `lib/firebase/auth.ts` | `signUp(email, password, name)` sets Auth **`displayName`**; `updateDisplayName(name)` for existing parents; `onProfileChanged` emitter (updateProfile doesn't re-fire `onAuthStateChanged`). |
| `components/panels/ParentPanel.tsx` (name edit) | Signed-in parent can **inline-edit their name** ("Edit name" / "Add your name" → field + Save). |
| `hooks/useAuthUser.tsx` | Subscribes to `onProfileChanged` → re-renders so a just-set `displayName` shows immediately. |
| `components/panels/parent/ParentAuthForm.tsx` | Sign-up now has a **"Your name"** field (required for sign-up). |
| `__mocks__/firebase.js` | Added `updateProfile` / `sendPasswordResetEmail` to the jest mock. |
| `types/index.ts`, `hooks/usePracticeSession.tsx` | New `solved` flag on `QuestionResult` (Solve/auto-solve, distinct from a self-correction). |
| `lib/firebase/sync.ts`, `lib/firebase/dashboard.ts` | Session doc now carries `finalScore` + **`corrected` / `solvedWithHelp` / `hintsUsed`**. |
| `components/panels/parent/ParentDashboard.tsx` | Recent-session rows show **final score + help badges** (✎ corrected · 🪄 solved with help · 💡 hints, or "All correct, no help 🎉"), grouped by method in tinted panels with date+time. **Pinned refresh bar**; children are **collapsible `SectionList` sections with sticky headers** (chevron + accuracy%; first child open, rest collapsed) so many kids don't mean endless scrolling. |
| `ParentPanel.tsx` + `app/family-settings.tsx` (declutter) | Parent home is now just **"Hi {name} 👋" + Progress + Refresh**. The **account (name edit + "signed in as" email)** moved into Family settings alongside the codes. |
| **Topic-agnostic sync** (`lib/firebase/sync.ts`) + **Clock sync** (`components/domain/clock/ClockModule.tsx`) | Sync core now takes a neutral `SessionSyncData` (Operations adapter + Clock). Clock commits once on Home/Again/unmount (reflecting fixes; maps `correct`/`fixed` → firstTry/finalScore/corrected, no hints/solve). Dashboard shows a blue **Clock** group. Both modules now feed Parent Mode. |
| **Offline sync queue** (`lib/storage.pendingSyncStore`, `sync.flushPending`, `hooks/useSyncFlush`, `_layout`) | Every finished session (both modules) is enqueued locally first, then pushed; a failed push (offline) stays queued and retries on the next flush — on each finish, on **launch**, and on **app-foreground** (`AppState`, no new native dep). Removed only after a successful push → no double-count. Fixes the "aggregate uses increments" fragility too. |
| `firestore.rules` (child writes) | Child data writable by the kid's own device **or any family member** — supports a shared phone / one-device use. Kids aren't members, so still locked to their own doc. **Re-deploy required.** |
| **Clock local history** (`lib/clock` `ClockSession`/`summariseClockSession`, `lib/storage.clockHistoryStore`, new `app/clock-history.tsx`, `ClockSettingsView` History pill) | Clock now has its own on-device History (matching the Operations History link): each finished session saved locally + a **History** pill on the Clock page → a list screen (date, type, score, fixes). Same session id feeds both local history and the offline sync queue. |
| **Co-parents** (`family.ts`, `useFamily.tsx`, `ParentPanel.tsx`, new `FamilySetup.tsx`, `FamilyCode.tsx`, `firestore.rules`, en.json) | Two equal parents per family: `parents/` membership + `parentInvites/` + `parentIndex/`; Create/Join chooser; stable `parentCode`; rules verify the invite. **No migration.** |
| **Parent settings gear** (`ParentPanel.tsx`, new `app/family-settings.tsx`) | Parent home is now just greeting + dashboard; a header **gear → /family-settings** holds the two share codes, "Open practice mode", and "Sign out" (mirrors kid home → grown-ups). |
| `lib/firebase/family.ts` | `updateChildName()`; `joinFamily` stores name. |
| `lib/storage/index.ts` | `FamilyLink` carries optional `name`. |
| `lib/i18n/locales/en.json` | Strings for the above (reset mode, names, greeting). |

### Known follow-ups / pending

1. **Deploy `firestore.rules`** to the Firebase console, then re-test the full
   loop under rules (parent read, kid write, cross-family denial). — *user action*
2. **Test on iOS** the uncommitted batch (reset mode, name edit, greeting), then
   commit it together.
3. **Email deliverability** (pre-launch): default reset emails land in **junk**
   because they send from `noreply@mathpen-6869d.firebaseapp.com`. Fix path:
   set the project **public-facing name** to `MathPen` (Project settings →
   General) so `%APP_NAME%` stops showing the project id; then before launch, use
   a **custom sender domain with SPF/DKIM** (Identity Platform custom SMTP, or a
   Cloud Function + SendGrid/SES). Console/DNS config, no app code.
4. **Device-id hardening** (see "Hardening" below) — deferred, needs native rebuild.
5. **Realtime dashboard** (onSnapshot) — currently pull-to-refresh only.

---

## Architecture (as built)

### Roles
- **Parent** → real email account (Firebase Email/Password auth). Owns the data.
- **Kid device** → **Firebase Anonymous Auth** — a stable per-device identity, no
  credentials. The anonymous **uid IS the `childId`**.
- One binary; role chosen at first run (`deviceRoleStore`) and remembered.

### Firestore data model (ACTUAL — differs from the original spec)
```
families/{familyId}                         { ownerUid, pairingCode, parentCode, createdAt }
families/{familyId}/parents/{parentUid}     { joinedAt }           // members (equal co-parents)
families/{familyId}/children/{childId}      { name, joinedAt,
                                              totalSessions, totalQuestions, totalCorrect,
                                              lastActiveAt, byTopic{ [topic]: {sessions,questions,correct} } }
families/{familyId}/children/{childId}/sessions/{sessionId}
                                            { topic, completedAt, totalQuestions,
                                              correctFirstTry, finalScore,
                                              corrected, solvedWithHelp, hintsUsed,
                                              durationSec, syncedAt }
pairingCodes/{code}                         { familyId, active }   // kid device join
parentInvites/{code}                        { familyId, active }   // co-parent join
parentIndex/{parentUid}                     { familyId }           // "my family" pointer
```

### Co-parents (two equal parents per family)
- A family has one **creator** (`ownerUid`) plus any number of **equal co-parents**,
  each a doc under `families/{id}/parents/{uid}`. Membership = owner OR a parents doc.
- **Stable code, like the pairing code**: `parentCode` is minted **once** at
  family creation (backfilled for older families in `ensureParentCode`) and lives
  on the family doc + a get-only `parentInvites/{code}` lookup. "Invite a
  co-parent" just displays it — it does NOT regenerate on each tap.
- **Child writes**: allowed for the kid's own device (`uid == childId`) **OR any
  family member** (parent). This supports a shared phone / one-device testing
  (Firebase has one auth user per device, so a device signed in as a parent
  couldn't otherwise write kid data). Kids are never members, so a kid still only
  writes its own child doc. Session **delete** is allowed the same way — used by
  the per-child **Reset progress** (`resetChild`: delete session docs + zero the
  aggregate, keep identity) and **Remove child** (`removeChild`: delete sessions
  + the child doc) actions. Both cloud-only; the device's local history is
  untouched. (Child-doc delete is covered by the member `write` rule, so no extra
  rule beyond the session-delete one Reset already needs.)
- **Join by invite code**: the co-parent enters it → writes their `parents/{uid}`
  doc carrying the code as `invite`. The **security rule verifies the code** via
  `get()`
  (`validParentInvite`), so knowing the familyId isn't enough for parent access —
  stronger than the kid join. No Cloud Function.
- **Lookup**: `parentIndex/{uid}` points a parent at their family in one read;
  `getFamilyForParent` falls back to the owner query and backfills the pointer, so
  **pre-existing families keep working with no migration**.
- **No auto-create**: a signed-in parent with no family sees a **Create / Join**
  chooser (`FamilySetup`) instead of silently creating an empty family.

**Two things changed from the original plan — remember these:**
1. **No `devices` subcollection.** The child *is* the device (`childId == uid`).
2. **No separate `summary` document.** The rolling aggregate lives **ON the child
   doc** (a valid 4-segment path). The original plan's `.../children/{childId}/summary`
   is a **5-segment = collection** path and is an invalid document ref — writing
   to it silently failed and the dashboard threw. This was a real bug; the fix
   was to merge the aggregate onto the child doc. Do not reintroduce a `summary`
   subdoc.

### Pairing / join — CLIENT-SIDE (no Cloud Function)
The original spec called for a `joinFamily` Cloud Function; it was built
**client-side instead** — no Blaze/Functions needed. Security comes from:
- `familyId` is an unguessable Firestore auto-id.
- `pairingCodes/{code}` is **get-only, never listable** (rules), so codes can't be
  enumerated — you can only resolve a code you already know.
- The kid device writes only its own child doc (`uid == childId`).

Flow: `joinFamily(code, uid, name)` → `getDoc(pairingCodes/{code})` → resolve
`familyId` → `setDoc(families/{familyId}/children/{uid}, {joinedAt, name})`.

### Cost model
Dashboard open = one `getDocs(children)` + one small recent-sessions query per
child (limit 5). Kid session finish = 1 session doc + 1 merge onto the child doc
(~2 writes). Well inside the Firestore free tier for a long time.

---

## File map

**Firebase layer — `lib/firebase/`**
- `index.ts` — init. `initializeApp` (guarded), `initializeAuth` with
  `getReactNativePersistence(AsyncStorage)`, `initializeFirestore(app, {experimentalForceLongPolling: true})`. Exports `auth`, `db`. No analytics (COPPA). apiKey is public/safe.
- `auth.ts` — `signIn`, `signUp`, `signOut`, `resetPassword`, `ensureSignedInUid()` (anonymous), `authErrorKey(e)` → i18n key under `parentAuth.errors.*`.
- `family.ts` — `Family`, `randomCode()` (charset `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, 6 chars), `uniqueCode`, `getFamilyForOwner`, `createFamily`, `ensureFamily`, `updateChildName`, `InvalidCodeError`, `joinFamily`.
- `sync.ts` — `maybeSyncSession(s)` (fire-and-forget on session finish if linked), `writeSession` (session doc + aggregate merge onto child doc), `backfillSessions` (first-link local-history upload, guarded by child `totalSessions > 0`).
- `dashboard.ts` — `loadDashboard(familyId)` → `ChildProgress[]`.

**Hooks — `hooks/`**
- `useDeviceRole.tsx` — `'unset' | 'child' | 'parent'` (persisted).
- `useFamilyLink.tsx` — `{hydrated, link, linked, setLink}`, `FamilyLink = {familyId, childId, name?}`.
- `useAuthUser.tsx` — `onAuthStateChanged` → `{user, initializing}`.
- `useFamily.tsx` — `useFamily(ownerUid)` → `{family, loading, error}` (ensureFamily).
- `useDashboard.tsx` — `useDashboard(familyId)` → `{children, loading, error, reload}`.

**UI**
- `components/panels/ParentPanel.tsx` — root: initializing→spinner; no/anon user→`<ParentAuthForm>`; else `<SignedInParent>` (dashboard + family-code toggle + sign out).
- `components/panels/parent/ParentAuthForm.tsx` — signin / signup / **reset** modes; eye toggle; "continue as child" escape.
- `components/panels/parent/ParentDashboard.tsx` — per-child cards (sessions/questions/accuracy, per-topic rows, recent sessions), refresh spinner.
- `components/panels/parent/FamilyCode.tsx` — presentational big code.
- `app/connect.tsx` — "Connect to a parent": name + code → join; connected state lets the child edit their name / disconnect.
- `app/grown-ups.tsx` — gated grown-ups menu (become parent, connect, help). Dev-only "Switch to parent" when already linked.
- `components/panels/MainPanel/MainPanel.tsx` — gear entry (gated for kids only); personalized greeting from `link.name`.

**Wiring / infra**
- `app/_layout.tsx` — providers: `DeviceRoleProvider > FamilyLinkProvider > …`; `RoleGate` overlay.
- `lib/storage/index.ts` — `deviceRoleStore`, `familyLinkStore`.
- `firestore.rules` — security rules (uncommitted, undeployed).
- `__mocks__/firebase.js` + `jest.config.js` `moduleNameMapper` — jest can't parse Firebase ESM, so `firebase/(app|auth|firestore)` is mocked. **Note:** the mock does NOT validate path segment counts, so the 5-segment `summary` bug passed tests — verify Firestore paths by hand, not just via jest.

---

## Key decisions & gotchas (why things are the way they are)

- **Parental gate**: kids get a math gate before the grown-ups menu; a **signed-in
  parent (non-anonymous) or a `__DEV__` build skips it** — re-challenging an
  authenticated adult is pointless. `isGrownUp = !!user && !user.isAnonymous`.
- **Parent preview doesn't record**: when a signed-in (non-anonymous) parent
  practices via "Open practice mode", it's a preview — `isSignedInParent()` gates
  it out of **local history AND cloud sync** (operations + clock), and the
  **History link is hidden** on the Operations & Clock pages. Only an anonymous
  kid device records/syncs. Corollary: to test kid sync, use a device that is NOT
  signed in as a parent.
- **childId stability**: stored in the family link **at join time** (not read from
  `auth.currentUser` at practice time) — an auth change mid-session used to
  mismatch and write to the wrong/empty child. All syncs use `link.childId`.
- **Backfill idempotency**: guarded on the child doc's `totalSessions > 0` so a
  disconnect→reconnect doesn't double-count history.
- **COPPA**: parent account = consent; kid stays anonymous, **no PII**; only
  session *summaries* stored (topic/score/time), never answer content; no
  kid-facing analytics SDK.
- **Login persistence**: `getReactNativePersistence(AsyncStorage)` — parents stay
  signed in across launches (they dislike re-login).
- **RN Firestore**: `experimentalForceLongPolling: true` is required or reads hang.

---

## How to resume in a new terminal

1. **Where you are:** `cd /Users/yousef/projects/mathpad-workspace/mathpad`,
   `git branch` → should be `parent-mode`. `git status` shows the uncommitted
   batch listed above.
2. **Sanity checks:** `npx tsc --noEmit` (clean) and `npx jest` (228 tests
   passing at last run).
3. **Run the app (iOS first, per user pref):** `npx expo run:ios`.
4. **Test the parent loop:** on one device pick "I'm a parent" → sign up → note
   the pairing code. On the kid device: grown-ups → Connect to a parent → enter
   name + code → do a practice session → parent dashboard → refresh → session
   appears. Reset-password: sign-in form → "Forgot password?" → email-only →
   Send reset link.
5. **Deploy rules:** Firebase console → Firestore → Rules → paste
   `firestore.rules` → Publish. Then re-test the loop under rules.
6. **Commit only after the user tests and says so.** Suggested message style
   matches existing history: `Parent Mode M1: <slice>`.

**Constraints to honor** (also in auto-memory):
- No commit until the user has tested on-device and says "commit."
- Default test instructions to **iOS** (`npx expo run:ios`).
- `google-service-account.json` is a secret — never commit. Firebase `apiKey` is
  public and safe to commit.

---

## Hardening (later)

- **Stable child identity across reinstall.** `childId` is the anonymous uid,
  stored in the family link at join. Rename and disconnect→reconnect preserve
  progress, but **reinstall / clear-data** wipes the uid → a fresh empty child
  (old one orphaned on the dashboard). To block that casual reset, key the child
  on a reinstall-stable **device id** (`expo-application`: `getAndroidId()` /
  `getIosIdForVendorAsync()`) so re-entering the code resolves to the same child.
  Needs a native module + rebuild. Not cryptographic — a kid owns the device and
  can ultimately tamper; this only stops the trivial reinstall dodge. **Security
  rules are the higher priority** than kid anti-tamper.

## Later milestones (out of scope for M1)

Multiple child profiles · assignments · prizes/rewards · subscription/billing ·
push notifications · realtime dashboard · Clock session sync · Apple/Google sign-in.
</content>
</invoke>
