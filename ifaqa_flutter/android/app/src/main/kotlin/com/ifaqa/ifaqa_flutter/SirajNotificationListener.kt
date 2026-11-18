package com.ifaqa.ifaqa_flutter

import android.app.NotificationManager
import android.os.PowerManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Watches system notifications so the Siraj overlay can dodge heads-up
 * banners instead of being covered by them.
 *
 * PLATFORM LIMIT (why this exists): a heads-up banner is drawn by
 * SystemUI *above* every app window, including a
 * `TYPE_APPLICATION_OVERLAY` window — no window type available to a
 * third-party app can draw over it. So when a banner (e.g. WhatsApp)
 * appears, the island underneath it is covered for a few seconds. The
 * fix is to move, not to fight the z-order: this listener reports
 * posted/removed notifications to [SirajOverlayService], which forwards
 * them to the Dart side; the Dart side shifts the island down below the
 * banner while it shows and moves it back when it is gone (see
 * `SirajOverlayShift` in `lib/siraj/siraj_state.dart`). The countdown is
 * never hidden.
 *
 * Only heads-up *candidates* are forwarded: high-importance (or
 * full-screen-intent) notifications from other apps, not ongoing ones,
 * while the screen is on. Low-importance notifications (which only land
 * in the shade) never move the island. The listener is a no-op while the
 * overlay is not showing (`SirajOverlayService.instance` is null then).
 *
 * Enabled by the user in system Settings (notification access), via the
 * Siraj settings screen ("فتح إعدادات الوصول للإشعارات"); see
 * `OVERLAY_NATIVE.md` §3d. The service runs in the app's own process,
 * so it talks to the overlay service through its static [instance]
 * instead of a broadcast.
 */
class SirajNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "SirajNotifListener"
    }

    override fun onNotificationPosted(
        sbn: StatusBarNotification,
        rankingMap: RankingMap,
    ) {
        if (!isHeadsUpCandidate(sbn, rankingMap)) return
        SirajOverlayService.instance?.onHeadsUpPosted()
    }

    override fun onNotificationRemoved(
        sbn: StatusBarNotification,
        rankingMap: RankingMap,
    ) {
        if (!isHeadsUpCandidate(sbn, rankingMap)) return
        // Another banner may still be up: only restore when no other
        // heads-up candidate remains in the shade.
        try {
            val stillUp = activeNotifications.any {
                it.key != sbn.key && isHeadsUpCandidate(it, rankingMap)
            }
            if (stillUp) return
        } catch (e: Exception) {
            Log.d(TAG, "activeNotifications check failed", e)
        }
        SirajOverlayService.instance?.onHeadsUpRemoved()
    }

    /**
     * True for a notification that can show as a heads-up banner over the
     * island: high importance (or a full-screen intent), from another
     * app, not ongoing, while the screen is on. Our own notifications
     * (the Siraj live capsule, the overlay's foreground notification)
     * never shift the island.
     */
    private fun isHeadsUpCandidate(
        sbn: StatusBarNotification,
        rankingMap: RankingMap,
    ): Boolean {
        if (sbn.packageName == packageName) return false
        if (sbn.isOngoing) return false
        val power = getSystemService(PowerManager::class.java)
        if (power != null && !power.isInteractive) return false
        if (sbn.notification.fullScreenIntent != null) return true
        val ranking = NotificationListenerService.Ranking()
        if (!rankingMap.getRanking(sbn.key, ranking)) return false
        return ranking.importance >= NotificationManager.IMPORTANCE_HIGH
    }
}
