import 'dart:async';
import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import '../data/clan_territories.dart';
import 'app_state.dart';
import 'cloud_service.dart';
import 'clan_features.dart';

/// Clans ("الرَّكْب"), on the same Firestore paths and rules as React's
/// `clanService`. Ported: browsing, create/edit, join (open/passcode/approval/
/// hybrid), join requests, members, leave/kick/transfer/disband, points with
/// streak and blessed-time multipliers, territory unlocks, quests, activity
/// feed and chat, distributed khatma (`features/khatma`), Sahar lanterns
/// (`features/sahar_<date>`), twin pacts and joint mega projects
/// (`public/data/clan_twins`). Pure logic for the last three lives in
/// clan_features.dart.
enum JoinPolicy { open, passcode, approval, hybrid }

JoinPolicy _policy(Map<String, dynamic> m) {
  final p = m['joinPolicy'] as String?;
  return JoinPolicy.values.firstWhere((e) => e.name == p, orElse: () => m['isPrivate'] == true ? JoinPolicy.passcode : JoinPolicy.open);
}

class ClanBanner {
  final String id;
  final String name;
  final List<Color> colors;
  const ClanBanner(this.id, this.name, this.colors);
}

const clanBanners = [
  ClanBanner('emerald', 'زمردي ملكي', [Color(0xFF134E3A), Color(0xFF09261C)]),
  ClanBanner('sapphire', 'كحلي أندلسي', [Color(0xFF1E3A5F), Color(0xFF0F1D30)]),
  ClanBanner('amber', 'ذهبي عتيق', [Color(0xFF6C4E1A), Color(0xFF38280B)]),
  ClanBanner('amethyst', 'أرجواني فاخر', [Color(0xFF4A2569), Color(0xFF251235)]),
  ClanBanner('ruby', 'عنابي وقور', [Color(0xFF5C1D24), Color(0xFF2D0D12)]),
  ClanBanner('teal', 'فيروزي نقي', [Color(0xFF115357), Color(0xFF08292B)]),
];

/// React stores the banner as a CSS gradient string; read the hex colors back.
List<Color> bannerColors(String raw) {
  for (final b in clanBanners) {
    if (raw == b.id || raw.contains(_hex(b.colors.first))) return b.colors;
  }
  final hexes = RegExp(r'#([0-9a-fA-F]{6})').allMatches(raw).map((m) => Color(int.parse('FF${m.group(1)}', radix: 16))).toList();
  if (hexes.length >= 2) return hexes.take(2).toList();
  if (hexes.length == 1) return [hexes.first, hexes.first];
  return clanBanners.first.colors;
}

String _hex(Color c) => '#${(c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}';
String bannerCss(ClanBanner b) => 'linear-gradient(135deg, ${_hex(b.colors[0])}, ${_hex(b.colors[1])})';

/// React stores logos as `./clan_logos/clan_01.gif`.
final clanLogos = List.generate(26, (i) => './clan_logos/clan_${(i + 1).toString().padLeft(2, '0')}.${i == 8 ? 'png' : 'gif'}');
String? logoAsset(String badge) {
  final m = RegExp(r'clan_(\d{2})\.(gif|png)').firstMatch(badge);
  return m == null ? null : 'assets/clan_logos/clan_${m.group(1)}.${m.group(2)}';
}

class Clan {
  final String id;
  final String name;
  final String description;
  final String bannerColor;
  final String badgeIcon;
  final String leaderId;
  final String leaderName;
  final int memberCount;
  final int maxCapacity;
  final int totalPoints;
  final int questBonusPoints;
  final List<String> unlockedTerritories;
  final Map<String, dynamic> territoryProjects;
  final JoinPolicy policy;
  final String passcode;
  final String tag;
  final List<ClanActivity> activities;
  final String twinStatus; // none | pending_sent | pending_received | active
  final String? twinPactId;
  final String? twinClanId;
  final String? twinClanName;
  final String? twinClanBadge;
  final String? twinPendingClanId;

  const Clan({
    required this.id,
    required this.name,
    required this.description,
    required this.bannerColor,
    required this.badgeIcon,
    required this.leaderId,
    required this.leaderName,
    required this.memberCount,
    required this.maxCapacity,
    required this.totalPoints,
    required this.questBonusPoints,
    required this.unlockedTerritories,
    required this.territoryProjects,
    required this.policy,
    required this.passcode,
    required this.tag,
    required this.activities,
    this.twinStatus = 'none',
    this.twinPactId,
    this.twinClanId,
    this.twinClanName,
    this.twinClanBadge,
    this.twinPendingClanId,
  });

  bool get isFull => memberCount >= maxCapacity;
  List<Color> get colors => bannerColors(bannerColor);

  factory Clan.fromDoc(DocumentSnapshot<Map<String, dynamic>> d) {
    final m = d.data() ?? const <String, dynamic>{};
    return Clan(
      id: d.id,
      name: (m['name'] as String?) ?? 'رَكْب',
      description: (m['description'] as String?) ?? '',
      bannerColor: (m['bannerColor'] as String?) ?? '',
      badgeIcon: (m['badgeIcon'] as String?) ?? '',
      leaderId: (m['leaderId'] as String?) ?? '',
      leaderName: (m['leaderName'] as String?) ?? '',
      memberCount: (m['memberCount'] as num?)?.toInt() ?? 0,
      maxCapacity: (m['maxCapacity'] as num?)?.toInt() ?? 10,
      totalPoints: (m['totalPoints'] as num?)?.toInt() ?? 0,
      questBonusPoints: (m['questBonusPoints'] as num?)?.toInt() ?? 0,
      unlockedTerritories: List<String>.from((m['unlockedTerritories'] as List?) ?? const []),
      territoryProjects: Map<String, dynamic>.from((m['territoryProjects'] as Map?) ?? const {}),
      policy: _policy(m),
      passcode: (m['joinPasscode'] as String?) ?? '',
      tag: (m['clanTag'] as String?) ?? '#${d.id}',
      activities: ((m['recentActivities'] as List?) ?? const [])
          .whereType<Map>()
          .map((a) => ClanActivity.fromMap(Map<String, dynamic>.from(a)))
          .toList(),
      twinStatus: (m['twinStatus'] as String?) ?? 'none',
      twinPactId: m['twinPactId'] as String?,
      twinClanId: m['twinClanId'] as String?,
      twinClanName: m['twinClanName'] as String?,
      twinClanBadge: m['twinClanBadge'] as String?,
      twinPendingClanId: m['twinPendingClanId'] as String?,
    );
  }

  Map<String, dynamic> get twinFields => {'twinStatus': twinStatus, 'twinPactId': twinPactId, 'twinClanId': twinClanId, 'twinClanName': twinClanName, 'twinClanBadge': twinClanBadge, 'twinPendingClanId': twinPendingClanId};
}

class ClanActivity {
  final String userName;
  final String message;
  final DateTime time;
  const ClanActivity(this.userName, this.message, this.time);
  factory ClanActivity.fromMap(Map<String, dynamic> m) => ClanActivity(
        (m['userName'] as String?) ?? '',
        (m['message'] as String?) ?? '',
        DateTime.fromMillisecondsSinceEpoch((m['timestamp'] as num?)?.toInt() ?? 0),
      );
}

