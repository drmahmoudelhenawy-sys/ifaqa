package com.ifaqa.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class QuranProgressWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_quran_progress)
            
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.quran_widget_container, pendingIntent)

            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val lastPage = prefs.getString("last_read_page", "1")
            views.setTextViewText(R.id.hifz_text, "آخر صفحة: $lastPage")

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
