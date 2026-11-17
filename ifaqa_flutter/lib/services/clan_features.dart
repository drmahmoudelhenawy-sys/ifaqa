/// Pure logic and models for the clan features shared with the React app:
/// distributed khatma, Sahar lanterns, and twin pacts with joint mega
/// projects. No Firebase imports, so it is unit-testable.
library;

import 'dart:math';

// ---------------------------------------------------------------- juz table

class QuranJuz {
  final int juzNumber;
  final String name;
  final int startPage;
  final int endPage;
  final int totalPages;
  const QuranJuz(this.juzNumber, this.name, this.startPage, this.endPage, this.totalPages);
}

/// Same table as React `QURAN_JUZS` (Madani Mushaf, 604 pages).
const quranJuzs = <QuranJuz>[
  QuranJuz(1, 'الم (الفاتحة والبقرة)', 1, 21, 21),
  QuranJuz(2, 'سيقول السفهاء (البقرة)', 22, 41, 20),
  QuranJuz(3, 'تلك الرسل (البقرة وآل عمران)', 42, 61, 20),
  QuranJuz(4, 'لن تنالوا البر (آل عمران والنساء)', 62, 81, 20),
  QuranJuz(5, 'والمحصنات (النساء)', 82, 101, 20),
  QuranJuz(6, 'لا يحب الله (النساء والمائدة)', 102, 121, 20),
  QuranJuz(7, 'وإذا سمعوا (المائدة والأنعام)', 122, 141, 20),
  QuranJuz(8, 'ولو أننا نزلنا (الأنعام والأعراف)', 142, 161, 20),
  QuranJuz(9, 'قال الملأ (الأعراف والأنفال)', 162, 181, 20),
  QuranJuz(10, 'واعلموا (الأنفال والتوبة)', 182, 201, 20),
  QuranJuz(11, 'يعتذرون إليكم (التوبة ويونس وهود)', 202, 221, 20),
  QuranJuz(12, 'وما من دابة (هود ويوسف)', 222, 241, 20),
  QuranJuz(13, 'وما أبرئ نفسي (يوسف والرعد وإبراهيم)', 242, 261, 20),
  QuranJuz(14, 'ربما يود (الحجر والنحل)', 262, 281, 20),
  QuranJuz(15, 'سبحان الذي أسرى (الإسراء والكهف)', 282, 301, 20),
  QuranJuz(16, 'قال ألم أقل لك (الكهف ومريم وطه)', 302, 321, 20),
  QuranJuz(17, 'اقترب للناس (الأنبياء والحج)', 322, 341, 20),
  QuranJuz(18, 'قد أفلح المؤمنون (المؤمنون والنور والفرقان)', 342, 361, 20),
  QuranJuz(19, 'وقال الذين لا يرجون (الفرقان والشعراء والنمل)', 362, 381, 20),
  QuranJuz(20, 'فما كان جواب قومه (النمل والقصص والعنكبوت)', 382, 401, 20),
  QuranJuz(21, 'ولا تجادلوا (العنكبوت والروم ولقمان والسجدة والأحزاب)', 402, 421, 20),
  QuranJuz(22, 'ومن يقنت (الأحزاب وسبأ وفاطر ويس)', 422, 441, 20),
  QuranJuz(23, 'وما أنزلنا على قومه (يس والصافات وص والزمر)', 442, 461, 20),
  QuranJuz(24, 'فمن أظلم (الزمر وغافر وفصلت)', 462, 481, 20),
  QuranJuz(25, 'إليه يرد علم الساعة (فصلت والشورى والزخرف والدخان والجاثية)', 482, 501, 20),
  QuranJuz(26, 'حم (الأحقاف ومحمد والفتح والحجرات وق والذاريات)', 502, 521, 20),
  QuranJuz(27, 'قال فما خطبكم (الذاريات والطور والنجم والقمر والرحمن والواقعة والحديد)', 522, 541, 20),
  QuranJuz(28, 'قد سمع الله (المجادلة إلى التحريم)', 542, 561, 20),
  QuranJuz(29, 'تبارك الذي بيده الملك (الملك إلى المرسلات)', 562, 581, 20),
  QuranJuz(30, 'عمّ يتساءلون (النبأ إلى الناس)', 582, 604, 23),
];

