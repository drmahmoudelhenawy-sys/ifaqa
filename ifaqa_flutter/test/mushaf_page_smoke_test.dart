import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/services/app_state.dart';
import 'package:ifaqa_flutter/services/mushaf_layout.dart';
import 'package:ifaqa_flutter/widgets/mushaf_page_view.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<MushafPage> fakeLoader(int page) async =>
    MushafPage.parse(File('assets/mushaf/pages/${page.toString().padLeft(3, '0')}.json').readAsStringSync());

void main() {
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await AppState.init();
  });

  Future<void> pump(WidgetTester t, int page) async {
    t.view.physicalSize = const Size(400, 800);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(Directionality(
      textDirection: TextDirection.rtl,
      child: MaterialApp(
        home: Scaffold(body: MushafPageView(page: page, night: false, onTapBackground: () {}, loader: fakeLoader)),
      ),
    ));
    await t.pumpAndSettle();
  }

  // Slot k (1-based) spans y in [4 + (k-1)*slotH + offset, ...) with 15 slots of (800-8)/15.
  double slotCenter(int slot, int slots) {
    const slotH = (800 - 8) / 15;
    final y0 = 4 + (15 - slots) / 2 * slotH;
    return y0 + (slot - 0.5) * slotH;
  }

  testWidgets('page 1: header on slot 1, no bismillah', (t) async {
    await pump(t, 1);
    expect(find.text('سورة الفاتحة'), findsOneWidget);
    expect(find.textContaining('بِسۡمِ'), findsNothing);
    expect(t.getCenter(find.text('سورة الفاتحة')).dy, closeTo(slotCenter(1, 8), 2));
  });

  testWidgets('page 50: Al Imran header and bismillah on slots 1-2', (t) async {
    await pump(t, 50);
    expect(find.text('سورة آل عمران'), findsOneWidget);
    expect(find.textContaining('بِسۡمِ'), findsOneWidget);
    expect(t.getCenter(find.text('سورة آل عمران')).dy, closeTo(slotCenter(1, 15), 2));
    expect(t.getCenter(find.textContaining('بِسۡمِ')).dy, closeTo(slotCenter(2, 15), 2));
  });

  testWidgets('page 187: At-Tawbah header, no bismillah', (t) async {
    await pump(t, 187);
    expect(find.text('سورة التوبة'), findsOneWidget);
    expect(find.textContaining('بِسۡمِ'), findsNothing);
    expect(t.getCenter(find.text('سورة التوبة')).dy, closeTo(slotCenter(1, 15), 2));
  });
}
