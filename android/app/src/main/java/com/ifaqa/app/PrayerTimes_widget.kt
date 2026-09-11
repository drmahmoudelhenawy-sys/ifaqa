package com.ifaqa.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

class PrayerTimes_widget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.prayer_times_widget)
            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)

            try {
                // 1. Next Prayer Info
                val nextName = prefs.getString("next_prayer_name", "الفجر")
                val nextTimeMs = prefs.getString("next_prayer_time_ms", "0")?.toLong() ?: 0L
                
                views.setTextViewText(R.id.next_prayer_name, nextName)
                views.setTextViewText(R.id.prayer_status_text, "حان الآن موعد صلاة $nextName")

                // 2. Countdown Logic
                val diff = nextTimeMs - System.currentTimeMillis()
                if (diff > 0) {
                    val minutes = (diff / 1000 / 60) % 60
                    val hours = (diff / 1000 / 3600)
                    views.setTextViewText(R.id.countdown_timer, String.format("%02d:%02d", hours, minutes))
                }

                // 3. Grid Binding with Unique IDs
                val timingsJson = prefs.getString("ifaqa_prayer_times", null)
                if (timingsJson != null) {
                    val timings = JSONObject(timingsJson)
                    views.setTextViewText(R.id.time_fajr, timings.optString("Fajr"))
                    views.setTextViewText(R.id.time_shurooq, timings.optString("Sunrise"))
                    views.setTextViewText(R.id.time_dhuhr, timings.optString("Dhuhr"))
                    views.setTextViewText(R.id.time_asr, timings.optString("Asr"))
                    views.setTextViewText(R.id.time_maghrib, timings.optString("Maghrib"))
                    views.setTextViewText(R.id.time_isha, timings.optString("Isha"))
                }

                // Intent to open app
                val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                views.setOnClickPendingIntent(R.id.prayer_widget_root, pendingIntent)

            } catch (e: Exception) {
                e.printStackTrace()
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}