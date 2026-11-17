import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../data/surahs_data.dart';
import '../services/app_state.dart';
import '../services/ayah_tools_service.dart';
import '../services/quran_search_service.dart';
import '../theme/app_colors.dart';

/// Ayat of one page with their tafsir, expandable one at a time.
class PageTafsirSheet extends StatefulWidget {
  final int page;
  const PageTafsirSheet({super.key, required this.page});

  @override
  State<PageTafsirSheet> createState() => _PageTafsirSheetState();
}

class _PageTafsirSheetState extends State<PageTafsirSheet> {
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
                              '${a.text} ﴿${arabicDigits(a.ayah)}﴾',
                              style: const TextStyle(fontFamily: 'Amiri', fontSize: 19, height: 1.9, color: AppColors.slate900),
                            ),
                            subtitle: Text('${quranSurahs[a.surah - 1].name} · آية ${a.ayah}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                            childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                            children: [
                              AyahTools(
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

String arabicDigits(int n) => n.toString().split('').map((d) => '٠١٢٣٤٥٦٧٨٩'[int.parse(d)]).join();

enum AyahToolKind { tafsir, irab, meanings, similar }

/// Tafsir, i'rab, word meanings and mutashabihat for one ayah.
class AyahTools extends StatefulWidget {
  final PageAyah ayah;
  final Widget tafsir;
  const AyahTools({super.key, required this.ayah, required this.tafsir});

  @override
  State<AyahTools> createState() => _AyahToolsState();
}

class _AyahToolsState extends State<AyahTools> {
  AyahToolKind tool = AyahToolKind.tafsir;
  final _svc = AyahToolsService.instance;
  late final Future<List<AyahWord>> _irab = _svc.irab(widget.ayah.surah, widget.ayah.ayah);
  late final Future<List<AyahWord>> _meanings = _svc.meanings(widget.ayah.surah, widget.ayah.ayah);
  late final Future<List<SimilarAyah>> _similar = _svc.mutashabihat(widget.ayah.surah, widget.ayah.ayah);

  static const _labels = {AyahToolKind.tafsir: 'التفسير', AyahToolKind.irab: 'الإعراب', AyahToolKind.meanings: 'المعاني', AyahToolKind.similar: 'المتشابهات'};

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
          children: AyahToolKind.values
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
          AyahToolKind.tafsir => widget.tafsir,
          AyahToolKind.irab => _future<AyahWord>(_irab, 'لا يتوفر إعراب لهذه الآية.', (w) => _wordRow(w.text, w.irab.isEmpty ? '—' : w.irab, note: w.root)),
          AyahToolKind.meanings => _future<AyahWord>(_meanings, 'لا توجد كلمات غريبة في هذه الآية.', (w) => _wordRow(w.text.isEmpty ? '•' : w.text, w.meaning)),
          AyahToolKind.similar => _future<SimilarAyah>(
              _similar,
              'لا توجد آيات متشابهة مع هذه الآية.',
              (s) => _wordRow('${s.surahName} ${arabicDigits(s.ayah)}', s.text, note: null),
            ),
        },
      ],
    );
  }
}

/// Bottom sheet for a single ayah picked in the Mushaf: its text, quick actions
/// (copy, bookmark, highlight colour) and the tafsir / i'rab / meanings /
/// mutashabihat tools.
class AyahSheet extends StatefulWidget {
  final PageAyah ayah;
  final bool bookmarked;
  final VoidCallback? onBookmark;
  final void Function(int color)? onColor; // 0 removes the highlight
  final List<int> colorChoices; // ARGB, index 1.. are choosable
  const AyahSheet({
    super.key,
    required this.ayah,
    this.bookmarked = false,
    this.onBookmark,
    this.onColor,
    this.colorChoices = const [],
  });

  @override
  State<AyahSheet> createState() => _AyahSheetState();
}

class _AyahSheetState extends State<AyahSheet> {
  late int edition = AppState.instance.number('tafsir_edition', fallback: 16);
  final Map<int, Future<String>> _tafsir = {};
  late bool _bookmarked = widget.bookmarked;

  Future<String> _tafsirFor() => _tafsir.putIfAbsent(edition, () => fetchTafsir(widget.ayah.surah, widget.ayah.ayah, edition: edition));

  @override
  Widget build(BuildContext context) {
    final a = widget.ayah;
    final surahName = quranSurahs[a.surah - 1].name;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.95,
        minChildSize: 0.35,
        expand: false,
        builder: (context, scroll) => Container(
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
          child: ListView(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.slate200, borderRadius: BorderRadius.circular(9)))),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: Text('سورة $surahName · آية ${a.ayah}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15))),
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
              Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: const Color(0xFFFBF8F1), borderRadius: BorderRadius.circular(18)),
                child: SelectableText(
                  '${a.text} ﴿${arabicDigits(a.ayah)}﴾',
                  style: const TextStyle(fontFamily: 'Amiri', fontSize: 22, height: 2, color: AppColors.slate900),
                ),
              ),
              Row(
                children: [
                  IconButton(
                    tooltip: 'نسخ',
                    icon: const Icon(Icons.copy, size: 20, color: AppColors.slate500),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: '${a.text} ﴿$surahName: ${a.ayah}﴾'));
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(duration: Duration(seconds: 1), content: Text('تم النسخ')));
                    },
                  ),
                  if (widget.onBookmark != null)
                    IconButton(
                      tooltip: 'علامة',
                      icon: Icon(_bookmarked ? Icons.bookmark : Icons.bookmark_border, size: 22, color: AppColors.emerald600),
                      onPressed: () {
                        widget.onBookmark!();
                        setState(() => _bookmarked = !_bookmarked);
                      },
                    ),
                  const Spacer(),
                  if (widget.onColor != null) ...[
                    for (var i = 1; i < widget.colorChoices.length; i++)
                      GestureDetector(
                        onTap: () => widget.onColor!(i),
                        child: Container(
                          width: 24,
                          height: 24,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(color: Color(widget.colorChoices[i]), shape: BoxShape.circle, border: Border.all(color: AppColors.slate200)),
                        ),
                      ),
                    IconButton(
                      tooltip: 'إزالة التظليل',
                      icon: const Icon(Icons.format_color_reset, size: 20, color: AppColors.slate500),
                      onPressed: () => widget.onColor!(0),
                    ),
                  ],
                ],
              ),
              AyahTools(
                ayah: a,
                tafsir: FutureBuilder<String>(
                  future: _tafsirFor(),
                  builder: (context, t) {
                    if (t.hasError) {
                      return TextButton.icon(
                        onPressed: () => setState(() {
                          _tafsir.remove(edition);
                        }),
                        icon: const Icon(Icons.refresh),
                        label: const Text('تعذر تحميل التفسير، أعد المحاولة'),
                      );
                    }
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
        ),
      ),
    );
  }
}