/// React `getJuzFromPage`: out-of-range pages are clamped into 1..604.
QuranJuz juzFromPage(int page) {
  final p = max(1, min(604, page));
  return quranJuzs.firstWhere((j) => p >= j.startPage && p <= j.endPage, orElse: () => quranJuzs.first);
}

// ------------------------------------------------------------------ khatma

const maxUnfinishedClaims = 3;
const khatmaJuzMemberPoints = 500;
const khatmaJuzClanPoints = 1500;
const khatmaCompleteClanBonus = 20000;

class KhatmaSlot {
  final int juzNumber;
  final String juzName;
  final int startPage;
  final int endPage;
  final int totalPages;
  String? claimedByUserId;
  String? claimedByName;
  int? claimedAt;
  List<int> readPages;
  bool isCompleted;
  int? completedAt;

  KhatmaSlot({
    required this.juzNumber,
    required this.juzName,
    required this.startPage,
    required this.endPage,
    required this.totalPages,
    this.claimedByUserId,
    this.claimedByName,
    this.claimedAt,
    List<int>? readPages,
    this.isCompleted = false,
    this.completedAt,
  }) : readPages = readPages ?? <int>[];

  bool get isClaimed => claimedByUserId != null && claimedByUserId!.isNotEmpty;
  double get progress => totalPages == 0 ? 0 : (readPages.length / totalPages).clamp(0.0, 1.0);

