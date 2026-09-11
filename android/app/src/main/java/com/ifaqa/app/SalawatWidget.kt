package com.ifaqa.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class SalawatWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "com.ifaqa.app.INCREMENT_SALAWAT") {
            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val currentCount = prefs.getString("salawat_count", "0")?.toInt() ?: 0
            val newCount = currentCount + 1
            prefs.edit().putString("salawat_count", newCount.toString()).apply()

            // Update all widgets
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val ids = appWidgetManager.getAppWidgetIds(ComponentName(context, SalawatWidget::class.java))
            for (id in ids) {
                updateAppWidget(context, appWidgetManager, id)
            }
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_salawat)
            
            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val count = prefs.getString("salawat_count", "0")
            views.setTextViewText(R.id.salawat_count_text, count)

            // Intent to increment
            val intent = Intent(context, SalawatWidget::class.java).apply {
                action = "com.ifaqa.app.INCREMENT_SALAWAT"
            }
            val pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.salawat_click_area, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