class ClanMember {
  final String id;
  final String name;
  final String role;
  final int points;
  final int streakDays;
  final String lastActiveDate;
  const ClanMember(this.id, this.name, this.role, this.points, this.streakDays, this.lastActiveDate);

  bool get isLeader => role == 'leader';

  factory ClanMember.fromDoc(DocumentSnapshot<Map<String, dynamic>> d) {
    final m = d.data() ?? const <String, dynamic>{};
    return ClanMember(
      d.id,
      (m['name'] as String?) ?? 'رفيق',
      (m['role'] as String?) ?? 'member',
      (m['contributedPoints'] as num?)?.toInt() ?? 0,
      (m['streakDays'] as num?)?.toInt() ?? 0,
      (m['lastActiveDate'] as String?) ?? '',
    );
  }
}

class JoinRequest {
  final String userId;
  final String userName;
  final int personalXp;
  final String message;
  const JoinRequest(this.userId, this.userName, this.personalXp, this.message);
  factory JoinRequest.fromDoc(DocumentSnapshot<Map<String, dynamic>> d) {
    final m = d.data() ?? const <String, dynamic>{};
    return JoinRequest(d.id, (m['userName'] as String?) ?? 'رفيق الخير', (m['personalXp'] as num?)?.toInt() ?? 0, (m['message'] as String?) ?? '');
  }
}

enum QuestType {
  quranPages('quran_pages'),
  audioMinutes('audio_minutes'),
  salawat('salawat'),
  tasbeeh('tasbeeh'),
  collectiveKhatma('collective_khatma');

  /// The value stored in Firestore, shared with the React app.
  final String wire;
  const QuestType(this.wire);
}

const questUnits = {
  QuestType.quranPages: 'صفحة',
  QuestType.audioMinutes: 'دقيقة',
  QuestType.salawat: 'صلاة على النبي ﷺ',
  QuestType.tasbeeh: 'ذكر',
  QuestType.collectiveKhatma: 'مشارك',
};

class ClanQuest {
  final String id;
  final String title;
  final String description;
  final QuestType type;
  final int target;
  final int current;
  final int bonus;
  final bool completed;
  final String schedule;
  const ClanQuest({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.target,
    this.current = 0,
    required this.bonus,
    this.completed = false,
    this.schedule = 'all_time',
  });

  bool get isWeekly => schedule == 'weekly' || schedule == 'friday_only' || id.startsWith('quest_weekly_') || id == 'quest_kahf_friday';
  bool get fridayOnly => schedule == 'friday_only' || id == 'quest_kahf_friday';

  ClanQuest withProgress(int c, bool done) => ClanQuest(
      id: id, title: title, description: description, type: type, target: target, current: c, bonus: bonus, completed: done, schedule: schedule);

  Map<String, dynamic> toMap() => {
        'id': id,
        'title': title,
        'description': description,
        'targetType': type.wire,
        'targetAmount': target,
        'bonusPoints': bonus,
        'scheduleType': schedule,
      };

  factory ClanQuest.fromMap(String id, Map<String, dynamic> m) => ClanQuest(
        id: id,
        title: (m['title'] as String?) ?? '',
        description: (m['description'] as String?) ?? '',
        type: QuestType.values.firstWhere((t) => t.wire == m['targetType'], orElse: () => QuestType.tasbeeh),
        target: (m['targetAmount'] as num?)?.toInt() ?? 1,
        bonus: (m['bonusPoints'] as num?)?.toInt() ?? 0,
        schedule: (m['scheduleType'] as String?) ?? 'all_time',
      );
}

const defaultClanQuests = [
  ClanQuest(id: 'quest_weekly_khatma', title: 'الختمة الأسبوعية المشتركة', description: 'تلاوة 604 صفحات (مصحف كامل) بتعاون وتكاتف جميع رفقاء الرَّكْب خلال الأسبوع.', type: QuestType.quranPages, target: 604, bonus: 12000, schedule: 'weekly'),
  ClanQuest(id: 'quest_kahf_friday', title: 'نور بين الجمعتين (سورة الكهف)', description: 'قراءة سورة الكهف من قِبل 5 رفقاء على الأقل من الرَّكْب يوم الجمعة.', type: QuestType.collectiveKhatma, target: 5, bonus: 6000, schedule: 'friday_only'),
  ClanQuest(id: 'quest_weekly_tasbeeh', title: 'واحة الذكر الأسبوعية', description: 'تحقيق 15,000 تسبيحة واستغفار جماعي متجدد خلال أيام الأسبوع.', type: QuestType.tasbeeh, target: 15000, bonus: 6000, schedule: 'weekly'),
  ClanQuest(id: 'quest_weekly_salawat', title: 'فيض الصلاة على الحبيب ﷺ', description: 'إنجاز 10,000 صلاة على النبي ﷺ تملأ أسبوع الرَّكْب بالنور والبركة.', type: QuestType.salawat, target: 10000, bonus: 7500, schedule: 'weekly'),
  ClanQuest(id: 'quest_1000_minutes', title: 'ألف دقيقة تدبر واستماع', description: 'تحقيق 1,000 دقيقة استماع لإذاعات وتلاوات القرآن الكريم للرَّكْب ككل.', type: QuestType.audioMinutes, target: 1000, bonus: 5000),
  ClanQuest(id: 'quest_50000_tasbeeh', title: 'ميدان المسبحة الكبرى (٥٠ ألف ذكر)', description: 'الوصول إلى 50,000 ذكر واستغفار في مسيرة الرَّكْب الكبرى.', type: QuestType.tasbeeh, target: 50000, bonus: 15000),
];

class MemberLevel {
  final int level;
  final String title;
  final int next;
  final double progress;
  const MemberLevel(this.level, this.title, this.next, this.progress);
}

MemberLevel memberLevel(int points) {
  const steps = [(0, 200, 'مبتدئ الهمة'), (200, 800, 'سالك الهدى'), (800, 2500, 'مبادر الخيرات'), (2500, 7000, 'صاحب الهمّة'), (7000, 20000, 'رائد الفتوحات'), (20000, 50000, 'سابق بالخيرات')];
  final p = max(0, points);
  for (var i = 0; i < steps.length; i++) {
    final (lo, hi, title) = steps[i];
    if (p < hi || i == steps.length - 1) return MemberLevel(i + 1, title, hi, ((p - lo) / (hi - lo)).clamp(0.0, 1.0));
  }
  return const MemberLevel(1, 'مبتدئ الهمة', 200, 0);
}

double streakMultiplier(int days) => days >= 14 ? 2.0 : days >= 7 ? 1.5 : days >= 3 ? 1.25 : 1.0;

class BlessedTime {
  final String name;
  final double multiplier;
  const BlessedTime(this.name, this.multiplier);
}

BlessedTime? activeBlessedTime([DateTime? at]) {
  final now = at ?? DateTime.now();
  final mins = now.hour * 60 + now.minute;
  final friday = now.weekday == DateTime.friday;
  if (mins >= 150 && mins < 300) return const BlessedTime('نفحة السحر x2', 2.0);
  if (mins >= 300 && mins < 405) return const BlessedTime('ساعة البكور x1.5', 1.5);
  if (friday && mins >= 990 && mins < 1110) return const BlessedTime('ساعة الإجابة x2', 2.0);
  if (!friday && mins >= 990 && mins < 1095) return const BlessedTime('أصيل الذكر x1.25', 1.25);
  return null;
}

