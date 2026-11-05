import 'dart:typed_data';

/// The browser's HTTP cache already keeps fetched pages, so nothing to do here.
class MushafDiskCache {
  Future<bool> has(int page) async => false;
  Future<Uint8List?> read(int page) async => null;
  Future<void> write(int page, Uint8List bytes) async {}
}
