import 'dart:convert';
import 'app_state.dart';
import 'clan_service.dart';

/// A reading plan: finish the Mushaf in [days] days (React `KhatmaGoal`).
class KhatmaGoal {
  final String title;
  final int days;
  final DateTime start;
  const KhatmaGoal(this.title, this.days, this.start);

  int get pagesPerDay => (604 / days).ceil();
  int get dayNumber => DateTime.now().difference(DateTime(start.year, start.month, start.day)).inDays + 1;
  int get expectedPages => (pagesPerDay * dayNumber).clamp(0, 604);

  Map<String, dynamic> toJson() => {'title': title, 'days': days, 'start': start.millisecondsSinceEpoch};
  factory KhatmaGoal.fromJson(Map<String, dynamic> m) =>
      KhatmaGoal(m['title'] as String? ?? 'ختمة', (m['days'] as num?)?.toInt() ?? 30, DateTime.fromMillisecondsSinceEpoch((m['start'] as num?)?.toInt() ?? 0));
}

class DayPages {
  final DateTime day;
  final int pages;
  const DayPages(this.day, this.pages);
}

/// Pages counted as read (after 20 seconds on the page, like React), daily
/// stats, the khatma plan, and the hooks into XP and clan quests.
class QuranProgressService {
  QuranProgressService._();
  static final QuranProgressService instance = QuranProgressService._();

  static const int pageXp = 10; // XP_RULES.QURAN_PAGE_READ
  static const int secondsToCount = 20;
  static const int _kahfFirst = 293, _kahfLast = 304;

  final _state = AppState.instance;

  bool readToday(int page) => _state.dayHas(DateTime.now(), 'quran_pages', '$page');

  int pagesOn(DateTime day) => _state.dayCount(day, 'quran_pages');

  /// Returns true when the page was newly counted today.
  bool markRead(int page) {
    final now = DateTime.now();
    if (readToday(page)) return false;
    _state.toggleDayItem(now, 'quran_pages', '$page', xpValue: pageXp);
    ClanService.instance.autoContribute(QuestType.quranPages, 1);

    final goal = khatma;
    if (goal != null) {
      final read = {..._state.strings('khatma_pages')}..add('$page');
      _state.setStrings('khatma_pages', read.toList());
      if (read.length >= 604 && !_state.flag('khatma_done')) {
        _state.setFlag('khatma_done', true);
        _state.setNumber('khatmas_completed', _state.number('khatmas_completed') + 1);
      }
    }

    if (now.weekday == DateTime.friday && page >= _kahfFirst && page <= _kahfLast) {
      final kahfDone = List.generate(_kahfLast - _kahfFirst + 1, (i) => _kahfFirst + i).every(readToday);
      final key = 'kahf_${AppState.dateKey(now)}';
      if (kahfDone && !_state.flag(key)) {
        _state.setFlag(key, true);
        ClanService.instance.autoContribute(QuestType.collectiveKhatma, 1);
      }
    }
    return true;
  }

  // ---- Khatma ----

  KhatmaGoal? get khatma {
    final raw = _state.text('khatma_goal');
    if (raw == null || raw.isEmpty) return null;
    return KhatmaGoal.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  int get khatmaPagesRead => _state.strings('khatma_pages').length;
  int get khatmasCompleted => _state.number('khatmas_completed');

  void startKhatma(String title, int days) {
    _state.setText('khatma_goal', jsonEncode(KhatmaGoal(title.trim().isEmpty ? 'ختمة جديدة' : title.trim(), days, DateTime.now()).toJson()));
    _state.setStrings('khatma_pages', const []);
    _state.setFlag('khatma_done', false);
  }

  void clearKhatma() {
    _state.setText('khatma_goal', '');
    _state.setStrings('khatma_pages', const []);
  }

  // ---- Stats ----

  List<DayPages> lastDays(int n) {
    final today = DateTime.now();
    return List.generate(n, (i) {
      final d = DateTime(today.year, today.month, today.day).subtract(Duration(days: n - 1 - i));
      return DayPages(d, pagesOn(d));
    });
  }

  /// Consecutive days with at least one page, counting today if read.
  int get streak {
    var d = DateTime.now();
    if (pagesOn(d) == 0) d = d.subtract(const Duration(days: 1));
    var n = 0;
    while (pagesOn(d) > 0 && n < 3650) {
      n++;
      d = d.subtract(const Duration(days: 1));
    }
    return n;
  }
}
