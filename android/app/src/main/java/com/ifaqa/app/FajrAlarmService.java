package com.ifaqa.app;

import android.app.*;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.*;
import androidx.core.app.NotificationCompat;

public class FajrAlarmService extends Service {
 private MediaPlayer player;private Vibrator vibrator;private PowerManager.WakeLock wakeLock;
 private final Handler handler=new Handler(Looper.getMainLooper());
 @Override public IBinder onBind(Intent intent){return null;}
 @Override public int onStartCommand(Intent intent,int flags,int startId){
  NotificationManager manager=getSystemService(NotificationManager.class);
  if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=new NotificationChannel("fajr_alarm_clock","منبّه الفجر",NotificationManager.IMPORTANCE_HIGH);channel.setDescription("منبّه الفجر الذي فعّلته");channel.setSound(null,null);channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);manager.createNotificationChannel(channel);}
  PendingIntent full=PendingIntent.getActivity(this,7803,new Intent(this,FajrAlarmActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  PendingIntent stop=PendingIntent.getActivity(this,7804,new Intent(this,FajrAlarmActivity.class).setAction("awake").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification notification=new NotificationCompat.Builder(this,"fajr_alarm_clock").setSmallIcon(R.drawable.ic_stat_prayer).setContentTitle("حان وقت صلاة الفجر").setContentText("أنا صحيت — لإيقاف المنبّه وتسجيل الاستيقاظ").setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX).setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setOngoing(true).setAutoCancel(false).setContentIntent(full).setFullScreenIntent(full,true).addAction(R.drawable.ic_stat_prayer,"أنا صحيت",stop).build();
  startForeground(7800,notification);
  if(player!=null)return START_NOT_STICKY;
  try{
   wakeLock=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"ifaqa:fajrAlarm");wakeLock.acquire(15*60*1000L);
   String customSound=FajrAlarmStore.prefs(this).getString("soundUrl","");
   Uri sound=null;
   if(!customSound.isEmpty()){try{sound=Uri.parse(customSound);}catch(Exception e){sound=null;}}
   if(sound==null){sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);if(sound==null)sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);}
   player=new MediaPlayer();player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());player.setDataSource(this,sound);player.setLooping(true);player.prepare();player.start();
  }catch(Exception ignored){}
  vibrator=(Vibrator)getSystemService(VIBRATOR_SERVICE);if(vibrator!=null){long[] pattern={0,700,700};if(Build.VERSION.SDK_INT>=26)vibrator.vibrate(VibrationEffect.createWaveform(pattern,0));else vibrator.vibrate(pattern,0);}
  handler.postDelayed(this::stopSelf,15*60*1000L);
  return START_NOT_STICKY;
 }
 @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);if(player!=null){player.release();player=null;}if(vibrator!=null)vibrator.cancel();if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();FajrAlarmStore.prefs(this).edit().putBoolean("ringing",false).apply();stopForeground(true);super.onDestroy();}
}
