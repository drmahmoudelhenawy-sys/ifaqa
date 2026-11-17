import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../data/surahs_data.dart';
import '../services/mushaf_layout.dart';
import '../services/mushaf_marks.dart';
import '../services/mushaf_service.dart';
import '../services/quran_search_service.dart' show PageAyah;
import '../theme/app_colors.dart';
import 'ayah_tools.dart';

const String _bismillah = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
const Color _gold = Color(0xFFB8860B);

class _WordBox {
  final int index; // into MushafPage.words
  final Rect rect;
  final double gap; // space to the neighbour, used to join highlights
  const _WordBox(this.index, this.rect, this.gap);
}

class _Geometry {
  final Size size;
  final double fontSize;
  final double slotH;
  final double y0;
  final double textLeft;
  final double textWidth;
  final List<_WordBox> boxes;
  final List<List<_WordBox>> byLine;
  const _Geometry(this.size, this.fontSize, this.slotH, this.y0, this.textLeft, this.textWidth, this.boxes, this.byLine);

  double lineTop(int slot) => y0 + slot * slotH;
}

/// One printed Madinah Mushaf page: 15 evenly spaced line slots (8 on pages 1-2)
/// filling the whole screen, every line justified to the full width.
class MushafPageView extends StatefulWidget {
  final int page;
  final bool night;
  final VoidCallback onTapBackground;
  /// Test hook: replaces the asset + font loading.
  final Future<MushafPage> Function(int page)? loader;
  const MushafPageView({super.key, required this.page, required this.night, required this.onTapBackground, this.loader});

  @override
  State<MushafPageView> createState() => _MushafPageViewState();
}

class _MushafPageViewState extends State<MushafPageView> {
  late Future<MushafPage> _future = _load();

  Future<MushafPage> _load() => (widget.loader ?? MushafService.instance.loadPage)(widget.page);
  _Geometry? _geo;
  MushafPage? _geoPage;
  int? _anchor;
  int? _extent;
  bool _showBar = false;

  Color get _ink => widget.night ? const Color(0xFFE9E1CF) : const Color(0xFF1B1B1B);

  bool get _hasSelection => _anchor != null && _extent != null;

  void _clearSelection() => setState(() {
        _anchor = null;
        _extent = null;
        _showBar = false;
      });

  // ---- layout -------------------------------------------------------------

  _Geometry _geometry(MushafPage page, Size size) {
    final cached = _geo;
    if (cached != null && identical(_geoPage, page) && cached.size == size) return cached;
    final family = MushafService.fontFamily(page.page);
    final narrow = page.page <= 2;
    const vPad = 4.0;
    final contentW = math.min(size.width - 8, size.height * 0.74);
    final textW = narrow ? contentW * 0.84 : contentW;
    final textLeft = (size.width - textW) / 2;
    final slotH = (size.height - vPad * 2) / 15;
    final y0 = vPad + (15 - page.slotCount) / 2 * slotH;

    double measure(String code, double fs) {
      final tp = TextPainter(
        text: TextSpan(text: code, style: TextStyle(fontFamily: family, fontSize: fs, height: 1)),
        textDirection: TextDirection.rtl,
      )..layout();
      final w = tp.width;
      tp.dispose();
      return w;
    }

    const ref = 100.0;
    // QCF v2 glyph advances already contain the word spacing and every printed line
    // is about the same natural width, so no extra gap is reserved.
    const minGapEm = 0.0;
    // Font size: the widest line (plus minimal word gaps) must fit the width.
    var fs = slotH * 0.95;
    final natural100 = <int, List<double>>{};
    for (final line in page.lines) {
      if (line.kind != MushafLineKind.text) continue;
      final ws = [for (final w in line.words) measure(w.code, ref)];
      natural100[line.number] = ws;
      final em = ws.fold<double>(0, (a, b) => a + b) / ref + (ws.length - 1) * minGapEm;
      if (em > 0) fs = math.min(fs, textW / em);
    }

    final boxes = <_WordBox>[];
    final byLine = <List<_WordBox>>[];
    var index = 0;
    for (final line in page.lines) {
      final lineBoxes = <_WordBox>[];
      byLine.add(lineBoxes);
      if (line.kind != MushafLineKind.text) continue;
      final top = y0 + (line.number - 1) * slotH;
      final widths = [for (final w in natural100[line.number]!) w * fs / ref];
      final n = widths.length;
      final natural = widths.fold<double>(0, (a, b) => a + b);
      var gap = n > 1 ? (textW - natural) / (n - 1) : 0.0;
      var start = textLeft + textW; // right edge: RTL
      // The short closing line of a surah is centred instead of stretched.
      final sparse = !narrow && (n == 1 || gap > fs * 0.6);
      if (sparse) {
        gap = 0;
        final total = natural + gap * (n - 1);
        start = textLeft + textW / 2 + total / 2;
      }
      var x = start;
      for (var i = 0; i < n; i++) {
        final rect = Rect.fromLTWH(x - widths[i], top, widths[i], slotH);
        final box = _WordBox(index++, rect, gap);
        lineBoxes.add(box);
        boxes.add(box);
        x -= widths[i] + gap;
      }
    }
    _geoPage = page;
    return _geo = _Geometry(size, fs, slotH, y0, textLeft, textW, boxes, byLine);
  }

