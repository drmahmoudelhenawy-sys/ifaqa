import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/services/tafsir_offline_service.dart';

void main() {
  test('stripTafsirHtml removes tags and trims', () {
    expect(stripTafsirHtml(' a <span class="green">(ب)</span> ج '), 'a (ب) ج');
  });

  test('compactTafsirJson maps ayah number to plain text', () {
    final json = compactTafsirJson([
      {'verse_key': '1:1', 'text': 'x <b>y</b>'},
      {'verse_key': '1:2', 'text': '<p></p>'},
      {'verse_key': '1:3', 'text': 'z'},
    ]);
    expect(jsonDecode(json), {'1': 'x y', '3': 'z'});
  });
}
