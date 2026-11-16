import 'package:just_audio/just_audio.dart' show ProcessingState;
import 'package:flutter/material.dart';
import '../models/radio_station.dart';
import '../services/audio_service.dart';
import '../services/radio_service.dart';
import '../theme/app_colors.dart';

class RadioScreen extends StatefulWidget {
  const RadioScreen({super.key});

  @override
  State<RadioScreen> createState() => _RadioScreenState();
}

class _RadioScreenState extends State<RadioScreen> {
  final AudioService _audio = AudioService.instance;
  RadioCategory activeCategory = RadioCategory.reciters;
  List<RadioStation> reciterStations = [];
  bool loading = true;
  String query = '';
  RadioStation? currentStation;
  bool get isBuffering => _audio.buffering;
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
    _audio.addListener(_onAudio);
  }

  Future<void> _load() async {
    final stations = await fetchReciterStations();
    if (!mounted) return;
    setState(() {
      reciterStations = stations;
      loading = false;
    });
  }

  @override
  void dispose() {
    _audio.removeListener(_onAudio);
    super.dispose();
  }

  void _onAudio() {
    if (!mounted) return;
    // Another source took over the shared player.
    if (currentStation != null && (_audio.now?.title != currentStation!.name)) currentStation = null;
    setState(() {});
  }

  List<RadioStation> get _visibleStations => activeCategory == RadioCategory.live ? liveStations : reciterStations;

  List<RadioStation> get _filtered {
    if (query.trim().isEmpty) return _visibleStations;
    return _visibleStations.where((s) => s.name.contains(query)).toList();
  }

  Future<void> _selectStation(RadioStation station) async {
    setState(() {
      currentStation = station;
      error = null;
    });
    await _audio.playLive(station.name, 'إذاعة القرآن الكريم', station.url);
    if (mounted && _audio.player.processingState == ProcessingState.idle) setState(() => error = 'تعذر تشغيل هذه الإذاعة الآن');
  }

  Future<void> _togglePlay() async {
    if (currentStation == null) return;
    await _audio.toggle();
  }

  @override
  Widget build(BuildContext context) {
    final isPlaying = _audio.playing;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(backgroundColor: AppColors.slate50, elevation: 0, foregroundColor: AppColors.slate800, title: const Text('إذاعة القرآن الكريم', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)), centerTitle: true),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600, Color(0xFF312E81)]),
                  borderRadius: BorderRadius.circular(36),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 88,
                      height: 88,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(28), border: Border.all(color: Colors.white.withValues(alpha: 0.2))),
                      child: Icon(currentStation?.category == RadioCategory.live ? Icons.podcasts : Icons.radio, color: Colors.white, size: 44),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 50,
                      child: Center(
                        child: Text(currentStation?.name ?? 'اختر إذاعة للتشغيل', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.music_note, color: Colors.white70, size: 12),
                        const SizedBox(width: 6),
                        Text(
                          error ?? (isBuffering ? 'جارٍ الاتصال بالبث' : (isPlaying ? 'بث مباشر الآن' : 'جاهز للتشغيل')),
                          style: const TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    InkWell(
                      onTap: currentStation == null ? null : _togglePlay,
                      borderRadius: BorderRadius.circular(999),
                      child: Container(
                        width: 64,
                        height: 64,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                        child: isBuffering
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.indigo600))
                            : Icon(isPlaying ? Icons.pause : Icons.play_arrow, color: AppColors.indigo700, size: 34),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: _categoryChip('إذاعات القراء', RadioCategory.reciters),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _categoryChip('بث مباشر', RadioCategory.live),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                onChanged: (v) => setState(() => query = v),
                textAlign: TextAlign.right,
                decoration: InputDecoration(
                  hintText: activeCategory == RadioCategory.live ? 'ابحث عن بث مباشر...' : 'ابحث عن قارئ...',
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
              child: loading && activeCategory == RadioCategory.reciters
                  ? const Center(child: CircularProgressIndicator())
                  : _filtered.isEmpty
                      ? const Center(child: Text('لا يوجد نتائج', style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.bold)))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                          itemCount: _filtered.length,
                          itemBuilder: (context, i) {
                            final station = _filtered[i];
                            final isCurrent = currentStation?.id == station.id;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: InkWell(
                                onTap: () => _selectStation(station),
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: isCurrent ? const Color(0xFFF5F3FF) : Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: isCurrent ? const Color(0xFFDDD6FE) : AppColors.slate100),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        alignment: Alignment.center,
                                        decoration: BoxDecoration(color: isCurrent ? AppColors.violet600 : AppColors.slate100, borderRadius: BorderRadius.circular(14)),
                                        child: Icon(
                                          station.category == RadioCategory.live ? Icons.podcasts : Icons.play_arrow,
                                          color: isCurrent ? Colors.white : AppColors.slate400,
                                          size: 18,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(station.name, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: isCurrent ? AppColors.violet700 : AppColors.slate700)),
                                            Text(station.subtitle ?? 'بث مباشر', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                                          ],
                                        ),
                                      ),
                                      if (isCurrent) Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.violet600, shape: BoxShape.circle)),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _categoryChip(String label, RadioCategory cat) {
    final active = activeCategory == cat;
    return InkWell(
      onTap: () => setState(() => activeCategory = cat),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? AppColors.violet600 : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? Colors.transparent : AppColors.slate200),
        ),
        child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: active ? Colors.white : AppColors.slate600)),
      ),
    );
  }
}
