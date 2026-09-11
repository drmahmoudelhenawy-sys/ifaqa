package com.ifaqa.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class PrayersTrackerWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_prayers_tracker)
            
            // Simple launch app for now, background toggle needs more complex logic
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
            
            views.setOnClickPendingIntent(R.id.icon_fajr, pendingIntent)
            views.setOnClickPendingIntent(R.id.icon_dhuhr, pendingIntent)
            views.setOnClickPendingIntent(R.id.icon_asr, pendingIntent)
            views.setOnClickPendingIntent(R.id.icon_maghrib, pendingIntent)
            views.setOnClickPendingIntent(R.id.icon_isha, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
