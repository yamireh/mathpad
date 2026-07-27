# Cloud Functions — Parent Pro subscription (Slice 3c)

Server-authoritative subscription entitlement. Apple is the source of truth for
payment; these functions are the only trusted writer of
`families/{id}.subscription`, which every parent and kid device reads.

- **`syncParentProSubscription`** (callable) — the parent app calls it after a
  purchase and on launch with the StoreKit `transactionId`. Queries the App
  Store Server API, computes active/expiresAt, writes the family doc, and records
  the `originalTransactionId → familyId` mapping for the webhook.
- **`appStoreNotifications`** (HTTPS webhook) — App Store Server Notifications V2
  (renew / cancel / expire / refund). Maps the event to a family and re-syncs, so
  a lapse revokes access even with no app open.

## Configure (App Store Connect → Users and Access → Integrations → In-App Purchase key)

Generate an **In-App Purchase key** (.p8), note the **Key ID** and **Issuer ID**, then:

```bash
firebase functions:secrets:set APPLE_PRIVATE_KEY   # paste the .p8 file contents
# and set the (non-secret) params, e.g. in functions/.env or the console:
#   APPLE_KEY_ID=XXXXXXXXXX
#   APPLE_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#   APPLE_BUNDLE_ID=com.mc.mathpad      # confirm your real bundle id
#   APPLE_ENV=Sandbox                    # Sandbox for testing, Production for live
```

## Deploy

```bash
cd functions && npm install
firebase deploy --only functions
```

## Point Apple at the webhook

App Store Connect → your app → **App Information → App Store Server Notifications
→ Production/Sandbox URL** = the deployed `appStoreNotifications` URL
(`https://<region>-mathpen-6869d.cloudfunctions.net/appStoreNotifications`),
**Version 2**.

## After it's live — tighten the rule

Once the function is deployed and the app calls it, the client-side family-doc
mirror (`setFamilySubscription` in `ParentPanel`) becomes redundant. Lock the
`families/{id}` rule so **clients can't write `subscription`** (only the admin
Cloud Function can), then drop the client mirror.
