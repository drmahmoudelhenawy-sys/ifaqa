import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/siraj/siraj_quotes.dart';
import 'package:ifaqa_flutter/siraj/siraj_state.dart';

SirajDay day(DateTime date) {
  DateTime at(int h, int m) => DateTime(date.year, date.month, date.day, h, m);
  return SirajDay(
    date: DateTime(date.year, date.month, date.day),
    sunrise: at(6, 20),
    prayers: [
      SirajPrayer('fajr', at(4, 50), 20),
      SirajPrayer('dhuhr', at(11, 50), 10),
      SirajPrayer('asr', at(14, 40), 10),
      SirajPrayer('maghrib', at(17, 5), 5),
      SirajPrayer('isha', at(18, 30), 15),
    ],
  );
}

// Tuesday 2026-11-17.
final days = [for (var i = -1; i <= 3; i++) day(DateTime(2026, 11, 17 + i))];

// Chosen so epoch ms is not within the quote window unless a test wants it.
DateTime t(int h, int m, [int s = 0]) => DateTime(2026, 11, 17, h, m, s);

const quietConfig = SirajConfig(alertQuotes: false);

SirajState stateAt(DateTime now, {SirajConfig config = quietConfig, SirajSignals signals = const SirajSignals()}) =>
    computeSirajState(now: now, days: days, config: config, signals: signals);

