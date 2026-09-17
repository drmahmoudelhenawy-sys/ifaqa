import 'package:just_audio/just_audio.dart';

class AudioPlayerService {
  static final AudioPlayerService instance = AudioPlayerService._internal();
  AudioPlayerService._internal();

  final AudioPlayer _player = AudioPlayer();
  AudioPlayer get player => _player;

  String? _currentUrl;
  bool _isPlaying = false;

  bool get isPlaying => _isPlaying;

  Future<void> playAyah({
    required String reciterFolder,
    required int surah,
    required int ayah,
  }) async {
    final s = surah.toString().padLeft(3, '0');
    final a = ayah.toString().padLeft(3, '0');
    final url = 'https://everyayah.com/data/$reciterFolder/$s$a.mp3';
    await playUrl(url);
  }

  Future<void> playRadio(String streamUrl) async {
    await playUrl(streamUrl);
  }

  Future<void> playUrl(String url) async {
    try {
      if (_currentUrl == url && _player.playing) {
        await pause();
        return;
      }
      _currentUrl = url;
      await _player.setUrl(url);
      await _player.play();
      _isPlaying = true;
    } catch (e) {
      _isPlaying = false;
    }
  }

  Future<void> pause() async {
    await _player.pause();
    _isPlaying = false;
  }

  Future<void> resume() async {
    await _player.play();
    _isPlaying = true;
  }

  Future<void> stop() async {
    await _player.stop();
    _isPlaying = false;
    _currentUrl = null;
  }

  void dispose() {
    _player.dispose();
  }
}
