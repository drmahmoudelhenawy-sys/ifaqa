import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'dart:convert';
import '../services/app_state.dart';
import '../services/hadith_service.dart';
import '../services/mushaf_service.dart';
import '../services/offline_store/offline_store.dart';
import '../services/quran_search_service.dart' show tafsirEditions;
import '../services/tafsir_offline_service.dart';
import '../theme/app_colors.dart';

class DownloadsScreen extends StatefulWidget {
  const DownloadsScreen({super.key});

  @override
  State<DownloadsScreen> createState() => _DownloadsScreenState();
}

class _DownloadsScreenState extends State<DownloadsScreen> {
  int? _downloaded;
  bool _running = false;
  bool _stopRequested = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _refreshCount();
  }

  @override
  void dispose() {
    _stopRequested = true;
    super.dispose();
  }

  Future<void> _refreshCount() async {
    final count = await MushafService.instance.downloadedPageCount();
    if (mounted) setState(() => _downloaded = count);
  }

  Future<void> _start() async {
    setState(() {
      _running = true;
      _stopRequested = false;
      _failed = false;
    });
    final complete = await MushafService.instance.downloadAll(
      shouldStop: () => _stopRequested,
      onProgress: (count) {
        if (mounted) setState(() => _downloaded = count);
      },
    );
    if (!mounted) return;
    setState(() {
      _running = false;
      _failed = !complete && !_stopRequested;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(
          backgroundColor: AppColors.slate50,
          elevation: 0,
          foregroundColor: AppColors.slate800,
          title: const Text('مركز التنزيلات', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildMushafCard(),
            if (OfflineStore.supported) ...[
              const SizedBox(height: 14),
              const _HadithDownloads(),
              const SizedBox(height: 14),
              const _TafsirDownloads(),
              const SizedBox(height: 14),
              const _AudioDownloads(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMushafCard() {
    final count = _downloaded ?? 0;
    final total = MushafService.pageCount;
    final done = count >= total;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.menu_book, color: AppColors.emerald600),
              SizedBox(width: 10),
              Expanded(child: Text('مصحف المدينة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.slate900))),
            ],
          ),
          const SizedBox(height: 8),
          if (kIsWeb)
            const Text(
              'التنزيل الكامل متاح في تطبيق الموبايل. على الويب يحتفظ المتصفح بالصفحات التي فتحتها.',
              style: TextStyle(fontSize: 12, height: 1.7, fontWeight: FontWeight.bold, color: AppColors.slate500),
            )
          else ...[
            const Text(
              'نزّل خطوط صفحات المصحف الـ604 لتقرأ بدون إنترنت (التخطيط مضمّن في التطبيق). يحتاج التنزيل مساحة بمئات الميجابايت، ويفضل استخدام Wi-Fi.',
              style: TextStyle(fontSize: 12, height: 1.7, fontWeight: FontWeight.bold, color: AppColors.slate500),
            ),
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: count / total,
                minHeight: 8,
                backgroundColor: AppColors.slate100,
                valueColor: const AlwaysStoppedAnimation(AppColors.emerald600),
              ),
            ),
            const SizedBox(height: 6),
            Text('$count من $total صفحة', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate500)),
            if (_failed)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('توقف التنزيل بسبب خطأ في الاتصال. يمكنك المتابعة من حيث توقف.', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.rose500)),
              ),
            const SizedBox(height: 14),
            if (!done)
              FilledButton(
                onPressed: _downloaded == null ? null : (_running ? () => setState(() => _stopRequested = true) : _start),
                style: FilledButton.styleFrom(backgroundColor: _running ? AppColors.slate700 : AppColors.emerald600),
                child: Text(_running ? 'إيقاف' : (count > 0 ? 'متابعة التنزيل' : 'تنزيل المصحف'), style: const TextStyle(fontWeight: FontWeight.w900)),
              )
            else
              const Text('المصحف كامل على جهازك ✓', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.emerald700)),
          ],
        ],
      ),
    );
  }
}

String _mb(int bytes) => '${(bytes / (1024 * 1024)).toStringAsFixed(1)} م.ب';

Widget _card(IconData icon, Color color, String title, List<Widget> children) => Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Icon(icon, color: color),
            const SizedBox(width: 10),
            Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.slate900))),
          ]),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );

/// Hadith books saved for reading offline (React `HadithDownloadModal`).
class _HadithDownloads extends StatefulWidget {
  const _HadithDownloads();

  @override
  State<_HadithDownloads> createState() => _HadithDownloadsState();
}

