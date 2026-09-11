package com.ifaqa.app;
import android.Manifest;
import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name="FajrAlarm",permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class FajrAlarmPlugin extends Plugin {
 @PluginMethod public void status(PluginCall call){
  JSObject result=new JSObject();result.put("exact",FajrAlarmStore.canSchedule(getContext()));result.put("fullScreen",Build.VERSION.SDK_INT<34||getContext().getSystemService(NotificationManager.class).canUseFullScreenIntent());result.put("notifications",NotificationManagerCompat.from(getContext()).areNotificationsEnabled());result.put("enabled",FajrAlarmStore.prefs(getContext()).getBoolean("enabled",false));result.put("nextAt",FajrAlarmStore.prefs(getContext()).getLong("nextAt",0));
  int count=0;JSONArray entries=FajrAlarmStore.entries(getContext());for(int i=0;i<entries.length();i++)if(entries.optJSONObject(i)!=null&&entries.optJSONObject(i).optLong("at")>System.currentTimeMillis())count++;result.put("count",count);call.resolve(result);
 }
 @PluginMethod public void requestAccess(PluginCall call){
  String kind=call.getString("kind","");
  if("notifications".equals(kind)&&Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"notificationResult");return;}
  Intent intent=null;
  if("exact".equals(kind)&&Build.VERSION.SDK_INT>=31)intent=new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getContext().getPackageName()));
  if("fullScreen".equals(kind)&&Build.VERSION.SDK_INT>=34)intent=new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:"+getContext().getPackageName()));
  if("notifications".equals(kind))intent=new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName());
  if(intent!=null)getActivity().startActivity(intent);call.resolve();
 }
 @PermissionCallback private void notificationResult(PluginCall call){call.resolve();}
 @PluginMethod public void schedule(PluginCall call){
  if(!FajrAlarmStore.canSchedule(getContext())){call.reject("اسمح بالمنبّهات الدقيقة أولاً.");return;}
  JSArray entries=call.getArray("entries");if(entries==null||entries.length()==0||entries.length()>62){call.reject("مواعيد المنبّه غير صالحة.");return;}
  for(int i=0;i<entries.length();i++){JSONObject item=entries.optJSONObject(i);if(item==null||item.optLong("at")<=System.currentTimeMillis()||!item.optString("day").matches("\\d{4}-\\d{2}-\\d{2}")){call.reject("توجد مواعيد منتهية أو غير صالحة.");return;}}
  FajrAlarmStore.prefs(getContext()).edit().putString("entries",entries.toString()).putString("uid",call.getString("uid","")).putString("clanId",call.getString("clanId","")).putString("soundUrl",call.getString("soundUrl","")).putString("themeId",call.getString("themeId","emerald")).putBoolean("enabled",true).putLong("snooze",0).commit();
  try{FajrAlarmStore.scheduleNext(getContext());call.resolve();}catch(Exception e){FajrAlarmStore.cancel(getContext());call.reject("تعذر ضبط المنبّه.",e);}
 }
 @PluginMethod public void cancel(PluginCall call){FajrAlarmStore.cancel(getContext());call.resolve();}
 @PluginMethod public void events(PluginCall call){try{JSObject result=new JSObject();result.put("events",new JSONArray(FajrAlarmStore.prefs(getContext()).getString("events","[]")));call.resolve(result);}catch(Exception e){call.reject("تعذر قراءة حالة الاستيقاظ.");}}
 @PluginMethod public void acknowledge(PluginCall call){try{JSArray ids=call.getArray("ids");JSONArray events=new JSONArray(FajrAlarmStore.prefs(getContext()).getString("events","[]")),keep=new JSONArray();for(int i=0;i<events.length();i++){JSONObject item=events.getJSONObject(i);boolean remove=false;for(int j=0;ids!=null&&j<ids.length();j++)if(item.optString("id").equals(ids.optString(j)))remove=true;if(!remove)keep.put(item);}FajrAlarmStore.prefs(getContext()).edit().putString("events",keep.toString()).commit();call.resolve();}catch(Exception e){call.reject("تعذر حفظ الحالة.");}}
}
