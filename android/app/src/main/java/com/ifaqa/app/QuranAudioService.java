package com.ifaqa.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import java.io.File;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import org.json.JSONArray;
import org.json.JSONObject;

public class QuranAudioService extends Service implements
        MediaPlayer.OnPreparedListener,
        MediaPlayer.OnCompletionListener,
        MediaPlayer.OnErrorListener,
        MediaPlayer.OnBufferingUpdateListener {

    public static final String ACTION_STATE = "com.ifaqa.app.QURAN_AUDIO_STATE";
    public static final String ACTION_COMPLETED = "com.ifaqa.app.QURAN_AUDIO_COMPLETED";
    public static final String ACTION_PLAY_TRACK = "com.ifaqa.app.quran.PLAY_TRACK";
    public static final String ACTION_PLAY_URL = "com.ifaqa.app.quran.PLAY_URL";
    public static final String ACTION_TOGGLE = "com.ifaqa.app.quran.TOGGLE";
    public static final String ACTION_PLAY = "com.ifaqa.app.quran.PLAY";
    public static final String ACTION_PAUSE = "com.ifaqa.app.quran.PAUSE";
    public static final String ACTION_STOP = "com.ifaqa.app.quran.STOP";
    public static final String ACTION_NEXT = "com.ifaqa.app.quran.NEXT";
    public static final String ACTION_PREVIOUS = "com.ifaqa.app.quran.PREVIOUS";
    public static final String ACTION_SEEK = "com.ifaqa.app.quran.SEEK";
    public static final String ACTION_SPEED = "com.ifaqa.app.quran.SPEED";

    private static final String CHANNEL_ID = "quran_playback";
    private static final int NOTIFICATION_ID = 4107;

    private MediaPlayer player;
    private MediaSessionCompat mediaSession;
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private JSONArray playlist = new JSONArray();
    private int currentIndex = -1;
    private boolean preparing = false;
    private float playbackSpeed = 1f;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private boolean resumeOnFocusGain = false;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    private String singleTrackUrl = null;
    private String singleTrackTitle = "القرآن الكريم";
    private String singleTrackArtist = "إفاقة";
    private String singleTrackAlbum = "مكتبة التلاوات";

    private final Runnable progressTicker = new Runnable() {
        @Override public void run() {
            if (player != null && isPlaying()) {
                broadcastState();
            }
            progressHandler.postDelayed(this, 800);
        }
    };

    private final AudioManager.OnAudioFocusChangeListener focusListener = focus -> {
        if (player == null) return;
        if (focus == AudioManager.AUDIOFOCUS_LOSS) {
            resumeOnFocusGain = false;
            pausePlayback();
        } else if (focus == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            if (isPlaying()) {
                resumeOnFocusGain = true;
                pausePlayback();
            }
        } else if (focus == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            try { player.setVolume(0.2f, 0.2f); } catch (Exception ignored) {}
        } else if (focus == AudioManager.AUDIOFOCUS_GAIN) {
            try { player.setVolume(1.0f, 1.0f); } catch (Exception ignored) {}
            if (resumeOnFocusGain) {
                resumeOnFocusGain = false;
                resumePlayback();
            }
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        initLocks();
        createNotificationChannel();
        createMediaSession();
        progressHandler.post(progressTicker);
    }

    private void initLocks() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Ifaqa::QuranAudioWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        } catch (Exception ignored) {}

        try {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null) {
                wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "Ifaqa::QuranAudioWifiLock");
                wifiLock.setReferenceCounted(false);
            }
        } catch (Exception ignored) {}
    }

    private void acquireLocks() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(24 * 60 * 60 * 1000L); // 24 hours max
            }
        } catch (Exception ignored) {}
        try {
            if (wifiLock != null && !wifiLock.isHeld()) {
                wifiLock.acquire();
            }
        } catch (Exception ignored) {}
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
        try {
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
            }
        } catch (Exception ignored) {}
    }

    private void createMediaSession() {
        mediaSession = new MediaSessionCompat(this, "IfaqaQuranAudio");
        mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() { resumePlayback(); }
            @Override public void onPause() { pausePlayback(); }
            @Override public void onStop() { stopPlayback(); }
            @Override public void onSkipToNext() { playRelative(1); }
            @Override public void onSkipToPrevious() { previousOrRestart(); }
            @Override public void onSeekTo(long pos) { seekTo(pos); }
        });
        mediaSession.setActive(true);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) return START_STICKY;

        // Ensure foreground status immediately to prevent RemoteServiceException on Android 8+
        if (!ACTION_STOP.equals(action)) {
            updateSessionAndNotification();
        }

        if (ACTION_PLAY_TRACK.equals(action)) {
            try {
                singleTrackUrl = null;
                playlist = new JSONArray(intent.getStringExtra("playlistJson"));
                currentIndex = Math.max(0, Math.min(intent.getIntExtra("index", 0), playlist.length() - 1));
                playbackSpeed = intent.getFloatExtra("speed", 1f);
                long startPos = intent.getLongExtra("position", 0);
                startCurrentTrack(startPos);
            } catch (Exception error) {
                preparing = false;
                broadcastState();
            }
        } else if (ACTION_PLAY_URL.equals(action)) {
            try {
                playlist = new JSONArray();
                currentIndex = -1;
                singleTrackUrl = intent.getStringExtra("url");
                singleTrackTitle = intent.getStringExtra("title");
                if (singleTrackTitle == null || singleTrackTitle.isEmpty()) singleTrackTitle = "القرآن الكريم";
                singleTrackArtist = intent.getStringExtra("artist");
                if (singleTrackArtist == null || singleTrackArtist.isEmpty()) singleTrackArtist = "إفاقة";
                singleTrackAlbum = intent.getStringExtra("album");
                if (singleTrackAlbum == null || singleTrackAlbum.isEmpty()) singleTrackAlbum = "المصحف الشريف";
                playbackSpeed = intent.getFloatExtra("speed", 1f);
                long startPos = intent.getLongExtra("position", 0);
                startSingleTrack(singleTrackUrl, startPos);
            } catch (Exception error) {
                preparing = false;
                broadcastState();
            }
        } else if (ACTION_TOGGLE.equals(action)) {
            if (isPlaying()) pausePlayback(); else resumePlayback();
        } else if (ACTION_PLAY.equals(action)) {
            resumePlayback();
        } else if (ACTION_PAUSE.equals(action)) {
            pausePlayback();
        } else if (ACTION_STOP.equals(action)) {
            stopPlayback();
        } else if (ACTION_NEXT.equals(action)) {
            playRelative(1);
        } else if (ACTION_PREVIOUS.equals(action)) {
            previousOrRestart();
        } else if (ACTION_SEEK.equals(action)) {
            seekTo(intent.getLongExtra("position", 0));
        } else if (ACTION_SPEED.equals(action)) {
            setSpeed(intent.getFloatExtra("speed", 1f));
        }
        return START_STICKY;
    }

    private void startCurrentTrack(long startPosition) {
        if (currentIndex < 0 || currentIndex >= playlist.length()) return;
        releasePlayer();
        preparing = true;
        acquireLocks();
        updateSessionAndNotification();
        try {
            JSONObject track = playlist.getJSONObject(currentIndex);
            String url = track.getString("audioUrl");
            initAndPlay(url, startPosition);
        } catch (Exception error) {
            preparing = false;
            updateSessionAndNotification();
            broadcastState();
        }
    }

    private void startSingleTrack(String url, long startPosition) {
        if (url == null || url.isEmpty()) return;
        releasePlayer();
        preparing = true;
        acquireLocks();
        updateSessionAndNotification();
        try {
            initAndPlay(url, startPosition);
        } catch (Exception error) {
            preparing = false;
            updateSessionAndNotification();
            broadcastState();
        }
    }

    private void initAndPlay(String url, long startPosition) throws Exception {
        player = new MediaPlayer();
        player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());
        player.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
        player.setOnPreparedListener(mp -> {
            preparing = false;
            requestAudioFocus();
            setSpeed(playbackSpeed);
            if (startPosition > 0) {
                mp.seekTo((int) startPosition);
            }
            mp.start();
            updateSessionAndNotification();
            broadcastState();
        });
        player.setOnCompletionListener(this);
        player.setOnErrorListener(this);
        player.setOnBufferingUpdateListener(this);
        setPlayerDataSource(player, url);
        player.prepareAsync();
    }

    private void setPlayerDataSource(MediaPlayer mp, String url) throws Exception {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("Empty audio URL");
        }
        url = url.trim();

        // 1. Capacitor local filesystem URL (/_capacitor_file_/...)
        if (url.contains("/_capacitor_file_")) {
            String sub = url.substring(url.indexOf("/_capacitor_file_") + "/_capacitor_file_".length());
            String decodedPath = URLDecoder.decode(sub, "UTF-8");
            File file = new File(decodedPath);
            if (file.exists()) {
                mp.setDataSource(file.getAbsolutePath());
                return;
            }
        }

        // 2. Direct local file URI (file:///...)
        if (url.startsWith("file://")) {
            Uri uri = Uri.parse(url);
            String path = uri.getPath();
            if (path != null) {
                File file = new File(path);
                if (file.exists()) {
                    mp.setDataSource(file.getAbsolutePath());
                    return;
                }
            }
            mp.setDataSource(getApplicationContext(), uri);
            return;
        }

        // 3. Android Content Provider URI (content://...)
        if (url.startsWith("content://")) {
            Uri uri = Uri.parse(url);
            mp.setDataSource(getApplicationContext(), uri);
            return;
        }

        // 4. Remote HTTP/HTTPS URL
        Map<String, String> headers = new HashMap<>();
        headers.put("User-Agent", "IfaqaApp/1.0 (Android)");
        mp.setDataSource(getApplicationContext(), Uri.parse(url), headers);
    }

    @Override public void onPrepared(MediaPlayer mediaPlayer) {
        // Handled in lambda above
    }

    @Override public void onCompletion(MediaPlayer mediaPlayer) {
        broadcastCompletion();
        if (playlist != null && playlist.length() > 0 && currentIndex >= 0) {
            if (currentIndex + 1 < playlist.length()) {
                currentIndex += 1;
                startCurrentTrack(0);
            } else {
                pausePlayback();
                seekTo(0);
            }
        } else {
            pausePlayback();
            seekTo(0);
        }
    }

    @Override public boolean onError(MediaPlayer mediaPlayer, int what, int extra) {
        preparing = false;
        releaseLocks();
        updateSessionAndNotification();
        broadcastState();
        return true;
    }

    @Override public void onBufferingUpdate(MediaPlayer mp, int percent) {
        // Can be used if buffer percentage needed
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (audioFocusRequest == null) {
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .build())
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(focusListener)
                        .build();
            }
            audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } else {
            audioManager.abandonAudioFocus(focusListener);
        }
    }

    private void resumePlayback() {
        if (player == null) {
            if (singleTrackUrl != null) {
                startSingleTrack(singleTrackUrl, 0);
            } else if (currentIndex >= 0) {
                startCurrentTrack(0);
            }
            return;
        }
        if (!preparing) {
            acquireLocks();
            requestAudioFocus();
            player.start();
            updateSessionAndNotification();
            broadcastState();
        }
    }

    private void pausePlayback() {
        if (player != null && player.isPlaying()) {
            player.pause();
        }
        releaseLocks();
        updateSessionAndNotification();
        broadcastState();
    }

    private void stopPlayback() {
        releasePlayer();
        releaseLocks();
        abandonAudioFocus();
        singleTrackUrl = null;
        currentIndex = -1;
        playlist = new JSONArray();
        broadcastState();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private void playRelative(int delta) {
        if (playlist == null || playlist.length() == 0) return;
        int target = currentIndex + delta;
        if (target >= 0 && target < playlist.length()) {
            currentIndex = target;
            startCurrentTrack(0);
        }
    }

    private void previousOrRestart() {
        if (getPosition() > 5000 || currentIndex <= 0) seekTo(0);
        else playRelative(-1);
    }

    private void seekTo(long position) {
        if (player != null && !preparing) {
            player.seekTo((int) Math.max(0, Math.min(position, getDuration())));
            broadcastState();
        }
    }

    private void setSpeed(float speed) {
        playbackSpeed = Math.max(0.5f, Math.min(speed, 2.5f));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && player != null && !preparing) {
            try {
                player.setPlaybackParams(player.getPlaybackParams().setSpeed(playbackSpeed));
            } catch (Exception ignored) {}
        }
    }

    private boolean isPlaying() {
        try {
            return player != null && player.isPlaying();
        } catch (Exception ignored) {
            return false;
        }
    }

    private long getPosition() {
        try {
            return player != null && !preparing ? player.getCurrentPosition() : 0;
        } catch (Exception ignored) {
            return 0;
        }
    }

    private long getDuration() {
        try {
            long dur = player != null && !preparing ? Math.max(0, player.getDuration()) : 0;
            // Sanitize corrupt MP3 header calculation e.g. Al-Fatiha Minshawi (1769s) -> 52500ms
            if (dur > 180000 && getTrackTitle().contains("الفاتحة")) {
                return 52500L;
            }
            return dur;
        } catch (Exception ignored) {
            return 0;
        }
    }

    private JSONObject currentTrack() {
        try {
            return currentIndex >= 0 && currentIndex < playlist.length() ? playlist.getJSONObject(currentIndex) : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String getTrackTitle() {
        if (singleTrackUrl != null) return singleTrackTitle;
        JSONObject track = currentTrack();
        return track != null ? track.optString("title", "القرآن الكريم") : "القرآن الكريم";
    }

    private String getTrackArtist() {
        if (singleTrackUrl != null) return singleTrackArtist;
        JSONObject track = currentTrack();
        return track != null ? track.optString("artist", "إفاقة") : "إفاقة";
    }

    private String getTrackAlbum() {
        if (singleTrackUrl != null) return singleTrackAlbum;
        JSONObject track = currentTrack();
        return track != null ? track.optString("album", "مكتبة التلاوات") : "مكتبة التلاوات";
    }

    private void updateSessionAndNotification() {
        String title = getTrackTitle();
        String artist = getTrackArtist();
        String album = getTrackAlbum();

        mediaSession.setMetadata(new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, getDuration())
                .build());

        long actions = PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_STOP |
                PlaybackStateCompat.ACTION_SEEK_TO | PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS;
        int state = preparing ? PlaybackStateCompat.STATE_BUFFERING :
                (isPlaying() ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED);
        mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, getPosition(), isPlaying() ? playbackSpeed : 0f)
                .build());

        Notification notification = buildNotification(title, artist);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification(String title, String artist) {
        int immutable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
        PendingIntent content = PendingIntent.getActivity(this, 10,
                new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP),
                immutable | PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent previous = servicePendingIntent(ACTION_PREVIOUS, 11);
        PendingIntent toggle = servicePendingIntent(ACTION_TOGGLE, 12);
        PendingIntent next = servicePendingIntent(ACTION_NEXT, 13);
        PendingIntent stop = servicePendingIntent(ACTION_STOP, 14);

        Bitmap appIcon = null;
        try {
            appIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
        } catch (Exception ignored) {}

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(artist)
                .setSubText("القرآن الكريم · إفاقة")
                .setContentIntent(content)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setOnlyAlertOnce(true)
                .setOngoing(isPlaying())
                .addAction(android.R.drawable.ic_media_previous, "السابق", previous)
                .addAction(isPlaying() ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, isPlaying() ? "إيقاف" : "تشغيل", toggle)
                .addAction(android.R.drawable.ic_media_next, "التالي", next)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "إغلاق", stop)
                .setStyle(new MediaStyle()
                        .setMediaSession(mediaSession.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));

        if (appIcon != null) {
            builder.setLargeIcon(appIcon);
        }

        return builder.build();
    }

    private PendingIntent servicePendingIntent(String action, int requestCode) {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        Intent intent = new Intent(this, QuranAudioService.class).setAction(action);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return PendingIntent.getForegroundService(this, requestCode, intent, flags);
        } else {
            return PendingIntent.getService(this, requestCode, intent, flags);
        }
    }

    private void broadcastState() {
        Intent state = new Intent(ACTION_STATE).setPackage(getPackageName());
        state.putExtra("isPlaying", isPlaying());
        state.putExtra("isBuffering", preparing);
        state.putExtra("position", getPosition());
        state.putExtra("duration", getDuration());
        state.putExtra("currentIndex", currentIndex);
        state.putExtra("title", getTrackTitle());
        state.putExtra("artist", getTrackArtist());
        sendBroadcast(state);
    }

    private void broadcastCompletion() {
        Intent comp = new Intent(ACTION_COMPLETED).setPackage(getPackageName());
        comp.putExtra("currentIndex", currentIndex);
        comp.putExtra("title", getTrackTitle());
        comp.putExtra("artist", getTrackArtist());
        sendBroadcast(comp);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "تشغيل القرآن الكريم", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("التحكم في تلاوة القرآن أثناء استخدام التطبيقات الأخرى وإبقاء الصوت مستمراً في الخلفية");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setShowBadge(false);
            channel.setSound(null, null);
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
    }

    private void releasePlayer() {
        if (player != null) {
            try { player.reset(); player.release(); } catch (Exception ignored) {}
            player = null;
        }
    }

    @Override public void onDestroy() {
        progressHandler.removeCallbacks(progressTicker);
        releasePlayer();
        releaseLocks();
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
