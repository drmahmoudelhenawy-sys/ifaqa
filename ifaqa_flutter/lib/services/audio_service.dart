import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import '../data/surahs_data.dart';
import '../models/reciter.dart';
import 'app_state.dart';
import 'clan_service.dart';
import 'offline_store/offline_store.dart';

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
      if (s.processingState == ProcessingState.completed && autoNext) {
        next();
      }
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

  Future<void> playSurah(Reciter reciter, int surah) async {
    final name = quranSurahs.firstWhere((s) => s.number == surah).name;
    now = NowPlaying(title: 'سورة $name', subtitle: reciter.name, reciter: reciter, surah: surah);
    notifyListeners();
    _remember(reciter, surah);
    final local = await OfflineStore.instance.localPath(audioOfflinePath(reciter, surah));
    await _load(reciter.surahUrl(surah), localPath: local);
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
    now = NowPlaying(title: title, subtitle: subtitle, isLive: true);
    notifyListeners();
    await _load(url);
  }

  Future<void> _load(String url, {String? localPath}) async {
    try {
      if (localPath != null) {
        await player.setFilePath(localPath);
      } else {
        await player.setUrl(url);
      }
      unawaited(player.play());
    } catch (e) {
      debugPrint('audio load failed: $e');
      notifyListeners();
    }
  }

  Future<void> toggle() => player.playing ? player.pause() : player.play();

  Future<void> next() async => _step(1);
  Future<void> previous() async => _step(-1);

  Future<void> _step(int delta) async {
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
    now = null;
    notifyListeners();
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