  /// Word under [p]; with [nearest] also the closest one on the closest text line.
  int? _hit(Offset p, {bool nearest = false}) {
    final geo = _geo;
    if (geo == null) return null;
    var slot = ((p.dy - geo.y0) / geo.slotH).floor();
    final inside = slot >= 0 && slot < geo.byLine.length;
    if (!inside && !nearest) return null;
    slot = slot.clamp(0, geo.byLine.length - 1);
    if (geo.byLine[slot].isEmpty) {
      if (!nearest) return null;
      var best = -1;
      for (var i = 0; i < geo.byLine.length; i++) {
        if (geo.byLine[i].isEmpty) continue;
        if (best < 0 || (i - slot).abs() < (best - slot).abs()) best = i;
      }
      if (best < 0) return null;
      slot = best;
    }
    _WordBox? closest;
    var closestDist = double.infinity;
    for (final b in geo.byLine[slot]) {
      final half = b.gap / 2;
      if (p.dx >= b.rect.left - half && p.dx <= b.rect.right + half) return b.index;
      final d = p.dx < b.rect.left ? b.rect.left - p.dx : p.dx - b.rect.right;
      if (d < closestDist) {
        closestDist = d;
        closest = b;
      }
    }
    return nearest ? closest?.index : null;
  }

  // ---- interaction --------------------------------------------------------

  void _onTap(MushafPage page, Offset p) {
    if (_hasSelection) {
      _clearSelection();
      return;
    }
    final hit = _hit(p);
    if (hit == null) {
      widget.onTapBackground();
      return;
    }
    _selectAyah(page, hit);
  }

  List<int> _ayahIndexes(MushafPage page, int index) {
    final w = page.words[index];
    return [
      for (var i = 0; i < page.words.length; i++)
        if (page.words[i].surah == w.surah && page.words[i].ayah == w.ayah) i
    ];
  }

  Future<void> _selectAyah(MushafPage page, int index) async {
    final ids = _ayahIndexes(page, index);
    setState(() {
      _anchor = ids.first;
      _extent = ids.last;
      _showBar = false;
    });
    await _openAyahSheet(page, page.words[index]);
    if (mounted && !_showBar) _clearSelection();
  }

