package com.ifaqa.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        registerPlugin(QuranAudioPlugin.class);
        registerPlugin(FajrAlarmPlugin.class);
        super.onCreate(savedInstanceState);
        hideSystemStatusBar();
        try {
            PrayerNotificationManager.INSTANCE.updateNotification(this);
        } catch (Throwable t) {
            android.util.Log.e("MainActivity", "Error updating prayer notification in onCreate", t);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemStatusBar();
        try {
            PrayerNotificationManager.INSTANCE.updateNotification(this);
        } catch (Throwable t) {
            android.util.Log.e("MainActivity", "Error updating prayer notification in onResume", t);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemStatusBar();
        }
    }

    private void hideSystemStatusBar() {
        try {
            Window window = getWindow();
            if (window != null) {
                WindowCompat.setDecorFitsSystemWindows(window, false);
                window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
                window.clearFlags(WindowManager.LayoutParams.FLAG_FORCE_NOT_FULLSCREEN);

                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
                if (controller != null) {
                    controller.hide(WindowInsetsCompat.Type.statusBars());
                    controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    window.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
