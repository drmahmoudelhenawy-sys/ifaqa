import 'dart:collection';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'mushaf_cache/mushaf_cache.dart';

/// Madinah Mushaf pages (SVG) from github.com/batoulapps/quran-svg (MIT),
/// pinned to one commit so the pages can never change underneath the app.
class MushafService {
  MushafService._();
  static final MushafService instance = MushafService._();

  static const int pageCount = 604;
  static const String _commit = '78d97544bfdc57e9f04bc97ace3f857ed972d772';
  static const String _lastPageKey = 'quran_last_page';
  static const int _memoryLimit = 12;
  static const int _downloadWorkers = 6;

  static const List<int> _juzStartPages = [
    1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282,
    302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
  ];

  final MushafDiskCache _disk = MushafDiskCache();
  final LinkedHashMap<int, Uint8List> _memory = LinkedHashMap();
  final Map<int, Future<Uint8List>> _inFlight = {};

  static int juzOfPage(int page) => _juzStartPages.lastIndexWhere((start) => start <= page) + 1;

  Future<Uint8List> loadPage(int page) {
    final cached = _memory.remove(page);
    if (cached != null) {
      _memory[page] = cached;
      return Future.value(cached);
    }
    return _inFlight[page] ??= _fetch(page).whenComplete(() {
      _inFlight.remove(page);
    });
  }

  /// Fetches a page in the background; a failure here surfaces when it is opened.
  void preload(int page) {
    if (page >= 1 && page <= pageCount) loadPage(page).ignore();
  }

  Future<Uint8List> _fetch(int page) async {
    final bytes = await _disk.read(page) ?? await _download(page);
    _memory[page] = bytes;
    if (_memory.length > _memoryLimit) _memory.remove(_memory.keys.first);
    return bytes;
  }

  Future<Uint8List> _download(int page) async {
    final name = page.toString().padLeft(3, '0');
    final url = 'https://cdn.jsdelivr.net/gh/batoulapps/quran-svg@$_commit/svg/$name.svg';
    final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 30));
    if (response.statusCode != 200) {
      throw http.ClientException('HTTP ${response.statusCode}', Uri.parse(url));
    }
    await _disk.write(page, response.bodyBytes);
    return response.bodyBytes;
  }

  Future<int> downloadedPageCount() async {
    var count = 0;
    for (var page = 1; page <= pageCount; page++) {
      if (await _disk.has(page)) count++;
    }
    return count;
  }

  /// Downloads every missing page. Returns true once all pages are on disk,
  /// false if it was stopped or a page failed; a later call resumes from there.
  Future<bool> downloadAll({required bool Function() shouldStop, required void Function(int downloaded) onProgress}) async {
    var downloaded = 0;
    final missing = <int>[];
    for (var page = 1; page <= pageCount; page++) {
      if (await _disk.has(page)) {
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
          await _download(page);
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
