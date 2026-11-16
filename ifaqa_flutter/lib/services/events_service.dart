import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'app_state.dart';
import 'cloud_service.dart';

/// A zekr inside an event (React `Zekr`).
class EventZekr {
  final String id;
  final String text;
  final int count;
  final int xp;
  final String fadl;
  const EventZekr({required this.id, required this.text, this.count = 1, this.xp = 1, this.fadl = ''});

  factory EventZekr.fromMap(Map<String, dynamic> m) => EventZekr(
        id: (m['id'] ?? '').toString(),
        text: (m['text'] as String?) ?? '',
        count: (m['count'] as num?)?.toInt() ?? 1,
        xp: (m['xp'] as num?)?.toInt() ?? 1,
        fadl: (m['fadl'] as String?) ?? '',
      );

  Map<String, dynamic> toMap() => {'id': id, 'text': text, 'count': count, 'xp': xp, 'fadl': fadl};
}

enum EventPhase { upcoming, active, ended }

/// React `MawanEvent`, stored at `public/data/mawan_events`.
class MawanEvent {
  final String id;
  final String title;
  final String icon;
  final String gradient;
  final String status;
  final DateTime start;
  final DateTime end;
  final String description;
  final String rules;
  final List<EventZekr> adhkar;

  const MawanEvent({
    required this.id,
    required this.title,
    required this.icon,
    required this.gradient,
    required this.status,
    required this.start,
    required this.end,
    required this.description,
    required this.rules,
    required this.adhkar,
  });

  bool get isDraft => status == 'draft';

  EventPhase phaseAt(DateTime now) {
    if (now.isBefore(start)) return EventPhase.upcoming;
    if (now.isAfter(end)) return EventPhase.ended;
    return EventPhase.active;
  }

  factory MawanEvent.fromDoc(DocumentSnapshot<Map<String, dynamic>> d) {
    final m = d.data() ?? const {};
    DateTime ts(Object? v) => v is Timestamp ? v.toDate() : DateTime.now();
    return MawanEvent(
      id: d.id,
      title: (m['title'] as String?) ?? 'فعالية',
      icon: (m['icon'] as String?) ?? 'Star',
      gradient: (m['gradient'] as String?) ?? eventGradients.first,
      status: (m['status'] as String?) ?? 'active',
      start: ts(m['startTime']),
      end: ts(m['endTime']),
      description: (m['description'] as String?) ?? '',
      rules: (m['rules'] as String?) ?? '',
      adhkar: ((m['requiredAdhkar'] as List?) ?? const [])
          .whereType<Map>()
          .map((z) => EventZekr.fromMap(Map<String, dynamic>.from(z)))
          .toList(),
    );
  }

  /// Tailwind gradient class names from the React admin, mapped to colors.
  List<Color> get colors => gradientColors(gradient);
  IconData get iconData => eventIcons[icon] ?? Icons.star;
}

const eventGradients = [
  'from-yellow-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-cyan-500',
  'from-rose-400 to-red-500',
  'from-purple-500 to-indigo-600',
  'from-pink-500 to-rose-600',
];

const _gradientMap = <String, List<Color>>{
  'from-yellow-400 to-orange-500': [Color(0xFFFACC15), Color(0xFFF97316)],
  'from-emerald-400 to-teal-500': [Color(0xFF34D399), Color(0xFF14B8A6)],
  'from-blue-400 to-cyan-500': [Color(0xFF60A5FA), Color(0xFF06B6D4)],
  'from-rose-400 to-red-500': [Color(0xFFFB7185), Color(0xFFEF4444)],
  'from-purple-500 to-indigo-600': [Color(0xFFA855F7), Color(0xFF4F46E5)],
  'from-pink-500 to-rose-600': [Color(0xFFEC4899), Color(0xFFE11D48)],
};

List<Color> gradientColors(String g) => _gradientMap[g] ?? const [Color(0xFF8B5CF6), Color(0xFF4F46E5)];

const eventIcons = <String, IconData>{
  'Star': Icons.star,
  'Trophy': Icons.emoji_events,
  'BookOpen': Icons.menu_book,
  'Calendar': Icons.calendar_month,
  'Sparkles': Icons.auto_awesome,
  'Flame': Icons.local_fire_department,
  'Award': Icons.military_tech,
  'Compass': Icons.explore,
};

class EventParticipant {
  final String id;
  final String name;
  final int score;
  final Map<String, int> tasks;
  const EventParticipant(this.id, this.name, this.score, this.tasks);