/// Friday all day, or Thursday from 17:00 (React `isFridayTime`).
bool isFridayTime([DateTime? at]) {
  final now = at ?? DateTime.now();
  return now.weekday == DateTime.friday || (now.weekday == DateTime.thursday && now.hour >= 17);
}

/// ISO week id, same as React `getCurrentIslamicWeekId`.
String currentWeekId([DateTime? at]) {
  final date = at ?? DateTime.now();
  var d = DateTime.utc(date.year, date.month, date.day);
  d = d.add(Duration(days: 4 - d.weekday));
  final yearStart = DateTime.utc(d.year, 1, 1);
  final week = ((d.difference(yearStart).inDays + 1) / 7).ceil();
  return '${d.year}-W${week.toString().padLeft(2, '0')}';
}

String _isoDay(DateTime d) => d.toUtc().toIso8601String().substring(0, 10);

int nextStreak(int prev, String lastActive) {
  final now = DateTime.now();
  if (lastActive == _isoDay(now)) return max(1, prev);
  if (lastActive == _isoDay(now.subtract(const Duration(days: 1)))) return prev + 1;
  return 1;
}

/// React `pointsUpdate`: starts building landmarks once points reach their
/// cost and unlocks them (with their capacity bonus) after the build time.
Map<String, dynamic> pointsUpdate(Clan clan, int points, {int? memberCount}) {
  final projects = Map<String, dynamic>.from(clan.territoryProjects.map((k, v) => MapEntry(k, Map<String, dynamic>.from(v as Map))));
  final unlocked = {...clan.unlockedTerritories};
  var capacityBonus = 0;
  final nowMs = DateTime.now().millisecondsSinceEpoch;
  for (final t in territories) {
    if (unlocked.contains(t.id)) {
      capacityBonus += t.capacityBonus;
      continue;
    }
    if (points < t.cost) continue;
    final p = projects[t.id] as Map<String, dynamic>?;
    if (p == null) {
      projects[t.id] = {
        'territoryId': t.id,
        'startedAt': nowMs,
        'durationHours': t.buildDurationHours,
        'reducedHours': 0,
        'isCompleted': false,
        'contributions': <Object>[],
      };
    } else {
      final elapsed = max(0, (nowMs - ((p['startedAt'] as num?)?.toInt() ?? nowMs)) / 3600000) + ((p['reducedHours'] as num?)?.toDouble() ?? 0);
      if (elapsed >= ((p['durationHours'] as num?)?.toDouble() ?? 0)) {
        p['isCompleted'] = true;
        unlocked.add(t.id);
        capacityBonus += t.capacityBonus;
      }
    }
  }
  return {
    'totalPoints': points,
    'memberCount': memberCount ?? clan.memberCount,
    'isEligibleForMap': true,
    'unlockedTerritories': unlocked.toList(),
    'territoryProjects': projects,
    'maxCapacity': 10 + capacityBonus,
    'updatedAt': FieldValue.serverTimestamp(),
  };
}

class ChatMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String text;
  final DateTime time;
  const ChatMessage(this.id, this.senderId, this.senderName, this.text, this.time);
}

class ClanException implements Exception {
  final String message;
  ClanException(this.message);
  @override
  String toString() => message;
}

class ClanService {
  ClanService._();
  static final ClanService instance = ClanService._();

  FirebaseFirestore get _db => FirebaseFirestore.instance;
  String get _base => 'artifacts/${CloudService.appId}';
  CollectionReference<Map<String, dynamic>> get _clans => _db.collection('$_base/public/data/clans');
  DocumentReference<Map<String, dynamic>> clanRef(String id) => _clans.doc(id);
  DocumentReference<Map<String, dynamic>> _member(String clanId, String uid) => clanRef(clanId).collection('members').doc(uid);
  DocumentReference<Map<String, dynamic>> _request(String clanId, String uid) => clanRef(clanId).collection('joinRequests').doc(uid);
  DocumentReference<Map<String, dynamic>> _profile(String uid) => _db.doc('$_base/users/$uid/stats/profile');
  DocumentReference<Map<String, dynamic>> _userRequest(String uid) => _db.doc('$_base/users/$uid/stats/clanJoinRequest');
  CollectionReference<Map<String, dynamic>> get _globalQuests => _db.collection('$_base/public/data/global_clan_quests');
  CollectionReference<Map<String, dynamic>> _rooms(String clanId) => _db.collection('ifaqa_clan_chats/$clanId/rooms');

  String get _uid {
    final u = CloudService.instance.user;
    if (u == null) throw ClanException('سجّل الدخول للمشاركة مع الرَّكْب.');
    return u.uid;
  }

  String get _name => AppState.instance.displayName;

  // ---- Reads ----

  Stream<String?> myClanId() => _profile(_uid).snapshots().map((s) => s.data()?['clanId'] as String?);
  Stream<Map<String, dynamic>?> myPendingRequest() => _userRequest(_uid).snapshots().map((s) => s.data()?['status'] == 'pending' ? s.data() : null);
  Stream<List<Clan>> clans() => _clans.orderBy('totalPoints', descending: true).limit(50).snapshots().map((s) => s.docs.map(Clan.fromDoc).toList());
  Stream<Clan?> clan(String id) => clanRef(id).snapshots().map((s) => s.exists ? Clan.fromDoc(s) : null);
  Stream<List<ClanMember>> members(String id) =>
      clanRef(id).collection('members').orderBy('contributedPoints', descending: true).snapshots().map((s) => s.docs.map(ClanMember.fromDoc).toList());
  Stream<List<JoinRequest>> joinRequests(String id) =>
      clanRef(id).collection('joinRequests').where('status', isEqualTo: 'pending').snapshots().map((s) => s.docs.map(JoinRequest.fromDoc).toList());

  Future<List<ClanQuest>> _questDefinitions() async {
    try {
      final s = await _globalQuests.get();
      if (s.docs.isEmpty) return defaultClanQuests;
      return s.docs.map((d) => ClanQuest.fromMap(d.id, d.data())).toList();
    } catch (_) {
      return defaultClanQuests;
    }
  }

  Stream<List<ClanQuest>> quests(String clanId) async* {
    final defs = await _questDefinitions();
    final week = currentWeekId();
    yield* clanRef(clanId).collection('quests').snapshots().map((s) {
      final prog = {for (final d in s.docs) d.id: d.data()};
      return defs.map((q) {
        final key = q.isWeekly ? '${q.id}_$week' : q.id;
        final p = prog[key];
        return q.withProgress((p?['currentAmount'] as num?)?.toInt() ?? 0, p?['isCompleted'] == true);
      }).toList();
    });
  }

  // ---- Membership ----

  static String? validate(String name, String description, JoinPolicy policy, String passcode) {
    final n = name.trim().length;
    if (n < 3 || n > 32) return 'اسم الرَّكْب من 3 إلى 32 حرفًا.';
    if (description.trim().length > 160) return 'وصف الرَّكْب لا يتجاوز 160 حرفًا.';
    if ((policy == JoinPolicy.passcode || policy == JoinPolicy.hybrid) && passcode.trim().length < 4) {
      return 'يرجى تحديد رقم سري مكون من 4 خانات على الأقل.';
    }
    return null;
  }

