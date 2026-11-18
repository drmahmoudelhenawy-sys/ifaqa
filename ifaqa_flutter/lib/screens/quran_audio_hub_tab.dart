import 'package:flutter/material.dart';
import '../data/surahs_data.dart';
import '../models/reciter.dart';
import '../services/app_state.dart';
import '../services/audio_service.dart';
import '../services/offline_store/offline_store.dart';
import '../services/playlists_service.dart';
import '../services/reciter_service.dart';
import '../siraj/siraj_settings.dart';
import '../theme/app_colors.dart';
import '../widgets/playlists_view.dart';
import '../widgets/reciter_photo.dart';
import '../services/reciter_photo_service.dart';

class QuranAudioHubTab extends StatefulWidget {
  const QuranAudioHubTab({super.key});

  @override
  State<QuranAudioHubTab> createState() => _QuranAudioHubTabState();
}

class _QuranAudioHubTabState extends State<QuranAudioHubTab> {
  final AudioService _audio = AudioService.instance;
  List<Reciter>? reciters;
  bool loading = true;
  String? error;
  String query = '';
  Reciter? selectedReciter;
  bool showPlaylists = false;
  int? get currentSurah => _audio.now?.reciter?.id == selectedReciter?.id ? _audio.now?.surah : null;
  bool get isBuffering => _audio.buffering;

  @override
  void initState() {
    super.initState();
    _load();
    _audio.addListener(_onAudio);
  }

  @override
  void dispose() {
    _audio.removeListener(_onAudio);
    super.dispose();
  }

  void _onAudio() {
    if (mounted) setState(() {});
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await fetchReciters();
      ReciterPhotoService.instance.start();
      ReciterPhotoService.instance.registerReciters(result);
      if (!mounted) return;
      setState(() {
        reciters = result;
        loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        error = 'تعذر تحميل قائمة القراء. تأكد من اتصال الإنترنت.';
        loading = false;
      });
    }
  }

  Future<void> _playSurah(int surahNumber) async {
    if (selectedReciter == null) return;
    if (currentSurah == surahNumber) return _audio.toggle();
    await _audio.playSurah(selectedReciter!, surahNumber);
  }

  Future<void> _togglePlay() => _audio.toggle();

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: showPlaylists
          ? PlaylistsView(onBack: () => setState(() => showPlaylists = false))
          : selectedReciter == null
              ? _buildRecitersList()
              : _buildSurahsList(),
    );
  }

  Widget _buildListenSummary() {
    final last = _audio.lastListen;
    final lastReciter = last == null ? null : reciters?.where((r) => r.id == last['id']).firstOrNull;
    final today = _audio.minutesOn(DateTime.now());
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.slate100)),
              child: Row(children: [
                const Icon(Icons.timer_outlined, color: AppColors.indigo600, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('اليوم $today د · الإجمالي ${_audio.totalMinutes} د',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11, color: AppColors.slate700)),
                ),
              ]),
            ),
          ),
          if (lastReciter != null && last!['surah'] is int) ...[
            const SizedBox(width: 8),
            FilledButton.icon(
              onPressed: () {
                setState(() => selectedReciter = lastReciter);
                _audio.playSurah(lastReciter, last['surah'] as int);
              },
              icon: const Icon(Icons.play_arrow, size: 18),
              label: const Text('تابع الاستماع', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
              style: FilledButton.styleFrom(backgroundColor: AppColors.indigo600, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPlaylistsEntry() {
    final n = PlaylistsService.instance.playlists.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: InkWell(
        onTap: () => setState(() => showPlaylists = true),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
          decoration: BoxDecoration(color: const Color(0xFFF5F3FF), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFDDD6FE))),
          child: Row(children: [
            const Icon(Icons.queue_music, color: AppColors.violet600, size: 20),
            const SizedBox(width: 10),
            Expanded(child: Text('قوائمي ($n)', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.violet700))),
            const Icon(Icons.chevron_left, color: AppColors.slate300),
          ]),
        ),
      ),
    );
  }

  Widget _buildRecitersList() {
    final filtered = (reciters ?? []).where((r) => query.trim().isEmpty || r.name.contains(query)).toList();
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppColors.indigo600, AppColors.violet700]), borderRadius: BorderRadius.circular(28)),
            child: const Row(
              children: [
                Icon(Icons.headphones, color: Colors.white, size: 26),
                SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('مكتبة الاستماع', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                      SizedBox(height: 2),
                      Text('اختر قارئك المفضل واستمع لأي سورة', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        _buildListenSummary(),
        _buildPlaylistsEntry(),
        const _DeviceMusicEntry(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            onChanged: (v) => setState(() => query = v),
            textAlign: TextAlign.right,
            decoration: InputDecoration(
              hintText: 'ابحث عن قارئ...',
              prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.slate400),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : error != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.rose500, size: 32),
                            const SizedBox(height: 10),
                            Text(error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate500, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 14),
                            FilledButton(onPressed: _load, style: FilledButton.styleFrom(backgroundColor: AppColors.violet600), child: const Text('إعادة المحاولة')),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                      itemCount: filtered.length,
                      itemBuilder: (context, i) {
                        final r = filtered[i];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            onTap: () => setState(() => selectedReciter = r),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.slate100)),
                              child: Row(
                                children: [
                                  ReciterPhoto(reciterId: r.id),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(r.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
                                        Text('${r.surahList.length} سورة متاحة', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_left, color: AppColors.slate300),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildSurahsList() {
    final reciter = selectedReciter!;
    final surahs = quranSurahs.where((s) => reciter.surahList.contains(s.number)).toList();
    final isPlaying = _audio.playing;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Row(
            children: [
              InkWell(
                onTap: () => setState(() => selectedReciter = null),
                borderRadius: BorderRadius.circular(14),
                child: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.slate100)), child: const Icon(Icons.chevron_right, size: 18)),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(reciter.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.slate800), overflow: TextOverflow.ellipsis)),
            ],
          ),
        ),
        if (currentSurah != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(gradient: const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600]), borderRadius: BorderRadius.circular(22)),
              child: Row(
                children: [
                  InkWell(
                    onTap: _togglePlay,
                    borderRadius: BorderRadius.circular(999),
                    child: Container(
                      width: 42,
                      height: 42,
                      alignment: Alignment.center,
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      child: isBuffering
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.violet600))
                          : Icon(isPlaying ? Icons.pause : Icons.play_arrow, color: AppColors.violet700),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'سورة ${quranSurahs.firstWhere((s) => s.number == currentSurah).name}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                    ),
                  ),
                  const Icon(Icons.graphic_eq, color: Colors.white70, size: 18),
                ],
              ),
            ),
          ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            itemCount: surahs.length,
            itemBuilder: (context, i) {
              final s = surahs[i];
              final isCurrent = currentSurah == s.number;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => _playSurah(s.number),
                  onLongPress: () => showAddToPlaylistSheet(context, reciter, s.number),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isCurrent ? const Color(0xFFF5F3FF) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isCurrent ? const Color(0xFFDDD6FE) : AppColors.slate100),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(color: isCurrent ? AppColors.violet600 : AppColors.slate100, borderRadius: BorderRadius.circular(10)),
                          child: Text('${s.number}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: isCurrent ? Colors.white : AppColors.slate500)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(child: Text('سورة ${s.name}', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: isCurrent ? AppColors.violet700 : AppColors.slate700))),
                        InkWell(
                          onTap: () => showAddToPlaylistSheet(context, reciter, s.number),
                          customBorder: const CircleBorder(),
                          child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.playlist_add, color: AppColors.slate400, size: 20)),
                        ),
                        if (OfflineStore.supported) _DownloadButton(reciter: reciter, surah: s.number),
                        Icon(isCurrent && isPlaying ? Icons.pause_circle : Icons.play_circle, color: isCurrent ? AppColors.violet600 : AppColors.slate300, size: 22),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Small device-music status row for the Siraj player source switch.
