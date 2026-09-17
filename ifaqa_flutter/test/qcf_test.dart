import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qcf_quran_plus/qcf_quran_plus.dart';

void main() {
  test('qcf_quran_plus API verification', () {
    expect(totalPagesCount, 604);
    expect(totalSurahCount, 114);
    final pageView = QuranPageView(
      pageController: PageController(),
      highlights: const [],
      isDarkMode: false,
      onPageChanged: (page) {},
    );
    expect(pageView, isNotNull);
  });
}
