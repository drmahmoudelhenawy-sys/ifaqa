package com.ifaqa.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetPlugin")
public class WidgetPlugin extends Plugin {

    @PluginMethod
    public void pinWidget(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager appWidgetManager = context.getSystemService(AppWidgetManager.class);
            ComponentName myProvider = new ComponentName(context, PrayerTimes_widget.class);

            if (appWidgetManager.isRequestPinAppWidgetSupported()) {
                appWidgetManager.requestPinAppWidget(myProvider, null, null);
                call.resolve();
            } else {
                call.reject("Pinning widgets is not supported on this device/launcher");
            }
        } else {
            call.reject("Widget pinning requires Android 8.0 or higher");
        }
    }

    @PluginMethod
    public void updatePrayerNotification(PluginCall call) {
        try {
            Context context = getContext();
            PrayerNotificationManager.INSTANCE.updateNotification(context);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
