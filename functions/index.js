const functions = require('firebase-functions/v2');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const APP_ID = 'ifaqa';

/**
 * Helper function to send notification to all registered device tokens
 */
async function sendBroadcastNotification(title, body, targetPage, announcementId) {
  try {
    // 1. Fetch active device tokens from Firestore
    const tokensSnap = await db
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('fcm_tokens')
      .where('active', '==', true)
      .get();

    if (tokensSnap.empty) {
      console.log('No registered FCM tokens found. Sending to topic "all_users" directly.');
      // Fallback to topic
      await messaging.send({
        topic: 'all_users',
        notification: {
          title: title || 'تطبيق إفاقة 🌿',
          body: body || ''
        },
        data: {
          targetPage: targetPage || 'home',
          announcementId: announcementId || ''
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'general_notifications',
            priority: 'max'
          }
        }
      });
      return { success: true, count: 0, via: 'topic' };
    }

    const tokens = tokensSnap.docs.map(doc => doc.data().token).filter(Boolean);
    console.log(`Sending push notification to ${tokens.length} devices...`);

    // 2. Batch send in chunks of 500 (FCM limit)
    const chunkSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = [];

    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: title || 'تطبيق إفاقة 🌿',
          body: body || ''
        },
        data: {
          targetPage: targetPage || 'home',
          announcementId: announcementId || ''
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'general_notifications',
            priority: 'max'
          }
        }
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      // Identify invalid / expired tokens for cleanup
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(chunk[idx]);
          }
        }
      });
    }

    // Also send to topic for devices registered directly via topic
    try {
      await messaging.send({
        topic: 'all_users',
        notification: { title, body },
        data: { targetPage: targetPage || 'home', announcementId: announcementId || '' }
      });
    } catch (e) {
      console.warn('Topic send notice:', e.message);
    }

    // Cleanup stale tokens in background
    if (invalidTokens.length > 0) {
      const batch = db.batch();
      for (const badToken of invalidTokens) {
        const tokenDocId = badToken.replace(/[/\\.#$\[\]]/g, '_');
        const ref = db
          .collection('artifacts')
          .doc(APP_ID)
          .collection('public')
          .doc('data')
          .collection('fcm_tokens')
          .doc(tokenDocId);
        batch.delete(ref);
      }
      await batch.commit().catch(() => {});
    }

    return { success: true, count: successCount, failed: failureCount };
  } catch (error) {
    console.error('Error dispatching push notification:', error);
    throw error;
  }
}

/**
 * 1. Instant Push Trigger:
 * Triggers immediately when an announcement document is created in Firestore
 */
exports.onAnnouncementCreated = onDocumentCreated(
  `artifacts/${APP_ID}/public/data/announcements/{announcementId}`,
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    // If it's scheduled for later, do not send immediately
    if (data.isScheduled === true || data.status === 'sent') {
      console.log(`Announcement ${event.params.announcementId} is scheduled for ${data.scheduledAt}. Skipping instant send.`);
      return;
    }

    console.log(`Sending instant push notification for announcement: ${event.params.announcementId}`);
    try {
      const result = await sendBroadcastNotification(
        data.title,
        data.body || data.text,
        data.targetPage,
        event.params.announcementId
      );

      await snap.ref.update({
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        deliveryReport: result
      });
      console.log('✅ Instant push successfully dispatched:', result);
    } catch (err) {
      console.error('❌ Failed to dispatch instant push notification:', err);
      await snap.ref.update({
        status: 'error',
        lastError: err.message
      });
    }
  }
);

/**
 * 2. Scheduled Cron Job:
 * Runs every 5 minutes to check for pending scheduled notifications that are due
 */
exports.checkScheduledNotifications = onSchedule('every 5 minutes', async (event) => {
  const now = new Date().toISOString();
  console.log(`Running scheduled notifications check at: ${now}`);

  const pendingSnaps = await db
    .collection('artifacts')
    .doc(APP_ID)
    .collection('public')
    .doc('data')
    .collection('announcements')
    .where('isScheduled', '==', true)
    .where('status', '==', 'pending')
    .where('active', '==', true)
    .get();

  if (pendingSnaps.empty) {
    console.log('No pending scheduled notifications.');
    return;
  }

  for (const docSnap of pendingSnaps.docs) {
    const data = docSnap.data();
    if (data.scheduledAt && data.scheduledAt <= now) {
      console.log(`Dispatching scheduled announcement: ${docSnap.id} (Scheduled at: ${data.scheduledAt})`);
      try {
        const result = await sendBroadcastNotification(
          data.title,
          data.body || data.text,
          data.targetPage,
          docSnap.id
        );

        await docSnap.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          deliveryReport: result
        });
        console.log(`✅ Scheduled announcement ${docSnap.id} sent:`, result);
      } catch (err) {
        console.error(`❌ Failed to send scheduled announcement ${docSnap.id}:`, err);
        await docSnap.ref.update({
          status: 'error',
          lastError: err.message
        });
      }
    }
  }
});
