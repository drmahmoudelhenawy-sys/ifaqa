import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:ifaqa_flutter/services/mushaf_layout.dart';

MushafPage loadPage(int page) =>
    MushafPage.parse(File('assets/mushaf/pages/${page.toString().padLeft(3, '0')}.json').readAsStringSync());

Map<int, MushafLineKind> kinds(MushafPage p) => {for (final l in p.lines) l.number: l.kind};

void main() {
  group('header and bismillah inference', () {
    test('page 1: Al-Fatiha has a header and no separate bismillah', () {
      final p = loadPage(1);
      expect(p.slotCount, 8);
      expect(p.lines[0].kind, MushafLineKind.surahHeader);
      expect(p.lines[0].surah, 1);
      expect(p.lines.where((l) => l.kind == MushafLineKind.bismillah), isEmpty);
      expect(p.lines.skip(1).every((l) => l.kind == MushafLineKind.text), isTrue);
    });

    test('page 2: Al-Baqarah header then bismillah', () {
      final p = loadPage(2);
      expect(p.slotCount, 8);
      expect(p.lines[0].kind, MushafLineKind.surahHeader);
      expect(p.lines[0].surah, 2);
      expect(p.lines[1].kind, MushafLineKind.bismillah);
      expect(p.lines[2].kind, MushafLineKind.text);
    });

    test('page 187: At-Tawbah has a header but no bismillah', () {
      final p = loadPage(187);
      expect(p.slotCount, 15);
      expect(p.lines[0].kind, MushafLineKind.surahHeader);
      expect(p.lines[0].surah, 9);
      expect(p.lines[1].kind, MushafLineKind.text);
      expect(p.lines.where((l) => l.kind == MushafLineKind.bismillah), isEmpty);
    });

    test('page 106: Al-Ma\'idah starts mid-page (lines 6-7)', () {
      final k = kinds(loadPage(106));
      expect(k[6], MushafLineKind.surahHeader);
      expect(k[7], MushafLineKind.bismillah);
      expect(k[8], MushafLineKind.text);
      expect(k[5], MushafLineKind.text);
    });

    test('page 604: three surahs each get a header and bismillah', () {
      final p = loadPage(604);
      final headers = p.lines.where((l) => l.kind == MushafLineKind.surahHeader).map((l) => l.surah).toList();
      final bismillahs = p.lines.where((l) => l.kind == MushafLineKind.bismillah).map((l) => l.surah).toList();
      expect(headers, [112, 113, 114]);
      expect(bismillahs, [112, 113, 114]);
      final k = kinds(p);
      expect([k[1], k[2], k[3]], [MushafLineKind.surahHeader, MushafLineKind.bismillah, MushafLineKind.text]);
      expect([k[5], k[6], k[7]], [MushafLineKind.surahHeader, MushafLineKind.bismillah, MushafLineKind.text]);
      expect([k[10], k[11], k[12]], [MushafLineKind.surahHeader, MushafLineKind.bismillah, MushafLineKind.text]);
    });

    test('every page parses to a full set of slots with words', () {
      for (var page = 1; page <= 604; page++) {
        final p = loadPage(page);
        expect(p.slotCount, page <= 2 ? 8 : 15);
        expect(p.words, isNotEmpty, reason: 'page $page');
      }
    });
  });

  group('selection', () {
    final words = loadPage(2).words;

    test('wordRange is inclusive and order independent', () {
      expect(wordRange(words, 2, 5).map((w) => w.id), words.sublist(2, 6).map((w) => w.id));
      expect(wordRange(words, 5, 2).map((w) => w.id), words.sublist(2, 6).map((w) => w.id));
      expect(wordRange(words, 3, 3), hasLength(1));
      expect(wordRange(words, -4, 999), hasLength(words.length));
    });

    test('ayahWords returns the words of one ayah only', () {
      final a = ayahWords(words, 2, 2);
      expect(a, isNotEmpty);
      expect(a.every((w) => w.surah == 2 && w.ayah == 2), isTrue);
      expect(a.last.isEnd, isTrue);
    });

    test('copy text joins uthmani words with spaces and appends the reference', () {
      final sel = ayahWords(words, 2, 1);
      final text = selectionCopyText(sel);
      expect(text, contains(sel.first.text));
      expect(text, endsWith('﴿البقرة: 1﴾'));
      expect(text.contains('  '), isFalse);
      expect(wordsText(sel).split(' ').length, sel.where((w) => !w.isEnd).length);
    });

    test('reference spans ayat', () {
      final sel = wordRange(words, 0, words.length - 1);
      expect(selectionReference(sel), startsWith('﴿البقرة: 1-'));
    });
  });

  group('highlight storage', () {
    test('round trip', () {
      final marks = [const MarkEntry(2, 255, 3, 4, 42), const MarkEntry(1, 1, 0, 0, 1)];
      final back = decodeMarks(encodeMarks(marks));
      expect(back.map((m) => m.encode()), marks.map((m) => m.encode()));
      expect(back.first.wordId, '2:255:3');
      expect(back.first.color, 4);
      expect(back.first.page, 42);
    });

    test('malformed entries are dropped', () {
      expect(decodeMarks(['1:2:3:4:5', 'bad', '1:2:x:4:5', '1:2:3']), hasLength(1));
    });

    test('palette has five colours plus none', () {
      expect(kMarkColors, hasLength(6));
    });
  });
}
