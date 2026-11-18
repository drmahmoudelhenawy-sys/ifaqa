import 'dart:async';

import 'package:flutter/material.dart';
import '../data/surahs_data.dart';
import '../services/app_state.dart';
import '../services/audio_service.dart';
import '../services/playlists_service.dart';
import '../theme/app_colors.dart';
import 'siraj_settings.dart';

// ===========================================================================
// DEVICE MUSIC — NOT YET INTEGRATED (honest unavailable state, see below).
//
// The 'device' source is selectable in this card, but it does NOT list or
// play any on-device tracks today: no device-audio query package is in
// pubspec.yaml / pubspec.lock or the pub cache, and AndroidManifest.xml has
// no media-read permission. Nothing here fakes device playback.
//
// EXACT INTEGRATION STEPS (for a later wave — do NOT claim this works
// until all four are done and tested on a real device):
//   1. pubspec.yaml: add `on_audio_query: ^2.9.0` (or current) AND
//      `permission_handler: ^11.0.0` (or current) under dependencies, then
//      run `flutter pub get`.
//   2. android/app/src/main/AndroidManifest.xml, inside <manifest>:
//        <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
//        <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
//            android:maxSdkVersion="32" />
//      (READ_MEDIA_AUDIO is Android 13+; READ_EXTERNAL_STORAGE covers older.)
//   3. At runtime, before querying, request the permission with
//      permission_handler (Permission.audio on Android 13+, Permission.storage
//      below it) and handle a denial gracefully — never query without it.
//   4. Query with OnAudioQuery().querySongs() (filter out items with no
//      file / duration 0), build a just_audio ConcatenatingAudioSource from
//      the returned file URIs, and play it through AudioService's player —
//      do NOT start a second player, so playback still survives tab switches
//      and never overlaps app audio. Wire the results into this card behind
//      the 'device' source and replace [deviceMusicAvailable] with a real
//      check (package present + permission granted).
// ===========================================================================

/// Whether on-device music can actually be listed/played right now.
///
/// False until the integration above lands. Kept as a single constant so
/// the day it becomes true there is exactly one place to flip.
const bool deviceMusicAvailable = false;

/// Small player card for the Siraj tab / Siraj settings.
///
/// Shows the current track from [AudioService.instance.now] (title +
/// subtitle) with play/pause + previous/next, a source switch (app audio
/// vs device music) bound to [SirajSettings.playerSourceKey] /
/// [SirajSettings.deviceMusicEnabledKey], and a playlist picker listing the
/// user's playlists ([PlaylistsService]) plus the last-listened item from
/// the app's audio hub.
///
/// Degrades gracefully: when nothing is playing it shows a neutral
/// "nothing playing" state and never crashes. It never touches prayer
/// state and never changes any existing playback behaviour.
class SirajPlayerCard extends StatefulWidget {
  const SirajPlayerCard({super.key});

  @override
  State<SirajPlayerCard> createState() => _SirajPlayerCardState();
}

class _SirajPlayerCardState extends State<SirajPlayerCard> {
  final AudioService _audio = AudioService.instance;
  Timer? _sleepTimer;
  int _sleepMinutes = 0;

  @override
  void initState() {
    super.initState();
    _audio.addListener(_rebuild);
    PlaylistsService.instance.addListener(_rebuild);
    AppState.instance.addListener(_rebuild);
  }

  @override
  void dispose() {
    _sleepTimer?.cancel();
    _audio.removeListener(_rebuild);
    PlaylistsService.instance.removeListener(_rebuild);
    AppState.instance.removeListener(_rebuild);
    super.dispose();
  }

  void _rebuild() {
    if (mounted) setState(() {});
  }

  void _setSource(String source) {
    final s = AppState.instance;
    s.setText(SirajSettings.playerSourceKey, source);
    // deviceMusicEnabled mirrors "the device source is the active one".
    s.setFlag(SirajSettings.deviceMusicEnabledKey, source == 'device');
  }

  /// Sleep timer: pauses playback after [minutes] (0 = off). Small and safe:
  /// one Timer, cancelled on dispose and whenever the user picks another value.
  void _setSleepTimer(int minutes) {
    _sleepTimer?.cancel();
    if (minutes > 0) {
      _sleepTimer = Timer(Duration(minutes: minutes), () async {
        await _audio.pause();
        if (mounted) setState(() => _sleepMinutes = 0);
      });
    }
    setState(() => _sleepMinutes = minutes);
  }

