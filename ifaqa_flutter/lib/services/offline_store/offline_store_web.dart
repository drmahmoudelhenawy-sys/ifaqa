import 'dart:typed_data';

/// The browser keeps its own HTTP cache; nothing is stored for offline use.
class OfflineStore {
  OfflineStore._();
  static final OfflineStore instance = OfflineStore._();
  static const bool supported = false;

  Future<bool> has(String path) async => false;
  Future<String?> localPath(String path) async => null;
  Future<Uint8List?> read(String path) async => null;
  Future<void> download(String url, String path, {void Function(double)? onProgress}) async =>
      throw UnsupportedError('التنزيل للاستخدام بدون إنترنت متاح في تطبيق الموبايل فقط.');
  Future<void> delete(String path) async {}
  Future<List<String>> list(String dir) async => const [];
  Future<int> sizeOf(String dir) async => 0;
}
