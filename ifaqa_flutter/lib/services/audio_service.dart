import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import '../data/surahs_data.dart';
import '../models/reciter.dart';
import '../siraj/device_music.dart';
import 'app_state.dart';
import 'clan_service.dart';
import 'offline_store/offline_store.dart';
import 'playlists_service.dart';

/// What is loaded in the shared player.
class NowPlaying {
  final String title;
  final String subtitle;
  final bool isLive;
  final Reciter? reciter;
  final int? surah;
  const NowPlaying({required this.title, required this.subtitle, this.isLive = false, this.reciter, this.surah});
}

/// One player for the whole app (Quran recitations and radio), so playback
/// survives switching tabs and two sources never play over each other.
/// Also counts listening time for stats and the clan "audio minutes" quest.
class AudioService extends ChangeNotifier {
  AudioService._() {
    player.playerStateStream.listen((s) {
      if (s.processingState == ProcessingState.completed && autoNext && !inPlaylist) {
        next();
      }
      notifyListeners();
    });
    // Keeps the mini player in step when a playlist moves to its next track
    // (also from the lock screen / notification buttons).
    player.currentIndexStream.listen((i) {
      if (inDeviceMusic) {
        if (i == null || i >= _deviceQueue.length) return;
        final song = _deviceQueue[i];
        now = NowPlaying(title: song.title, subtitle: song.artist);
        notifyListeners();
        return;
      }
      if (!inPlaylist || i == null || i >= _queue.length) return;
      final it = _queue[i];
      now = _nowFor(it.reciter, it.surah);
      _remember(it.reciter, it.surah);
      notifyListeners();
    });
    player.positionStream.listen((_) => _throttledNotify());
    // Lives as long as the app: the service is a singleton.
    Timer.periodic(const Duration(seconds: 1), (_) => _countSecond());
  }
  static final AudioService instance = AudioService._();

  final AudioPlayer player = AudioPlayer();
  NowPlaying? now;
  bool autoNext = true;
  String? playlistId;
  List<PlaylistItem> _queue = const [];
  bool get inPlaylist => playlistId != null;
  // On-device music queue (see playDeviceSongs). Kept separate from _queue:
  // device tracks are files, not reciter/surah items, and must never be
  // mixed into a Quran playlist. Empty whenever app audio is playing.
  List<DeviceSong> _deviceQueue = const [];
  bool get inDeviceMusic => _deviceQueue.isNotEmpty;
  List<DeviceSong> get deviceQueue => List.unmodifiable(_deviceQueue);
  DateTime _lastNotify = DateTime.fromMillisecondsSinceEpoch(0);
  int _unsentClanSeconds = 0;

  bool get playing => player.playing;
  bool get buffering => player.processingState == ProcessingState.loading || player.processingState == ProcessingState.buffering;

  void _throttledNotify() {
    final t = DateTime.now();
    if (t.difference(_lastNotify).inMilliseconds > 500) {
      _lastNotify = t;
      notifyListeners();
    }
  }

  NowPlaying _nowFor(Reciter reciter, int surah) {
    final name = quranSurahs.firstWhere((s) => s.number == surah).name;
    return NowPlaying(title: 'سورة $name', subtitle: reciter.name, reciter: reciter, surah: surah);
  }

  Future<AudioSource> _sourceFor(Reciter reciter, int surah) async {
    final name = quranSurahs.firstWhere((s) => s.number == surah).name;
    final tag = MediaItem(id: '${reciter.id}_$surah', title: 'سورة $name', artist: reciter.name, album: 'تلاوات إفاقة');
    final local = await OfflineStore.instance.localPath(audioOfflinePath(reciter, surah));
    return AudioSource.uri(local != null ? Uri.file(local) : Uri.parse(reciter.surahUrl(surah)), tag: tag);
  }

  Future<void> playSurah(Reciter reciter, int surah) async {
    playlistId = null;
    _queue = const [];
    _deviceQueue = const [];
    now = _nowFor(reciter, surah);
    notifyListeners();
    _remember(reciter, surah);
    await _load(await _sourceFor(reciter, surah));
  }

  /// Plays a user playlist from [startIndex]; next/previous and autoplay follow it.
  Future<void> playPlaylist(UserPlaylist pl, {int startIndex = 0}) async {
    if (pl.items.isEmpty) return;
    final items = [...pl.items];
    final idx = startIndex.clamp(0, items.length - 1);
    playlistId = pl.id;
    _queue = items;
    _deviceQueue = const [];
    now = _nowFor(items[idx].reciter, items[idx].surah);
    notifyListeners();
    try {
      final sources = [for (final it in items) await _sourceFor(it.reciter, it.surah)];
      await player.setAudioSource(ConcatenatingAudioSource(children: sources), initialIndex: idx);
      unawaited(player.play());
    } catch (e) {
      debugPrint('playlist load failed: $e');
      notifyListeners();
    }
  }

  static String audioOfflinePath(Reciter r, int surah) => 'audio/${r.id}/${surah.toString().padLeft(3, '0')}.mp3';

