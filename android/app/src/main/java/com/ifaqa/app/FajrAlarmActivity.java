package com.ifaqa.app;
import android.app.Activity;
import android.app.KeyguardManager;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.graphics.Color;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class FajrAlarmActivity extends Activity {
 @Override public void onCreate(Bundle state){super.onCreate(state);
  if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true);}else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED|WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
  getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  if("awake".equals(getIntent().getAction())){awake();return;}
  String theme=FajrAlarmStore.prefs(this).getString("themeId","emerald");
  int bg=Color.rgb(15,38,30), txt=Color.rgb(195,225,208);
  if("midnight".equals(theme)){bg=Color.rgb(12,18,38);txt=Color.rgb(199,210,254);}
  else if("royal_purple".equals(theme)){bg=Color.rgb(26,12,38);txt=Color.rgb(233,213,255);}
  else if("warm_amber".equals(theme)){bg=Color.rgb(35,25,10);txt=Color.rgb(253,230,138);}
  LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setGravity(Gravity.CENTER);layout.setPadding(48,48,48,48);layout.setBackgroundColor(bg);layout.setLayoutDirection(android.view.View.LAYOUT_DIRECTION_RTL);
  TextView time=new TextView(this);time.setText(new java.text.SimpleDateFormat("HH:mm",java.util.Locale.getDefault()).format(new java.util.Date()));time.setTextSize(64);time.setTextColor(Color.WHITE);time.setGravity(Gravity.CENTER);layout.addView(time);
  TextView title=new TextView(this);title.setText("حان وقت صلاة الفجر");title.setTextSize(26);title.setTextColor(txt);title.setGravity(Gravity.CENTER);title.setPadding(0,30,0,50);layout.addView(title);
  Button awake=new Button(this);awake.setText("أنا صحيت · إيقاف المنبّه");awake.setTextSize(18);awake.setOnClickListener(v->awake());layout.addView(awake,new LinearLayout.LayoutParams(-1,80));
  Button snooze=new Button(this);snooze.setText("غفوة ٥ دقائق");snooze.setOnClickListener(v->{FajrAlarmStore.prefs(this).edit().putLong("snooze",System.currentTimeMillis()+5*60*1000L).apply();stopService(new Intent(this,FajrAlarmService.class));FajrAlarmStore.scheduleNext(this);finish();});LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,80);lp.topMargin=24;layout.addView(snooze,lp);
  TextView hint=new TextView(this);hint.setText("إيقاف المنبّه يسجّل استيقاظك لرفقاء الفجر عند الاتصال.");hint.setTextColor(Color.LTGRAY);hint.setTextSize(13);hint.setGravity(Gravity.CENTER);hint.setPadding(0,40,0,0);layout.addView(hint);setContentView(layout);
 }
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if("awake".equals(intent.getAction()))awake();}
 private void awake(){FajrAlarmStore.awake(this);Intent app=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);startActivity(app);finish();}
}
