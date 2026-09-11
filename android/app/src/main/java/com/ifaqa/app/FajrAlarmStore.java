package com.ifaqa.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

final class FajrAlarmStore {
  static SharedPreferences prefs(Context c) { return c.getSharedPreferences("ifaqa_fajr_alarm", Context.MODE_PRIVATE); }
  static JSONArray entries(Context c) { try { return new JSONArray(prefs(c).getString("entries", "[]")); } catch(Exception e) { return new JSONArray(); } }
  static PendingIntent operation(Context c, long at, String day) {
    Intent i = new Intent(c, FajrAlarmReceiver.class).setAction("com.ifaqa.app.FAJR_RING").putExtra("at",at).putExtra("day",day);
    return PendingIntent.getBroadcast(c, 7801, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }
  static boolean canSchedule(Context c) { return Build.VERSION.SDK_INT < 31 || c.getSystemService(AlarmManager.class).canScheduleExactAlarms(); }
  static synchronized void scheduleNext(Context c) {
    if(!prefs(c).getBoolean("enabled",false) || !canSchedule(c))return;
    long now = System.currentTimeMillis(), earliest = Long.MAX_VALUE; String day = "";
    JSONArray list = entries(c);
    for(int i=0;i<list.length();i++){JSONObject entry=list.optJSONObject(i);if(entry!=null){long at=entry.optLong("at");if(at>now && at<earliest){earliest=at;day=entry.optString("day");}}}
    long snooze=prefs(c).getLong("snooze",0);if(snooze>now && snooze<earliest){earliest=snooze;day=prefs(c).getString("activeDay","");}
    AlarmManager manager=c.getSystemService(AlarmManager.class);
    if(earliest==Long.MAX_VALUE){prefs(c).edit().putBoolean("enabled",false).putLong("nextAt",0).apply();manager.cancel(operation(c,0,""));return;}
    PendingIntent show=PendingIntent.getActivity(c,7802,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    manager.setAlarmClock(new AlarmManager.AlarmClockInfo(earliest,show),operation(c,earliest,day));
    prefs(c).edit().putLong("nextAt",earliest).apply();
  }
  static synchronized void cancel(Context c) {
    c.getSystemService(AlarmManager.class).cancel(operation(c,0,""));
    prefs(c).edit().putBoolean("enabled",false).putLong("nextAt",0).putLong("snooze",0).apply();
    c.stopService(new Intent(c,FajrAlarmService.class));
  }
  static synchronized void awake(Context c) {
    SharedPreferences p=prefs(c);
    String day=p.getString("activeDay","");
    if(day.isEmpty() || !p.getBoolean("ringing",false))return;
    try {
      JSONArray events=new JSONArray(p.getString("events","[]"));
      String id=p.getString("uid","")+":"+day;
      boolean found=false;for(int i=0;i<events.length();i++)if(id.equals(events.getJSONObject(i).optString("id")))found=true;
      if(!found){JSONObject event=new JSONObject();event.put("id",id);event.put("uid",p.getString("uid",""));event.put("clanId",p.getString("clanId",""));event.put("day",day);events.put(event);}
      p.edit().putString("events",events.toString()).putBoolean("ringing",false).putLong("snooze",0).commit();
    }catch(Exception ignored){}
    c.stopService(new Intent(c,FajrAlarmService.class));scheduleNext(c);
  }
}
