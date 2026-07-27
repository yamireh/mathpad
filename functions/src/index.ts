/**
 * Parent Pro subscription — server-authoritative entitlement (pricing skill
 * §0.1, Slice 3c). Apple is the source of truth for payment; this function is
 * the only trusted writer of `families/{id}.subscription`, which every parent
 * and kid device reads.
 *
 *  - `syncParentProSubscription` (callable): the parent app calls it after a
 *    purchase and on launch with the StoreKit `transactionId`. It queries the
 *    App Store Server API, computes active/expiresAt, writes the family doc,
 *    and records the transaction→family mapping.
 *  - `appStoreNotifications` (HTTPS webhook): Apple's Server Notifications V2
 *    (renew / cancel / expire / refund). It maps the event to a family and
 *    re-syncs — so a lapse revokes access even when no app is open.
 *
 * Config (App Store Connect → Users and Access → Integrations → In-App Purchase
 * key), set with the Firebase CLI:
 *   firebase functions:secrets:set APPLE_PRIVATE_KEY   # the .p8 file contents
 *   firebase functions:config is replaced by params — set the rest as env:
 *   APPLE_KEY_ID, APPLE_ISSUER_ID, APPLE_BUNDLE_ID, APPLE_ENV (Sandbox|Production)
 */
import { AppStoreServerAPIClient, Environment } from '@apple/app-store-server-library';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

initializeApp();
const db = getFirestore();

const PARENT_PRO_PRODUCT_ID = 'com.mc.mathpad.parentpro';

const APPLE_KEY_ID = defineString('APPLE_KEY_ID');
const APPLE_ISSUER_ID = defineString('APPLE_ISSUER_ID');
const APPLE_BUNDLE_ID = defineString('APPLE_BUNDLE_ID', { default: 'com.mc.mathpad' });
const APPLE_ENV = defineString('APPLE_ENV', { default: 'Sandbox' });
const APPLE_PRIVATE_KEY = defineSecret('APPLE_PRIVATE_KEY');

function apiClient(): AppStoreServerAPIClient {
  const env =
    APPLE_ENV.value() === 'Production' ? Environment.PRODUCTION : Environment.SANDBOX;
  return new AppStoreServerAPIClient(
    APPLE_PRIVATE_KEY.value(),
    APPLE_KEY_ID.value(),
    APPLE_ISSUER_ID.value(),
    APPLE_BUNDLE_ID.value(),
    env,
  );
}

/**
 * Decode a JWS payload WITHOUT verifying the signature. Safe ONLY for data that
 * already arrived over Apple's authenticated App Store Server API (HTTPS). For
 * the raw webhook we use this only to find *which* subscription to re-query —
 * the authoritative check is the subsequent authenticated API call.
 */
function decodeJws<T>(jws: string): T {
  const [, payload] = jws.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
}

interface TxInfo {
  productId: string;
  originalTransactionId: string;
  transactionId?: string;
  expiresDate?: number;
}

/** Apple subscription status codes that grant access: active or grace period. */
const ACTIVE_STATUSES = new Set([1, 4]);

/**
 * Query Apple for the transaction's subscription status, then write the family
 * doc + the transaction→family mapping (for the webhook).
 */
async function syncFromTransaction(
  transactionId: string,
  familyId: string,
): Promise<void> {
  const statuses = await apiClient().getAllSubscriptionStatuses(transactionId);
  let active = false;
  let expiresAt: string | null = null;
  let originalTransactionId = '';

  for (const group of statuses.data ?? []) {
    for (const last of group.lastTransactions ?? []) {
      if (!last.signedTransactionInfo) continue;
      const tx = decodeJws<TxInfo>(last.signedTransactionInfo);
      if (tx.productId !== PARENT_PRO_PRODUCT_ID) continue;
      originalTransactionId = tx.originalTransactionId;
      if (last.status != null && ACTIVE_STATUSES.has(last.status)) {
        active = true;
        expiresAt = tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null;
      }
    }
  }

  await db
    .doc(`families/${familyId}`)
    .set({ subscription: { active, expiresAt } }, { merge: true });
  if (originalTransactionId) {
    await db
      .doc(`subscriptionOwners/${originalTransactionId}`)
      .set({ familyId }, { merge: true });
  }
  logger.info('parentPro synced', { familyId, active, expiresAt });
}

/** Called by the parent app after a purchase (and on launch) to sync entitlement. */
export const syncParentProSubscription = onCall(
  { secrets: [APPLE_PRIVATE_KEY] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const transactionId = (req.data as { transactionId?: string })?.transactionId;
    if (!transactionId) {
      throw new HttpsError('invalid-argument', 'transactionId is required.');
    }
    const idx = await db.doc(`parentIndex/${uid}`).get();
    const familyId = idx.get('familyId') as string | undefined;
    if (!familyId) {
      throw new HttpsError('failed-precondition', 'No family for this parent.');
    }
    await syncFromTransaction(transactionId, familyId);
    return { ok: true };
  },
);

/** App Store Server Notifications V2 webhook — renew / cancel / expire / refund. */
export const appStoreNotifications = onRequest(
  { secrets: [APPLE_PRIVATE_KEY] },
  async (request, response) => {
    try {
      const signedPayload = (request.body as { signedPayload?: string })?.signedPayload;
      if (!signedPayload) {
        response.status(400).send('missing signedPayload');
        return;
      }
      // Unverified decode purely to find which subscription this concerns — the
      // authoritative status comes from the authenticated API re-query below.
      const notif = decodeJws<{ data?: { signedTransactionInfo?: string } }>(
        signedPayload,
      );
      const signedTx = notif.data?.signedTransactionInfo;
      if (!signedTx) {
        response.status(200).send('ignored');
        return;
      }
      const tx = decodeJws<TxInfo>(signedTx);
      if (tx.productId !== PARENT_PRO_PRODUCT_ID) {
        response.status(200).send('ignored');
        return;
      }
      const owner = await db
        .doc(`subscriptionOwners/${tx.originalTransactionId}`)
        .get();
      const familyId = owner.get('familyId') as string | undefined;
      if (!familyId) {
        // Not mapped yet (event before the app's first sync) — the app's
        // callable will establish it. Ack so Apple doesn't retry forever.
        response.status(200).send('unmapped');
        return;
      }
      await syncFromTransaction(
        tx.transactionId ?? tx.originalTransactionId,
        familyId,
      );
      response.status(200).send('ok');
    } catch (err) {
      logger.error('appStoreNotifications error', err);
      response.status(500).send('error');
    }
  },
);
