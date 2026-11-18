import 'package:flutter/foundation.dart';
import 'package:on_audio_query_pluse/on_audio_query.dart';
import 'package:permission_handler/permission_handler.dart';

/// One playable audio file found on the device.
///
/// Kept free of any player state: [AudioService] owns playback, this is
/// just the query result it plays through its single shared player.
class DeviceSong {
  final int id;
  final String title;
  final String artist;
  final String filePath;
  final int durationMs;

  const DeviceSong({
    required this.id,
    required this.title,
    required this.artist,
    required this.filePath,
    required this.durationMs,
  });

  /// Builds a playable song from a raw [SongModel]; returns null when the
  /// entry cannot be played (no file path, or a zero/unknown duration).
  /// Never throws: a single unreadable row must not lose the whole list.
  static DeviceSong? fromSongModel(SongModel song) {
    try {
      final path = song.data;
      final duration = song.duration;
      if (!isUsableDeviceSong(filePath: path, durationMs: duration)) {
        return null;
      }
      return DeviceSong(
        id: song.id,
        title: song.title,
        artist: song.artist ?? '',
        filePath: path,
        durationMs: duration!,
      );
    } catch (e) {
      debugPrint('device music: skipping unreadable song: $e');
      return null;
    }
  }
}

/// Pure rule shared by the service and the tests: a device entry is only
/// playable when it points at a real file and has a positive duration.
bool isUsableDeviceSong({required String? filePath, required int? durationMs}) =>
    filePath != null && filePath.isNotEmpty && durationMs != null && durationMs > 0;

/// Drops every unplayable entry from [songs], preserving order.
List<DeviceSong> usableDeviceSongs(List<DeviceSong> songs) =>
    songs.where((s) => isUsableDeviceSong(filePath: s.filePath, durationMs: s.durationMs)).toList();

/// Outcome of asking the OS for media access.
enum DeviceMusicPermissionState {
  /// The app may query on-device audio.
  granted,

  /// The user declined (but can still be asked again).
  denied,

  /// The user declined permanently ("don't ask again") — only app settings
  /// can re-enable it.
  permanentlyDenied,
}

/// Queries on-device audio and owns the runtime permission for it.
///
/// Availability is two parts: the `on_audio_query_pluse` package is present
/// (enforced at compile time by this import) AND the OS permission is
/// granted (checked here at runtime). Never query without the permission.
class DeviceMusicService {
  DeviceMusicService({OnAudioQuery? audioQuery}) : _audioQuery = audioQuery ?? OnAudioQuery();

  final OnAudioQuery _audioQuery;

  static bool _isGranted(PermissionStatus status) => status.isGranted || status.isLimited;

  /// Requests media access for this Android version.
  ///
  /// Android 13+ (SDK 33): `Permission.audio` (READ_MEDIA_AUDIO). Older
  /// Android: `Permission.storage` (READ_EXTERNAL_STORAGE, declared with
  /// `maxSdkVersion="32"`). The two are requested in that order because
  /// permission_handler reports a permission that does not exist on the
  /// running SDK as denied immediately, without ever showing a dialog —
  /// so the request for the wrong SDK is a silent no-op and the right one
  /// is the one that actually prompts.
  Future<DeviceMusicPermissionState> ensurePermission() async {
    // Fast path: already granted (also covers "limited" partial access).
    if (_isGranted(await Permission.audio.status)) {
      return DeviceMusicPermissionState.granted;
    }
    final audio = await Permission.audio.request();
    if (_isGranted(audio)) return DeviceMusicPermissionState.granted;
    final storage = await Permission.storage.request();
    if (_isGranted(storage)) return DeviceMusicPermissionState.granted;
    if (audio.isPermanentlyDenied || storage.isPermanentlyDenied) {
      return DeviceMusicPermissionState.permanentlyDenied;
    }
    return DeviceMusicPermissionState.denied;
  }

  /// Lists the device's audio files, playable ones only, sorted by title.
  /// Callers must call [ensurePermission] first and only call this when
  /// it returned [DeviceMusicPermissionState.granted].
  Future<List<DeviceSong>> querySongs() async {
    final songs = await _audioQuery.querySongs(sortType: SongSortType.TITLE);
    final out = <DeviceSong>[];
    for (final song in songs) {
      final deviceSong = DeviceSong.fromSongModel(song);
      if (deviceSong != null) out.add(deviceSong);
    }
    return out;
  }

  /// Opens the app's system settings page, where a permanently denied
  /// media permission can be re-enabled.
  Future<bool> openSettings() => openAppSettings();
}
