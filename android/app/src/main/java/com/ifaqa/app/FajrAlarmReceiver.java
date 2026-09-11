package com.ifaqa.app;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

public class FajrAlarmReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context, Intent intent) {
  if("com.ifaqa.app.FAJR_RING".equals(intent.getAction())){
   if(!FajrAlarmStore.prefs(context).getBoolean("enabled",false))return;
   long at=intent.getLongExtra("at",0);
   if(Math.abs(System.currentTimeMillis()-at)>15*60*1000L){FajrAlarmStore.scheduleNext(context);return;}
   FajrAlarmStore.prefs(context).edit().putString("activeDay",intent.getStringExtra("day")).putLong("snooze",0).putBoolean("ringing",true).commit();
   ContextCompat.startForegroundService(context,new Intent(context,FajrAlarmService.class));
  }
  FajrAlarmStore.scheduleNext(context);
 }
}