class _HadithDownloadsState extends State<_HadithDownloads> {
  final Map<String, bool> saved = {};
  final Map<String, double> progress = {};

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    for (final c in hadithCollections) {
      saved[c.edition] = await OfflineStore.instance.has(hadithOfflinePath(c.edition));
    }
    if (mounted) setState(() {});
  }

  Future<void> _download(HadithCollection c) async {
    setState(() => progress[c.edition] = 0);
    try {
      await OfflineStore.instance.download(hadithUrl(c.edition), hadithOfflinePath(c.edition), onProgress: (v) {
        if (mounted) setState(() => progress[c.edition] = v);
      });
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تعذر تنزيل ${c.name}، تحقق من الاتصال.')));
    }
    progress.remove(c.edition);
    await _refresh();
  }

  @override
  Widget build(BuildContext context) => _card(Icons.auto_stories, AppColors.amber600, 'كتب الحديث', [
        const Text('نزّل الكتاب لتتصفحه وتبحث فيه بدون إنترنت.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500)),
        const SizedBox(height: 6),
        ...hadithCollections.map((c) {
          final p = progress[c.edition];
          final has = saved[c.edition] == true;
          return ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
            subtitle: p != null
                ? LinearProgressIndicator(value: p > 0 ? p : null)
                : (has ? const Text('محفوظ على الجهاز ✓', style: TextStyle(color: AppColors.emerald600, fontSize: 11)) : null),
            trailing: p != null
                ? null
                : has
                    ? IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppColors.rose500),
                        onPressed: () async {
                          await OfflineStore.instance.delete(hadithOfflinePath(c.edition));
                          await _refresh();
                        },
                      )
                    : IconButton(icon: const Icon(Icons.download, color: AppColors.emerald600), onPressed: () => _download(c)),
          );
        }),
      ]);
}

/// Tafsir editions saved for reading offline.
class _TafsirDownloads extends StatefulWidget {
  const _TafsirDownloads();

  @override
  State<_TafsirDownloads> createState() => _TafsirDownloadsState();
}

class _TafsirDownloadsState extends State<_TafsirDownloads> {
  final Map<int, int> saved = {};
  final Map<int, double> progress = {};

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    for (final e in tafsirEditions.keys) {
      saved[e] = await tafsirDownloaded(e);
    }
    if (mounted) setState(() {});
  }

  Future<void> _download(int e) async {
    setState(() => progress[e] = 0);
    try {
      await downloadTafsir(e, onProgress: (v) {
        if (mounted) setState(() => progress[e] = v);
      });
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تعذر تنزيل تفسير ${tafsirEditions[e]}، يمكنك الاستئناف لاحقاً.')));
    }
    progress.remove(e);
    await _refresh();
  }

  @override
  Widget build(BuildContext context) => _card(Icons.menu_book, AppColors.violet600, 'التفاسير', [
        const Text('نزّل التفسير لقراءته بدون إنترنت. إذا انقطع التنزيل يكمل من حيث توقف.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500)),
        const SizedBox(height: 6),
        ...tafsirEditions.entries.map((en) {
          final p = progress[en.key];
          final n = saved[en.key] ?? 0;
          return ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(en.value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
            subtitle: p != null
                ? LinearProgressIndicator(value: p > 0 ? p : null)
                : (n >= 114
                    ? const Text('محفوظ على الجهاز ✓', style: TextStyle(color: AppColors.emerald600, fontSize: 11))
                    : (n > 0 ? Text('محفوظ $n من 114 سورة', style: const TextStyle(color: AppColors.amber600, fontSize: 11)) : null)),
            trailing: p != null
                ? null
                : Row(mainAxisSize: MainAxisSize.min, children: [
                    if (n > 0)
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppColors.rose500),
                        onPressed: () async {
                          await deleteTafsir(en.key);
                          await _refresh();
                        },
                      ),
                    if (n < 114) IconButton(icon: const Icon(Icons.download, color: AppColors.emerald600), onPressed: () => _download(en.key)),
                  ]),
          );
        }),
      ]);
}

/// Recitations saved from the listening tab.
class _AudioDownloads extends StatefulWidget {
  const _AudioDownloads();

  @override
  State<_AudioDownloads> createState() => _AudioDownloadsState();
}

class _AudioDownloadsState extends State<_AudioDownloads> {
  List<String> files = const [];
  int bytes = 0;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    files = await OfflineStore.instance.list('audio');
    bytes = await OfflineStore.instance.sizeOf('audio');
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final names = Map<String, dynamic>.from(jsonDecode(AppState.instance.text('offline_reciters') ?? '{}') as Map);
    final byReciter = <String, int>{};
    for (final f in files) {
      final parts = f.split('/');
      if (parts.length >= 3) byReciter[parts[1]] = (byReciter[parts[1]] ?? 0) + 1;
    }
    return _card(Icons.headphones, AppColors.indigo600, 'التلاوات المحفوظة', [
      Text(files.isEmpty ? 'نزّل أي سورة من تبويب «استماع» بزر التنزيل بجانبها.' : '${files.length} سورة · ${_mb(bytes)}',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500)),
      ...byReciter.entries.map((e) => ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(((names[e.key] as Map?)?['name'] as String?) ?? 'قارئ', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
            subtitle: Text('${e.value} سورة'),
            trailing: IconButton(
              icon: const Icon(Icons.delete_outline, color: AppColors.rose500),
              onPressed: () async {
                for (final f in files.where((f) => f.startsWith('audio/${e.key}/'))) {
                  await OfflineStore.instance.delete(f);
                }
                await _refresh();
              },
            ),
          )),
    ]);
  }
}
