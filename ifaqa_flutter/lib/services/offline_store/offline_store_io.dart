import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

/// Files kept for offline use (hadith books, recitations), by relative path.
class OfflineStore {
  OfflineStore._();
  static final OfflineStore instance = OfflineStore._();
  static const bool supported = true;

  Future<File> _file(String path) async => File('${(await getApplicationSupportDirectory()).path}/offline/$path');

  Future<bool> has(String path) async => (await _file(path)).exists();

  Future<String?> localPath(String path) async {
    final f = await _file(path);
    return await f.exists() ? f.path : null;
  }

  Future<Uint8List?> read(String path) async {
    final f = await _file(path);
    return await f.exists() ? f.readAsBytes() : null;
  }

  /// Streams [url] to disk through a temp file, reporting 0..1 progress.
  Future<void> download(String url, String path, {void Function(double)? onProgress}) async {
    final f = await _file(path);
    await f.parent.create(recursive: true);
    final temp = File('${f.path}.part');
    final client = http.Client();
    try {
      final res = await client.send(http.Request('GET', Uri.parse(url)));
      if (res.statusCode != 200) throw HttpException('HTTP ${res.statusCode}');
      final total = res.contentLength ?? 0;
      var got = 0;
      final sink = temp.openWrite();
      await for (final chunk in res.stream) {
        sink.add(chunk);
        got += chunk.length;
        if (total > 0) onProgress?.call(got / total);
      }
      await sink.close();
      await temp.rename(f.path);
    } catch (_) {
      if (await temp.exists()) await temp.delete();
      rethrow;
    } finally {
      client.close();
    }
  }

  Future<void> delete(String path) async {
    final f = await _file(path);
    if (await f.exists()) await f.delete();
  }

  /// Relative paths of files under [dir].
  Future<List<String>> list(String dir) async {
    final d = Directory('${(await getApplicationSupportDirectory()).path}/offline/$dir');
    if (!await d.exists()) return const [];
    final files = await d.list(recursive: true).where((e) => e is File && !e.path.endsWith('.part')).toList();
    // Relative to the offline root, with forward slashes on every platform.
    return files.map((e) => e.path.replaceAll(r'\', '/').split('/offline/').last).toList();
  }

  Future<int> sizeOf(String dir) async {
    final d = Directory('${(await getApplicationSupportDirectory()).path}/offline/$dir');
    if (!await d.exists()) return 0;
    var n = 0;
    await for (final e in d.list(recursive: true)) {
      if (e is File) n += await e.length();
    }
    return n;
  }
}
