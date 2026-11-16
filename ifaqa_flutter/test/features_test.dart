import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/models/prayer_time_info.dart';
import 'package:ifaqa_flutter/screens/fajr_wake_team_tab.dart';
import 'package:ifaqa_flutter/services/app_state.dart';
import 'package:ifaqa_flutter/services/clan_service.dart';
import 'package:ifaqa_flutter/services/prophet_challenge_service.dart';
import 'package:ifaqa_flutter/services/reminder_plan.dart';
import 'package:shared_preferences/shared_preferences.dart';

Clan _clan({int points = 0, List<String> unlocked = const [], Map<String, dynamic> projects = const {}}) => Clan(
      id: 'c',
      name: 'ركب',
      description: '',
      bannerColor: '',
      badgeIcon: '',
      leaderId: 'u',
      leaderName: 'u',
      memberCount: 3,
      maxCapacity: 10,
      totalPoints: points,
      questBonusPoints: 0,
      unlockedTerritories: unlocked,
      territoryProjects: projects,
      policy: JoinPolicy.open,
      passcode: '',
      tag: '#c',
      activities: const [],
    );

void main() {
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await AppState.init();
  });

  group('Prophet challenge schedule', () {
    final loc = AppLocation.cairo;

    test('Monday runs the daily counter', () {
      final s = ProphetSchedule.at(DateTime(2026, 11, 16, 12));
      expect(s.isFriday, isFalse);
      expect(s.periodKey, 'daily_2026-11-16');
      expect(s.globalGoal, 50000);
    });

    test('Thursday after Fajr until Friday Maghrib is the Friday challenge', () {
      final thuFajr = prayerTimesOn(loc, DateTime(2026, 11, 19)).fajr.toLocal();
      final friMaghrib = prayerTimesOn(loc, DateTime(2026, 11, 20)).maghrib.toLocal();
      final during = ProphetSchedule.at(thuFajr.add(const Duration(minutes: 1)));
      expect(during.isFriday, isTrue);
      expect(during.periodKey, 'friday_2026-11-20');
      expect(ProphetSchedule.at(friMaghrib.subtract(const Duration(minutes: 1))).isFriday, isTrue);
      expect(ProphetSchedule.at(friMaghrib.add(const Duration(minutes: 1))).isFriday, isFalse);
      expect(ProphetSchedule.at(thuFajr.subtract(const Duration(minutes: 1))).subtitle, 'تحدي الجمعة يبدأ عند الفجر');
    });
  });

  group('Clans', () {
    test('week id matches the React ISO week', () {
      expect(currentWeekId(DateTime(2026, 1, 1)), '2026-W01');
      expect(currentWeekId(DateTime(2026, 11, 16)), '2026-W47');
      expect(currentWeekId(DateTime(2027, 1, 1)), '2026-W53');
    });

    test('member levels follow the React thresholds', () {
      expect(memberLevel(0).level, 1);
      expect(memberLevel(199).level, 1);
      expect(memberLevel(200).level, 2);
      expect(memberLevel(20000).level, 6);
      expect(memberLevel(100000).progress, 1.0);
    });

    test('streak multipliers', () {
      expect(streakMultiplier(1), 1.0);
      expect(streakMultiplier(3), 1.25);
      expect(streakMultiplier(7), 1.5);
      expect(streakMultiplier(14), 2.0);
    });

    test('reaching a landmark cost starts its construction without unlocking it', () {
      final u = pointsUpdate(_clan(), 1000000);
      expect((u['territoryProjects'] as Map).containsKey('oasis_tranquility'), isTrue);
      expect(u['unlockedTerritories'], isEmpty);
      expect(u['maxCapacity'], 10);
    });

    test('a finished build unlocks the landmark and its capacity once', () {
      final started = DateTime.now().subtract(const Duration(hours: 25)).millisecondsSinceEpoch;
      final clan = _clan(points: 1000000, projects: {
        'oasis_tranquility': {'startedAt': started, 'durationHours': 24, 'reducedHours': 0},
      });
      final u = pointsUpdate(clan, 1000000);
      expect(u['unlockedTerritories'], contains('oasis_tranquility'));
      expect(u['maxCapacity'], 15);
      // Re-applying keeps the same capacity instead of adding the bonus again.
      final again = pointsUpdate(_clan(points: 1000000, unlocked: ['oasis_tranquility']), 1000000);
      expect(again['maxCapacity'], 15);
    });

    test('banner colors read back from the React CSS gradient', () {
      expect(bannerColors('linear-gradient(135deg, #1e3a5f, #0f1d30)'), clanBanners[1].colors);
      expect(logoAsset('./clan_logos/clan_09.png'), 'assets/clan_logos/clan_09.png');
    });

    test('quest type keeps the React wire names', () {
      expect(QuestType.quranPages.wire, 'quran_pages');
      expect(defaultClanQuests.firstWhere((q) => q.id == 'quest_kahf_friday').fridayOnly, isTrue);
    });
  });

  test('wake phone numbers need a country code and accept Arabic digits', () {
    expect(normalizePhone('+20 101 234 5678'), '+201012345678');
    expect(normalizePhone('+٢٠١٠١٢٣٤٥٦٧٨'), '+201012345678');
    expect(normalizePhone('01012345678'), isNull);
  });

  test('an active khatma plans a daily reminder with its pages per day', () {
    final state = AppState.instance;
    state.setText('khatma_goal', jsonEncode({'title': 'ختمة رمضان', 'days': 30, 'start': 0}));
    final plans = planReminders(state, DateTime(2026, 11, 16, 1)).where((p) => p.kind == ReminderKind.khatma).toList();
    expect(plans, hasLength(planDays));
    expect(plans.first.body, contains('21 صفحة'));
    state.setText('khatma_goal', '');
  });
}
