import 'package:cloud_firestore/cloud_firestore.dart';
import 'cloud_service.dart';

/// Admin-managed home content (React `DynamicContent`) and launch announcements.
class ContentItem {
  final String id;
  final String type;
  final String text;
  final String explanation;
  final String source;
  final int duration;
  final bool active;
  const ContentItem(this.id, this.type, this.text, this.explanation, this.source, this.duration, this.active);

  String get typeLabel => switch (type) { 'hadith' => 'حديث شريف', 'zekr' => 'ذكر', _ => 'حكمة' };

  factory ContentItem.fromDoc(DocumentSnapshot<Map<String, dynamic>> d) {
    final m = d.data() ?? const <String, dynamic>{};
    return ContentItem(
      d.id,
      (m['type'] as String?) ?? 'wisdom',
      (m['text'] as String?) ?? '',
      (m['explanation'] as String?) ?? '',
      (m['source'] as String?) ?? '',
      (m['duration'] as num?)?.toInt() ?? 10,
      m['active'] != false,
    );
  }
}

class Announcement {
  final String id;
  final String title;
  final String body;
  final bool active;
  final DateTime time;
  const Announcement(this.id, this.title, this.body, this.active, this.time);

  factory Announcement.fromDoc(DocumentSnapshot<Map<String, dynamic>> d) {
    final m = d.data() ?? const <String, dynamic>{};
    final ts = m['timestamp'];
    return Announcement(
      d.id,
      (m['title'] as String?) ?? 'تنبيه هام',
      (m['body'] as String?) ?? (m['text'] as String?) ?? '',
      m['active'] == true,
      ts is Timestamp ? ts.toDate() : DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class ContentService {
  ContentService._();
  static final ContentService instance = ContentService._();

  FirebaseFirestore get _db => FirebaseFirestore.instance;
  CollectionReference<Map<String, dynamic>> get _content => _db.collection('artifacts/${CloudService.appId}/public/data/dynamic_content');
  CollectionReference<Map<String, dynamic>> get _announcements => _db.collection('artifacts/${CloudService.appId}/public/data/announcements');

  Stream<List<ContentItem>> activeContent() =>
      _content.where('active', isEqualTo: true).snapshots().map((s) => s.docs.map(ContentItem.fromDoc).where((c) => c.text.isNotEmpty).toList());

  Stream<List<ContentItem>> allContent() => _content.snapshots().map((s) => s.docs.map(ContentItem.fromDoc).toList());

  Future<Announcement?> latestAnnouncement() async {
    final s = await _announcements.where('active', isEqualTo: true).get();
    if (s.docs.isEmpty) return null;
    final list = s.docs.map(Announcement.fromDoc).where((a) => a.body.isNotEmpty).toList()..sort((a, b) => a.time.compareTo(b.time));
    return list.isEmpty ? null : list.last;
  }

  Stream<List<Announcement>> announcements() =>
      _announcements.orderBy('timestamp', descending: true).limit(50).snapshots().map((s) => s.docs.map(Announcement.fromDoc).toList());

  // ---- Admin ----

  Future<void> addContent(String type, String text, String explanation, String source, int duration) => _content.add({
        'type': type,
        'text': text,
        'explanation': explanation,
        'source': source,
        'duration': duration,
        'active': true,
      });

  Future<void> setContentActive(String id, bool active) => _content.doc(id).update({'active': active});
  Future<void> deleteContent(String id) => _content.doc(id).delete();

  /// Same document shape as React's admin. `status` stays 'pending': the
  /// `onCreate` Cloud Function pushes it and then marks it 'sent' itself.
  Future<void> postAnnouncement(String title, String body) => _announcements.add({
        'title': title.isEmpty ? 'تطبيق إفاقة' : title,
        'body': body,
        'text': body,
        'active': true,
        'isScheduled': false,
        'scheduledAt': null,
        'status': 'pending',
        'targetTopic': 'all_users',
        'targetPage': 'home',
        'timestamp': FieldValue.serverTimestamp(),
        'sentAt': null,
        'createdBy': CloudService.instance.user?.email ?? CloudService.instance.user?.uid,
      });

  Future<void> setAnnouncementActive(String id, bool active) => _announcements.doc(id).update({'active': active});
  Future<void> deleteAnnouncement(String id) => _announcements.doc(id).delete();
}
