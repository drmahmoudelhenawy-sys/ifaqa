package com.ifaqa.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject

class WirdWidgetWhite : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_wird_white)

            try {
                val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)

                // Hifz
                val hifzJson = prefs.getString("user_wird_hifz", null)
                if (hifzJson != null) {
                    val data = JSONObject(hifzJson)
                    val surah = data.optString("surahName", "---")
                    val juz = data.optInt("juzNumber", 1)
                    val page = data.optInt("pageNumber", 1)

                    views.setTextViewText(R.id.hifz_surah, "سورة $surah")
                    views.setTextViewText(R.id.hifz_juz, "جزء $juz")
                    views.setTextViewText(R.id.hifz_page, "صفحة $page")

                    val intent = createDeepLinkIntent(context, "quran", surah, page)
                    val pendingIntent = PendingIntent.getActivity(context, 101, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                    views.setOnClickPendingIntent(R.id.section_hifz, pendingIntent)
                }

                // Revision data (Near/Far)
                val nearJson = prefs.getString("user_wird_rev_near_data", null)
                if (nearJson != null) {
                    val data = JSONObject(nearJson)
                    views.setTextViewText(R.id.rev_near_surah, "سورة " + data.optString("surahName"))
                    views.setTextViewText(R.id.rev_near_juz, "جزء " + data.optInt("juzNumber"))
                    views.setTextViewText(R.id.rev_near_page, "صفحة " + data.optInt("pageNumber"))
                }

                val farJson = prefs.getString("user_wird_rev_far_data", null)
                if (farJson != null) {
                    val data = JSONObject(farJson)
                    views.setTextViewText(R.id.rev_far_surah, "سورة " + data.optString("surahName"))
                    views.setTextViewText(R.id.rev_far_juz, "جزء " + data.optInt("juzNumber"))
                    views.setTextViewText(R.id.rev_far_page, "صفحة " + data.optInt("pageNumber"))
                }

                val mainIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                val mainPending = PendingIntent.getActivity(context, 0, mainIntent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                views.setOnClickPendingIntent(R.id.wird_widget_root, mainPending)

            } catch (e: Exception) {
                e.printStackTrace()
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun createDeepLinkIntent(context: Context, type: String, surah: String, page: Int): Intent {
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)!!
            intent.putExtra("ACTION_TYPE", type)
            intent.putExtra("SURAH_NAME", surah)
            intent.putExtra("PAGE_NUMBER", page)
            intent.data = Uri.parse("ifaqa://wird/$type/$surah/$page")
            return intent
        }
    }
}
