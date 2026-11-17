import 'package:flutter/foundation.dart';
import 'app_state.dart';
import 'mushaf_layout.dart';

/// Word highlights and ayah bookmarks of the Mushaf, persisted through AppState.
class MushafMarks extends ChangeNotifier {
  MushafMarks._();
  static final MushafMarks instance = MushafMarks._();

  static const _highlightKey = 'mushaf_highlights';
  static const _bookmarkKey = 'mushaf_bookmarks';

  Map<String, MarkEntry>? _highlights; // by word id
  Map<String, MarkEntry>? _bookmarks; // by ayah key

  Map<String, MarkEntry> get _hl => _highlights ??= {for (final m in decodeMarks(AppState.instance.strings(_highlightKey))) m.wordId: m};
  Map<String, MarkEntry> get _bm => _bookmarks ??= {for (final m in decodeMarks(AppState.instance.strings(_bookmarkKey))) m.ayahKey: m};

  /// Highlight color index (1..5) of a word, 0 if none.
  int colorOf(String wordId) => _hl[wordId]?.color ?? 0;

  bool isBookmarked(int surah, int ayah) => _bm.containsKey('$surah:$ayah');

  List<MarkEntry> get highlights => _hl.values.toList()..sort(_byPlace);
  List<MarkEntry> get bookmarks => _bm.values.toList()..sort(_byPlace);

  static int _byPlace(MarkEntry a, MarkEntry b) {
    final c = a.page.compareTo(b.page);
    if (c != 0) return c;
    final s = a.surah.compareTo(b.surah);
    if (s != 0) return s;
    final y = a.ayah.compareTo(b.ayah);
    return y != 0 ? y : a.position.compareTo(b.position);
  }

  /// Sets [color] (1..5) on [words], or removes the highlight when it is 0.
  void setColor(Iterable<MushafWord> words, int color, int page) {
    for (final w in words) {
      if (w.isEnd) continue;
      if (color == 0) {
        _hl.remove(w.id);
      } else {
        _hl[w.id] = MarkEntry(w.surah, w.ayah, w.position, color, page);
      }
    }
    AppState.instance.setStrings(_highlightKey, encodeMarks(_hl.values));
    notifyListeners();
  }

  /// Returns true when the ayah is bookmarked after the call.
  bool toggleBookmark(int surah, int ayah, int page) {
    final key = '$surah:$ayah';
    final added = !_bm.containsKey(key);
    if (added) {
      _bm[key] = MarkEntry(surah, ayah, 0, 0, page);
    } else {
      _bm.remove(key);
    }
    AppState.instance.setStrings(_bookmarkKey, encodeMarks(_bm.values));
    notifyListeners();
    return added;
  }
}
