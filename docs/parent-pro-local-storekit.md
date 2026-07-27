# Local StoreKit testing (simulator, no App Store Connect)

`MathPad.storekit` (repo root) defines the products locally — the Operations
bundle, Clock, and the **Parent Pro** subscription ($7.99/mo, **3-day free
trial**, Family Sharing). With it you can exercise subscribe / renew / cancel /
expire / refund in the **simulator**, instantly, before App Store Connect exists.

## Wire it into Xcode (one-time)
1. Generate/open the iOS project: `npx expo run:ios` once (creates `ios/`), then
   open `ios/*.xcworkspace` in Xcode.
2. **Add the file:** File → *Add Files to "…"* → pick `MathPad.storekit` at the
   repo root (untick *Copy items* so it stays the repo copy).
3. **Point the scheme at it:** Product → Scheme → *Edit Scheme…* → **Run** →
   **Options** → **StoreKit Configuration** → select `MathPad.storekit`.
4. Run on a simulator. Purchases are local — free, no Apple ID, no App Store
   Connect.

> `ios/` is prebuild-generated, so after `expo prebuild --clean` you re-do steps
> 2–3 (the `.storekit` file itself persists in the repo).

## Test every scenario (Transaction Manager)
While the app runs in Xcode: **Debug → StoreKit → Manage Transactions**. From
there you can, per transaction:
- **Subscribe / Start trial** — tap the paywall's *Start your 3-day free trial* →
  parent unlocks, kid devices unlock (live).
- **Renew** — force a renewal (or set an accelerated renewal rate in the
  `.storekit` editor → *Editor* menu).
- **Cancel / Expire** — *Disable Auto-Renew* or *Expire* the transaction → on the
  next app launch the parent's reconcile flips it → **parent + family blocked**.
- **Refund** — *Refund* a transaction → same revoke path.

## Notes
- The parent device blocks/unblocks on **app launch** (StoreKit reconcile);
  relaunch to see a forced expire/refund take effect.
- Kid devices read `families/{id}.subscription` via a **live listener**, so they
  flip the instant the family doc updates — which happens when the parent app
  runs (client mirror) or, in production, via the Cloud Function webhook.
- The best-effort `syncParentProSubscription` call just no-ops locally (the
  function isn't reachable) — the client mirror covers propagation here.
