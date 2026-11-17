import 'dart:convert';
import '../data/surahs_data.dart';

/// Pure data/logic for the Madinah Mushaf page layout (no Flutter imports, so
/// it can be unit tested). Page files are produced by tool/build_mushaf_layout.cjs.

/// Highlight palette; index 0 means "no highlight". ARGB values.
const List<int> kMarkColors = [
  0x00000000,
  0xFFFFE066, // 1 yellow
  0xFF8EDB8E, // 2 green
  0xFF8CC8FF, // 3 blue
  0xFFFFA6C9, // 4 pink
  0xFFFFB066, // 5 orange
];
const List<String> kMarkColorNames = ['', 'أصفر', 'أخضر', 'أزرق', 'وردي', 'برتقالي'];

class MushafWord {
  final int surah;
  final int ayah;
  final int position;
  final bool isEnd; // ayah-number marker
  final String code; // QCF v2 glyph(s)
  final String text; // text_uthmani ('' for markers)
  final int line;
  const MushafWord(this.surah, this.ayah, this.position, this.isEnd, this.code, this.text, this.line);

  String get id => '$surah:$ayah:$position';
  String get ayahKey => '$surah:$ayah';
}

enum MushafLineKind { text, surahHeader, bismillah, blank }

class MushafLine {
  final int number; // 1-based slot
  final MushafLineKind kind;
  final List<MushafWord> words;
  final int surah; // for header / bismillah
  const MushafLine(this.number, this.kind, {this.words = const [], this.surah = 0});
}

class MushafPage {
  final int page;
  final List<MushafLine> lines; // one per slot, in order
  final List<MushafWord> words; // reading order
  const MushafPage(this.page, this.lines, this.words);

  int get slotCount => lines.length;

  static int slotsFor(int page) => page <= 2 ? 8 : 15;

  factory MushafPage.fromJson(Map<String, dynamic> json) {
    final page = json['p'] as int;
    final byLine = <int, List<MushafWord>>{};
    for (final entry in json['l'] as List) {
      final lineNo = entry[0] as int;
      final words = <MushafWord>[];
      for (final w in entry[1] as List) {
        final isEnd = w[3] == 1;
        words.add(MushafWord(w[0] as int, w[1] as int, w[2] as int, isEnd, w[4] as String, isEnd ? '' : (w[5] as String), lineNo));
      }
      byLine[lineNo] = words;
    }
    return MushafPage.build(page, byLine);
  }

  factory MushafPage.parse(String source) => MushafPage.fromJson(jsonDecode(source) as Map<String, dynamic>);

  /// Fills the lines that carry no words: a surah header (and bismillah) is
  /// printed just before the first line of every surah that starts on the page.
  /// Surah 1 has no separate bismillah (it is ayah 1) and surah 9 has none.
  factory MushafPage.build(int page, Map<int, List<MushafWord>> byLine) {
    final slots = slotsFor(page);
    final kinds = <int, MushafLine>{};
    for (final e in byLine.entries) {
      kinds[e.key] = MushafLine(e.key, MushafLineKind.text, words: e.value);
    }
    for (final e in byLine.entries) {
      final first = e.value.isEmpty ? null : e.value.first;
      if (first == null || first.ayah != 1 || first.position != 1 || first.isEnd) continue;
      final surah = first.surah;
      final line = e.key;
      final hasBismillah = surah != 1 && surah != 9;
      var headerLine = line - 1;
      if (hasBismillah) {
        if (line - 1 >= 1 && !kinds.containsKey(line - 1)) {
          kinds[line - 1] = MushafLine(line - 1, MushafLineKind.bismillah, surah: surah);
        }
        headerLine = line - 2;
      }
      if (headerLine >= 1 && !kinds.containsKey(headerLine)) {
        kinds[headerLine] = MushafLine(headerLine, MushafLineKind.surahHeader, surah: surah);
      }
    }
    final lines = List<MushafLine>.generate(slots, (i) => kinds[i + 1] ?? MushafLine(i + 1, MushafLineKind.blank));
    final words = <MushafWord>[for (final l in lines) ...l.words];
    return MushafPage(page, lines, words);
  }
}

/// Words between two indexes (inclusive, either order) of [words].
List<MushafWord> wordRange(List<MushafWord> words, int a, int b) {
  if (words.isEmpty) return const [];
  final lo = (a < b ? a : b).clamp(0, words.length - 1);
  final hi = (a < b ? b : a).clamp(0, words.length - 1);
  return words.sublist(lo, hi + 1);
}

/// All words of one ayah that are printed on the page.
List<MushafWord> ayahWords(List<MushafWord> words, int surah, int ayah) =>
    words.where((w) => w.surah == surah && w.ayah == ayah).toList();

/// Plain text of [words] (ayah markers skipped), joined with spaces.
String wordsText(Iterable<MushafWord> words) => words.where((w) => !w.isEnd && w.text.isNotEmpty).map((w) => w.text).join(' ');

/// e.g. "﴿البقرة: 5﴾" or "﴿البقرة: 5-7﴾" for a selection.
String selectionReference(List<MushafWord> selection) {
  if (selection.isEmpty) return '';
  final first = selection.first, last = selection.last;
  final name = quranSurahs[first.surah - 1].name;
  if (first.surah == last.surah) {
    return first.ayah == last.ayah ? '﴿$name: ${first.ayah}﴾' : '﴿$name: ${first.ayah}-${last.ayah}﴾';
  }
  return '﴿$name: ${first.ayah} - ${quranSurahs[last.surah - 1].name}: ${last.ayah}﴾';
}

String selectionCopyText(List<MushafWord> selection) => '${wordsText(selection)} ${selectionReference(selection)}'.trim();

/// A highlighted word or a bookmarked ayah. For bookmarks [position] is 0.
class MarkEntry {
  final int surah;
  final int ayah;
  final int position;
  final int color; // 1..5 (highlight) or 0 (bookmark)
  final int page;
  const MarkEntry(this.surah, this.ayah, this.position, this.color, this.page);

  String get wordId => '$surah:$ayah:$position';
  String get ayahKey => '$surah:$ayah';

  String encode() => '$surah:$ayah:$position:$color:$page';

  static MarkEntry? decode(String raw) {
    final p = raw.split(':');
    if (p.length != 5) return null;
    final n = p.map(int.tryParse).toList();
    if (n.contains(null)) return null;
    return MarkEntry(n[0]!, n[1]!, n[2]!, n[3]!, n[4]!);
  }
}

List<String> encodeMarks(Iterable<MarkEntry> marks) => marks.map((m) => m.encode()).toList();

List<MarkEntry> decodeMarks(Iterable<String> raw) => raw.map(MarkEntry.decode).whereType<MarkEntry>().toList();