  factory KhatmaSlot.fromMap(int juz, Map<String, dynamic> m) {
    final meta = quranJuzs[(juz - 1).clamp(0, 29)];
    return KhatmaSlot(
      juzNumber: (m['juzNumber'] as num?)?.toInt() ?? meta.juzNumber,
      juzName: (m['juzName'] as String?) ?? meta.name,
      startPage: (m['startPage'] as num?)?.toInt() ?? meta.startPage,
      endPage: (m['endPage'] as num?)?.toInt() ?? meta.endPage,
      totalPages: (m['totalPages'] as num?)?.toInt() ?? meta.totalPages,
      claimedByUserId: m['claimedByUserId'] as String?,
      claimedByName: m['claimedByName'] as String?,
      claimedAt: (m['claimedAt'] as num?)?.toInt(),
      readPages: ((m['readPages'] as List?) ?? const []).whereType<num>().map((e) => e.toInt()).toList(),
      isCompleted: m['isCompleted'] == true,
      completedAt: (m['completedAt'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toMap() => {
        'juzNumber': juzNumber,
        'juzName': juzName,
        'startPage': startPage,
        'endPage': endPage,
        'totalPages': totalPages,
        'claimedByUserId': claimedByUserId,
        'claimedByName': claimedByName,
        'claimedAt': claimedAt,
        'readPages': readPages,
        'isCompleted': isCompleted,
        'completedAt': completedAt,
      };
}

class ClanKhatma {
  int khatmaNumber;
  final Map<int, KhatmaSlot> slots;
  int completedCount;
  bool isCompleted;
  int? completedAt;
  int createdAt;
  int updatedAt;

  ClanKhatma({
    required this.khatmaNumber,
    required this.slots,
    this.completedCount = 0,
    this.isCompleted = false,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ClanKhatma.initial([int number = 1, int? nowMs]) {
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    return ClanKhatma(
      khatmaNumber: number,
      slots: {for (final j in quranJuzs) j.juzNumber: KhatmaSlot(juzNumber: j.juzNumber, juzName: j.name, startPage: j.startPage, endPage: j.endPage, totalPages: j.totalPages)},
      createdAt: now,
      updatedAt: now,
    );
  }

  factory ClanKhatma.fromMap(Map<String, dynamic> m) {
    final raw = (m['slots'] as Map?) ?? const {};
    final slots = <int, KhatmaSlot>{};
    final blank = ClanKhatma.initial().slots;
    for (final j in quranJuzs) {
      final s = raw['${j.juzNumber}'];
      slots[j.juzNumber] = s is Map ? KhatmaSlot.fromMap(j.juzNumber, Map<String, dynamic>.from(s)) : blank[j.juzNumber]!;
    }
    return ClanKhatma(
      khatmaNumber: (m['khatmaNumber'] as num?)?.toInt() ?? 1,
      slots: slots,
      completedCount: (m['completedCount'] as num?)?.toInt() ?? 0,
      isCompleted: m['isCompleted'] == true,
      completedAt: (m['completedAt'] as num?)?.toInt(),
      createdAt: (m['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (m['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'khatmaNumber': khatmaNumber,
        'slots': {for (final e in slots.entries) '${e.key}': e.value.toMap()},
        'completedCount': completedCount,
        'isCompleted': isCompleted,
        'completedAt': completedAt,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  List<KhatmaSlot> unfinishedClaimsOf(String uid) => slots.values.where((s) => s.claimedByUserId == uid && !s.isCompleted).toList();

  /// The unfinished juz this user claimed that contains [page], if any.
  KhatmaSlot? claimedSlotForPage(String uid, int page) {
    final s = slots[juzFromPage(page).juzNumber];
    return s != null && s.claimedByUserId == uid && !s.isCompleted ? s : null;
  }
}

/// Returns an Arabic error message, or null after mutating [k] to claim the juz.
String? claimKhatmaSlot(ClanKhatma k, String uid, String name, int juz, {int? nowMs}) {
  if (k.isCompleted) return 'اكتملت هذه الختمة؛ ابدأوا ختمة جديدة.';
  final slot = k.slots[juz];
  if (slot == null) return 'رقم الجزء غير صحيح.';
  if (slot.isCompleted) return 'هذا الجزء مكتمل ومقفل.';
  if (slot.isClaimed) {
    return slot.claimedByUserId == uid ? null : 'هذا الجزء محجوز حالياً للرفيق «${slot.claimedByName}».';
  }
  if (k.unfinishedClaimsOf(uid).length >= maxUnfinishedClaims) {
    return 'لقد حجزت 3 أجزاء جارية بالفعل؛ أتمم قراءتها أولاً لإتاحة الفرصة للرفقاء.';
  }
  final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
  slot.claimedByUserId = uid;
  slot.claimedByName = name;
  slot.claimedAt = now;
  k.updatedAt = now;
  return null;
}

/// Releasing a juz drops its progress (as in React).
String? releaseKhatmaSlot(ClanKhatma k, String uid, int juz, {int? nowMs}) {
  final slot = k.slots[juz];
  if (slot == null) return 'رقم الجزء غير صحيح.';
  if (slot.claimedByUserId != uid) return 'لا يمكنك إلغاء حجز جزء مخصص لرفيق آخر.';
  if (slot.isCompleted) return 'لا يمكن إلغاء حجز جزء تم إتمامه.';
  slot.claimedByUserId = null;
  slot.claimedByName = null;
  slot.claimedAt = null;
  slot.readPages = [];
  k.updatedAt = nowMs ?? DateTime.now().millisecondsSinceEpoch;
  return null;
}

class KhatmaPageResult {
  final bool changed;
  final bool juzCompleted;
  final int juzNumber;
  final bool khatmaCompleted;
  const KhatmaPageResult({this.changed = false, this.juzCompleted = false, this.juzNumber = 0, this.khatmaCompleted = false});
}

/// Records [page] on the user's claimed juz. A juz completes when every page
/// was read, or (React rule) when its last page was read with at least 12
/// pages done. `completedCount` is recounted from the slots so it never drifts.
KhatmaPageResult recordKhatmaPage(ClanKhatma k, String uid, int page, {int? nowMs}) {
  final juz = juzFromPage(page);
  final slot = k.claimedSlotForPage(uid, page);
  if (slot == null || k.isCompleted) return KhatmaPageResult(juzNumber: juz.juzNumber);
  final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
  final pages = {...slot.readPages, page};
  final added = pages.length != slot.readPages.length;
  slot.readPages = pages.toList()..sort();
  var juzDone = false;
  if (slot.readPages.length >= slot.totalPages || (page == slot.endPage && slot.readPages.length >= 12)) {
    slot.isCompleted = true;
    slot.completedAt = now;
    juzDone = true;
  }
  k.completedCount = k.slots.values.where((s) => s.isCompleted).length;
  var all = false;
  if (k.completedCount >= 30 && !k.isCompleted) {
    k.isCompleted = true;
    k.completedAt = now;
    all = true;
  }
  if (added || juzDone) k.updatedAt = now;
  return KhatmaPageResult(changed: added || juzDone, juzCompleted: juzDone, juzNumber: juz.juzNumber, khatmaCompleted: all);
}

// ------------------------------------------------------------------- sahar

/// React `isRibatSaharActive`: 03:30 to 05:00 local time.
bool isSaharActive([DateTime? at]) {
  final now = at ?? DateTime.now();
  final mins = now.hour * 60 + now.minute;
  return mins >= 210 && mins < 300;
}

int saharRemainingMinutes([DateTime? at]) {
  final now = at ?? DateTime.now();
  return isSaharActive(now) ? max(1, 300 - (now.hour * 60 + now.minute)) : 0;
}

/// Minutes until the next window opens (0 while active).
int minutesUntilSahar([DateTime? at]) {
  final now = at ?? DateTime.now();
  if (isSaharActive(now)) return 0;
  final mins = now.hour * 60 + now.minute;
  return mins < 210 ? 210 - mins : 1440 - mins + 210;
}

/// Night doc id suffix. React uses the UTC calendar date
/// (`toISOString().slice(0,10)`); kept so both apps share one doc per night.
String saharDateKey([DateTime? at]) => (at ?? DateTime.now()).toUtc().toIso8601String().substring(0, 10);

class SaharLantern {
  final String userId;
  final String userName;
  final String actionType;
  final int litAt;
  const SaharLantern(this.userId, this.userName, this.actionType, this.litAt);

  factory SaharLantern.fromMap(Map<String, dynamic> m) =>
      SaharLantern((m['userId'] as String?) ?? '', (m['userName'] as String?) ?? 'رفيق', (m['actionType'] as String?) ?? 'istighfar', (m['litAt'] as num?)?.toInt() ?? 0);

  Map<String, dynamic> toMap() => {'userId': userId, 'userName': userName, 'litAt': litAt, 'actionType': actionType};
}

String saharActionLabel(String a) => switch (a) {
      'quran' => 'بتلاوة القرآن',
      'salawat' => 'بالصلاة على النبي ﷺ',
      'tasbeeh' => 'بالتسبيح والذكر',
      _ => 'بالاستغفار والقيام',
    };

/// Adds or refreshes the user's lantern. Returns whether it is a new one.
bool upsertLantern(List<SaharLantern> lanterns, SaharLantern l) {
  final i = lanterns.indexWhere((x) => x.userId == l.userId);
  if (i == -1) {
    lanterns.add(l);
    return true;
  }
  lanterns[i] = l;
  return false;
}

// -------------------------------------------------------------------- twins

class JointProjectTemplate {
  final String id;
  final String name;
  final String arabicTitle;
  final String description;
  final String icon;
  final int targetPoints;
  final double mapX;
  final double mapY;
  final String perk;
  const JointProjectTemplate(this.id, this.name, this.arabicTitle, this.description, this.icon, this.targetPoints, this.mapX, this.mapY, this.perk);
}

/// Same as React `JOINT_MEGA_PROJECTS`.
const jointMegaProjects = <JointProjectTemplate>[
  JointProjectTemplate('dam_of_concord', 'سد الوفاق العظيم', 'سد الأمان والبركة المشتركة', 'صرح حصين في ملتقى الأودية بتعاون ركابين متآخيين، يجمع مياه الرحمة والغيث ويحمي واحات الخير.', 'icon:waves', 60000, 50, 52,
      '+2 سعة مقاعد إضافية لكلا الرَّكْبَيْن ووسام حليف الإخاء'),
  JointProjectTemplate('well_of_ruwah', 'بئر الرُّوَاة والسُّقيا', 'سقيا الإخاء ونماء القوافل', 'بئر عذب نمير في واحة التقاء القوافل، يُروي السالكين اقتداءً بسنة المؤاخاة وسقيا الماء المباركة.', 'icon:sparkles', 35000, 48, 72,
      '+15% تسريع لجميع مشاريع التشييد الجارية في الرَّكْبَيْن'),
];

/// Share of a member's credited clan points that also goes to the joint project.
const jointContributionRate = 0.15;

String pactIdFor(String a, String b) => ([a, b]..sort()).join('_');

class JointProject {
  final String id;
  final String name;
  final String description;
  final int target;
  final int clan1;
  final int clan2;
  final int total;
  final bool completed;
  final String perk;
  const JointProject(this.id, this.name, this.description, this.target, this.clan1, this.clan2, this.total, this.completed, this.perk);

  double get progress => target == 0 ? 0 : (total / target).clamp(0.0, 1.0);

  factory JointProject.fromMap(Map<String, dynamic> m) => JointProject(
        (m['id'] as String?) ?? '',
        (m['name'] as String?) ?? '',
        (m['description'] as String?) ?? '',
        (m['targetPoints'] as num?)?.toInt() ?? 1,
        (m['clan1Contributed'] as num?)?.toInt() ?? 0,
        (m['clan2Contributed'] as num?)?.toInt() ?? 0,
        (m['totalContributed'] as num?)?.toInt() ?? 0,
        m['isCompleted'] == true,
        (m['perk'] as String?) ?? '',
      );
}

class TwinContribution {
  final String userName;
  final String clanName;
  final int points;
  final String worshipType;
  const TwinContribution(this.userName, this.clanName, this.points, this.worshipType);
}

class TwinPact {
  final String id;
  final String clan1Id, clan1Name, clan1Badge;
  final String clan2Id, clan2Name, clan2Badge;
  final String status; // pending | active | completed
  final String requestedByClanId;
  final JointProject project;
  final List<TwinContribution> recent;

  const TwinPact({
    required this.id,
    required this.clan1Id,
    required this.clan1Name,
    required this.clan1Badge,
    required this.clan2Id,
    required this.clan2Name,
    required this.clan2Badge,
    required this.status,
    required this.requestedByClanId,
    required this.project,
    this.recent = const [],
  });

  bool get isActive => status == 'active';
  bool get isPending => status == 'pending';
  bool involves(String clanId) => clan1Id == clanId || clan2Id == clanId;
  String otherId(String me) => clan1Id == me ? clan2Id : clan1Id;
  String otherName(String me) => clan1Id == me ? clan2Name : clan1Name;
  String otherBadge(String me) => clan1Id == me ? clan2Badge : clan1Badge;
  int mine(String me) => clan1Id == me ? project.clan1 : project.clan2;
  int theirs(String me) => clan1Id == me ? project.clan2 : project.clan1;
  bool sentBy(String me) => requestedByClanId == me;

  factory TwinPact.fromMap(String id, Map<String, dynamic> m) => TwinPact(
        id: id,
        clan1Id: (m['clan1Id'] as String?) ?? '',
        clan1Name: (m['clan1Name'] as String?) ?? '',
        clan1Badge: (m['clan1Badge'] as String?) ?? '',
        clan2Id: (m['clan2Id'] as String?) ?? '',
        clan2Name: (m['clan2Name'] as String?) ?? '',
        clan2Badge: (m['clan2Badge'] as String?) ?? '',
        status: (m['status'] as String?) ?? 'pending',
        requestedByClanId: (m['requestedByClanId'] as String?) ?? '',
        project: JointProject.fromMap(Map<String, dynamic>.from((m['jointProject'] as Map?) ?? const {})),
        recent: ((m['recentContributions'] as List?) ?? const [])
            .whereType<Map>()
            .map((c) => TwinContribution((c['userName'] as String?) ?? '', (c['clanName'] as String?) ?? '', (c['points'] as num?)?.toInt() ?? 0, (c['worshipType'] as String?) ?? ''))
            .toList(),
      );
}

/// Document body for a new pact, same shape as React `sendTwinningRequest`.
Map<String, dynamic> newPactMap({
  required String pactId,
  required String myId,
  required String myName,
  required String myBadge,
  required String otherId,
  required String otherName,
  required String otherBadge,
  required JointProjectTemplate template,
  required int nowMs,
}) =>
    {
      'id': pactId,
      'clan1Id': myId,
      'clan1Name': myName,
      'clan1Badge': myBadge.isEmpty ? 'icon:leaf' : myBadge,
      'clan2Id': otherId,
      'clan2Name': otherName,
      'clan2Badge': otherBadge.isEmpty ? 'icon:leaf' : otherBadge,
      'status': 'pending',
      'requestedByClanId': myId,
      'requestedByName': myName,
      'requestedAt': nowMs,
      'acceptedAt': null,
      'jointProject': {
        'id': template.id,
        'name': template.name,
        'arabicTitle': template.arabicTitle,
        'description': template.description,
        'icon': template.icon,
        'targetPoints': template.targetPoints,
        'clan1Contributed': 0,
        'clan2Contributed': 0,
        'totalContributed': 0,
        'isCompleted': false,
        'completedAt': null,
        'mapCoords': {'x': template.mapX, 'y': template.mapY},
        'perk': template.perk,
      },
      'recentContributions': <Object>[],
    };

/// Applies a contribution to a pact map (the `clan_twins` document body) and
/// returns the fields to write, or null if the pact is not active or the clan
/// is not part of it.
Map<String, dynamic>? applyJointContribution(Map<String, dynamic> pact,
    {required String clanId, required String userId, required String userName, required int points, required String worshipType, required int nowMs}) {
  if (pact['status'] != 'active') return null;
  final proj = Map<String, dynamic>.from((pact['jointProject'] as Map?) ?? const {});
  final isClan1 = pact['clan1Id'] == clanId;
  if (!isClan1 && pact['clan2Id'] != clanId) return null;
  final pts = max(1, points);
  final key = isClan1 ? 'clan1Contributed' : 'clan2Contributed';
  proj[key] = ((proj[key] as num?)?.toInt() ?? 0) + pts;
  final total = ((proj['totalContributed'] as num?)?.toInt() ?? 0) + pts;
  proj['totalContributed'] = total;
  if (total >= ((proj['targetPoints'] as num?)?.toInt() ?? 1 << 40) && proj['isCompleted'] != true) {
    proj['isCompleted'] = true;
    proj['completedAt'] = nowMs;
  }
  final recents = <Object?>[
    {'userId': userId, 'userName': userName, 'clanId': clanId, 'clanName': isClan1 ? pact['clan1Name'] : pact['clan2Name'], 'points': pts, 'worshipType': worshipType, 'timestamp': nowMs},
    ...((pact['recentContributions'] as List?) ?? const []),
  ].take(15).toList();
  return {'jointProject': proj, 'recentContributions': recents};
}

/// What a clan document's `twin*` fields should say, derived from the pacts
/// that involve it. `clan_twins` is the source of truth: a leader may not edit
/// another clan's document under the Firestore rules, so each clan's own
/// members keep their own clan doc in sync with it (React clients read these
/// fields).
Map<String, dynamic> desiredTwinFields(String myId, List<TwinPact> pacts) {
  final mine = pacts.where((p) => p.involves(myId)).toList();
  TwinPact? pick(bool Function(TwinPact) f) {
    for (final p in mine) {
      if (f(p)) return p;
    }
    return null;
  }

  final active = pick((p) => p.isActive);
  if (active != null) {
    return {
      'twinStatus': 'active',
      'twinPactId': active.id,
      'twinClanId': active.otherId(myId),
      'twinClanName': active.otherName(myId),
      'twinClanBadge': active.otherBadge(myId),
      'twinPendingClanId': null,
    };
  }
  final sent = pick((p) => p.isPending && p.sentBy(myId));
  if (sent != null) {
    return {'twinStatus': 'pending_sent', 'twinPactId': sent.id, 'twinClanId': null, 'twinClanName': null, 'twinClanBadge': null, 'twinPendingClanId': sent.otherId(myId)};
  }
  final received = pick((p) => p.isPending && !p.sentBy(myId));
  if (received != null) {
    return {'twinStatus': 'pending_received', 'twinPactId': received.id, 'twinClanId': null, 'twinClanName': null, 'twinClanBadge': null, 'twinPendingClanId': received.otherId(myId)};
  }
  return {'twinStatus': 'none', 'twinPactId': null, 'twinClanId': null, 'twinClanName': null, 'twinClanBadge': null, 'twinPendingClanId': null};
}

/// True when the clan doc's twin fields differ from [want].
bool twinFieldsDiffer(Map<String, dynamic> clanData, Map<String, dynamic> want) {
  for (final e in want.entries) {
    final cur = clanData[e.key];
    final norm = (e.key == 'twinStatus' && cur == null) ? 'none' : cur;
    if (norm != e.value) return true;
  }
  return false;
}
