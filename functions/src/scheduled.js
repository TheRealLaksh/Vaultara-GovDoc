import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION, FieldValue, Timestamp, db } from './runtime.js';

// Hourly housekeeping: expired shares lose access, spent invites disappear.
export const housekeeping = onSchedule({ region: REGION, schedule: 'every 60 minutes', timeoutSeconds: 300 }, async () => {
  const now = Timestamp.now();

  const shares = await db.collection('shares').where('expiresAt', '<=', now).limit(400).get();
  for (const share of shares.docs) {
    const data = share.data();
    const batch = db.batch();
    batch.delete(share.ref);
    batch.update(db.collection('documents').doc(data.docId), { sharedWithUids: FieldValue.arrayRemove(data.recipientUid) });
    await batch.commit().catch((e) => console.warn('share cleanup', share.id, e.message));
  }

  const invites = await db.collection('familyInvites').where('expiresAt', '<=', now).limit(400).get();
  const batch = db.batch();
  invites.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  const cutoff = Timestamp.fromMillis(Date.now() - 2 * 86400000);
  const limits = await db.collection('rateLimits').where('windowStart', '<', cutoff.toMillis()).limit(400).get();
  const cleanup = db.batch();
  limits.docs.forEach((d) => cleanup.delete(d.ref));
  await cleanup.commit();

  console.log(`housekeeping: ${shares.size} shares, ${invites.size} invites, ${limits.size} limits`);
});
