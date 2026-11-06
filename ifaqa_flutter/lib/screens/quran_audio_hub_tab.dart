import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../data/surahs_data.dart';
import '../models/reciter.dart';
import '../services/reciter_service.dart';
import '../theme/app_colors.dart';

class QuranAudioHubTab extends StatefulWidget {
  const QuranAudioHubTab({super.key});

  @override
  State<QuranAudioHubTab> createState() => _QuranAudioHubTabState();
}

class _QuranAudioHubTabState extends State<QuranAudioHubTab> {
  final AudioPlayer _player = AudioPlayer();
  List<Reciter>? reciters;
  bool loading = true;
  String? error;
  String query = '';
  Reciter? selectedReciter;
  int? currentSurah;
  bool isBuffering = false;

  @override
  void initState() {
    super.initState();
    _load();
    _player.playerStateStream.listen((state) {
      if (!mounted) return;
      setState(() => isBuffering = state.processingState == ProcessingState.loading || state.processingState == ProcessingState.buffering);
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await fetchReciters();
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
    setState(() => currentSurah = surahNumber);
    try {
      await _player.setUrl(selectedReciter!.surahUrl(surahNumber));
      await _player.play();
    } catch (_) {}
  }

  Future<void> _togglePlay() async {
    if (currentSurah == null) return;
    if (_player.playing) {
      await _player.pause();
    } else {
      await _player.play();
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: selectedReciter == null ? _buildRecitersList() : _buildSurahsList(),
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
                                  Container(
                                    width: 42,
                                    height: 42,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(14)),
                                    child: const Icon(Icons.person, color: AppColors.indigo600, size: 20),
                                  ),
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
    final isPlaying = _player.playing;
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
