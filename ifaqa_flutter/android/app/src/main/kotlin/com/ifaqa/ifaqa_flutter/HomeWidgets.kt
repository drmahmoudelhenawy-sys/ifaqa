package com.ifaqa.ifaqa_flutter

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.widget.RemoteViews
import es.antonborri.home_widget.HomeWidgetLaunchIntent
import es.antonborri.home_widget.HomeWidgetPlugin
import es.antonborri.home_widget.HomeWidgetProvider

// Home screen widgets. The Flutter side (lib/services/home_widget_sync.dart)
// writes the values below into HomeWidgetPreferences and asks for a redraw.

class PrayerTimesWidget : HomeWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray, widgetData: SharedPreferences) {
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_prayer).apply {
                setTextViewText(R.id.next_name, widgetData.getString("next_prayer_name", "الصلاة"))
                setTextViewText(R.id.next_time, widgetData.getString("next_prayer_time", "--:--"))
                setTextViewText(R.id.next_countdown, widgetData.getString("next_prayer_countdown", ""))
                setTextViewText(R.id.all_times, widgetData.getString("prayer_times_line", "افتح التطبيق لتحديث المواقيت"))
                setOnClickPendingIntent(R.id.widget_root, HomeWidgetLaunchIntent.getActivity(context, MainActivity::class.java))
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}

class QuranProgressWidget : HomeWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray, widgetData: SharedPreferences) {
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_quran).apply {
                setTextViewText(R.id.khatma_title, widgetData.getString("khatma_title", "وردي من القرآن"))
                setTextViewText(R.id.today_pages, widgetData.getString("quran_today", "0 صفحة اليوم"))
                setTextViewText(R.id.khatma_text, widgetData.getString("khatma_text", "ابدأ ختمة من التطبيق"))
                setProgressBar(R.id.khatma_progress, 100, widgetData.getInt("khatma_percent", 0), false)
                setOnClickPendingIntent(R.id.widget_root, HomeWidgetLaunchIntent.getActivity(context, MainActivity::class.java))
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}

/** Counts salawat right on the home screen; the app collects the pending taps on its next start or resume. */
class SalawatWidget : HomeWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray, widgetData: SharedPreferences) {
        for (id in appWidgetIds) {
            val tap = Intent(context, SalawatWidget::class.java).apply { action = ACTION_TAP }
            val pending = PendingIntent.getBroadcast(context, 0, tap, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val views = RemoteViews(context.packageName, R.layout.widget_salawat).apply {
                setTextViewText(R.id.salawat_count, widgetData.getInt("salawat_count", 0).toString())
                setOnClickPendingIntent(R.id.salawat_tap, pending)
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != ACTION_TAP) return
        val prefs = HomeWidgetPlugin.getData(context)
        prefs.edit()
            .putInt("salawat_count", prefs.getInt("salawat_count", 0) + 1)
            .putInt("salawat_pending", prefs.getInt("salawat_pending", 0) + 1)
            .apply()
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, SalawatWidget::class.java))
        onUpdate(context, manager, ids, prefs)
    }

    companion object {
        const val ACTION_TAP = "com.ifaqa.app.SALAWAT_TAP"
    }
}

/** A short zekr that rotates, plus a hint when morning or evening athkar are due. Tap opens the app. */
class AthkarWidget : HomeWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray, widgetData: SharedPreferences) {
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_athkar).apply {
                setTextViewText(R.id.athkar_due, widgetData.getString("athkar_due", "أذكار"))
                setTextViewText(R.id.athkar_text, widgetData.getString("athkar_text", "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ"))
                setTextViewText(R.id.athkar_count, widgetData.getString("athkar_count", ""))
                setOnClickPendingIntent(R.id.widget_root, HomeWidgetLaunchIntent.getActivity(context, MainActivity::class.java))
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}

/** Today's wird: done / total and the next task still to do. */
class WirdWidget : HomeWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray, widgetData: SharedPreferences) {
        for (id in appWidgetIds) {
            val done = widgetData.getInt("wird_done", 0)
            val total = widgetData.getInt("wird_total", 0)
            val views = RemoteViews(context.packageName, R.layout.widget_wird).apply {
                setTextViewText(R.id.wird_count, "$done/$total")
                setProgressBar(R.id.wird_progress, 100, if (total == 0) 0 else done * 100 / total, false)
                setTextViewText(R.id.wird_next, widgetData.getString("wird_next", "أضف وردك من التطبيق"))
                setOnClickPendingIntent(R.id.widget_root, HomeWidgetLaunchIntent.getActivity(context, MainActivity::class.java))
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}

/** The five prayers of today as dots; a check means it was prayed. */
class PrayersTrackerWidget : HomeWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray, widgetData: SharedPreferences) {
        val dots = listOf(
            "fajr" to R.id.p_fajr, "dhuhr" to R.id.p_dhuhr, "asr" to R.id.p_asr,
            "maghrib" to R.id.p_maghrib, "isha" to R.id.p_isha,
        )
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_prayers_tracker).apply {
                for ((key, viewId) in dots) {
                    val on = widgetData.getInt("prayer_done_$key", 0) == 1
                    setTextViewText(viewId, if (on) "✓" else "")
                    setInt(viewId, "setBackgroundResource", if (on) R.drawable.widget_dot_on else R.drawable.widget_dot_off)
                }
                setOnClickPendingIntent(R.id.widget_root, HomeWidgetLaunchIntent.getActivity(context, MainActivity::class.java))
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}

/**
 * Last radio station / now playing, with a play-pause button. Playback lives in Flutter, so the
 * button opens the app with ifaqa://radio/toggle and home_widget_sync.dart toggles the player.
 */
class RadioWidget : HomeWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray, widgetData: SharedPreferences) {
        val playing = widgetData.getBoolean("radio_playing", false)
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_radio).apply {
                setTextViewText(R.id.radio_title, widgetData.getString("radio_title", "افتح التطبيق للاستماع"))
                setTextViewText(R.id.radio_subtitle, widgetData.getString("radio_subtitle", ""))
                setImageViewResource(R.id.radio_icon, if (playing) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play)
                setOnClickPendingIntent(R.id.radio_toggle, HomeWidgetLaunchIntent.getActivity(context, MainActivity::class.java, Uri.parse("ifaqa://radio/toggle")))
                setOnClickPendingIntent(R.id.widget_root, HomeWidgetLaunchIntent.getActivity(context, MainActivity::class.java))
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}
