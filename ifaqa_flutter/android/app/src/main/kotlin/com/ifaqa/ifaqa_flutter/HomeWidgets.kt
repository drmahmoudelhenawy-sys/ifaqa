package com.ifaqa.ifaqa_flutter

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
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