  Future<void> _playPlaylist(UserPlaylist pl) async {
    final ok = await _audio.playPlaylistById(pl.id);
    if (!mounted) return;
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('قائمة "${pl.title}" فارغة')),
      );
    }
  }

  String _surahName(int number) =>
      quranSurahs.where((s) => s.number == number).firstOrNull?.name ?? '$number';

  @override
  Widget build(BuildContext context) {
    final config = SirajSettings.config();
    final isDevice = config.playerSource == 'device';
    final now = _audio.now;
    final playlists = PlaylistsService.instance.playlists;
    final last = _audio.lastListen;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.slate100),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(Icons.music_note, color: AppColors.violet600, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'المشغّل',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.slate800),
                  ),
                ),
                _SourceChip(label: 'صوتيات التطبيق', selected: !isDevice, onTap: () => _setSource('app')),
                const SizedBox(width: 6),
                _SourceChip(label: 'موسيقى الجهاز', selected: isDevice, onTap: () => _setSource('device')),
              ],
            ),
            const SizedBox(height: 12),
            if (isDevice && !deviceMusicAvailable) _deviceUnavailableNotice(),
            if (isDevice && !deviceMusicAvailable) const SizedBox(height: 12),
            // ---- Now playing (or the neutral empty state) ----
            if (now == null)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(14)),
                child: const Row(
                  children: [
                    Icon(Icons.play_circle_outline, color: AppColors.slate400, size: 22),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'لا يوجد شيء قيد التشغيل',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.slate500),
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    InkWell(
                      onTap: _audio.toggle,
                      borderRadius: BorderRadius.circular(999),
                      child: Container(
                        width: 42,
                        height: 42,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                        child: _audio.buffering
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.violet600))
                            : Icon(_audio.playing ? Icons.pause : Icons.play_arrow, color: AppColors.violet700),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(now.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                          if (now.subtitle.isNotEmpty)
                            Text(now.subtitle, style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                    IconButton(onPressed: _audio.previous, icon: const Icon(Icons.skip_next, color: Colors.white), tooltip: 'السابق'),
                    IconButton(onPressed: _audio.next, icon: const Icon(Icons.skip_previous, color: Colors.white), tooltip: 'التالي'),
                  ],
                ),
              ),
            if (now != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.bedtime, color: AppColors.violet600, size: 18),
                  const SizedBox(width: 8),
                  const Text(
                    'مؤقت النوم',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.slate700),
                  ),
                  const SizedBox(width: 8),
                  for (final m in [0, 15, 30, 60])
                    Padding(
                      padding: const EdgeInsetsDirectional.only(end: 6),
                      child: _SourceChip(
                        label: m == 0 ? 'إيقاف' : '$m د',
                        selected: _sleepMinutes == m,
                        onTap: () => _setSleepTimer(m),
                      ),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            // ---- Playlist picker: user playlists + audio-hub resume ----
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              childrenPadding: EdgeInsets.zero,
              leading: const Icon(Icons.queue_music, color: AppColors.violet600, size: 20),
              title: Text(
                'قوائمي (${playlists.length})',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800),
              ),
              children: [
                if (playlists.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: Text(
                      'لا توجد قوائم بعد — أنشئ قائمة من تبويب الصوتيات.',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate400),
                    ),
                  )
                else
                  for (final pl in playlists)
                    ListTile(
                      dense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                      leading: Icon(
                        _audio.playlistId == pl.id ? Icons.equalizer : Icons.playlist_play,
                        color: AppColors.violet600,
                        size: 20,
                      ),
                      title: Text(pl.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.slate700)),
                      subtitle: Text(
                        '${pl.items.length} عنصر',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400),
                      ),
                      trailing: _audio.playlistId == pl.id && _audio.playing
                          ? const Icon(Icons.graphic_eq, color: AppColors.violet600, size: 18)
                          : null,
                      onTap: () => _playPlaylist(pl),
                    ),
                if (last != null && last['surah'] is int)
                  ListTile(
                    dense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                    leading: const Icon(Icons.history, color: AppColors.slate400, size: 20),
                    title: Text(
                      'آخر استماع: سورة ${_surahName(last['surah'] as int)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.slate700),
                    ),
                    subtitle: Text(
                      '${last['name'] ?? ''} · من مكتبة الاستماع',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _deviceUnavailableNotice() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.amber100,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.amber300),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: AppColors.amber700, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'موسيقى الجهاز غير مدمجة بعد: تشغيل ملفات الصوت على جهازك يحتاج إلى مكتبة الصوتيات (حزمة on_audio_query + إذن READ_MEDIA_AUDIO) وهي غير مثبّتة حاليًا. يبقى تشغيل صوتيات التطبيق متاحًا.',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.amber800, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _SourceChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _SourceChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.violet600 : AppColors.slate100,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: selected ? Colors.white : AppColors.slate600,
          ),
        ),
      ),
    );
  }
}
