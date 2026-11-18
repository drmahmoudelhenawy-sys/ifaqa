import 'dart:async';

import 'package:flutter/material.dart';
import '../data/surahs_data.dart';
import '../services/app_state.dart';
import '../services/audio_service.dart';
import '../services/playlists_service.dart';
import '../theme/app_colors.dart';
import 'device_music.dart';
import 'siraj_settings.dart';

/// Device music is integrated: the `on_audio_query_pluse` package is a real
/// dependency and [DeviceMusicService] queries the device's audio files
/// (playable ones only) and plays them through [AudioService]'s single
/// shared player. Availability at runtime is "permission granted" —
/// [DeviceMusicService.ensurePermission] requests READ_MEDIA_AUDIO on
/// Android 13+ and READ_EXTERNAL_STORAGE below it, and the card below
/// never queries without it. Requires those permissions in
/// AndroidManifest.xml (see [DeviceMusicService]).

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
  final DeviceMusicService _deviceMusic = DeviceMusicService();
  Timer? _sleepTimer;
  int _sleepMinutes = 0;
  // On-device tracks for the 'device' source (empty until loaded).
  List<DeviceSong> _deviceSongs = const [];
  bool _deviceLoading = false;
  DeviceMusicPermissionState? _devicePermission;
  String? _deviceError;

  @override
  void initState() {
    super.initState();
    _audio.addListener(_rebuild);
    PlaylistsService.instance.addListener(_rebuild);
    AppState.instance.addListener(_rebuild);
    if (SirajSettings.config().playerSource == 'device') _loadDeviceSongs();
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
    if (source == 'device') _loadDeviceSongs();
  }

  /// Loads the device track list: asks for the media permission first and
  /// only queries when it is granted. Denials and errors stay in the card
  /// as a notice with a retry / open-settings action — never a crash, and
  /// app-audio playback is untouched.
  Future<void> _loadDeviceSongs() async {
    if (_deviceLoading) return;
    setState(() {
      _deviceLoading = true;
      _deviceError = null;
    });
    try {
      final permission = await _deviceMusic.ensurePermission();
      if (!mounted) return;
      setState(() => _devicePermission = permission);
      if (permission != DeviceMusicPermissionState.granted) {
        setState(() {
          _deviceLoading = false;
          _deviceSongs = const [];
        });
        return;
      }
      final songs = await _deviceMusic.querySongs();
      if (!mounted) return;
      setState(() {
        _deviceSongs = songs;
        _deviceLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _deviceLoading = false;
        _deviceError = '$e';
      });
    }
  }

  Future<void> _playDeviceSong(int index) async {
    await _audio.playDeviceSongs(_deviceSongs, startIndex: index);
  }

  String _formatDuration(int ms) {
    final totalSecs = ms ~/ 1000;
    return '${totalSecs ~/ 60}:${(totalSecs % 60).toString().padLeft(2, '0')}';
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
            // ---- Device source: on-device track list. App source: the
            // playlist picker below, exactly as before. ----
            if (isDevice) _deviceSection(),
            if (!isDevice)
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

  /// Device-source section: loading state, permission notice (denied /
  /// permanently denied / error), empty state, or the track list.
  /// Tap a track to play it through [AudioService]'s shared player.
  Widget _deviceSection() {
    if (_deviceLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.violet600)),
            SizedBox(width: 10),
            Text(
              'جارٍ تحميل موسيقى الجهاز…',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500),
            ),
          ],
        ),
      );
    }
    if (_deviceError != null) {
      return _deviceNotice(
        icon: Icons.error_outline,
        text: 'تعذّر تحميل موسيقى الجهاز. تحقّق من الإذن ثم أعد المحاولة.',
        actions: [
          TextButton(onPressed: _loadDeviceSongs, child: const Text('إعادة المحاولة')),
        ],
      );
    }
    if (_devicePermission != null && _devicePermission != DeviceMusicPermissionState.granted) {
      final permanent = _devicePermission == DeviceMusicPermissionState.permanentlyDenied;
      return _deviceNotice(
        icon: Icons.folder_off_outlined,
        text: permanent
            ? 'لعرض موسيقى الجهاز يحتاج التطبيق إلى إذن الوصول إلى ملفات الصوت، وقد تم رفضه نهائيًا. فعّله من إعدادات التطبيق ثم عُد هنا.'
            : 'لعرض موسيقى الجهاز يحتاج التطبيق إلى إذن الوصول إلى ملفات الصوت على جهازك. اسمح بالإذن ثم أعد المحاولة.',
        actions: [
          if (permanent)
            TextButton(onPressed: () => _deviceMusic.openSettings(), child: const Text('فتح الإعدادات')),
          TextButton(onPressed: _loadDeviceSongs, child: const Text('إعادة المحاولة')),
        ],
      );
    }
    if (_deviceSongs.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'لا توجد ملفات صوتية على جهازك.',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate400),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(Icons.folder_open, color: AppColors.violet600, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'ملفات الصوت (${_deviceSongs.length})',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800),
              ),
            ),
            InkWell(
              onTap: _loadDeviceSongs,
              borderRadius: BorderRadius.circular(999),
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Icon(Icons.refresh, color: AppColors.slate400, size: 18),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        for (var i = 0; i < _deviceSongs.length; i++)
          ListTile(
            dense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 4),
            leading: Icon(
              _audio.inDeviceMusic && _audio.player.currentIndex == i ? Icons.equalizer : Icons.music_note,
              color: AppColors.violet600,
              size: 20,
            ),
            title: Text(
              _deviceSongs[i].title,
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.slate700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              _deviceSongs[i].artist.isEmpty ? _formatDuration(_deviceSongs[i].durationMs) : '${_deviceSongs[i].artist} · ${_formatDuration(_deviceSongs[i].durationMs)}',
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: _audio.inDeviceMusic && _audio.player.currentIndex == i && _audio.playing
                ? const Icon(Icons.graphic_eq, color: AppColors.violet600, size: 18)
                : null,
            onTap: () => _playDeviceSong(i),
          ),
      ],
    );
  }

  Widget _deviceNotice({required IconData icon, required String text, List<Widget> actions = const []}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.amber100,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.amber300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: AppColors.amber700, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  text,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.amber800, height: 1.5),
                ),
              ),
            ],
          ),
          if (actions.isNotEmpty)
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: actions,
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
