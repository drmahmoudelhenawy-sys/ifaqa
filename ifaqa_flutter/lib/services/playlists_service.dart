import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/reciter.dart';
import 'app_state.dart';

/// One surah by one reciter inside a user playlist.
class PlaylistItem {
  final int reciterId;
  final String reciterName;
  final String server;
  final int surah;
  const PlaylistItem({required this.reciterId, required this.reciterName, required this.server, required this.surah});

  Reciter get reciter => Reciter(id: reciterId, name: reciterName, server: server, surahList: const []);

  Map<String, dynamic> toJson() => {'reciterId': reciterId, 'reciterName': reciterName, 'server': server, 'surah': surah};

  factory PlaylistItem.fromJson(Map<String, dynamic> j) => PlaylistItem(
        reciterId: (j['reciterId'] as num).toInt(),
        reciterName: j['reciterName'] as String? ?? '',
        server: j['server'] as String? ?? '',
        surah: (j['surah'] as num).toInt(),
      );
}

class UserPlaylist {
  final String id;
  String title;
  List<PlaylistItem> items;
  UserPlaylist({required this.id, required this.title, required this.items});

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'items': items.map((e) => e.toJson()).toList()};

  factory UserPlaylist.fromJson(Map<String, dynamic> j) => UserPlaylist(
        id: j['id'] as String,
        title: j['title'] as String? ?? '',
        items: ((j['items'] as List?) ?? const []).map((e) => PlaylistItem.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
      );
}

/// Locally stored user playlists (JSON in AppState).
class PlaylistsService extends ChangeNotifier {
  PlaylistsService._();
  static final PlaylistsService instance = PlaylistsService._();
  static const _key = 'user_playlists_v1';

  List<UserPlaylist> get playlists {
    final raw = AppState.instance.text(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      return (jsonDecode(raw) as List).map((e) => UserPlaylist.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    } catch (_) {
      return [];
    }
  }

  UserPlaylist? byId(String id) => playlists.where((p) => p.id == id).firstOrNull;

  void _save(List<UserPlaylist> all) {
    AppState.instance.setText(_key, jsonEncode(all.map((p) => p.toJson()).toList()));
    notifyListeners();
  }

  UserPlaylist create(String title) {
    final all = playlists;
    final p = UserPlaylist(id: 'pl_${DateTime.now().millisecondsSinceEpoch}', title: title.trim().isEmpty ? 'قائمة جديدة' : title.trim(), items: []);
    all.add(p);
    _save(all);
    return p;
  }

  void rename(String id, String title) {
    final all = playlists;
    final p = all.where((e) => e.id == id).firstOrNull;
    if (p == null || title.trim().isEmpty) return;
    p.title = title.trim();
    _save(all);
  }

  void delete(String id) => _save(playlists.where((p) => p.id != id).toList());

  void addItem(String id, Reciter r, int surah) {
    final all = playlists;
    final p = all.where((e) => e.id == id).firstOrNull;
    if (p == null) return;
    p.items.add(PlaylistItem(reciterId: r.id, reciterName: r.name, server: r.server, surah: surah));
    _save(all);
  }

  void removeItem(String id, int index) {
    final all = playlists;
    final p = all.where((e) => e.id == id).firstOrNull;
    if (p == null || index < 0 || index >= p.items.length) return;
    p.items.removeAt(index);
    _save(all);
  }

  void moveItem(String id, int from, int to) {
    final all = playlists;
    final p = all.where((e) => e.id == id).firstOrNull;
    if (p == null) return;
    final item = p.items.removeAt(from);
    p.items.insert(to.clamp(0, p.items.length), item);
    _save(all);
  }
}