  Map<String, dynamic> _policyFields(JoinPolicy policy, String passcode) {
    final needsCode = policy == JoinPolicy.passcode || policy == JoinPolicy.hybrid;
    return {'joinPolicy': policy.name, 'isPrivate': needsCode, 'joinPasscode': needsCode ? passcode.trim() : ''};
  }

  Future<String> create({required String name, required String description, required String badge, required String banner, required JoinPolicy policy, String passcode = ''}) async {
    final uid = _uid;
    final err = validate(name, description, policy, passcode);
    if (err != null) throw ClanException(err);
    final ref = _clans.doc();
    await _db.runTransaction((tx) async {
      final profile = await tx.get(_profile(uid));
      if (profile.data()?['clanId'] != null) throw ClanException('أنت منضم بالفعل إلى رَكْب آخر.');
      tx.set(ref, {
        'name': name.trim(),
        'description': description.trim(),
        'badgeIcon': badge,
        'bannerColor': banner,
        'leaderId': uid,
        'leaderName': _name,
        'memberCount': 1,
        'maxCapacity': 10,
        'totalPoints': 0,
        'individualPoints': 0,
        'questBonusPoints': 0,
        'unlockedTerritories': <String>[],
        'isEligibleForMap': true,
        ..._policyFields(policy, passcode),
        'clanTag': '#${ref.id}',
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      tx.set(_member(ref.id, uid), {'name': _name, 'role': 'leader', 'contributedPoints': 0, 'joinedPersonalXp': AppState.instance.xp, 'joinedAt': FieldValue.serverTimestamp()});
      tx.set(_profile(uid), {'clanId': ref.id, 'clanName': name.trim(), 'clanBadge': badge}, SetOptions(merge: true));
    });
    return ref.id;
  }

  Future<void> updateSettings(String clanId, {required String name, required String description, required String badge, required String banner, required JoinPolicy policy, String passcode = ''}) async {
    final uid = _uid;
    final err = validate(name, description, policy, passcode);
    if (err != null) throw ClanException(err);
    await clanRef(clanId).update({
      'name': name.trim(),
      'description': description.trim(),
      'badgeIcon': badge,
      'bannerColor': banner,
      ..._policyFields(policy, passcode),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await _profile(uid).set({'clanName': name.trim(), 'clanBadge': badge}, SetOptions(merge: true));
  }

  Future<void> join(String clanId, {String passcode = ''}) async {
    final uid = _uid;
    await _db.runTransaction((tx) async {
      final c = await tx.get(clanRef(clanId));
      final p = await tx.get(_profile(uid));
      final m = await tx.get(_member(clanId, uid));
      if (!c.exists) throw ClanException('هذا الرَّكْب لم يعد متاحاً.');
      if (p.data()?['clanId'] == clanId && m.exists) return;
      if (p.data()?['clanId'] != null || m.exists) throw ClanException('أنت منضم بالفعل إلى رَكْب آخر.');
      final clan = Clan.fromDoc(c);
      if (clan.isFull) throw ClanException('اكتملت سعة هذا الرَّكْب؛ اختر ركباً آخر.');
      switch (clan.policy) {
        case JoinPolicy.open:
          break;
        case JoinPolicy.approval:
          throw ClanException('هذا الرَّكْب يتطلب إرسال طلب انضمام وموافقة القائد أولاً.');
        case JoinPolicy.passcode:
        case JoinPolicy.hybrid:
          if (clan.passcode.isEmpty || passcode.trim() != clan.passcode.trim()) {
            throw ClanException(clan.policy == JoinPolicy.hybrid
                ? 'رمز الانضمام غير صحيح. يمكنك بدلاً من ذلك إرسال طلب انضمام لقائد الرَّكْب.'
                : 'رمز الانضمام غير صحيح.');
          }
      }
      tx.set(_member(clanId, uid), {'name': _name, 'role': 'member', 'contributedPoints': 0, 'joinedPersonalXp': AppState.instance.xp, 'joinedAt': FieldValue.serverTimestamp()});
      tx.update(clanRef(clanId), pointsUpdate(clan, clan.totalPoints, memberCount: clan.memberCount + 1));
      tx.set(_profile(uid), {'clanId': clanId, 'clanName': clan.name, 'clanBadge': clan.badgeIcon}, SetOptions(merge: true));
      tx.delete(_request(clanId, uid));
      tx.delete(_userRequest(uid));
    });
    _pushActivity(clanId, 'انضم الرفيق «$_name» إلى الرَّكْب، أهلًا بك في صحبة الخير');
  }

  Future<void> requestToJoin(Clan clan, String message) async {
    final uid = _uid;
    if (clan.isFull) throw ClanException('سعة هذا الرَّكْب مكتملة حالياً.');
    final p = await _profile(uid).get();
    if (p.data()?['clanId'] != null) throw ClanException('أنت منضم بالفعل إلى رَكْب آخر.');
    final now = DateTime.now().millisecondsSinceEpoch;
    await _request(clan.id, uid).set({
      'id': uid,
      'clanId': clan.id,
      'clanName': clan.name,
      'userId': uid,
      'userName': _name,
      'personalXp': AppState.instance.xp,
      'message': message.trim().length > 160 ? message.trim().substring(0, 160) : message.trim(),
      'status': 'pending',
      'createdAt': now,
    });
    await _userRequest(uid).set({'clanId': clan.id, 'clanName': clan.name, 'status': 'pending', 'createdAt': now});
  }

  Future<void> cancelRequest(String clanId) async {
    final uid = _uid;
    await Future.wait([_request(clanId, uid).delete().catchError((_) {}), _userRequest(uid).delete().catchError((_) {})]);
  }

  /// The applicant's profile and own `clanJoinRequest` doc are private to
  /// them, so the leader neither reads nor deletes them (React did both, which
  /// made every acceptance fail). If the applicant already joined another
  /// clan, the rules reject the profile write and the transaction rolls back.
  /// [clearStaleRequest] removes their request doc on their side.
  Future<void> accept(String clanId, JoinRequest r) async {
    final uid = _uid;
    try {
      await _acceptTx(clanId, r, uid);
    } on FirebaseException catch (e) {
      if (e.code != 'permission-denied') rethrow;
      await _request(clanId, r.userId).delete().catchError((_) {});
      throw ClanException('هذا الرفيق انضم إلى رَكْب آخر بالفعل.');
    }
    _pushActivity(clanId, 'رحّب الرَّكْب بانضمام الرفيق «${r.userName}» بصحبة الخير');
  }

  Future<void> _acceptTx(String clanId, JoinRequest r, String uid) async {
    await _db.runTransaction((tx) async {
      final c = await tx.get(clanRef(clanId));
      if (!c.exists) throw ClanException('الرَّكْب غير موجود.');
      final clan = Clan.fromDoc(c);
      if (clan.leaderId != uid) throw ClanException('فقط قائد الرَّكْب يملك صلاحية قبول الطلبات.');
      if (clan.isFull) throw ClanException('السعة مكتملة، لا يمكن إضافة أعضاء جدد.');
      tx.set(_member(clanId, r.userId), {'name': r.userName, 'role': 'member', 'contributedPoints': 0, 'joinedPersonalXp': r.personalXp, 'joinedAt': FieldValue.serverTimestamp()});
      tx.update(clanRef(clanId), pointsUpdate(clan, clan.totalPoints, memberCount: clan.memberCount + 1));
      tx.set(_profile(r.userId), {'clanId': clanId, 'clanName': clan.name, 'clanBadge': clan.badgeIcon}, SetOptions(merge: true));
      tx.delete(_request(clanId, r.userId));
    });
  }

  Future<void> reject(String clanId, String applicantId) => _request(clanId, applicantId).delete();

  Future<void> clearStaleRequest() => _userRequest(_uid).delete().catchError((_) {});

  Future<void> leave(String clanId) async {
    final uid = _uid;
    await _db.runTransaction((tx) async {
      final c = await tx.get(clanRef(clanId));
      final p = await tx.get(_profile(uid));
      final m = await tx.get(_member(clanId, uid));
      if (p.data()?['clanId'] != clanId) throw ClanException('تغيّرت عضويتك؛ أعد فتح الصفحة.');
      if (c.exists && m.exists) {
        final clan = Clan.fromDoc(c);
        if (clan.leaderId == uid && clan.memberCount > 1) throw ClanException('انقل القيادة إلى أحد رفقاء الرَّكْب قبل المغادرة.');
        tx.delete(_member(clanId, uid));
        tx.update(clanRef(clanId), {
          'memberCount': max(0, clan.memberCount - 1),
          if (clan.leaderId == uid) ...{'leaderId': '', 'leaderName': ''},
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
      tx.set(_profile(uid), {'clanId': null, 'clanName': null, 'clanBadge': null}, SetOptions(merge: true));
    });
  }

  Future<void> kick(String clanId, String memberId) async {
    final uid = _uid;
    if (uid == memberId) throw ClanException('لا يمكن للقائد إخلاء مقعد نفسه.');
    await _db.runTransaction((tx) async {
      final c = await tx.get(clanRef(clanId));
      final m = await tx.get(_member(clanId, memberId));
      if (!c.exists) throw ClanException('الرَّكْب غير موجود.');
      final clan = Clan.fromDoc(c);
      if (clan.leaderId != uid) throw ClanException('فقط قائد الرَّكْب يملك صلاحية إخلاء مقاعد الأعضاء.');
      if (!m.exists) throw ClanException('هذا الرفيق غير مسجل في الرَّكْب.');
      tx.delete(_member(clanId, memberId));
      tx.update(clanRef(clanId), {'memberCount': max(1, clan.memberCount - 1), 'updatedAt': FieldValue.serverTimestamp()});
      tx.set(_profile(memberId), {'clanId': null, 'clanName': null, 'clanBadge': null}, SetOptions(merge: true));
    });
  }

  Future<void> transferLeadership(String clanId, ClanMember successor) async {
    final uid = _uid;
    await _db.runTransaction((tx) async {
      final c = await tx.get(clanRef(clanId));
      final next = await tx.get(_member(clanId, successor.id));
      if (!c.exists || c.data()?['leaderId'] != uid || !next.exists || successor.id == uid) {
        throw ClanException('تعذر نقل القيادة لهذا العضو.');
      }
      tx.update(clanRef(clanId), {'leaderId': successor.id, 'leaderName': successor.name, 'updatedAt': FieldValue.serverTimestamp()});
      tx.update(_member(clanId, uid), {'role': 'member'});
      tx.update(_member(clanId, successor.id), {'role': 'leader'});
    });
  }

  Future<void> disband(String clanId) async {
    final uid = _uid;
    final members = await clanRef(clanId).collection('members').get();
    for (final m in members.docs) {
      if (m.id != uid) {
        await _profile(m.id).set({'clanId': null, 'clanName': null, 'clanBadge': null}, SetOptions(merge: true)).catchError((_) {});
      }
      await m.reference.delete();
    }
    await _profile(uid).set({'clanId': null, 'clanName': null, 'clanBadge': null}, SetOptions(merge: true));
    try {
      final quests = await clanRef(clanId).collection('quests').get();
      for (final q in quests.docs) {
        await q.reference.delete();
      }
    } catch (e) {
      debugPrint('quest cleanup failed: $e');
    }
    await clanRef(clanId).delete();
  }

  // ---- Points and quests ----

  Future<String?> _currentClanId(String uid) async => (await _profile(uid).get()).data()?['clanId'] as String?;

  /// Every XP gain also counts for the clan (React `recordClanActivity`).
  Future<void> recordActivity(int points) async {
    final u = CloudService.instance.user;
    if (u == null || points <= 0) return;
    try {
      final id = await _currentClanId(u.uid);
      if (id == null) return;
      var credited = 0;
      String name = _name;
      String? twinPact;
      await _db.runTransaction((tx) async {
        final c = await tx.get(clanRef(id));
        final m = await tx.get(_member(id, u.uid));
        if (!c.exists || !m.exists) return;
        final clan = Clan.fromDoc(c);
        final member = ClanMember.fromDoc(m);
        name = member.name;
        twinPact = clan.twinStatus == 'active' ? clan.twinPactId : null;
        final streak = nextStreak(member.streakDays, member.lastActiveDate);
        credited = (points * streakMultiplier(streak) * (activeBlessedTime()?.multiplier ?? 1)).round();
        tx.update(_member(id, u.uid), {
          'contributedPoints': FieldValue.increment(credited),
          'streakDays': streak,
          'lastActiveDate': _isoDay(DateTime.now()),
          'lastActive': FieldValue.serverTimestamp(),
        });
        tx.update(clanRef(id), {...pointsUpdate(clan, clan.totalPoints + credited), 'individualPoints': FieldValue.increment(credited)});
      });
      if (credited >= 100) _pushActivity(id, 'ساهم $name بـ $credited نقطة طاعة في مسيرة الرَّكْب');
      final jointPts = (credited * jointContributionRate).round();
      if (twinPact != null && jointPts >= 1) {
        unawaited(contributeToJointProject(twinPact!, id, jointPts, 'طاعات الركب المبارك', name));
      }
    } catch (e) {
      debugPrint('clan points sync failed: $e');
    }
  }

  /// Returns (accepted, bonusAwarded).
  Future<(int, int)> contribute(String clanId, ClanQuest quest, int amount) async {
    final uid = _uid;
    if (amount < 1) throw ClanException('اكتب عددًا صحيحًا أكبر من صفر.');
    if (quest.fridayOnly && !isFridayTime()) throw ClanException('هذا التحدي خاص بيوم الجمعة فقط (يبدأ من مساء الخميس).');
    final key = quest.isWeekly ? '${quest.id}_${currentWeekId()}' : quest.id;
    final questRef = clanRef(clanId).collection('quests').doc(key);
    final day = _isoDay(DateTime.now());
    final tallyRef = _member(clanId, uid).collection('questTotals').doc(quest.type == QuestType.collectiveKhatma ? key : '${key}_$day');
    final receiptRef = _member(clanId, uid).collection('contributions').doc();
    return _db.runTransaction((tx) async {
      final c = await tx.get(clanRef(clanId));
      final m = await tx.get(_member(clanId, uid));
      final p = await tx.get(_profile(uid));
      final q = await tx.get(questRef);
      final tally = await tx.get(tallyRef);
      if (!c.exists || !m.exists || p.data()?['clanId'] != clanId) throw ClanException('انضم إلى الرَّكْب قبل تسجيل مساهمة.');
      final current = max(0, (q.data()?['currentAmount'] as num?)?.toInt() ?? 0);
      final already = (tally.data()?['amount'] as num?)?.toInt() ?? 0;
      if (q.data()?['isCompleted'] == true || current >= quest.target) return (0, 0);
      if (quest.type == QuestType.collectiveKhatma && already >= 1) {
        throw ClanException('تم احتساب مشاركتك في هذا التحدي من قبل؛ الهدف مشاركة أعضاء مختلفين.');
      }
      final accepted = min(amount, quest.target - current);
      final total = current + accepted;
      final done = total >= quest.target;
      final bonus = done ? quest.bonus : 0;
      tx.set(questRef, {...quest.toMap(), 'currentAmount': total, 'isCompleted': done, 'updatedAt': FieldValue.serverTimestamp()});
      tx.set(tallyRef, {'amount': already + accepted, 'updatedAt': FieldValue.serverTimestamp()});
      tx.set(receiptRef, {'questId': quest.id, 'amount': accepted, 'completed': done, 'createdAt': FieldValue.serverTimestamp()});
      final member = ClanMember.fromDoc(m);
      final streak = nextStreak(member.streakDays, member.lastActiveDate);
      final multiplied = (accepted * streakMultiplier(streak) * (activeBlessedTime()?.multiplier ?? 1)).round();
      final clan = Clan.fromDoc(c);
      tx.update(_member(clanId, uid), {
        'contributedPoints': FieldValue.increment(multiplied),
        'streakDays': streak,
        'lastActiveDate': day,
        'lastActive': FieldValue.serverTimestamp(),
      });
      tx.update(clanRef(clanId), {
        ...pointsUpdate(clan, clan.totalPoints + multiplied + bonus),
        'individualPoints': FieldValue.increment(multiplied),
        if (bonus > 0) 'questBonusPoints': FieldValue.increment(bonus),
      });
      return (accepted, bonus);
    });
  }

  /// Feeds worship counted elsewhere in the app (salawat, tasbeeh, pages,
  /// listening minutes) into every matching clan quest.
  Future<void> autoContribute(QuestType type, int amount) async {
    final u = CloudService.instance.user;
    if (u == null || amount <= 0) return;
    try {
      final id = await _currentClanId(u.uid);
      if (id == null) return;
      for (final q in (await _questDefinitions()).where((q) => q.type == type)) {
        if (q.fridayOnly && !isFridayTime()) continue;
        try {
          await contribute(id, q, amount);
        } catch (e) {
          debugPrint('auto contribute ${q.id}: $e');
        }
      }
      // وبالأسحار هم يستغفرون: any worship during the Sahar window lights a lantern.
      if (isSaharActive()) {
        final action = switch (type) { QuestType.quranPages => 'quran', QuestType.salawat => 'salawat', QuestType.tasbeeh => 'tasbeeh', _ => 'istighfar' };
        unawaited(_recordSaharPresence(id, u.uid, action));
      }
      if (type == QuestType.salawat && amount >= 10) {
        _pushActivity(id, 'صلّى $_name على النبي ﷺ $amount مرة في ميزان الرَّكْب');
      } else if (type == QuestType.tasbeeh && amount >= 33) {
        _pushActivity(id, 'سبّح واستغفر $_name $amount تسبيحة في ميزان الرَّكْب');
      } else if (type == QuestType.quranPages) {
        _pushActivity(id, 'تلا $_name $amount ${amount == 1 ? 'صفحة' : 'صفحات'} من كتاب الله تعالى');
      }
    } catch (e) {
      debugPrint('auto contribute failed: $e');
    }
  }

  Future<void> _pushActivity(String clanId, String message, {String actionType = 'check_in', String icon = 'icon:sparkles'}) async {
    final u = CloudService.instance.user;
    if (u == null) return;
    try {
      final snap = await clanRef(clanId).get();
      if (!snap.exists) return;
      final current = List<Object?>.from((snap.data()?['recentActivities'] as List?) ?? const []);
      final item = {
        'id': '${DateTime.now().microsecondsSinceEpoch}',
        'clanId': clanId,
        'userId': u.uid,
        'userName': _name,
        'actionType': actionType,
        'message': message,
        'icon': icon,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };
      await clanRef(clanId).update({'recentActivities': [item, ...current].take(30).toList()});
    } catch (e) {
      debugPrint('clan activity failed: $e');
    }
  }

  // ---- Distributed khatma (clans/{id}/features/khatma) ----

  DocumentReference<Map<String, dynamic>> _khatmaRef(String clanId) => clanRef(clanId).collection('features').doc('khatma');

  /// Shows a fresh khatma until the first claim creates the document (React
  /// created it on subscribe, which let two members race to overwrite it).
  Stream<ClanKhatma> khatma(String clanId) =>
      _khatmaRef(clanId).snapshots().map((s) => s.exists ? ClanKhatma.fromMap(s.data()!) : ClanKhatma.initial());

  Future<void> claimJuz(String clanId, int juz) async {
    final uid = _uid;
    final name = _name;
    await _db.runTransaction((tx) async {
      final snap = await tx.get(_khatmaRef(clanId));
      final k = snap.exists ? ClanKhatma.fromMap(snap.data()!) : ClanKhatma.initial();
      final err = claimKhatmaSlot(k, uid, name, juz);
      if (err != null) throw ClanException(err);
      tx.set(_khatmaRef(clanId), k.toMap(), SetOptions(merge: true));
    });
  }

  Future<void> releaseJuz(String clanId, int juz) async {
    final uid = _uid;
    await _db.runTransaction((tx) async {
      final snap = await tx.get(_khatmaRef(clanId));
      if (!snap.exists) return;
      final k = ClanKhatma.fromMap(snap.data()!);
      final err = releaseKhatmaSlot(k, uid, juz);
      if (err != null) throw ClanException(err);
      tx.set(_khatmaRef(clanId), k.toMap(), SetOptions(merge: true));
    });
  }

  /// Anyone can open the next khatma once the current one is complete.
  Future<void> startNextKhatma(String clanId) async {
    if (_uid.isEmpty) return;
    await _db.runTransaction((tx) async {
      final snap = await tx.get(_khatmaRef(clanId));
      final k = snap.exists ? ClanKhatma.fromMap(snap.data()!) : ClanKhatma.initial();
      if (!k.isCompleted) throw ClanException('الختمة الحالية لم تكتمل بعد.');
      tx.set(_khatmaRef(clanId), ClanKhatma.initial(k.khatmaNumber + 1).toMap());
    });
  }

  String? _khatmaClanId;
  DateTime _khatmaClanAt = DateTime.fromMillisecondsSinceEpoch(0);

  /// Called when a Mushaf page is counted as read. Counts it toward the juz
  /// this user claimed in the clan's shared khatma; silent when there is none.
  Future<void> onKhatmaPageRead(int page) async {
    final u = CloudService.instance.user;
    if (u == null) return;
    try {
      if (_khatmaClanId == null || DateTime.now().difference(_khatmaClanAt) > const Duration(minutes: 2)) {
        _khatmaClanId = await _currentClanId(u.uid);
        _khatmaClanAt = DateTime.now();
      }
      final id = _khatmaClanId;
      if (id == null) return;
      KhatmaPageResult? result;
      String claimer = _name;
      await _db.runTransaction((tx) async {
        final snap = await tx.get(_khatmaRef(id));
        if (!snap.exists) return;
        final k = ClanKhatma.fromMap(snap.data()!);
        final r = recordKhatmaPage(k, u.uid, page);
        if (!r.changed) return;
        final c = await tx.get(clanRef(id));
        final m = await tx.get(_member(id, u.uid));
        tx.set(_khatmaRef(id), k.toMap(), SetOptions(merge: true));
        result = r;
        claimer = k.slots[r.juzNumber]?.claimedByName ?? claimer;
        if ((r.juzCompleted || r.khatmaCompleted) && c.exists) {
          final clan = Clan.fromDoc(c);
          final gain = (r.juzCompleted ? khatmaJuzClanPoints : 0) + (r.khatmaCompleted ? khatmaCompleteClanBonus : 0);
          if (r.juzCompleted && m.exists) tx.update(_member(id, u.uid), {'contributedPoints': FieldValue.increment(khatmaJuzMemberPoints)});
          tx.update(clanRef(id), {
            ...pointsUpdate(clan, clan.totalPoints + gain),
            if (r.juzCompleted) 'individualPoints': FieldValue.increment(khatmaJuzMemberPoints),
            if (r.khatmaCompleted) 'questBonusPoints': FieldValue.increment(khatmaCompleteClanBonus),
          });
        }
      });
      final r = result;
      if (r != null && r.juzCompleted) {
        final meta = quranJuzs[r.juzNumber - 1];
        _pushActivity(id, 'أتم $claimer قراءة الجزء ${r.juzNumber} (${meta.name}) كاملاً من الختمة التشاركية المباركة', actionType: 'khatma_juz', icon: 'icon:book');
      }
    } catch (e) {
      debugPrint('khatma page record failed: $e');
    }
  }

  // ---- Sahar lanterns (clans/{id}/features/sahar_<yyyy-mm-dd>) ----

  DocumentReference<Map<String, dynamic>> _saharRef(String clanId, String dateKey) => clanRef(clanId).collection('features').doc('sahar_$dateKey');

  Stream<List<SaharLantern>> saharLanterns(String clanId, [String? dateKey]) =>
      _saharRef(clanId, dateKey ?? saharDateKey()).snapshots().map((s) => ((s.data()?['lanterns'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => SaharLantern.fromMap(Map<String, dynamic>.from(e)))
          .toList());

  /// Manual lantern (istighfar) from the UI; throws outside the window.
  Future<void> lightSaharLantern(String clanId, {String action = 'istighfar'}) async {
    final uid = _uid;
    if (!isSaharActive()) throw ClanException('محراب الأسحار يفتح في الثلث الأخير من الليل، من 3:30 إلى 5:00 فجراً.');
    await _writeLantern(clanId, uid, action, throttle: false);
  }

  Future<void> _recordSaharPresence(String clanId, String uid, String action) async {
    try {
      await _writeLantern(clanId, uid, action, throttle: true);
    } catch (e) {
      debugPrint('sahar presence failed: $e');
    }
  }

  Future<void> _writeLantern(String clanId, String uid, String action, {required bool throttle}) async {
    final name = _name;
    final ref = _saharRef(clanId, saharDateKey());
    final now = DateTime.now().millisecondsSinceEpoch;
    var isNew = false;
    await _db.runTransaction((tx) async {
      final snap = await tx.get(ref);
      final data = snap.data() ?? <String, dynamic>{};
      final lanterns = ((data['lanterns'] as List?) ?? const []).whereType<Map>().map((e) => SaharLantern.fromMap(Map<String, dynamic>.from(e))).toList();
      final existing = lanterns.where((l) => l.userId == uid).toList();
      // Counting pages or dhikr fires often; refresh a lantern at most every 5 minutes.
      if (throttle && existing.isNotEmpty && now - existing.first.litAt < 300000) return;
      isNew = upsertLantern(lanterns, SaharLantern(uid, name, action, now));
      tx.set(ref, {'date': saharDateKey(), 'lanterns': lanterns.map((l) => l.toMap()).toList(), 'speedUpGranted': data['speedUpGranted'] == true}, SetOptions(merge: true));
    });
    if (isNew) {
      _pushActivity(clanId, 'شهد $name نفحة السحر ${saharActionLabel(action)} (مضاعفة أجور الأسحار نشطة)', actionType: 'sahar_lantern', icon: 'icon:moon');
    }
  }

  // ---- Twin pacts (public/data/clan_twins) ----
  //
  // React's flow wrote the OTHER clan's document (twinStatus, twinPactId, ...)
  // from the acting leader. firestore.rules only lets a clan's own members,
  // its leader or an admin update a clan, so those writes were denied for a
  // leader of the other clan and the flow failed midway. Here each leader
  // writes only the pact document (open to any signed-in user) and their own
  // clan; the other clan's fields are reconciled by its own members through
  // [syncTwinFields].

  CollectionReference<Map<String, dynamic>> get _twins => _db.collection('$_base/public/data/clan_twins');

  /// Every pact that involves [clanId] (as clan1 or clan2). Emits only after
  /// both underlying queries have answered, so a half-loaded list is never
  /// mistaken for "no pact".
  Stream<List<TwinPact>> twinPacts(String clanId) {
    late StreamController<List<TwinPact>> ctl;
    final subs = <StreamSubscription>[];
    List<TwinPact>? a, b;
    void emit() {
      if (a == null || b == null || ctl.isClosed) return;
      ctl.add({for (final p in [...a!, ...b!]) p.id: p}.values.toList());
    }

    List<TwinPact> parse(QuerySnapshot<Map<String, dynamic>> s) => s.docs.map((d) => TwinPact.fromMap(d.id, d.data())).toList();
    ctl = StreamController<List<TwinPact>>(
      onListen: () {
        subs.add(_twins.where('clan1Id', isEqualTo: clanId).snapshots().listen((s) {
          a = parse(s);
          emit();
        }, onError: ctl.addError));
        subs.add(_twins.where('clan2Id', isEqualTo: clanId).snapshots().listen((s) {
          b = parse(s);
          emit();
        }, onError: ctl.addError));
      },
      onCancel: () async {
        for (final s in subs) {
          await s.cancel();
        }
      },
    );
    return ctl.stream;
  }

  Future<List<TwinPact>> _pactsOnce(String clanId) async {
    final r = await Future.wait([_twins.where('clan1Id', isEqualTo: clanId).get(), _twins.where('clan2Id', isEqualTo: clanId).get()]);
    return {for (final s in r) for (final d in s.docs) d.id: TwinPact.fromMap(d.id, d.data())}.values.toList();
  }

  Future<Clan> _leaderClan(String clanId) async {
    final uid = _uid;
    final snap = await clanRef(clanId).get();
    if (!snap.exists) throw ClanException('الرَّكْب غير موجود.');
    final clan = Clan.fromDoc(snap);
    if (clan.leaderId != uid) throw ClanException('المؤاخاة من صلاحيات قائد الرَّكْب فقط.');
    return clan;
  }

  /// Writes this clan's own `twin*` fields from the pacts (members only).
  Future<void> syncTwinFields(Clan clan, List<TwinPact> pacts) async {
    final want = desiredTwinFields(clan.id, pacts);
    if (!twinFieldsDiffer(clan.twinFields, want)) return;
    try {
      await clanRef(clan.id).update({...want, 'updatedAt': FieldValue.serverTimestamp()});
    } catch (e) {
      debugPrint('twin sync failed: $e');
    }
  }

  Future<void> _syncOwn(String clanId) async {
    final snap = await clanRef(clanId).get();
    if (!snap.exists) return;
    await syncTwinFields(Clan.fromDoc(snap), await _pactsOnce(clanId));
  }

  /// Leader of [myClanId] proposes a twin pact and joint project to [target].
  Future<String> sendTwinRequest(String myClanId, Clan target, String projectId) async {
    final me = await _leaderClan(myClanId);
    if (target.id == me.id) throw ClanException('لا يمكن مؤاخاة الرَّكْب مع نفسه!');
    final mine = await _pactsOnce(me.id);
    if (mine.any((p) => p.isActive)) throw ClanException('رَكْبكم مرتبط بالفعل بميثاق مؤاخاة نشط.');
    if (mine.any((p) => p.isPending && p.sentBy(me.id))) throw ClanException('لديكم طلب مؤاخاة معلّق؛ ألغوه أولاً لإرسال طلب آخر.');
    final theirs = await _pactsOnce(target.id);
    if (theirs.any((p) => p.isActive)) throw ClanException('الرَّكْب المطلوب مرتبط بالفعل بميثاق مؤاخاة مع قافلة أخرى.');
    final pactId = pactIdFor(me.id, target.id);
    if ((await _twins.doc(pactId).get()).exists) throw ClanException('يوجد بالفعل طلب أو ميثاق بين الرَّكْبَيْن.');
    final template = jointMegaProjects.firstWhere((p) => p.id == projectId, orElse: () => jointMegaProjects.first);
    await _twins.doc(pactId).set(newPactMap(
          pactId: pactId,
          myId: me.id,
          myName: me.name,
          myBadge: me.badgeIcon,
          otherId: target.id,
          otherName: target.name,
          otherBadge: target.badgeIcon,
          template: template,
          nowMs: DateTime.now().millisecondsSinceEpoch,
        ));
    await _syncOwn(me.id);
    return 'تم إرسال طلب المؤاخاة وبناء «${template.name}» إلى «${target.name}» بنجاح';
  }

  /// Leader of the receiving clan accepts or declines a pending pact.
  Future<String> respondToTwinRequest(TwinPact pact, String myClanId, bool accept) async {
    final me = await _leaderClan(myClanId);
    final fresh = await _twins.doc(pact.id).get();
    if (!fresh.exists) throw ClanException('طلب المؤاخاة غير موجود أو تم إلغاؤه.');
    final p = TwinPact.fromMap(fresh.id, fresh.data()!);
    if (!p.isPending || !p.involves(me.id) || p.sentBy(me.id)) throw ClanException('لا يمكن البتّ في هذا الطلب.');
    if (!accept) {
      await _twins.doc(p.id).delete();
      await _syncOwn(me.id);
      return 'تم الاعتذار عن طلب المؤاخاة بلطف.';
    }
    if ((await _pactsOnce(me.id)).any((x) => x.isActive)) throw ClanException('رَكْبكم مرتبط بالفعل بميثاق مؤاخاة نشط.');
    if ((await _pactsOnce(p.otherId(me.id))).any((x) => x.isActive)) throw ClanException('الرَّكْب الآخر ارتبط بميثاق مؤاخاة مع قافلة أخرى.');
    await _twins.doc(p.id).update({'status': 'active', 'acceptedAt': DateTime.now().millisecondsSinceEpoch});
    await _syncOwn(me.id);
    return 'تم عقد ميثاق المؤاخاة المبارك وتدشين «${p.project.name}» على الخريطة!';
  }

  /// Leader withdraws a pending request or ends an active pact.
  Future<String> cancelTwinPact(TwinPact pact, String myClanId) async {
    final me = await _leaderClan(myClanId);
    if (!pact.involves(me.id)) throw ClanException('هذا الميثاق لا يخص رَكْبكم.');
    await _twins.doc(pact.id).delete();
    await _syncOwn(me.id);
    return pact.isActive ? 'تم فك ميثاق المؤاخاة بسلام.' : 'تم إلغاء الطلب.';
  }

  /// Adds [points] to the joint project for [clanId] (no-op if the pact is
  /// gone, not active, or the clan is not part of it).
  Future<void> contributeToJointProject(String pactId, String clanId, int points, String worshipType, String userName) async {
    final uid = CloudService.instance.user?.uid;
    if (uid == null) return;
    try {
      await _db.runTransaction((tx) async {
        final ref = _twins.doc(pactId);
        final snap = await tx.get(ref);
        if (!snap.exists) return;
        final upd = applyJointContribution(snap.data()!,
            clanId: clanId, userId: uid, userName: userName, points: points, worshipType: worshipType, nowMs: DateTime.now().millisecondsSinceEpoch);
        if (upd != null) tx.update(ref, upd);
      });
    } catch (e) {
      debugPrint('joint project contribution failed: $e');
    }
  }

  // ---- Chat ----

  static String directRoomId(String a, String b) {
    final ids = [a, b]..sort();
    return 'dm_${ids.map(Uri.encodeComponent).join(':')}';
  }

  Stream<List<ChatMessage>> messages(String clanId, String roomId) => _rooms(clanId)
      .doc(roomId)
      .collection('messages')
      .orderBy('createdAt', descending: true)
      .limit(60)
      .snapshots()
      .map((s) => s.docs.reversed.map((d) {
            final m = d.data();
            return ChatMessage(
              d.id,
              (m['senderId'] as String?) ?? '',
              (m['senderName'] as String?) ?? 'رفيق',
              (m['text'] as String?) ?? '',
              (m['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
            );
          }).toList());

  Future<void> send(String clanId, String text, {String? peerId}) async {
    final uid = _uid;
    final body = text.trim();
    if (body.isEmpty || body.length > 2000) throw ClanException('اكتب رسالة بين حرف و٢٠٠٠ حرف.');
    final roomId = peerId == null ? 'team' : directRoomId(uid, peerId);
    final roomRef = _rooms(clanId).doc(roomId);
    final msgRef = roomRef.collection('messages').doc();
    await _db.runTransaction((tx) async {
      final me = await tx.get(_member(clanId, uid));
      if (!me.exists) throw ClanException('لم تعد عضواً في هذا الرَّكْب.');
      if (peerId != null && !(await tx.get(_member(clanId, peerId))).exists) throw ClanException('هذا الرفيق لم يعد عضواً في الرَّكْب.');
      final room = await tx.get(roomRef);
      final data = {
        'kind': peerId == null ? 'team' : 'direct',
        'participants': peerId == null ? <String>[] : ([uid, peerId]..sort()),
        'lastText': body,
        'lastSenderId': uid,
        'lastMessageId': msgRef.id,
        'updatedAt': FieldValue.serverTimestamp(),
      };
      tx.set(roomRef, room.exists ? {...?room.data(), ...data} : data);
      tx.set(msgRef, {'senderId': uid, 'senderName': ((me.data()?['name'] as String?) ?? 'رفيق'), 'text': body, 'createdAt': FieldValue.serverTimestamp()});
    });
  }
}
