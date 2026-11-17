import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../data/surahs_data.dart';
import '../models/surah_info.dart';
import '../services/app_state.dart';
import '../services/ayah_tools_service.dart';
import '../services/mushaf_service.dart';
import '../services/quran_progress_service.dart';
import '../services/quran_search_service.dart';
import '../theme/app_colors.dart';

/// Ayat of one page with their tafsir, expandable one at a time.
class _PageTafsirSheet extends StatefulWidget {
  final int page;
  const _PageTafsirSheet({required this.page});

  @override
  State<_PageTafsirSheet> createState() => _PageTafsirSheetState();
}

class _PageTafsirSheetState extends State<_PageTafsirSheet> {
  late Future<List<PageAyah>> _ayat = fetchPageAyat(widget.page);
  late int edition = AppState.instance.number('tafsir_edition', fallback: 16);
  final Map<String, Future<String>> _tafsir = {};

  Future<String> _tafsirFor(PageAyah a) => _tafsir.putIfAbsent('$edition:${a.surah}:${a.ayah}', () => fetchTafsir(a.surah, a.ayah, edition: edition));

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        minChildSize: 0.4,
        builder: (context, scroll) => Container(
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.slate200, borderRadius: BorderRadius.circular(9))),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                child: Row(
                  children: [
                    Text('تفسير الصفحة ${widget.page}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                    const Spacer(),
                    DropdownButton<int>(
                      value: edition,
                      underline: const SizedBox(),
                      items: tafsirEditions.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, style: const TextStyle(fontWeight: FontWeight.bold)))).toList(),
                      onChanged: (v) {
                        if (v == null) return;
                        AppState.instance.setNumber('tafsir_edition', v);
                        setState(() => edition = v);
                      },
                    ),
                  ],
                ),
              ),
              Expanded(
                child: FutureBuilder<List<PageAyah>>(
                  future: _ayat,
                  builder: (context, snap) {
                    if (snap.hasError) {
                      return Center(
                        child: TextButton.icon(
                          onPressed: () => setState(() => _ayat = fetchPageAyat(widget.page)),
                          icon: const Icon(Icons.refresh),
                          label: const Text('تعذر التحميل، أعد المحاولة'),
                        ),
                      );
                    }
                    if (!snap.hasData) return const Center(child: CircularProgressIndicator(color: AppColors.emerald600));
                    final ayat = snap.data!;
                    return ListView.builder(
                      controller: scroll,
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                      itemCount: ayat.length,
                      itemBuilder: (_, i) {
                        final a = ayat[i];
                        return Card(
                          elevation: 0,
                          color: const Color(0xFFFBF8F1),
                          margin: const EdgeInsets.only(bottom: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                          child: ExpansionTile(
                            key: ValueKey('$edition-${a.surah}-${a.ayah}'),
                            shape: const Border(),
                            title: Text(
                              '${a.text} ﴿${_arabicDigits(a.ayah)}﴾',
                              style: const TextStyle(fontFamily: 'Amiri', fontSize: 19, height: 1.9, color: AppColors.slate900),
                            ),
                            subtitle: Text('${quranSurahs[a.surah - 1].name} · آية ${a.ayah}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                            childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                            children: [
                              _AyahTools(
                                ayah: a,
                                tafsir: FutureBuilder<String>(
                                  future: _tafsirFor(a),
                                  builder: (context, t) {
                                    if (t.hasError) return const Text('تعذر تحميل التفسير.', style: TextStyle(color: AppColors.rose500));
                                    if (!t.hasData) return const LinearProgressIndicator(color: AppColors.emerald500);
                                    return Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        SelectableText(t.data!, style: const TextStyle(fontSize: 14, height: 1.9, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                                        Align(
                                          alignment: AlignmentDirectional.centerEnd,
                                          child: IconButton(
                                            icon: const Icon(Icons.copy, size: 18, color: AppColors.slate400),
                                            onPressed: () => Clipboard.setData(ClipboardData(text: '${a.text}\n\n${tafsirEditions[edition]}: ${t.data!}')),
                                          ),
                                        ),
                                      ],
                                    );
                                  },
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class QuranReaderScreen extends StatefulWidget {
  final int initialPage;
  const QuranReaderScreen({super.key, required this.initialPage});

  factory QuranReaderScreen.surah(SurahInfo surah, {Key? key}) =>
      QuranReaderScreen(key: key, initialPage: surah.startPage);

  @override
  State<QuranReaderScreen> createState() => _QuranReaderScreenState();
}

class _QuranReaderScreenState extends State<QuranReaderScreen> {
  static const Color _paper = Color(0xFFFBF8F1);

  late final PageController _pageController;
  late int currentPage;
  final _progress = QuranProgressService.instance;
  Timer? _readTimer;
  int _secondsOnPage = 0;

  @override
  void initState() {
    super.initState();
    currentPage = widget.initialPage;
    _pageController = PageController(initialPage: currentPage - 1);
    _onPageShown(currentPage);
  }

  @override
  void dispose() {
    _readTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _onPageShown(int page) {
    MushafService.instance.saveLastReadPage(page);
    MushafService.instance.preload(page + 1);
    MushafService.instance.preload(page - 1);
    _readTimer?.cancel();
    _secondsOnPage = 0;
    if (_progress.readToday(page)) return;
    // A page counts once the reader has stayed on it for 20 seconds.
    _readTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted || currentPage != page) return t.cancel();
      setState(() => _secondsOnPage++);
      if (_secondsOnPage >= QuranProgressService.secondsToCount) {
        t.cancel();
        if (_progress.markRead(page) && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            duration: const Duration(seconds: 2),
            backgroundColor: AppColors.emerald600,
            content: Text('تقبل الله، صفحة $page +${QuranProgressService.pageXp} XP', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900)),
          ));
        }
      }
    });
  }

  void _openTafsir() => showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _PageTafsirSheet(page: currentPage),
      );

  SurahInfo get _surahOfPage => quranSurahs.lastWhere((s) => s.startPage <= currentPage);

  Future<void> _askForPage() async {
    final page = await showDialog<int>(
      context: context,
      builder: (_) => _GoToPageDialog(currentPage: currentPage),
    );
    if (page != null && _pageController.hasClients) _pageController.jumpToPage(page - 1);
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: _paper,
        body: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: MushafService.pageCount,
                  onPageChanged: (index) {
                    setState(() => currentPage = index + 1);
                    _onPageShown(index + 1);
                  },
                  itemBuilder: (context, index) => _MushafPage(key: ValueKey(index + 1), page: index + 1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(color: Colors.white, border: Border(bottom: BorderSide(color: AppColors.slate200))),
      child: Row(
        children: [
          InkWell(
            onTap: () => Navigator.of(context).pop(),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.chevron_right, size: 20),
            ),
          ),
          Expanded(
            child: Column(
              children: [
                Text('سورة ${_surahOfPage.name}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.slate800)),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'صفحة $currentPage · الجزء ${MushafService.juzOfPage(currentPage)}',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400),
                    ),
                    const SizedBox(width: 6),
                    if (_progress.readToday(currentPage))
                      const Icon(Icons.check_circle, size: 13, color: AppColors.emerald500)
                    else
                      SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(
                          value: _secondsOnPage / QuranProgressService.secondsToCount,
                          strokeWidth: 2,
                          backgroundColor: AppColors.slate200,
                          color: AppColors.emerald500,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          InkWell(
            onTap: _openTafsir,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.menu_book_outlined, size: 20, color: AppColors.emerald700),
            ),
          ),
          const SizedBox(width: 6),
          InkWell(
            onTap: _askForPage,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.numbers, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}

class _GoToPageDialog extends StatefulWidget {
  final int currentPage;
  const _GoToPageDialog({required this.currentPage});

  @override
  State<_GoToPageDialog> createState() => _GoToPageDialogState();
}

class _GoToPageDialogState extends State<_GoToPageDialog> {
  late final TextEditingController _controller = TextEditingController(text: '${widget.currentPage}');

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final value = int.tryParse(_controller.text.trim());
    if (value != null && value >= 1 && value <= MushafService.pageCount) {
      Navigator.of(context).pop(value);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: AlertDialog(
        title: const Text('الانتقال إلى صفحة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        content: TextField(
          controller: _controller,
          autofocus: true,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          decoration: const InputDecoration(helperText: 'من 1 إلى ${MushafService.pageCount}'),
          onSubmitted: (_) => _submit(),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('إلغاء')),
          FilledButton(
            onPressed: _submit,
            style: FilledButton.styleFrom(backgroundColor: AppColors.emerald600),
            child: const Text('انتقال'),
          ),
        ],
      ),
    );
  }
}

class _MushafPage extends StatefulWidget {
  final int page;
  const _MushafPage({super.key, required this.page});

  @override
  State<_MushafPage> createState() => _MushafPageState();
}

class _MushafPageState extends State<_MushafPage> {
  late Future<Uint8List> _bytes;

  @override
  void initState() {
    super.initState();
    _bytes = MushafService.instance.loadPage(widget.page);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List>(
      future: _bytes,
      builder: (context, snapshot) {
        if (snapshot.hasError) return _buildError();
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator(color: AppColors.emerald600));
        }
        return InteractiveViewer(
          maxScale: 4,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
            child: Semantics(
              label: 'صفحة ${widget.page} من المصحف',
              image: true,
              child: SvgPicture.memory(
                snapshot.data!,
                width: double.infinity,
                height: double.infinity,
                fit: BoxFit.contain,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppColors.rose500, size: 32),
            const SizedBox(height: 12),
            const Text(
              'تعذر تحميل الصفحة. تأكد من اتصال الإنترنت.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.slate500, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => setState(() => _bytes = MushafService.instance.loadPage(widget.page)),
              style: FilledButton.styleFrom(backgroundColor: AppColors.emerald600),
              child: const Text('إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }
}

String _arabicDigits(int n) => n.toString().split('').map((d) => '٠١٢٣٤٥٦٧٨٩'[int.parse(d)]).join();

enum _AyahTool { tafsir, irab, meanings, similar }

/// Tafsir, i'rab, word meanings and mutashabihat for one ayah.
class _AyahTools extends StatefulWidget {
  final PageAyah ayah;
  final Widget tafsir;
  const _AyahTools({required this.ayah, required this.tafsir});

  @override
  State<_AyahTools> createState() => _AyahToolsState();
}

class _AyahToolsState extends State<_AyahTools> {
  _AyahTool tool = _AyahTool.tafsir;
  final _svc = AyahToolsService.instance;
  late final Future<List<AyahWord>> _irab = _svc.irab(widget.ayah.surah, widget.ayah.ayah);
  late final Future<List<AyahWord>> _meanings = _svc.meanings(widget.ayah.surah, widget.ayah.ayah);
  late final Future<List<SimilarAyah>> _similar = _svc.mutashabihat(widget.ayah.surah, widget.ayah.ayah);

  static const _labels = {_AyahTool.tafsir: 'التفسير', _AyahTool.irab: 'الإعراب', _AyahTool.meanings: 'المعاني', _AyahTool.similar: 'المتشابهات'};

  Widget _future<T>(Future<List<T>> f, String empty, Widget Function(T) row) => FutureBuilder<List<T>>(
        future: f,
        builder: (context, s) {
          if (s.hasError) return const Text('تعذر التحميل، تحقق من الاتصال.', style: TextStyle(color: AppColors.rose500));
          if (!s.hasData) return const LinearProgressIndicator(color: AppColors.emerald500);
          if (s.data!.isEmpty) return Text(empty, style: const TextStyle(color: AppColors.slate400, fontWeight: FontWeight.bold));
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: s.data!.map(row).toList());
        },
      );

  Widget _wordRow(String word, String body, {String? note}) => Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Text(word, style: const TextStyle(fontFamily: 'Amiri', fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.emerald700)),
              if (note != null && note.isNotEmpty) ...[
                const SizedBox(width: 8),
                Text('الجذر: $note', style: const TextStyle(fontSize: 10, color: AppColors.slate400, fontWeight: FontWeight.bold)),
              ],
            ]),
            Text(body, style: const TextStyle(fontSize: 13, height: 1.7, fontWeight: FontWeight.w600, color: AppColors.slate700)),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 6,
          children: _AyahTool.values
              .map((t) => ChoiceChip(
                    label: Text(_labels[t]!, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: tool == t ? Colors.white : AppColors.slate600)),
                    selected: tool == t,
                    showCheckmark: false,
                    selectedColor: AppColors.emerald600,
                    onSelected: (_) => setState(() => tool = t),
                  ))
              .toList(),
        ),
        const SizedBox(height: 8),
        switch (tool) {
          _AyahTool.tafsir => widget.tafsir,
          _AyahTool.irab => _future<AyahWord>(_irab, 'لا يتوفر إعراب لهذه الآية.', (w) => _wordRow(w.text, w.irab.isEmpty ? '—' : w.irab, note: w.root)),
          _AyahTool.meanings => _future<AyahWord>(_meanings, 'لا توجد كلمات غريبة في هذه الآية.', (w) => _wordRow(w.text.isEmpty ? '•' : w.text, w.meaning)),
          _AyahTool.similar => _future<SimilarAyah>(
              _similar,
              'لا توجد آيات متشابهة مع هذه الآية.',
              (s) => _wordRow('${s.surahName} ${_arabicDigits(s.ayah)}', s.text, note: null),
            ),
        },
      ],
    );
  }
}
