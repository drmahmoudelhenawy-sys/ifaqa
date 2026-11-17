import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/prayer_time_info.dart';
import 'app_state.dart';
import 'clan_service.dart';
import 'cloud_service.dart';

/// Which counter is running right now. Same windows as React's
/// `getProphetChallengeSchedule`: the Friday challenge runs from Thursday Fajr
/// to Friday Maghrib with its own counter; every other moment uses a daily one.
class ProphetSchedule {
  final bool isFriday;
  final String periodKey;
  final String title;
  final String subtitle;
  final Duration remaining;
  final String countdown;

  const ProphetSchedule({
    required this.isFriday,
    required this.periodKey,
    required this.title,
    required this.subtitle,
    required this.remaining,
    required this.countdown,
  });

  int get globalGoal => isFriday ? 100000 : 50000;

  static String _two(int n) => n.toString().padLeft(2, '0');
  static String _clock(Duration d) => '${_two(d.inHours)}:${_two(d.inMinutes % 60)}:${_two(d.inSeconds % 60)}';

  static ProphetSchedule at(DateTime now) {
    final loc = AppState.instance.location;
    DateTime day(DateTime d) => DateTime(d.year, d.month, d.day);
    final today = day(now);
    // DateTime.weekday: Mon=1 ... Fri=5, Sun=7.
    final daysToFriday = (DateTime.friday - now.weekday + 7) % 7;
    final friday = today.add(Duration(days: daysToFriday));
    final thursday = friday.subtract(const Duration(days: 1));
    final thursdayFajr = prayerTimesOn(loc, thursday).fajr.toLocal();
    final fridayMaghrib = prayerTimesOn(loc, friday).maghrib.toLocal();

    if (!now.isBefore(thursdayFajr) && now.isBefore(fridayMaghrib)) {
      final left = fridayMaghrib.difference(now);
      return ProphetSchedule(
        isFriday: true,
        periodKey: 'friday_${AppState.dateKey(friday)}',
        title: 'تحدي الجمعة المباركة',
        subtitle: 'صلِّ على النبي ﷺ وشارك بالهدف',
        remaining: left,
        countdown: _clock(left),
      );
    }

    final dailyKey = 'daily_${AppState.dateKey(today)}';
    if (now.weekday == DateTime.thursday && now.isBefore(thursdayFajr)) {
      final left = thursdayFajr.difference(now);
      return ProphetSchedule(
        isFriday: false,
        periodKey: dailyKey,
        title: 'ذكر المصطفى ﷺ',
        subtitle: 'تحدي الجمعة يبدأ عند الفجر',
        remaining: left,
        countdown: _clock(left),
      );
    }

    var daysToThu = (DateTime.thursday - now.weekday + 7) % 7;
    if (daysToThu == 0) daysToThu = 7;
    final nextThuFajr = prayerTimesOn(loc, today.add(Duration(days: daysToThu))).fajr.toLocal();
    final left = nextThuFajr.difference(now);
    final days = left.inDays;
    final hours = left.inHours % 24;
    final text = days > 1 ? '$days أيام و $hours س' : days == 1 ? 'يوم و $hours س' : '${left.inHours} ساعة';
    return ProphetSchedule(
      isFriday: false,
      periodKey: dailyKey,
      title: 'ذكر المصطفى ﷺ',
      subtitle: 'العداد اليومي متاح 24 ساعة',
      remaining: left,
      countdown: text,
    );
  }
}

class ProphetLeader {
  final String id;
  final String name;
  final int count;
  const ProphetLeader(this.id, this.name, this.count);
}

/// Counter state for the current period. Taps count locally at once (so the
/// counter works offline and as a guest) and go to Firestore at the same paths
/// as React when signed in. XP is credited in batches of 10, like React.
class ProphetChallengeService {
  ProphetChallengeService._();
  static final ProphetChallengeService instance = ProphetChallengeService._();

  final AppState _state = AppState.instance;
  int _pendingXp = 0;
  Timer? _flush;

  FirebaseFirestore get _db => FirebaseFirestore.instance;
  String get _base => 'artifacts/${CloudService.appId}/public/data/prophet_v2';

  int localCount(String periodKey) =>
      _state.text('salat_period') == periodKey ? _state.number('salat_count') : 0;

  int get personalGoal => _state.number('salat_goal', fallback: 100);
  set personalGoal(int v) => _state.setNumber('salat_goal', v);

  /// Adds one salawat and returns the new local count.
  int pray(String periodKey) {
    final next = localCount(periodKey) + 1;
    _state.setText('salat_period', periodKey);
    _state.setNumber('salat_count', next);

    _pendingXp += 1;
    if (_pendingXp >= 10) {
      _flushXp();
    } else {
      _flush?.cancel();
      _flush = Timer(const Duration(milliseconds: 1500), _flushXp);
    }

    final u = CloudService.instance.user;
    if (u != null) {
      _db.doc('$_base/$periodKey/users/${u.uid}').set({
        'count': FieldValue.increment(1),
        'name': _state.displayName,
        'lastUpdate': DateTime.now().millisecondsSinceEpoch,
      }, SetOptions(merge: true)).catchError((Object e) => debugPrint('prophet sync failed: $e'));
    }
    return next;
  }

  /// Salawat counted elsewhere (the home screen widget) added in one go.
  void prayMany(String periodKey, int n) {
    if (n <= 0) return;
    final next = localCount(periodKey) + n;
    _state.setText('salat_period', periodKey);
    _state.setNumber('salat_count', next);
    _pendingXp += n;
    _flushXp();
    final u = CloudService.instance.user;
    if (u != null) {
      _db.doc('$_base/$periodKey/users/${u.uid}').set({
        'count': FieldValue.increment(n),
        'name': _state.displayName,
        'lastUpdate': DateTime.now().millisecondsSinceEpoch,
      }, SetOptions(merge: true)).catchError((Object e) => debugPrint('prophet sync failed: $e'));
    }
  }

  void _flushXp() {
    _flush?.cancel();
    if (_pendingXp > 0) {
      final batch = _pendingXp;
      _pendingXp = 0;
      _state.addXp(batch);
      ClanService.instance.autoContribute(QuestType.salawat, batch);
    }
  }

  void flush() => _flushXp();

  /// The signed-in user's server count, so the counter follows the account
  /// across devices (and across the React app).
  Stream<int> serverCount(String periodKey) {
    final u = CloudService.instance.user;
    if (u == null || !CloudService.instance.available) return const Stream.empty();
    return _db.doc('$_base/$periodKey/users/${u.uid}').snapshots().map((s) => (s.data()?['count'] as num?)?.toInt() ?? 0);
  }

  Stream<List<ProphetLeader>> leaders(String periodKey) {
    if (CloudService.instance.user == null) return const Stream.empty();
    return _db
        .collection('$_base/$periodKey/users')
        .orderBy('count', descending: true)
        .limit(10)
        .snapshots()
        .map((s) => s.docs
            .map((d) => ProphetLeader(d.id, (d.data()['name'] as String?) ?? 'مستخدم', (d.data()['count'] as num?)?.toInt() ?? 0))
            .toList());
  }

  /// Sum of every participant's count. React wrote a `global/totals` doc, but
  /// the rules only let admins write it, so the real total is the sum here.
  Future<int> globalTotal(String periodKey) async {
    if (CloudService.instance.user == null) return 0;
    try {
      final agg = await _db.collection('$_base/$periodKey/users').aggregate(sum('count')).get();
      return (agg.getSum('count') ?? 0).toInt();
    } catch (e) {
      debugPrint('prophet total failed: $e');
      return 0;
    }
  }
}
