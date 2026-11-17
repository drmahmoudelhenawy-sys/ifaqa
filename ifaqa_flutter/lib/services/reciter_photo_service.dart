import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../models/reciter.dart';
import 'cloud_service.dart';
import 'reciter_service.dart';

/// Same normalisation as React `normalizeReciterKey`: strips tashkeel and
/// unifies alef / yaa / taa marbuta so name variants map to one key.
String normalizeReciterKey(String name) {
  if (name.isEmpty) return '';
  return name
      .trim()
      .toLowerCase()
      .replaceAll(RegExp('[ً-ٰٟ]'), '')
      .replaceAll(RegExp('[أإآ]'), 'ا')
      .replaceAll('ى', 'ي')
      .replaceAll('ة', 'ه')
      .replaceAll(RegExp(r'\s+'), ' ');
}

/// Parses the `photos` map of the Firestore doc into normalizedKey -> url.
/// Entries without a usable `photoUrl` are dropped.
Map<String, CustomReciterPhoto> parseReciterPhotos(Object? raw) {
  final out = <String, CustomReciterPhoto>{};
  if (raw is! Map) return out;
  raw.forEach((k, v) {
    if (v is! Map) return;
    final url = (v['photoUrl'] ?? '').toString().trim();
    if (url.isEmpty) return;
    out[k.toString()] = CustomReciterPhoto(name: (v['name'] ?? k).toString(), photoUrl: url);
  });
  return out;
}

/// Resolves a photo for [name]: exact / normalized key, then fuzzy
/// substring match (only when the name has 4+ chars), like the React service.
String? matchReciterPhoto(Map<String, CustomReciterPhoto> photos, String name) {
  final clean = name.trim();
  if (clean.isEmpty) return null;
  final normalized = normalizeReciterKey(clean);
  final direct = photos[clean] ?? photos[normalized];
  if (direct != null) return direct.photoUrl;
  for (final e in photos.entries) {
    final keyNorm = normalizeReciterKey(e.key);
    final itemNorm = normalizeReciterKey(e.value.name);
    if (keyNorm == normalized || itemNorm == normalized) return e.value.photoUrl;
    if (normalized.length >= 4 &&
        (keyNorm.contains(normalized) || normalized.contains(keyNorm) || itemNorm.contains(normalized) || normalized.contains(itemNorm))) {
      return e.value.photoUrl;
    }
  }
  return null;
}

class CustomReciterPhoto {
  final String name;
  final String photoUrl;
  const CustomReciterPhoto({required this.name, required this.photoUrl});
}

/// Admin-managed reciter photos, stored by reciter *name* in
/// `artifacts/{appId}/public/data/app_config/reciter_custom_photos`
/// (field `photos.<normalizedName>`), shared with the React app.
/// Listen via [addListener] (or `ReciterPhoto` widget) to refresh UIs.
class ReciterPhotoService extends ChangeNotifier {
  ReciterPhotoService._();
  static final ReciterPhotoService instance = ReciterPhotoService._();

  Map<String, CustomReciterPhoto> _photos = {};
  final Map<int, String> _idToName = {};
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _sub;
  Future<void>? _namesLoad;

  DocumentReference<Map<String, dynamic>> get _doc => FirebaseFirestore.instance.doc('artifacts/${CloudService.appId}/public/data/app_config/reciter_custom_photos');

  /// Starts the Firestore listener and the id->name lookup (idempotent).
  void start() {
    _sub ??= _doc.snapshots().listen((snap) {
      _photos = parseReciterPhotos(snap.data()?['photos']);
      notifyListeners();
    }, onError: (_) {});
    _namesLoad ??= _loadNames();
  }

  Future<void> _loadNames() async {
    try {
      registerReciters(await fetchReciters());
    } catch (_) {
      _namesLoad = null; // retry on next photoUrlFor call
    }
  }

  /// Lets callers that already hold the reciter list skip the extra fetch.
  void registerReciters(Iterable<Reciter> reciters) {
    for (final r in reciters) {
      _idToName[r.id] = r.name;
    }
    notifyListeners();
  }

  /// Custom photo URL for a reciter id, or null (use the default avatar).
  String? photoUrlFor(int reciterId) {
    start();
    final name = _idToName[reciterId];
    return name == null ? null : matchReciterPhoto(_photos, name);
  }

  String? photoUrlForName(String name) {
    start();
    return matchReciterPhoto(_photos, name);
  }

  /// Exact stored entry for a reciter (admin UI), or null.
  String? storedUrlFor(String name) => _photos[normalizeReciterKey(name)]?.photoUrl;

  Future<void> setPhoto(String name, String url) async {
    final trimmed = name.trim();
    final u = url.trim();
    if (trimmed.isEmpty || !(Uri.tryParse(u)?.hasAbsolutePath ?? false) || !u.startsWith('http')) {
      throw ArgumentError('اسم القارئ ورابط الصورة (http) مطلوبان');
    }
    final key = normalizeReciterKey(trimmed);
    await _doc.set({
      'photos': {
        key: {
          'name': trimmed,
          'photoUrl': u,
          'updatedAt': DateTime.now().toIso8601String(),
          'updatedBy': FirebaseAuth.instance.currentUser?.email ?? 'Admin',
          'notes': '',
        },
      },
      'lastUpdated': DateTime.now().toIso8601String(),
    }, SetOptions(merge: true));
  }

  Future<void> clearPhoto(String name) async {
    final key = normalizeReciterKey(name);
    await _doc.update({
      FieldPath(['photos', key]): FieldValue.delete(),
      'lastUpdated': DateTime.now().toIso8601String(),
    });
  }
}
