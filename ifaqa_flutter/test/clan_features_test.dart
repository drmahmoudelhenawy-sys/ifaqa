import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/services/clan_features.dart';

void main() {
  group('juz mapping', () {
    test('table covers 604 pages with no gaps', () {
      expect(quranJuzs.length, 30);
      expect(quranJuzs.first.startPage, 1);
      expect(quranJuzs.last.endPage, 604);
      for (var i = 1; i < 30; i++) {
        expect(quranJuzs[i].startPage, quranJuzs[i - 1].endPage + 1);
      }
      expect(quranJuzs.fold<int>(0, (s, j) => s + j.totalPages), 604);
    });

    test('page to juz boundaries and clamping', () {
      expect(juzFromPage(1).juzNumber, 1);
      expect(juzFromPage(21).juzNumber, 1);
      expect(juzFromPage(22).juzNumber, 2);
      expect(juzFromPage(581).juzNumber, 29);
      expect(juzFromPage(582).juzNumber, 30);
      expect(juzFromPage(604).juzNumber, 30);
      expect(juzFromPage(0).juzNumber, 1);
      expect(juzFromPage(9999).juzNumber, 30);
    });
  });

  group('khatma slots', () {
    test('claim, conflict and the 3-slot limit', () {
      final k = ClanKhatma.initial();
      expect(claimKhatmaSlot(k, 'a', 'أحمد', 1), isNull);
      expect(claimKhatmaSlot(k, 'b', 'بلال', 1), contains('محجوز'));
      expect(claimKhatmaSlot(k, 'a', 'أحمد', 2), isNull);
      expect(claimKhatmaSlot(k, 'a', 'أحمد', 3), isNull);
      expect(claimKhatmaSlot(k, 'a', 'أحمد', 4), contains('3 أجزاء'));
      expect(claimKhatmaSlot(k, 'a', 'أحمد', 99), contains('غير صحيح'));
      // re-claiming your own slot is a no-op, not an error
      expect(claimKhatmaSlot(k, 'a', 'أحمد', 1), isNull);
    });

    test('release only by owner and resets progress', () {
      final k = ClanKhatma.initial();
      claimKhatmaSlot(k, 'a', 'أحمد', 5);
      recordKhatmaPage(k, 'a', 85);
      expect(k.slots[5]!.readPages, [85]);
      expect(releaseKhatmaSlot(k, 'b', 5), isNotNull);
      expect(releaseKhatmaSlot(k, 'a', 5), isNull);
      expect(k.slots[5]!.isClaimed, isFalse);
      expect(k.slots[5]!.readPages, isEmpty);
    });

    test('pages only count on own claimed juz and are de-duplicated', () {
      final k = ClanKhatma.initial();
      claimKhatmaSlot(k, 'a', 'أحمد', 2);
      expect(recordKhatmaPage(k, 'a', 5).changed, isFalse); // juz 1 not claimed
      expect(recordKhatmaPage(k, 'b', 25).changed, isFalse); // someone else's
      expect(recordKhatmaPage(k, 'a', 25).changed, isTrue);
      expect(recordKhatmaPage(k, 'a', 25).changed, isFalse);
      expect(k.slots[2]!.readPages, [25]);
    });

    test('juz completes on all pages and counts toward the khatma', () {
      final k = ClanKhatma.initial();
      claimKhatmaSlot(k, 'a', 'أحمد', 2);
      KhatmaPageResult? last;
      for (var p = 22; p <= 41; p++) {
        last = recordKhatmaPage(k, 'a', p);
      }
      expect(last!.juzCompleted, isTrue);
      expect(k.slots[2]!.isCompleted, isTrue);
      expect(k.completedCount, 1);
      expect(k.isCompleted, isFalse);
      // a completed slot cannot be released or re-recorded
      expect(releaseKhatmaSlot(k, 'a', 2), contains('تم إتمامه'));
      expect(recordKhatmaPage(k, 'a', 30).changed, isFalse);
    });

    test('React shortcut: last page with 12+ pages read completes', () {
      final k = ClanKhatma.initial();
      claimKhatmaSlot(k, 'a', 'أحمد', 2);
      for (var p = 22; p <= 33; p++) {
        recordKhatmaPage(k, 'a', p);
      }
      expect(k.slots[2]!.isCompleted, isFalse);
      expect(recordKhatmaPage(k, 'a', 41).juzCompleted, isTrue); // 13 pages incl. the last
    });

    test('30 completed juz finish the khatma once; completed khatma locks claims', () {
      final k = ClanKhatma.initial(3);
      var finishes = 0;
      for (final j in quranJuzs) {
        // three claims at a time is the limit, so claim/finish one by one
        expect(claimKhatmaSlot(k, 'a', 'أحمد', j.juzNumber), isNull);
        for (var p = j.startPage; p <= j.endPage; p++) {
          if (recordKhatmaPage(k, 'a', p).khatmaCompleted) finishes++;
        }
      }
      expect(finishes, 1);
      expect(k.completedCount, 30);
      expect(k.isCompleted, isTrue);
      expect(claimKhatmaSlot(k, 'b', 'بلال', 1), contains('اكتملت'));
    });

    test('serialises to the React document shape and back', () {
      final k = ClanKhatma.initial(2);
      claimKhatmaSlot(k, 'a', 'أحمد', 7);
      recordKhatmaPage(k, 'a', 130);
      final m = k.toMap();
      expect((m['slots'] as Map).length, 30);
      final slot = (m['slots'] as Map)['7'] as Map;
      expect(slot['claimedByUserId'], 'a');
      expect(slot['readPages'], [130]);
      final back = ClanKhatma.fromMap(m);
      expect(back.khatmaNumber, 2);
      expect(back.slots[7]!.readPages, [130]);
      expect(back.slots[7]!.claimedByName, 'أحمد');
    });
  });

  group('sahar window', () {
    test('03:30 inclusive to 05:00 exclusive', () {
      DateTime t(int h, int m) => DateTime(2026, 3, 1, h, m);
      expect(isSaharActive(t(3, 29)), isFalse);
      expect(isSaharActive(t(3, 30)), isTrue);
      expect(isSaharActive(t(4, 59)), isTrue);
      expect(isSaharActive(t(5, 0)), isFalse);
      expect(isSaharActive(t(12, 0)), isFalse);
      expect(saharRemainingMinutes(t(4, 0)), 60);
      expect(saharRemainingMinutes(t(6, 0)), 0);
    });

    test('minutes until the next window', () {
      expect(minutesUntilSahar(DateTime(2026, 3, 1, 3, 0)), 30);
      expect(minutesUntilSahar(DateTime(2026, 3, 1, 4, 0)), 0);
      expect(minutesUntilSahar(DateTime(2026, 3, 1, 23, 30)), 240);
    });

    test('night key is the UTC date, like React', () {
      expect(saharDateKey(DateTime.utc(2026, 3, 1, 23, 59)), '2026-03-01');
    });

    test('lantern upsert reports new vs refreshed', () {
      final l = <SaharLantern>[];
      expect(upsertLantern(l, const SaharLantern('a', 'أحمد', 'quran', 1)), isTrue);
      expect(upsertLantern(l, const SaharLantern('b', 'بلال', 'salawat', 2)), isTrue);
      expect(upsertLantern(l, const SaharLantern('a', 'أحمد', 'tasbeeh', 3)), isFalse);
      expect(l.length, 2);
      expect(l.first.actionType, 'tasbeeh');
    });
  });

  group('twin pacts', () {
    Map<String, dynamic> pact(String a, String b, {String status = 'pending'}) => {
          ...newPactMap(pactId: pactIdFor(a, b), myId: a, myName: 'ركب $a', myBadge: '', otherId: b, otherName: 'ركب $b', otherBadge: 'x', template: jointMegaProjects.first, nowMs: 1),
          'status': status,
        };
    TwinPact parse(Map<String, dynamic> m) => TwinPact.fromMap(m['id'] as String, m);

    test('pact id is order independent', () {
      expect(pactIdFor('b', 'a'), 'a_b');
      expect(pactIdFor('a', 'b'), pactIdFor('b', 'a'));
    });

    test('desired clan fields follow the pacts for each side', () {
      final pending = parse(pact('a', 'b'));
      expect(desiredTwinFields('a', [pending])['twinStatus'], 'pending_sent');
      expect(desiredTwinFields('a', [pending])['twinPendingClanId'], 'b');
      expect(desiredTwinFields('b', [pending])['twinStatus'], 'pending_received');
      final active = parse(pact('a', 'b', status: 'active'));
      final fa = desiredTwinFields('a', [active]);
      expect(fa['twinStatus'], 'active');
      expect(fa['twinClanId'], 'b');
      expect(fa['twinClanName'], 'ركب b');
      expect(desiredTwinFields('b', [active])['twinClanId'], 'a');
      expect(desiredTwinFields('a', const [])['twinStatus'], 'none');
      // an active pact wins over a stray pending one
      expect(desiredTwinFields('a', [pending, parse(pact('a', 'c', status: 'active'))])['twinClanId'], 'c');
    });

    test('stale clan fields are detected', () {
      final want = desiredTwinFields('a', const []);
      expect(twinFieldsDiffer({}, want), isFalse);
      expect(twinFieldsDiffer({'twinStatus': 'pending_sent', 'twinPactId': 'a_b'}, want), isTrue);
    });

    test('joint contributions: sides, completion, recents cap, inactive pact', () {
      final m = pact('a', 'b', status: 'active');
      (m['jointProject'] as Map)['targetPoints'] = 100;
      expect(applyJointContribution(pact('a', 'b'), clanId: 'a', userId: 'u', userName: 'n', points: 5, worshipType: 'w', nowMs: 1), isNull);
      expect(applyJointContribution(m, clanId: 'zzz', userId: 'u', userName: 'n', points: 5, worshipType: 'w', nowMs: 1), isNull);
      var upd = applyJointContribution(m, clanId: 'a', userId: 'u', userName: 'n', points: 60, worshipType: 'w', nowMs: 1)!;
      m.addAll(upd);
      upd = applyJointContribution(m, clanId: 'b', userId: 'v', userName: 'm', points: 50, worshipType: 'w', nowMs: 2)!;
      final proj = upd['jointProject'] as Map;
      expect(proj['clan1Contributed'], 60);
      expect(proj['clan2Contributed'], 50);
      expect(proj['totalContributed'], 110);
      expect(proj['isCompleted'], isTrue);
      expect((upd['recentContributions'] as List).length, 2);
      m.addAll(upd);
      for (var i = 0; i < 20; i++) {
        m.addAll(applyJointContribution(m, clanId: 'a', userId: 'u', userName: 'n', points: 0, worshipType: 'w', nowMs: 3)!);
      }
      expect((m['recentContributions'] as List).length, 15);
      expect(((m['jointProject'] as Map)['clan1Contributed']), 80); // zero points count as 1
    });
  });
}