  Future<void> _openAyahSheet(MushafPage page, MushafWord word) async {
    final text = await MushafService.instance.ayahText(word.surah, word.ayah, page.page).catchError((_) => '');
    if (!mounted) return;
    final marks = MushafMarks.instance;
    final ayahWordsOnPage = ayahWords(page.words, word.surah, word.ayah);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AyahSheet(
        ayah: PageAyah(word.surah, word.ayah, text),
        bookmarked: marks.isBookmarked(word.surah, word.ayah),
        onBookmark: () => marks.toggleBookmark(word.surah, word.ayah, page.page),
        onColor: (c) => marks.setColor(ayahWordsOnPage, c, page.page),
        colorChoices: kMarkColors,
      ),
    );
  }

  void _onLongPressStart(Offset p) {
    final hit = _hit(p, nearest: true);
    if (hit == null) return;
    HapticFeedback.selectionClick();
    setState(() {
      _anchor = hit;
      _extent = hit;
      _showBar = false;
    });
  }

  void _onLongPressMove(Offset p) {
    final hit = _hit(p, nearest: true);
    if (hit != null && hit != _extent && _anchor != null) setState(() => _extent = hit);
  }

  void _onLongPressEnd() {
    if (_hasSelection) setState(() => _showBar = true);
  }

  List<MushafWord> _selected(MushafPage page) => _hasSelection ? wordRange(page.words, _anchor!, _extent!) : const [];

  void _toast(String text) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(duration: const Duration(seconds: 1), content: Text(text, textAlign: TextAlign.center)));

  // ---- build --------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<MushafPage>(
      future: _future,
      builder: (context, snap) {
        if (snap.hasError) return _buildError();
        if (!snap.hasData) return Center(child: CircularProgressIndicator(color: widget.night ? AppColors.emerald400 : AppColors.emerald600));
        final page = snap.data!;
        return LayoutBuilder(builder: (context, constraints) {
          final geo = _geometry(page, constraints.biggest);
          return Stack(
            children: [
              Positioned.fill(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTapUp: (d) => _onTap(page, d.localPosition),
                  onLongPressStart: (d) => _onLongPressStart(d.localPosition),
                  onLongPressMoveUpdate: (d) => _onLongPressMove(d.localPosition),
                  onLongPressEnd: (_) => _onLongPressEnd(),
                  child: RepaintBoundary(
                    child: AnimatedBuilder(
                      animation: MushafMarks.instance,
                      builder: (context, _) => _buildPage(page, geo),
                    ),
                  ),
                ),
              ),
              if (_showBar && _hasSelection) Positioned(left: 12, right: 12, bottom: 18, child: _buildToolbar(page)),
            ],
          );
        });
      },
    );
  }

  Widget _buildPage(MushafPage page, _Geometry geo) {
    final family = MushafService.fontFamily(page.page);
    final selected = <int>{};
    if (_hasSelection) {
      final lo = math.min(_anchor!, _extent!), hi = math.max(_anchor!, _extent!);
      for (var i = lo; i <= hi; i++) {
        selected.add(i);
      }
    }
    final marks = MushafMarks.instance;
    final highlights = <(Rect, Color)>[];
    for (final line in geo.byLine) {
      for (final b in line) {
        final word = page.words[b.index];
        final half = b.gap / 2;
        final rect = Rect.fromLTRB(b.rect.left - half, b.rect.top + geo.slotH * 0.1, b.rect.right + half, b.rect.bottom - geo.slotH * 0.1);
        final mark = marks.colorOf(word.id);
        if (mark > 0) highlights.add((rect, Color(kMarkColors[mark]).withValues(alpha: widget.night ? 0.5 : 0.6)));
        if (selected.contains(b.index)) {
          highlights.add((rect, (widget.night ? AppColors.emerald400 : AppColors.emerald600).withValues(alpha: 0.3)));
        }
      }
    }
    final style = TextStyle(fontFamily: family, fontSize: geo.fontSize, height: 1, color: _ink);
    return Stack(
      children: [
        Positioned.fill(child: CustomPaint(painter: _HighlightPainter(highlights))),
        for (final line in page.lines)
          if (line.kind == MushafLineKind.surahHeader)
            Positioned(
              left: geo.textLeft,
              width: geo.textWidth,
              top: geo.lineTop(line.number - 1),
              height: geo.slotH,
              child: _SurahHeader(surah: line.surah, fontSize: geo.fontSize, night: widget.night),
            )
          else if (line.kind == MushafLineKind.bismillah)
            Positioned(
              left: geo.textLeft,
              width: geo.textWidth,
              top: geo.lineTop(line.number - 1),
              height: geo.slotH,
              child: Center(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(_bismillah, textDirection: TextDirection.rtl, style: TextStyle(fontFamily: 'Amiri', fontSize: geo.fontSize * 1.05, height: 1.2, color: _ink)),
                ),
              ),
            ),
        for (final b in geo.boxes)
          Positioned.fromRect(
            rect: b.rect,
            child: Center(
              child: Text(
                page.words[b.index].code,
                textDirection: TextDirection.rtl,
                softWrap: false,
                maxLines: 1,
                overflow: TextOverflow.visible,
                style: style,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildToolbar(MushafPage page) {
    final words = _selected(page);
    final first = words.first;
    final marks = MushafMarks.instance;
    return Center(
      child: Material(
        elevation: 8,
        color: widget.night ? const Color(0xFF2A2620) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 2,
            children: [
              _barIcon(Icons.copy, 'نسخ', () {
                Clipboard.setData(ClipboardData(text: selectionCopyText(words)));
                _toast('تم النسخ');
                _clearSelection();
              }),
              for (var i = 1; i < kMarkColors.length; i++)
                GestureDetector(
                  onTap: () {
                    marks.setColor(words, i, page.page);
                    _clearSelection();
                  },
                  child: Container(
                    width: 26,
                    height: 26,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(color: Color(kMarkColors[i]), shape: BoxShape.circle, border: Border.all(color: AppColors.slate300)),
                  ),
                ),
              _barIcon(Icons.format_color_reset, 'إزالة التظليل', () {
                marks.setColor(words, 0, page.page);
                _clearSelection();
              }),
              _barIcon(Icons.menu_book_outlined, 'التفسير', () => _openAyahSheet(page, first)),
              _barIcon(marks.isBookmarked(first.surah, first.ayah) ? Icons.bookmark : Icons.bookmark_border, 'علامة', () {
                final added = marks.toggleBookmark(first.surah, first.ayah, page.page);
                _toast(added ? 'تمت إضافة العلامة' : 'أزيلت العلامة');
                _clearSelection();
              }),
              _barIcon(Icons.close, 'إغلاق', _clearSelection),
            ],
          ),
        ),
      ),
    );
  }

  Widget _barIcon(IconData icon, String tip, VoidCallback onTap) => IconButton(
        tooltip: tip,
        visualDensity: VisualDensity.compact,
        icon: Icon(icon, size: 21, color: widget.night ? const Color(0xFFE9E1CF) : AppColors.slate600),
        onPressed: onTap,
      );

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppColors.rose500, size: 32),
            const SizedBox(height: 12),
            Text(
              'تعذر تحميل خط الصفحة. تأكد من اتصال الإنترنت.',
              textAlign: TextAlign.center,
              style: TextStyle(color: widget.night ? const Color(0xFFE9E1CF) : AppColors.slate500, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => setState(() => _future = _load()),
              style: FilledButton.styleFrom(backgroundColor: AppColors.emerald600),
              child: const Text('إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }
}

class _HighlightPainter extends CustomPainter {
  final List<(Rect, Color)> items;
  _HighlightPainter(this.items);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();
    for (final (rect, color) in items) {
      paint.color = color;
      canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(5)), paint);
    }
  }

  @override
  bool shouldRepaint(_HighlightPainter old) => true;
}

/// Decorative surah-name frame printed above the first ayah of a surah.
class _SurahHeader extends StatelessWidget {
  final int surah;
  final double fontSize;
  final bool night;
  const _SurahHeader({required this.surah, required this.fontSize, required this.night});

  @override
  Widget build(BuildContext context) {
    final name = quranSurahs[surah - 1].name;
    final tint = night ? const Color(0xFF3A3020) : const Color(0xFFFBF1D6);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(8), border: Border.all(color: _gold, width: 1.6)),
        child: Container(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(5), border: Border.all(color: _gold.withValues(alpha: 0.7), width: 0.8)),
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _diamond(),
              const SizedBox(width: 12),
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    'سورة $name',
                    textDirection: TextDirection.rtl,
                    style: TextStyle(fontFamily: 'Amiri', fontWeight: FontWeight.w700, fontSize: fontSize * 1.1, height: 1.3, color: night ? const Color(0xFFF0D58A) : const Color(0xFF7A5A00)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              _diamond(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _diamond() => Transform.rotate(
        angle: math.pi / 4,
        child: Container(width: 9, height: 9, decoration: BoxDecoration(color: _gold, borderRadius: BorderRadius.circular(1.5))),
      );
}
