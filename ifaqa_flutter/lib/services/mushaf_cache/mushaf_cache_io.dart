import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';

/// Keeps downloaded pages on disk so they stay readable offline.
class MushafDiskCache {
  Future<File> _file(int page) async {
    final dir = await getApplicationSupportDirectory();
    return File('${dir.path}/mushaf/${page.toString().padLeft(3, '0')}.svg');
  }

  Future<bool> has(int page) async => (await _file(page)).exists();

  Future<Uint8List?> read(int page) async {
    final file = await _file(page);
    return await file.exists() ? file.readAsBytes() : null;
  }

  Future<void> write(int page, Uint8List bytes) async {
    final file = await _file(page);
    await file.parent.create(recursive: true);
    // Written via a temp file so an interrupted download can't leave a truncated page.
    final temp = File('${file.path}.part');
    await temp.writeAsBytes(bytes, flush: true);
    await temp.rename(file.path);
  }
}
