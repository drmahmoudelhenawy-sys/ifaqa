package com.ifaqa.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "QuranAudio")
public class QuranAudioPlugin extends Plugin {
    private BroadcastReceiver stateReceiver;
    private BroadcastReceiver completedReceiver;

    @Override public void load() {
        stateReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                JSObject state = new JSObject();
                state.put("isPlaying", intent.getBooleanExtra("isPlaying", false));
                state.put("isBuffering", intent.getBooleanExtra("isBuffering", false));
                state.put("currentTime", intent.getLongExtra("position", 0) / 1000d);
                state.put("duration", intent.getLongExtra("duration", 0) / 1000d);
                state.put("currentIndex", intent.getIntExtra("currentIndex", -1));
                state.put("title", intent.getStringExtra("title"));
                state.put("artist", intent.getStringExtra("artist"));
                notifyListeners("playbackState", state, true);
            }
        };

        completedReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                JSObject event = new JSObject();
                event.put("currentIndex", intent.getIntExtra("currentIndex", -1));
                event.put("title", intent.getStringExtra("title"));
                event.put("artist", intent.getStringExtra("artist"));
                notifyListeners("playbackCompleted", event, true);
            }
        };

        IntentFilter stateFilter = new IntentFilter(QuranAudioService.ACTION_STATE);
        IntentFilter compFilter = new IntentFilter(QuranAudioService.ACTION_COMPLETED);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(stateReceiver, stateFilter, Context.RECEIVER_NOT_EXPORTED);
            getContext().registerReceiver(completedReceiver, compFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(stateReceiver, stateFilter);
            getContext().registerReceiver(completedReceiver, compFilter);
        }
    }

    @PluginMethod public void playTrack(PluginCall call) {
        String playlistJson = call.getString("playlistJson", "[]");
        int index = call.getInt("index", 0);
        float speed = call.getFloat("speed", 1f);
        long position = Math.round(call.getDouble("position", 0d) * 1000d);

        Intent intent = serviceIntent(QuranAudioService.ACTION_PLAY_TRACK)
                .putExtra("playlistJson", playlistJson)
                .putExtra("index", index)
                .putExtra("speed", speed)
                .putExtra("position", position);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod public void playUrl(PluginCall call) {
        String url = call.getString("url", "");
        String title = call.getString("title", "القرآن الكريم");
        String artist = call.getString("artist", "إفاقة");
        String album = call.getString("album", "المصحف الشريف");
        float speed = call.getFloat("speed", 1f);
        long position = Math.round(call.getDouble("position", 0d) * 1000d);

        Intent intent = serviceIntent(QuranAudioService.ACTION_PLAY_URL)
                .putExtra("url", url)
                .putExtra("title", title)
                .putExtra("artist", artist)
                .putExtra("album", album)
                .putExtra("speed", speed)
                .putExtra("position", position);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod public void toggle(PluginCall call) { send(QuranAudioService.ACTION_TOGGLE); call.resolve(); }
    @PluginMethod public void play(PluginCall call) { send(QuranAudioService.ACTION_PLAY); call.resolve(); }
    @PluginMethod public void pause(PluginCall call) { send(QuranAudioService.ACTION_PAUSE); call.resolve(); }
    @PluginMethod public void stop(PluginCall call) { send(QuranAudioService.ACTION_STOP); call.resolve(); }
    @PluginMethod public void next(PluginCall call) { send(QuranAudioService.ACTION_NEXT); call.resolve(); }
    @PluginMethod public void previous(PluginCall call) { send(QuranAudioService.ACTION_PREVIOUS); call.resolve(); }

    @PluginMethod public void seek(PluginCall call) {
        long position = Math.round(call.getDouble("position", 0d) * 1000d);
        send(serviceIntent(QuranAudioService.ACTION_SEEK).putExtra("position", position));
        call.resolve();
    }

    @PluginMethod public void setSpeed(PluginCall call) {
        float speed = call.getFloat("speed", 1f);
        send(serviceIntent(QuranAudioService.ACTION_SPEED).putExtra("speed", speed));
        call.resolve();
    }

    private Intent serviceIntent(String action) {
        return new Intent(getContext(), QuranAudioService.class).setAction(action);
    }

    private void send(String action) { send(serviceIntent(action)); }
    private void send(Intent intent) {
        try {
            ContextCompat.startForegroundService(getContext(), intent);
        } catch (Exception e) {
            try {
                getContext().startService(intent);
            } catch (Exception ignored) {}
        }
    }

    @Override protected void handleOnDestroy() {
        if (stateReceiver != null) {
            try { getContext().unregisterReceiver(stateReceiver); } catch (Exception ignored) {}
            stateReceiver = null;
        }
        if (completedReceiver != null) {
            try { getContext().unregisterReceiver(completedReceiver); } catch (Exception ignored) {}
            completedReceiver = null;
        }
        super.handleOnDestroy();
    }
}
