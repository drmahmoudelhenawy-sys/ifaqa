import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/services/challenges_service.dart';
import 'package:ifaqa_flutter/services/reciter_photo_service.dart';

void main() {
  test('normalizeReciterKey unifies variants', () {
    expect(normalizeReciterKey('  عبدُ الرحمن  السديس '), normalizeReciterKey('عبد الرحمن السديس'));
    expect(normalizeReciterKey('أحمد'), 'احمد');
  });
  test('matchReciterPhoto exact and fuzzy', () {
    final p = parseReciterPhotos({
      'مشاري العفاسي': {'name': 'مشاري العفاسي', 'photoUrl': 'http://a/x.png'},
      'bad': {'name': 'x', 'photoUrl': ''},
    });
    expect(p.length, 1);
    expect(matchReciterPhoto(p, 'مشاري العفاسي'), 'http://a/x.png');
    expect(matchReciterPhoto(p, 'الشيخ مشاري العفاسي'), 'http://a/x.png');
    expect(matchReciterPhoto(p, 'غيره'), isNull);
  });
  test('parseChallenges', () {
    expect(parseChallenges(null), isNull);
    expect(parseChallenges([]), isNull);
    final l = parseChallenges([
      {'id': 'a', 'title': 'T', 'xp': 3},
      {'id': '', 'title': 'x'},
    ])!;
    expect(l.length, 1);
    expect(l.first.xp, 10);
    expect(normalizeXp(null), 100);
  });
}
