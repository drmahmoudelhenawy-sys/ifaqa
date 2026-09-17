import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa/main.dart';

void main() {
  testWidgets('IfaqaApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const IfaqaApp());
    expect(find.text('إفاقة'), findsWidgets);
  });
}