  /// Saves a recitation for offline listening, with its reciter's details.
  Future<void> download(Reciter r, int surah, {void Function(double)? onProgress}) async {
    await OfflineStore.instance.download(r.surahUrl(surah), audioOfflinePath(r, surah), onProgress: onProgress);
    final s = AppState.instance;
    final names = Map<String, dynamic>.from(jsonDecode(s.text('offline_reciters') ?? '{}') as Map);
    names['${r.id}'] = {'name': r.name, 'server': r.server};
    s.setText('offline_reciters', jsonEncode(names));
  }

  Future<void> playLive(String title, String subtitle, String url) async {
    playlistId = null;
    _queue = const [];
    _deviceQueue = const [];
    now = NowPlaying(title: title, subtitle: subtitle, isLive: true);
    notifyListeners();
    await _load(AudioSource.uri(Uri.parse(url), tag: MediaItem(id: url, title: title, artist: subtitle)));
  }

  Future<void> _load(AudioSource source) async {
    try {
      await player.setAudioSource(source);
      unawaited(player.play());
    } catch (e) {
      debugPrint('audio load failed: $e');
      notifyListeners();
    }
  }

  Future<void> toggle() => player.playing ? player.pause() : player.play();

  /// Pause only when currently playing (used by the sleep timer).
  Future<void> pause() async {
    if (player.playing) await player.pause();
  }

  Future<void> next() async => _step(1);
  Future<void> previous() async => _step(-1);

  Future<void> _step(int delta) async {
    if (inDeviceMusic) {
      if (delta > 0) {
        await player.seekToNext();
      } else {
        await player.seekToPrevious();
      }
      return;
    }
    if (inPlaylist) {
      if (delta > 0) {
        await player.seekToNext();
      } else {
        await player.seekToPrevious();
      }
      return;
    }
    final n = now;
    if (n == null || n.reciter == null || n.surah == null) return;
    final list = [...n.reciter!.surahList]..sort();
    final i = list.indexOf(n.surah!);
    final j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    await playSurah(n.reciter!, list[j]);
  }

  Future<void> stop() async {
    await player.stop();
    playlistId = null;
    _queue = const [];
    _deviceQueue = const [];
    now = null;
    notifyListeners();
  }

  /// Plays on-device audio files through this same shared player, so
  /// device music survives tab switches and never overlaps app audio:
  /// loading it replaces whatever was playing, exactly like a playlist.
  /// Next/previous and the lock-screen controls follow this queue until
  /// app audio is played again (which clears it).
  Future<void> playDeviceSongs(List<DeviceSong> songs, {int startIndex = 0}) async {
    if (songs.isEmpty) return;
    final items = [...songs];
    final idx = startIndex.clamp(0, items.length - 1);
    playlistId = null;
    _queue = const [];
    _deviceQueue = items;
    now = NowPlaying(title: items[idx].title, subtitle: items[idx].artist);
    notifyListeners();
    try {
      final sources = [
        for (final s in items)
          AudioSource.uri(
            Uri.file(s.filePath),
            tag: MediaItem(id: 'device_${s.id}', title: s.title, artist: s.artist, album: 'موسيقى الجهاز'),
          ),
      ];
      await player.setAudioSource(ConcatenatingAudioSource(children: sources), initialIndex: idx);
      unawaited(player.play());
    } catch (e) {
      debugPrint('device music load failed: $e');
      notifyListeners();
    }
  }

  // ---- Siraj player card helpers (additive; existing behaviour unchanged) ----

  /// Read-only view of the current playlist queue (empty when not in a
  /// playlist). Used by the Siraj player card to show "up next".
  List<PlaylistItem> get queue => List.unmodifiable(_queue);

  /// Plays a user playlist by id. Returns false when it does not exist or
  /// is empty (nothing is loaded or stopped in that case).
  Future<bool> playPlaylistById(String id) async {
    final pl = PlaylistsService.instance.byId(id);
    if (pl == null || pl.items.isEmpty) return false;
    await playPlaylist(pl);
    return true;
  }

  // ---- Listening stats ----

  void _countSecond() {
    if (!player.playing || now == null) return;
    final s = AppState.instance;
    final today = DateTime.now();
    final key = 'listen_seconds_${AppState.dateKey(today)}';
    s.setNumber(key, s.number(key) + 1);
    s.setNumber('listen_seconds_total', s.number('listen_seconds_total') + 1);
    if (!now!.isLive) {
      _unsentClanSeconds++;
      if (_unsentClanSeconds >= 60) {
        _unsentClanSeconds -= 60;
        ClanService.instance.autoContribute(QuestType.audioMinutes, 1);
      }
    }
  }

  int minutesOn(DateTime day) => AppState.instance.number('listen_seconds_${AppState.dateKey(day)}') ~/ 60;
  int get totalMinutes => AppState.instance.number('listen_seconds_total') ~/ 60;

  // ---- Continue where you stopped ----

  void _remember(Reciter r, int surah) =>
      AppState.instance.setText('last_listen', jsonEncode({'id': r.id, 'name': r.name, 'surah': surah}));

  Map<String, dynamic>? get lastListen {
    final raw = AppState.instance.text('last_listen');
    if (raw == null || raw.isEmpty) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }
}
