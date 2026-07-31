# Parent Pro — Family Slots (child linking redesign)

_Status: SPEC — agreed 2026-07-31, not yet implemented._

Replaces the old family-linking model (one shared pairing code + kid devices
that self-create child docs keyed by their anonymous uid, with a soft,
count-based, easily-bypassed 5-child cap) with a **fixed slot pool**: a family
is born with a fixed number of child codes, the parent assigns them to named
children, and a device claims a code exactly once.

## Why

- **The cap becomes structural, not counted.** Only N codes ever exist → the
  family physically cannot exceed N children. No runtime `count()` at join, so
  no permission-denied (the bug that blocked joins), and **no Cloud Function is
  needed for the cap** — the rules enforce it.
- **Stable child identity.** The child id is the *slot* (tied to the code), not
  the device's anonymous uid, so a reinstall re-uses the same child → no
  orphan/ghost children on the dashboard.
- **Parent-authoritative.** The child device only ever *consumes* a pre-made
  slot. Its Firebase writes are limited to: the one-time **claim**, a self-scoped
  **device pointer**, and its own **practice sessions**. It never creates
  children or codes, and never edits family structure.

## The three states (per slot/code)

- **free** — code minted at family creation, not assigned to any child.
- **pending** — parent assigned a name; a child doc exists; no device has joined.
- **linked** — a device claimed it; its uid is stored. Locked: no other device
  can use it.

"free" = neither pending nor linked. A code that has been shared is always
`pending`; it can be claimed exactly once, after which it is `linked`.

## Data model

```
families/{familyId}
  { ownerUid, parentCode, subscription?, createdAt }
  # NOTE: no single `pairingCode` field anymore.

families/{familyId}/children/{childId}          # childId = the stable slot id
  { name,                                        #   parent-set label (dashboard)
    status: 'pending' | 'linked',
    deviceUid: string | null,                    #   the claiming device (anon uid)
    joinedAt }
  └─ sessions/{sessionId}        { ... }         # written by the linked device
  └─ targets|rewards|awards|redemptions|examResults   # parent-authoritative (unchanged)

pairingCodes/{code}                              # N minted at family creation
  { familyId,
    childId: string | null,                      #   set when assigned
    status: 'free' | 'assigned' }

childDevices/{deviceUid}                         # reverse index (kid's own pointer)
  { familyId, childId }
```

- **N = 5** codes minted at family creation. None minted later; removing a child
  returns its code to `free` for reuse.
- **`childDevices/{deviceUid}`** is the reverse index the rules need: a family-doc
  read (for the live subscription flag) and exam listing must answer "is this uid
  a linked child of this family?", and rules can't query "the child whose
  deviceUid == uid". The kid writes this pointer once, at claim.
- **Name:** the child doc's `name` is the **parent's** label — the only name the
  dashboard shows. The kid's own display name (Option A) lives **only in the
  device's local store** and never touches Firebase.

## Flows

### 1. Create family
Mint **5** `pairingCodes` (all `free`, `childId: null`) alongside the family doc.
The co-parent `parentCode` is unchanged (co-parents remain uncapped — separate
concern).

### 2. Parent "Add child" (dashboard)
1. Find a `free` code. **None left → "Family is full (max 5)."**
2. Create the child doc `{ name, status: 'pending', deviceUid: null }`.
3. Update the code `{ childId, status: 'assigned' }`.
4. Show the parent the **code + join instructions**.

### 3. Child joins → "Start practice"
1. Enter the code → resolve `pairingCodes/{code}` → `familyId`, `childId`.
2. Read the child doc; require `status == 'pending'`. If already `linked` →
   **"This code is already in use."**
3. **Claim** (rules-gated, single-use): update the child doc
   `status: 'linked'`, `deviceUid: <uid>`.
4. Write the reverse pointer `childDevices/{uid} = { familyId, childId }`.
5. Fetch the parent-set `name` → seed the **local** display name. Save
   `{ familyId, childId }` to the local family link.
6. Show a short welcome + a primary **"Start practice"** button → practice home.
   (No confirmation dead-end.)

### 4. Parent re-issues a device (lost / reinstalled)
Dashboard action on a `linked` child: revert `status: 'pending'`,
`deviceUid: null`. The same kid rejoins with the same code (same childId, so
history is preserved). The old device auto-unlinks on next launch (see #7).

### 5. Parent removes a child
Dashboard action: delete the child doc (+ its sessions/subcollections) and return
the code to `free` (`childId: null`). Frees the slot for a different kid.

### 6. Child renames — local only (Option A)
The kid can edit their display name; it is stored in the **device local store**
only. No Firebase write. The dashboard keeps showing the parent's label. (Parent
can rename the child from the dashboard — a member write to `name`.)

