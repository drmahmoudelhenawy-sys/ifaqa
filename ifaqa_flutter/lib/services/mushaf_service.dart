import 'dart:typed_data';
import 'package:flutter/services.dart' show FontLoader, rootBundle;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'mushaf_layout.dart';
import 'offline_store/offline_store.dart';

/// Madinah Mushaf data: line layout from bundled assets (works offline) and the
/// King Fahd Complex QCF v2 page fonts (one font per page) fetched on demand,
/// kept on disk on mobile and in the browser HTTP cache on the web.
///
/// The fonts are loaded as TTF on every platform: Flutter's FontLoader is only
/// guaranteed to accept TTF/OTF, while WOFF2 support differs by engine/platform.
class MushafService {
  MushafService._();
  static final MushafService instance = MushafService._();

  static const int pageCount = 604;
  static const String _lastPageKey = 'quran_last_page';
  static const int _downloadWorkers = 4;
  static const int _layoutCacheLimit = 40;
  static const String _fontBase = 'https://verses.quran.foundation/fonts/quran/hafs/v2/ttf';

  static const List<int> _juzStartPages = [
    1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282,
    302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
  ];

  final Map<int, Future<MushafPage>> _layouts = {};
  final Map<int, Future<void>> _fonts = {};

  static int juzOfPage(int page) => _juzStartPages.lastIndexWhere((start) => start <= page) + 1;

  static String fontFamily(int page) => 'QCF_P$page';
  static String _fontPath(int page) => 'mushaf/fonts/p$page.ttf';
  static String _fontUrl(int page) => '$_fontBase/p$page.ttf';

  Future<MushafPage> layout(int page) {
    final cached = _layouts.remove(page);
    if (cached != null) {
      _layouts[page] = cached;
      return cached;
    }
    final future = rootBundle.loadString('assets/mushaf/pages/${page.toString().padLeft(3, '0')}.json').then(MushafPage.parse);
    _layouts[page] = future;
    if (_layouts.length > _layoutCacheLimit) _layouts.remove(_layouts.keys.first);
    return future;
  }

  /// Registers the page font once; a failed attempt can be retried.
  Future<void> ensureFont(int page) {
    final existing = _fonts[page];
    if (existing != null) return existing;
    final future = _registerFont(page);
    _fonts[page] = future;
    future.catchError((Object _) {
      if (_fonts[page] == future) _fonts.remove(page);
    });
    return future;
  }

  Future<void> _registerFont(int page) async {
    final bytes = await OfflineStore.instance.read(_fontPath(page)) ?? await _downloadFont(page);
    final loader = FontLoader(fontFamily(page))..addFont(Future.value(ByteData.sublistView(bytes)));
    await loader.load();
  }

  Future<Uint8List> _downloadFont(int page) async {
    final uri = Uri.parse(_fontUrl(page));
    final response = await http.get(uri).timeout(const Duration(seconds: 40));
    if (response.statusCode != 200 || response.bodyBytes.isEmpty) {
      throw http.ClientException('HTTP ${response.statusCode}', uri);
    }
    if (OfflineStore.supported) await OfflineStore.instance.write(_fontPath(page), response.bodyBytes);
    return response.bodyBytes;
  }

  /// Layout plus a registered font: everything needed to draw the page.
  Future<MushafPage> loadPage(int page) async {
    final results = await Future.wait<Object?>([layout(page), ensureFont(page)]);
    return results[0]! as MushafPage;
  }

  /// Fetches neighbouring pages in the background; failures surface on open.
  void preload(int page) {
    if (page >= 1 && page <= pageCount) loadPage(page).ignore();
  }

  /// Full text of an ayah, also when it continues on the previous/next page.
  Future<String> ayahText(int surah, int ayah, int page) async {
    final words = <MushafWord>[];
    final here = await layout(page);
    final mine = ayahWords(here.words, surah, ayah);
    if (mine.isNotEmpty && mine.first.position > 1 && page > 1) {
      words.addAll(ayahWords((await layout(page - 1)).words, surah, ayah));
    }
    words.addAll(mine);
    if (mine.isNotEmpty && !mine.last.isEnd && page < pageCount) {
      words.addAll(ayahWords((await layout(page + 1)).words, surah, ayah));
    }
    return wordsText(words);
  }

  Future<int> downloadedPageCount() async {
    if (!OfflineStore.supported) return 0;
    var count = 0;
    for (var page = 1; page <= pageCount; page++) {
      if (await OfflineStore.instance.has(_fontPath(page))) count++;
    }
    return count;
  }

  /// Downloads every missing page font. Returns true once all are on disk,
  /// false if stopped or a download failed; a later call resumes from there.
  Future<bool> downloadAll({required bool Function() shouldStop, required void Function(int downloaded) onProgress}) async {
    var downloaded = 0;
    final missing = <int>[];
    for (var page = 1; page <= pageCount; page++) {
      if (await OfflineStore.instance.has(_fontPath(page))) {
        downloaded++;
      } else {
        missing.add(page);
      }
    }
    onProgress(downloaded);

    var next = 0;
    var failed = false;
    Future<void> worker() async {
      while (next < missing.length && !failed && !shouldStop()) {
        final page = missing[next++];
        try {
          await OfflineStore.instance.download(_fontUrl(page), _fontPath(page));
          onProgress(++downloaded);
        } catch (_) {
          failed = true;
        }
      }
    }

    await Future.wait(List.generate(_downloadWorkers, (_) => worker()));
    return downloaded == pageCount;
  }

  Future<int?> lastReadPage() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_lastPageKey);
  }

  Future<void> saveLastReadPage(int page) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_lastPageKey, page);
  }
}
