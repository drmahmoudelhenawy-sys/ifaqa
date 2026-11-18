import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/siraj/device_music.dart';
import 'package:on_audio_query_pluse/on_audio_query.dart';

void main() {
  group('isUsableDeviceSong', () {
    test('accepts a real file with a positive duration', () {
      expect(isUsableDeviceSong(filePath: '/storage/song.mp3', durationMs: 180000), isTrue);
    });

    test('rejects an empty file path', () {
      expect(isUsableDeviceSong(filePath: '', durationMs: 180000), isFalse);
    });

    test('rejects a null file path', () {
      expect(isUsableDeviceSong(filePath: null, durationMs: 180000), isFalse);
    });

    test('rejects a zero duration', () {
      expect(isUsableDeviceSong(filePath: '/storage/song.mp3', durationMs: 0), isFalse);
    });

    test('rejects a null duration', () {
      expect(isUsableDeviceSong(filePath: '/storage/song.mp3', durationMs: null), isFalse);
    });

    test('rejects a negative duration', () {
      expect(isUsableDeviceSong(filePath: '/storage/song.mp3', durationMs: -5), isFalse);
    });
  });

  group('usableDeviceSongs', () {
    test('keeps only playable songs, preserving order', () {
      const songs = [
        DeviceSong(id: 1, title: 'A', artist: 'X', filePath: '/a.mp3', durationMs: 1000),
        DeviceSong(id: 2, title: 'B', artist: 'Y', filePath: '', durationMs: 1000),
        DeviceSong(id: 3, title: 'C', artist: 'Z', filePath: '/c.mp3', durationMs: 0),
        DeviceSong(id: 4, title: 'D', artist: 'W', filePath: '/d.mp3', durationMs: 2000),
      ];
      final kept = usableDeviceSongs(songs);
      expect(kept.map((s) => s.id).toList(), [1, 4]);
    });
  });

  group('DeviceSong.fromSongModel', () {
    SongModel model(Map<String, dynamic> info) => SongModel(info);

    test('maps a valid song', () {
      final song = DeviceSong.fromSongModel(model({
        '_id': 7,
        '_data': '/storage/song.mp3',
        'title': 'My Song',
        'artist': 'Singer',
        'duration': 123000,
      }));
      expect(song, isNotNull);
      expect(song!.id, 7);
      expect(song.title, 'My Song');
      expect(song.artist, 'Singer');
      expect(song.filePath, '/storage/song.mp3');
      expect(song.durationMs, 123000);
    });

    test('returns null for a song with no file path', () {
      final song = DeviceSong.fromSongModel(model({
        '_id': 8,
        '_data': '',
        'title': 'No File',
        'artist': 'Singer',
        'duration': 123000,
      }));
      expect(song, isNull);
    });

    test('returns null for a song with zero duration', () {
      final song = DeviceSong.fromSongModel(model({
        '_id': 9,
        '_data': '/storage/song.mp3',
        'title': 'Zero',
        'artist': 'Singer',
        'duration': 0,
      }));
      expect(song, isNull);
    });

    test('returns null instead of throwing for a malformed row', () {
      final song = DeviceSong.fromSongModel(model({'_id': 10}));
      expect(song, isNull);
    });
  });
}