### 7. Auto-unlink on the child device
There is **no child-side disconnect** — disconnection is a parent action (#4/#5).
The existing `useVerifyLink` (launch + foreground) checks the kid's linked child
doc: if it's gone, or `deviceUid != uid` / `status == 'pending'`, it clears the
local link (and best-effort deletes the stale `childDevices/{uid}` +
`children/{childId}` local state). So parent-driven disconnect "just works" on the
kid's side.

## Security rules (where the cap + single-use actually live)

Helper: `isMember(familyId)` unchanged (owner or a `parents/` doc).
New helper: `linkedChild(familyId) = get(/childDevices/$(uid())).data.familyId == familyId`
(replaces the old `isChildOf` `exists(children/{uid})` check).

```
pairingCodes/{code}
  get:    signedIn()                              # resolve a code (never listed)
  list:   false
  create: familyOwner(request.resource.data.familyId) == uid()   # minted at family creation
  update: isMember(resource.data.familyId)        # assign / free on remove
  delete: familyOwner(resource.data.familyId) == uid()

families/{familyId}/children/{childId}
  get:    isMember(familyId)
          || resource.data.deviceUid == uid()     # my own linked child
          || resource.data.status == 'pending'    # a joinable slot (found via the secret code)
  create: isMember(familyId)                       # parent assigns: status 'pending', deviceUid null
          && request.resource.data.status == 'pending'
          && request.resource.data.deviceUid == null
  update:
    # CLAIM (kid, single-use): pending -> linked, stamping OWN uid, name unchanged
    ( resource.data.status == 'pending'
      && request.resource.data.status == 'linked'
      && request.resource.data.deviceUid == uid()
      && request.resource.data.name == resource.data.name )
    # PARENT: rename, or re-issue (linked -> pending, clear deviceUid)
    || isMember(familyId)
  delete: isMember(familyId)

  children/{childId}/sessions/{id}                 # (and targets/rewards/awards/redemptions/examResults)
    read:   isMember(familyId)
            || get(.../children/$(childId)).data.deviceUid == uid()
    write:  isMember(familyId)                      # parent-authoritative subcollections
            || ( <this is sessions/examResults> && get(.../children/$(childId)).data.deviceUid == uid() )

childDevices/{deviceUid}
  read:   uid() == deviceUid
  create: uid() == deviceUid                        # self-scoped
          && get(/families/$(request.resource.data.familyId)/children/$(request.resource.data.childId))
               .data.deviceUid == uid()             # ...and only if I actually claimed that child
  update: false
  delete: uid() == deviceUid                        # cleanup after unlink

families/{familyId}                                 # kid reads the live subscription flag
  read:   ... existing member checks ... || linkedChild(familyId)
```

Key properties:
- **Single-use:** the claim only succeeds `pending -> linked`; a second device
  sees `linked` and is rejected. 20 devices with the code → only the first wins.
- **Cap:** only 5 codes exist and the parent can only assign `free` ones → ≤5
  children, enforced structurally. No count, no Cloud Function.
- **No structural child writes:** the kid can only flip its slot to `linked` with
  its own uid, write its own `childDevices` pointer, and write its own sessions.

## What gets removed

- The old **`joinFamily`** (kid types a name, self-creates a child doc keyed by
  uid) and the single shared `pairingCode`.
- The child-side **`leaveFamily`** / "Disconnect this device" button (committed
  earlier for the old model) — superseded by parent re-issue/remove.
- **`createChildProfile`**'s count-based cap + `countChildren` + `FamilyFullError`
  as a *count* error → replaced by "no free code".
- Child-written **`updateChildName`** → the kid's name is local (Option A); rename
  is parent-only on Firebase.
- The old `isChildOf` (`exists(children/{uid})`) → `linkedChild` via `childDevices`.
- The follow-up **"server-authoritative cap (Cloud Function)"** TODO — no longer
  needed; the rules enforce it.

## Migration

Parent Pro has not shipped publicly (TestFlight only), so there is essentially no
production family data. **Discard existing test families** and everyone starts on
the new model — no migration code.

## Non-goals / notes

- **Co-parents remain uncapped** (unlimited via the invite code) — unchanged and
  out of scope here.
- Practice session writes still happen from the kid device (that's the whole
  point of the dashboard); "no child writes" means no *structural* writes.
- The subscription mirror on `families/{id}.subscription` (client + Cloud
  Function) is unchanged; kids read it via `linkedChild`.

## Implementation checklist

- `lib/firebase/family.ts` — `createFamily` mints 5 codes; new `addChild`
  (assign), `resolveCode`, `claimSlot` (join), `reissueChild`, `removeChild`,
  `renameChild` (parent). Delete `joinFamily`, `leaveFamily`, count-based
  `createChildProfile`/`countChildren`.
- `firestore.rules` — pairingCodes, children (claim/assign/reissue/rename),
  childDevices, sessions/subcollections via `deviceUid`, `linkedChild`.
- `app/connect.tsx` — enter code → claim → **Start practice**; remove name entry
  + disconnect button.
- Kid **local name** store + a "change my name" control (local only).
- `components/panels/parent/ParentDashboard.tsx` — Add child (name → show code),
  per-child **Re-issue** + **Remove**, slot/status display (free/pending/linked),
  "Family is full" when no free code.
- `hooks/useFamilyLink` — store `{ familyId, childId }`; `useVerifyLink` — clear
  the link when the child doc is gone / `deviceUid != uid` / `status == 'pending'`.
- Remove the dead cap TODO from `docs/parent-pro-status.md` / memory.
