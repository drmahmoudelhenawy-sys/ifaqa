import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../data/challenges_data.dart';
import 'cloud_service.dart';

/// Parses the `challenges` array of the Firestore doc. Invalid rows are
/// skipped; returns null when nothing usable remains (caller falls back to
/// the bundled list, like React does for an empty/absent doc).
List<ChallengeItem>? parseChallenges(Object? raw) {
  if (raw is! List) return null;
  final out = <ChallengeItem>[];
  for (final e in raw) {
    if (e is! Map) continue;
    final id = (e['id'] ?? '').toString();
    final title = (e['title'] ?? '').toString().trim();
    if (id.isEmpty || title.isEmpty) continue;
    out.add(ChallengeItem(id: id, title: title, xp: normalizeXp(e['xp'])));
  }
  return out.isEmpty ? null : out;
}

/// React clamps xp to at least 10 and defaults to 100.
int normalizeXp(Object? v) {
  final n = v is num ? v.round() : int.tryParse('${v ?? ''}') ?? 0;
  if (n == 0) return 100;
  return n < 10 ? 10 : n;
}

/// Editable daily challenges, shared with the React app:
/// `artifacts/{appId}/public/data/app_config/daily_challenges` { challenges: [{id,title,xp}] }.
/// Falls back to [allChallenges] when the doc is absent, empty or unreachable.
class ChallengesService {
  ChallengesService._();
  static final ChallengesService instance = ChallengesService._();

  DocumentReference<Map<String, dynamic>> get _doc => FirebaseFirestore.instance.doc('artifacts/${CloudService.appId}/public/data/app_config/daily_challenges');

  List<ChallengeItem> _latest = List.of(allChallenges);
  List<ChallengeItem> get latest => _latest;

  Stream<List<ChallengeItem>> stream() async* {
    yield _latest;
    try {
      await for (final snap in _doc.snapshots()) {
        _latest = parseChallenges(snap.data()?['challenges']) ?? List.of(allChallenges);
        yield _latest;
      }
    } catch (_) {
      yield _latest;
    }
  }

  Future<void> save(List<ChallengeItem> list) async {
    await _doc.set({
      'challenges': [for (final c in list) {'id': c.id, 'title': c.title, 'xp': c.xp}],
      'lastUpdated': DateTime.now().toIso8601String(),
    });
  }

  static String newId() => 'ch_${DateTime.now().millisecondsSinceEpoch}_${(DateTime.now().microsecond % 36).toRadixString(36)}';
}