  factory EventParticipant.fromDoc(DocumentSnapshot<Map<String, dynamic>> d) {
    final m = d.data() ?? const {};
    return EventParticipant(
      d.id,
      (m['name'] as String?) ?? 'مشارك',
      (m['score'] as num?)?.toInt() ?? 0,
      ((m['tasks'] as Map?) ?? const {}).map((k, v) => MapEntry(k.toString(), (v as num?)?.toInt() ?? 0)),
    );
  }
}

class EventsService {
  EventsService._();
  static final EventsService instance = EventsService._();

  FirebaseFirestore get _db => FirebaseFirestore.instance;
  CollectionReference<Map<String, dynamic>> get _events =>
      _db.collection('artifacts/${CloudService.appId}/public/data/mawan_events');
  DocumentReference<Map<String, dynamic>> _profile(String uid) =>
      _db.doc('artifacts/${CloudService.appId}/users/$uid/stats/profile');

  Stream<List<MawanEvent>> events() =>
      _events.orderBy('startTime', descending: true).snapshots().map((s) => s.docs.map(MawanEvent.fromDoc).toList());

  Stream<EventParticipant?> me(String eventId) {
    final uid = CloudService.instance.user!.uid;
    return _events.doc(eventId).collection('participants').doc(uid).snapshots().map((d) => d.exists ? EventParticipant.fromDoc(d) : null);
  }

  Stream<List<EventParticipant>> leaderboard(String eventId) => _events
      .doc(eventId)
      .collection('participants')
      .orderBy('score', descending: true)
      .limit(50)
      .snapshots()
      .map((s) => s.docs.map(EventParticipant.fromDoc).toList());

  Future<void> join(String eventId) async {
    final uid = CloudService.instance.user!.uid;
    await _events.doc(eventId).collection('participants').doc(uid).set({
      'name': AppState.instance.displayName,
      'photoURL': null,
      'gender': 'male',
      'score': 0,
      'tasks': <String, int>{},
      'joinedAt': FieldValue.serverTimestamp(),
    });
    await _profile(uid).set({'eventStats': {'participatedCount': FieldValue.increment(1)}}, SetOptions(merge: true));
  }

  Future<void> tap(String eventId, EventZekr z) async {
    final uid = CloudService.instance.user!.uid;
    await _events.doc(eventId).collection('participants').doc(uid).update({
      'score': FieldValue.increment(z.xp),
      'tasks.${z.id}': FieldValue.increment(1),
    });
    await _profile(uid).set({'eventStats': {'totalScore': FieldValue.increment(z.xp)}}, SetOptions(merge: true));
  }

  /// Records the final rank once per ended event (React `processEventResults`).
  Future<void> recordResult(MawanEvent e) async {
    final uid = CloudService.instance.user?.uid;
    if (uid == null) return;
    try {
      final profile = await _profile(uid).get();
      final stats = (profile.data()?['eventStats'] as Map?) ?? const {};
      final processed = List<String>.from((stats['processedEvents'] as List?) ?? const []);
      if (processed.contains(e.id)) return;
      final mine = await _events.doc(e.id).collection('participants').doc(uid).get();
      if (!mine.exists) return;
      final myScore = (mine.data()?['score'] as num?)?.toInt() ?? 0;
      final ahead = await _events.doc(e.id).collection('participants').where('score', isGreaterThan: myScore).count().get();
      final rank = (ahead.count ?? 0) + 1;
      final best = (stats['bestRank'] as num?)?.toInt();
      await _profile(uid).set({
        'eventStats': {
          'bestRank': best == null || rank < best ? rank : best,
          'processedEvents': FieldValue.arrayUnion([e.id]),
          if (rank == 1) 'firstPlaceWins': FieldValue.increment(1),
        },
      }, SetOptions(merge: true));
    } catch (err) {
      debugPrint('event result failed: $err');
    }
  }

  // ---- Admin ----

  Future<void> save({
    String? id,
    required String title,
    required String icon,
    required String gradient,
    required String status,
    required DateTime start,
    required DateTime end,
    required String description,
    required String rules,
    required List<EventZekr> adhkar,
  }) async {
    final data = {
      'title': title,
      'icon': icon,
      'gradient': gradient,
      'status': status,
      'startTime': Timestamp.fromDate(start),
      'endTime': Timestamp.fromDate(end),
      'description': description,
      'rules': rules,
      'requiredAdhkar': adhkar.map((z) => z.toMap()).toList(),
    };
    if (id == null) {
      await _events.add(data);
    } else {
      await _events.doc(id).set(data, SetOptions(merge: true));
    }
  }

  Future<void> delete(String id) => _events.doc(id).delete();
}
