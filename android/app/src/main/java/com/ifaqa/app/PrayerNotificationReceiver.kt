package com.ifaqa.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class PrayerNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        PrayerNotificationManager.updateNotification(context)
    }
}