/// Honest unavailable state: no on-device audio library is integrated yet
/// (see lib/siraj/siraj_player.dart), so this only reports the selected
/// source and never pretends to list device tracks.
class _DeviceMusicEntry extends StatefulWidget {
  const _DeviceMusicEntry();

  @override
  State<_DeviceMusicEntry> createState() => _DeviceMusicEntryState();
}

class _DeviceMusicEntryState extends State<_DeviceMusicEntry> {
  @override
  void initState() {
    super.initState();
    AppState.instance.addListener(_rebuild);
  }

  @override
  void dispose() {
    AppState.instance.removeListener(_rebuild);
    super.dispose();
  }

  void _rebuild() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final isDevice = SirajSettings.config().playerSource == 'device';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
        decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.slate100)),
        child: Row(children: [
          const Icon(Icons.folder_open, color: AppColors.slate400, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              isDevice
                  ? 'مصدر التشغيل: موسيقى الجهاز (غير مدمجة بعد)'
                  : 'مصدر التشغيل: صوتيات التطبيق',
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.slate600),
            ),
          ),
          InkWell(
            onTap: () {
              final s = AppState.instance;
              final next = isDevice ? 'app' : 'device';
              s.setText(SirajSettings.playerSourceKey, next);
              s.setFlag(SirajSettings.deviceMusicEnabledKey, next == 'device');
            },
            borderRadius: BorderRadius.circular(999),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 10),
              decoration: BoxDecoration(color: isDevice ? AppColors.violet600 : AppColors.slate200, borderRadius: BorderRadius.circular(999)),
              child: Text(isDevice ? 'التبديل للتطبيق' : 'التبديل للجهاز', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: isDevice ? Colors.white : AppColors.slate600)),
            ),
          ),
        ]),
      ),
    );
  }
}

class _DownloadButton extends StatefulWidget {
  final Reciter reciter;
  final int surah;
  const _DownloadButton({required this.reciter, required this.surah});

  @override
  State<_DownloadButton> createState() => _DownloadButtonState();
}

class _DownloadButtonState extends State<_DownloadButton> {
  bool? saved;
  double? progress;

  String get _path => AudioService.audioOfflinePath(widget.reciter, widget.surah);

  @override
  void initState() {
    super.initState();
    OfflineStore.instance.has(_path).then((v) {
      if (mounted) setState(() => saved = v);
    });
  }

  Future<void> _download() async {
    setState(() => progress = 0);
    try {
      await AudioService.instance.download(widget.reciter, widget.surah, onProgress: (v) {
        if (mounted) setState(() => progress = v);
      });
      if (mounted) setState(() => saved = true);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر التنزيل، تحقق من الاتصال.')));
    }
    if (mounted) setState(() => progress = null);
  }

  @override
  Widget build(BuildContext context) {
    final p = progress;
    if (p != null) {
      return Padding(padding: const EdgeInsets.all(10), child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(value: p > 0 ? p : null, strokeWidth: 2)));
    }
    if (saved == true) return const Padding(padding: EdgeInsets.all(10), child: Icon(Icons.offline_pin, color: AppColors.emerald500, size: 20));
    return IconButton(onPressed: saved == null ? null : _download, icon: const Icon(Icons.download, color: AppColors.slate400, size: 20), tooltip: 'تنزيل');
  }
}
