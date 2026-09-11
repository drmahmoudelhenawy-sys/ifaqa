package com.ifaqa.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

object PrayerNotificationManager {

    const val CHANNEL_ID = "ifaqa_persistent_prayer_timer"
    const val NOTIFICATION_ID = 999
    const val ACTION_UPDATE_NOTIFICATION = "com.ifaqa.app.ACTION_UPDATE_PRAYER_NOTIFICATION"

    private val ARABIC_NAMES = mapOf(
        "Fajr" to "الفجر",
        "Dhuhr" to "الظهر",
        "Asr" to "العصر",
        "Maghrib" to "المغرب",
        "Isha" to "العشاء"
    )

    private val PRAYER_KEYS = listOf("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha")

    fun getPostAdhanWindowMs(prayerKey: String): Long {
        return if (prayerKey.equals("Fajr", ignoreCase = true)) {
            20 * 60 * 1000L // 20 minutes for Fajr
        } else {
            18 * 60 * 1000L // 18 minutes for regular prayers
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val existing = notificationManager.getNotificationChannel(CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "مواقيت الصلاة الدائمة",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "إشعار دائم يعرض العداد التنازلي والوقت المنقضي بعد الأذان"
                    setShowBadge(false)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                    setSound(null, null)
                    enableVibration(false)
                }
                notificationManager.createNotificationChannel(channel)
            }
        }
    }

    data class PrayerItem(
        val key: String,
        val arabicName: String,
        val timeMs: Long,
        val timeFormatted: String,
        val postAdhanWindowMs: Long
    )

    private fun parseTimeToTodayMs(timeStr: String, dayOffset: Int = 0): Long {
        val clean = timeStr.split(" ")[0].trim()
        val parts = clean.split(":")
        val hours = parts[0].toIntOrNull() ?: return 0L
        val minutes = parts[1].toIntOrNull() ?: return 0L

        val cal = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, dayOffset)
            set(Calendar.HOUR_OF_DAY, hours)
            set(Calendar.MINUTE, minutes)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        return cal.timeInMillis
    }

    private fun formatTimeDisplay(timeMs: Long): String {
        val sdf = SimpleDateFormat("h:mm a", Locale("ar"))
        return sdf.format(Date(timeMs))
    }

    fun updateNotification(context: Context) {
        try {
            createNotificationChannel(context)

            val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val timingsJsonStr = prefs.getString("ifaqa_prayer_times", null)

            if (timingsJsonStr.isNullOrBlank()) {
                return
            }

            val timingsJson = JSONObject(timingsJsonStr)
            val now = System.currentTimeMillis()

            val todayPrayers = mutableListOf<PrayerItem>()
            val tomorrowPrayers = mutableListOf<PrayerItem>()

            for (key in PRAYER_KEYS) {
                val timeStr = timingsJson.optString(key, "")
                if (timeStr.isNotBlank()) {
                    val arabicName = ARABIC_NAMES[key] ?: key
                    val windowMs = getPostAdhanWindowMs(key)

                    val todayMs = parseTimeToTodayMs(timeStr, 0)
                    if (todayMs > 0) {
                        todayPrayers.add(
                            PrayerItem(key, arabicName, todayMs, formatTimeDisplay(todayMs), windowMs)
                        )
                    }

                    val tomorrowMs = parseTimeToTodayMs(timeStr, 1)
                    if (tomorrowMs > 0) {
                        tomorrowPrayers.add(
                            PrayerItem(key, arabicName, tomorrowMs, formatTimeDisplay(tomorrowMs), windowMs)
                        )
                    }
                }
            }

            if (todayPrayers.isEmpty()) {
                return
            }

            // Sort by time
            todayPrayers.sortBy { it.timeMs }
            tomorrowPrayers.sortBy { it.timeMs }

            // 1. Check if we are currently in the post-adhan window for any prayer today
            var activePostAdhanPrayer: PrayerItem? = null
            for (p in todayPrayers) {
                val endOfWindow = p.timeMs + p.postAdhanWindowMs
                if (now >= p.timeMs && now < endOfWindow) {
                    activePostAdhanPrayer = p
                    break
                }
            }

            var title: String
            var text: String
            var chronometerWhen: Long
            var isCountDown: Boolean
            var nextAlarmTriggerMs: Long

            if (activePostAdhanPrayer != null) {
                // We are in post-adhan elapsed counting period! (e.g. up to 18 mins / 20 mins for Fajr)
                val p = activePostAdhanPrayer
                title = "🕌 حان الآن وقت صلاة ${p.arabicName}"
                text = "مضى منذ الأذان • وقت الإقامة والسنن"
                chronometerWhen = p.timeMs
                isCountDown = false // Counts UP (elapsed)
                nextAlarmTriggerMs = p.timeMs + p.postAdhanWindowMs
            } else {
                // We are in countdown to upcoming prayer
                var upcomingPrayer = todayPrayers.firstOrNull { it.timeMs > now }
                if (upcomingPrayer == null) {
                    // All prayers today have passed, upcoming is Fajr tomorrow
                    upcomingPrayer = tomorrowPrayers.firstOrNull() ?: todayPrayers.first()
                }

                title = "الصلاة القادمة: صلاة ${upcomingPrayer.arabicName}"
                text = "موعد الأذان: ${upcomingPrayer.timeFormatted} • متبقي:"
                chronometerWhen = upcomingPrayer.timeMs
                isCountDown = true // Counts DOWN
                nextAlarmTriggerMs = upcomingPrayer.timeMs
            }

            // Build Open App Intent
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_prayer)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setUsesChronometer(true)
                .setChronometerCountDown(isCountDown)
                .setWhen(chronometerWhen)
                .setShowWhen(true)

            notificationManager.notify(NOTIFICATION_ID, builder.build())

            // Schedule exact transition alarm with AlarmManager
            scheduleNextAlarm(context, nextAlarmTriggerMs)

        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }

    private fun scheduleNextAlarm(context: Context, triggerAtMs: Long) {
        if (triggerAtMs <= System.currentTimeMillis()) return

        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, PrayerNotificationReceiver::class.java).apply {
                action = ACTION_UPDATE_NOTIFICATION
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                1001,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC, triggerAtMs, pendingIntent)
            }
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }
}