void main() {
  test('idle counts down to the next adhan', () {
    final s = stateAt(t(10, 0));
    expect(s.kind, SirajKind.idle);
    expect(s.prayerId, 'dhuhr');
    expect(s.target, t(11, 50));
    expect(sirajCountdown(s.target!.difference(t(10, 0, 0))), '٠١:٥٠:٠٠');
  });

  test('after isha the idle target is tomorrow fajr', () {
    final s = stateAt(DateTime(2026, 11, 17, 23, 0));
    expect(s.kind, SirajKind.idle);
    expect(s.prayerId, 'fajr');
    expect(s.target, DateTime(2026, 11, 18, 4, 50));
  });

  test('countdown uses Arabic-Indic digits and drops hours under one hour', () {
    expect(sirajCountdown(const Duration(hours: 1, minutes: 23, seconds: 45)), '٠١:٢٣:٤٥');
    expect(sirajCountdown(const Duration(minutes: 4, seconds: 12)), '٠٤:١٢');
  });

  test('iqamah phase runs from adhan to iqamah', () {
    final s = stateAt(t(11, 58));
    expect(s.kind, SirajKind.iqamah);
    expect(s.title, 'إقامة الظهر');
    expect(s.target, t(12, 0));
    // After the iqamah the next prayer is back to idle.
    expect(stateAt(t(12, 0)).kind, SirajKind.idle);
    expect(stateAt(t(12, 0)).prayerId, 'asr');
  });

  test('adhanNow lasts two minutes and beats the iqamah state', () {
    final s = stateAt(t(11, 51));
    expect(s.kind, SirajKind.adhanNow);
    expect(s.prayerId, 'dhuhr');
    expect(stateAt(t(11, 50)).kind, SirajKind.adhanNow);
    expect(stateAt(t(11, 51, 59)).kind, SirajKind.adhanNow);
    expect(stateAt(t(11, 52)).kind, SirajKind.iqamah);
    expect(stateAt(t(11, 49, 59)).kind, SirajKind.idle);
  });

  test('adhanNow is skipped once the prayer is logged', () {
    final signals = const SirajSignals(donePrayers: {'2026-11-17/dhuhr'});
    expect(stateAt(t(11, 51), signals: signals).kind, SirajKind.iqamah);
  });

  test('morning athkar window: fajr+20min until sunrise+3h', () {
    expect(stateAt(t(5, 9)).kind, SirajKind.iqamah); // fajr iqamah ends 05:10
    expect(stateAt(t(5, 10)).kind, SirajKind.athkarDue);
    final s = stateAt(t(7, 0));
    expect(s.kind, SirajKind.athkarDue);
    expect(s.athkar, SirajAthkar.morning);
    expect(s.target, t(9, 20));
    expect(stateAt(t(9, 19)).kind, SirajKind.athkarDue);
    expect(stateAt(t(9, 20)).kind, SirajKind.idle);
  });

  test('evening athkar window: asr+15min until maghrib', () {
    expect(stateAt(t(14, 54)).kind, SirajKind.idle);
    final s = stateAt(t(14, 55));
    expect(s.kind, SirajKind.athkarDue);
    expect(s.athkar, SirajAthkar.evening);
    expect(s.target, t(17, 5));
    expect(stateAt(t(17, 5)).kind, SirajKind.adhanNow);
  });

  test('done-today suppresses athkar per type', () {
    expect(stateAt(t(7, 0), signals: const SirajSignals(athkarMorningDone: true)).kind, SirajKind.idle);
    expect(stateAt(t(7, 0), signals: const SirajSignals(athkarEveningDone: true)).kind, SirajKind.athkarDue);
    expect(stateAt(t(16, 0), signals: const SirajSignals(athkarEveningDone: true)).kind, SirajKind.idle);
    expect(stateAt(t(16, 0), signals: const SirajSignals(athkarMorningDone: true)).kind, SirajKind.athkarDue);
  });

  test('disabled alert kinds are skipped', () {
    expect(stateAt(t(7, 0), config: quietConfig.copyWith(alertAthkar: false)).kind, SirajKind.idle);
    expect(stateAt(t(11, 51), config: quietConfig.copyWith(alertPrayer: false)).kind, SirajKind.iqamah);
    expect(stateAt(t(11, 58), config: quietConfig.copyWith(alertIqamah: false)).kind, SirajKind.idle);
  });

  test('do not disturb leaves only the idle countdown', () {
    final dnd = quietConfig.copyWith(dnd: true);
    const playing = SirajSignals(mediaPlaying: true, mediaTitle: 'سورة الكهف');
    for (final now in [t(11, 51), t(11, 58), t(7, 0), t(15, 30)]) {
      expect(stateAt(now, config: dnd, signals: playing).kind, SirajKind.idle, reason: '$now');
    }
    final withQuotes = const SirajConfig(dnd: true);
    final slot = DateTime.fromMillisecondsSinceEpoch(30 * 60000 * 100000);
    expect(computeSirajCandidates(now: slot, days: days, config: withQuotes).length, 1);
  });

  test('media shows only while playing', () {
    const playing = SirajSignals(mediaPlaying: true, mediaTitle: 'سورة الكهف', mediaSubtitle: 'قارئ');
    final s = stateAt(t(10, 0), signals: playing);
    expect(s.kind, SirajKind.media);
    expect(s.title, 'سورة الكهف');
    expect(stateAt(t(10, 0), signals: const SirajSignals(mediaTitle: 'سورة الكهف')).kind, SirajKind.idle);
  });

  test('quotes appear at the start of each slot and honour the source', () {
    final slotStart = DateTime.fromMillisecondsSinceEpoch(30 * 60000 * 100000);
    final inside = slotStart.add(const Duration(seconds: 3));
    // days are fixed to 2026-11-17; use times that fall inside a slot window there.
    final d = [day(DateTime(inside.year, inside.month, inside.day)), day(inside.add(const Duration(days: 1))), day(inside.subtract(const Duration(days: 1)))];
    final both = computeSirajState(now: inside, days: d);
    // The prayer day might coincide with a prayer window; only assert when it is a quote.
    final onlyHadith = computeSirajCandidates(now: inside, days: d, config: const SirajConfig(quoteSource: SirajQuoteChoice.hadith));
    final onlyQuran = computeSirajCandidates(now: inside, days: d, config: const SirajConfig(quoteSource: SirajQuoteChoice.quran));
    final h = onlyHadith.where((s) => s.kind == SirajKind.quote);
    final q = onlyQuran.where((s) => s.kind == SirajKind.quote);
    expect(h.single.quote!.source, SirajQuoteSource.hadith);
    expect(q.single.quote!.source, SirajQuoteSource.quran);
    expect(both, isNotNull);
    // Outside the show window there is no quote.
    final outside = slotStart.add(const Duration(minutes: 10));
    expect(computeSirajCandidates(now: outside, days: d).where((s) => s.kind == SirajKind.quote), isEmpty);
  });

  test('priority ordering: adhan > iqamah > athkar > media > quote > idle', () {
    expect(SirajPriority.adhanNow, greaterThan(SirajPriority.iqamah));
    expect(SirajPriority.iqamah, greaterThan(SirajPriority.athkar));
    expect(SirajPriority.athkar, greaterThan(SirajPriority.media));
    expect(SirajPriority.media, greaterThan(SirajPriority.quote));
    expect(SirajPriority.quote, greaterThan(SirajPriority.idle));

    // Everything at once: the 11:51 adhan card, with media playing and iqamah active.
    const playing = SirajSignals(mediaPlaying: true, mediaTitle: 'x');
    final all = computeSirajCandidates(now: t(11, 51), days: days, config: quietConfig, signals: playing);
    expect(all.map((s) => s.kind).toList(), [SirajKind.adhanNow, SirajKind.iqamah, SirajKind.media, SirajKind.idle]);
    // Athkar outranks media.
    final morning = computeSirajCandidates(now: t(7, 0), days: days, config: quietConfig, signals: playing);
    expect(morning.map((s) => s.kind).toList(), [SirajKind.athkarDue, SirajKind.media, SirajKind.idle]);
  });

  group('live notification plan', () {
    test('chain of (time, title, countdown target) for two days', () {
      final now = t(9, 0);
      final plan = planSirajLive(now: now, days: days);
      // First: post now, counting down to dhuhr adhan.
      expect(plan.first.time, now);
      expect(plan.first.countdownTarget, t(11, 50));
      expect(plan.first.iqamahPhase, isFalse);
      expect(plan.first.title, contains('الظهر'));

      // Alternates adhan (iqamah countdown) and iqamah end (next-prayer countdown).
      expect(plan[1].time, t(11, 50));
      expect(plan[1].iqamahPhase, isTrue);
      expect(plan[1].countdownTarget, t(12, 0));
      expect(plan[2].time, t(12, 0));
      expect(plan[2].iqamahPhase, isFalse);
      expect(plan[2].countdownTarget, t(14, 40));
      expect(plan[2].title, contains('العصر'));

      // Entries are ordered and each countdown ends after its own start.
      for (var i = 1; i < plan.length; i++) {
        expect(plan[i].time.isAfter(plan[i - 1].time), isTrue);
        expect(plan[i].countdownTarget.isAfter(plan[i].time), isTrue);
      }
      // Nothing is planned past the two-day horizon.
      expect(plan.last.time.isAfter(now.add(const Duration(days: 2))), isFalse);
      // 2 days x 5 prayers x 2 transitions, roughly, plus Athkar reminders
      // (one entry per window + one 30-minute resume entry; a morning window
      // starting exactly at an iqamah end replaces that prayer entry).
      expect(plan.length, inInclusiveRange(25, 29));
    });

    test('athkar windows appear on the lock screen without hiding prayer time', () {
      final now = t(9, 0);
      final plan = planSirajLive(now: now, days: days);
      // "Now" is inside the morning Athkar window: the first (prayer) entry
      // keeps its prayer title and countdown but mentions the Athkar.
      expect(plan.first.title, contains('الظهر'));
      expect(plan.first.countdownTarget, t(11, 50));
      expect(plan.first.body, contains('أذكار الصباح'));
      // Evening Athkar: its own entry at 14:55, still counting down to Maghrib.
      final evening = plan.firstWhere((e) => e.isAthkar && e.athkar == SirajAthkar.evening);
      expect(evening.time, t(14, 55));
      expect(evening.title, contains('أذكار المساء'));
      expect(evening.countdownTarget, t(17, 5));
      // 30 minutes later the capsule goes back to the prayer countdown.
      final resume = plan.firstWhere((e) => e.time == t(15, 25));
      expect(resume.isAthkar, isFalse);
      expect(resume.countdownTarget, t(17, 5));
      // A morning window starting exactly at an iqamah end replaces that entry.
      final morning = plan.firstWhere((e) => e.isAthkar && e.athkar == SirajAthkar.morning);
      expect(morning.time, DateTime(2026, 11, 18, 5, 10));
      expect(morning.countdownTarget, DateTime(2026, 11, 18, 11, 50));
    });

    test('starting inside the iqamah window counts down to the iqamah', () {
      final plan = planSirajLive(now: t(11, 55), days: days);
      expect(plan.first.iqamahPhase, isTrue);
      expect(plan.first.countdownTarget, t(12, 0));
      expect(plan[1].time, t(12, 0));
      expect(plan[1].countdownTarget, t(14, 40));
    });

    test('plan titles are readable and the body names the time', () {
      final plan = planSirajLive(now: t(9, 0), days: days);
      expect(plan.first.body, contains('١١:٥٠ ص'));
      expect(plan[1].title, 'سِراج · إقامة الظهر');
    });
  });
}
