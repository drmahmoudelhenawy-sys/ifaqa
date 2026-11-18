import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/athkar_data.dart';
import '../models/zekr.dart';
import '../services/app_state.dart';
import 'siraj_state.dart';

/// Shared Athkar-reader + Tasbih views for the Siraj island, used by BOTH
/// the in-app capsule (`siraj_capsule.dart`) and the overlay over other
/// apps (`siraj_overlay_entry.dart`).
///
/// The overlay isolate cannot import the app's screens or the capsule, so
/// this file only depends on data / models / AppState / siraj_state — and
/// the two views take their accent colour as a parameter instead of
/// reading a theme. Keeping one implementation here keeps the island and
/// the overlay showing the same Athkar text and the same Tasbih counter.
///
/// What the user asked for (2026-11-18): read the Athkar text right in
/// the expanded island/overlay (morning/evening chooser, no need to open
/// the app), reminder actions "اقرأ الآن" / "اقرأ لاحقًا" on the
/// notification AND in the island, and a Tasbih counter in both places
/// wired to the same counter/state as the app's Masbaha screen
/// (`masbaha_count` / `masbaha_zekr` / `masbaha_goal` in AppState).

// ---------------------------------------------------------------------------
// Athkar reader — pure logic
// ---------------------------------------------------------------------------

/// The Athkar list for [type] (24 morning, 23 evening — see athkar_data).
List<Zekr> sirajAthkarList(SirajAthkar type) =>
    type == SirajAthkar.morning ? morningAdhkar : eveningAdhkar;

/// Which Athkar fits the time of day: morning before Asr, evening after.
/// Same rule as the capsule panel's morning/evening button.
SirajAthkar sirajAthkarTypeForTime(DateTime now, DateTime asr) =>
    now.isBefore(asr) ? SirajAthkar.morning : SirajAthkar.evening;

/// Snooze choices offered by "اقرأ لاحقًا" ("ذكّرني متى؟"), in minutes.
/// The notification action cannot show a chooser, so it uses the default
/// ([sirajAthkarSnoozeDefault] / `SirajConfig.athkarSnoozeMinutes`); the
/// island shows all four options every time.
const List<int> sirajAthkarSnoozeOptions = [10, 15, 30, 60];

/// Default snooze (minutes) for "اقرأ لاحقًا" from a notification.
const int sirajAthkarSnoozeDefault = 15;

/// Normalises a stored snooze-minutes value to one of the options.
int sirajNormalizeAthkarSnoozeMinutes(int? value) =>
    value != null && sirajAthkarSnoozeOptions.contains(value)
        ? value
        : sirajAthkarSnoozeDefault;

/// Per-zekr remaining counts for one reading session. Tap a zekr to count
/// one repetition down; long-press marks the whole zekr done. The counts
/// live only for the session (they reset when the reader closes or the
/// type changes) — the durable "done for today" flag is still
/// `SirajSettings.markAthkarDone`, set by the parent's "تم" button.
class SirajAthkarReader {
  SirajAthkarReader(this.type) : _remaining = {
    for (final z in sirajAthkarList(type)) z.id: z.count,
  };

  SirajAthkar type;
  final Map<String, int> _remaining;

  List<Zekr> get list => sirajAthkarList(type);

  int remainingFor(String id) => _remaining[id] ?? 0;

  /// Counts one repetition of [id] down (never below 0). Returns the new
  /// remaining count, or -1 when [id] is not in this list.
  int tap(String id) {
    if (!_remaining.containsKey(id)) return -1;
    final next = (_remaining[id]! - 1).clamp(0, 1 << 30);
    _remaining[id] = next;
    return next;
  }

  /// Marks the whole zekr done at once (long-press in the UI).
  void complete(String id) {
    if (_remaining.containsKey(id)) _remaining[id] = 0;
  }

  int get doneCount => _remaining.values.where((r) => r == 0).length;
  int get totalCount => _remaining.length;
  bool get isDone => _remaining.values.every((r) => r == 0);

  void reset(SirajAthkar newType) {
    type = newType;
    _remaining
      ..clear()
      ..addEntries(
        sirajAthkarList(newType).map((z) => MapEntry(z.id, z.count)),
      );
  }
}

// ---------------------------------------------------------------------------
// Mailbox keys between the isolates (SharedPreferences, raw keys)
// ---------------------------------------------------------------------------

/// Pending expanded view for the overlay, written by the main isolate
/// (notification "اقرأ الآن" action) and consumed by the overlay tick.
/// Values: `athkar:morning`, `athkar:evening`,
/// `athkar:morning:snooze` / `athkar:evening:snooze` (open with the
/// snooze chooser already open), `tasbih`. Written via
/// `AppState.setText('siraj_overlay_pending_view', …)` in the main
/// isolate (raw key `text_siraj_overlay_pending_view`) and read/cleared
/// with the same raw key in the overlay isolate.
const String sirajOverlayPendingViewKey = 'siraj_overlay_pending_view';

String sirajOverlayPendingViewValue({
  required String view,
  SirajAthkar? type,
  bool snooze = false,
}) {
  if (view == 'athkar' && type != null) {
    return 'athkar:${type.name}${snooze ? ':snooze' : ''}';
  }
  return view;
}

/// Parses a pending-view value, or null when it is missing / malformed.
/// Returns (view, type, snooze): view is 'athkar' or 'tasbih'.
({String view, SirajAthkar? type, bool snooze})? sirajParseOverlayPendingView(
  String? raw,
) {
  if (raw == null || raw.isEmpty) return null;
  final parts = raw.split(':');
  if (parts.first == 'tasbih' && parts.length == 1) {
    return (view: 'tasbih', type: null, snooze: false);
  }
  if (parts.first == 'athkar' && (parts.length == 2 || parts.length == 3)) {
    final type = parts[1] == 'evening'
        ? SirajAthkar.evening
        : parts[1] == 'morning'
        ? SirajAthkar.morning
        : null;
    if (type == null) return null;
    if (parts.length == 3 && parts[2] != 'snooze') return null;
    return (view: 'athkar', type: type, snooze: parts.length == 3);
  }
  return null;
}

/// A snooze request for the Athkar reminder, written by the overlay
/// isolate when the user picks "اقرأ لاحقًا" + a delay there. The overlay
/// isolate cannot schedule a notification (only SharedPreferences is
/// registered on its engine), so the request is a mailbox: the overlay's
/// own 1-second tick fires it (re-expanding to the Athkar reader) when
/// `fireAt` arrives, and the main isolate's `ReminderService.reschedule`
/// schedules it as a real notification if it sees the request first.
/// JSON: `{"type":"morning"|"evening","minutes":15,"fireAt":epochMs}`.
const String sirajAthkarSnoozeRequestKey = 'siraj_athkar_snooze_request';

String sirajAthkarSnoozeRequestJson({
  required SirajAthkar type,
  required int minutes,
  required DateTime fireAt,
}) => jsonEncode({
  'type': type.name,
  'minutes': minutes,
  'fireAt': fireAt.millisecondsSinceEpoch,
});

/// Parses a snooze request, or null when it is missing / malformed.
/// Minutes are clamped to 1..180 so a corrupt value cannot schedule a
/// nonsense delay.
({SirajAthkar type, int minutes, DateTime fireAt})?
sirajParseAthkarSnoozeRequest(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  try {
    final data = jsonDecode(raw) as Map<String, dynamic>;
    final type = data['type'] == 'evening'
        ? SirajAthkar.evening
        : data['type'] == 'morning'
        ? SirajAthkar.morning
        : null;
    final minutes = (data['minutes'] as num?)?.toInt();
    final fireAtMs = (data['fireAt'] as num?)?.toInt();
    if (type == null || minutes == null || fireAtMs == null) return null;
    return (
      type: type,
      minutes: minutes.clamp(1, 180),
      fireAt: DateTime.fromMillisecondsSinceEpoch(fireAtMs),
    );
  } catch (_) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tasbih — shared counter state (same keys as MasbahaScreen)
// ---------------------------------------------------------------------------

/// The app's Masbaha phrases. The screen used to keep this list private;
/// it now imports it from here so the island and the screen never drift.
const List<String> sirajTasbihDefaultPhrases = [
  'سبحان الله',
  'الحمد لله',
  'الله أكبر',
  'لا إله إلا الله',
  'أستغفر الله',
  'اللهم صل على محمد',
  'لا حول ولا قوة إلا بالله',
];

/// Goal choices for the counter, and the default goal.
const List<int> sirajTasbihGoalOptions = [33, 100, 500, 1000];
const int sirajTasbihGoalDefault = 100;

/// Progress towards the goal, 0..1. A goal of 0 or less means "no goal"
/// and reports 0; reaching (or passing) the goal reports 1.
double sirajTasbihProgress(int count, int goal) {
  if (goal <= 0) return 0;
  if (count <= 0) return 0;
  if (count >= goal) return 1;
  return count / goal;
}

/// All phrases: the defaults plus the user's custom ones.
List<String> sirajTasbihPhrases(List<String> custom) => [
  ...sirajTasbihDefaultPhrases,
  ...custom,
];

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

/// Full Athkar text inside the island: a morning/evening chooser at the
/// top, then every zekr of the chosen list with its remaining count.
/// Tap a zekr to count one repetition down, long-press to mark the whole
/// zekr done. "اقرأ لاحقًا" opens the snooze chooser (10/15/30/60) and
/// reports the pick via [onSnooze]; "تم" reports the finished type via
/// [onDone] (the parent marks it done and closes). No scrolling of its
/// own — the parent (capsule card / overlay panel) scrolls it.
///
/// [snoozed] opens with the snooze chooser already visible (the
/// notification "اقرأ لاحقًا" path opens the island this way).
/// [onInteract] fires on every interaction (tap / long-press / type
/// switch) so the parent can keep the card open (re-arm its collapse).
class SirajAthkarReaderView extends StatefulWidget {
  final SirajAthkar initialType;
  final Color accent;
  final void Function(SirajAthkar type) onDone;
  final void Function(SirajAthkar type, int minutes) onSnooze;
  final bool snoozed;
  final VoidCallback? onInteract;

  const SirajAthkarReaderView({
    super.key,
    required this.initialType,
    required this.accent,
    required this.onDone,
    required this.onSnooze,
    this.snoozed = false,
    this.onInteract,
  });

  @override
  State<SirajAthkarReaderView> createState() => _SirajAthkarReaderViewState();
}

class _SirajAthkarReaderViewState extends State<SirajAthkarReaderView> {
  late SirajAthkar _type = widget.initialType;
  late SirajAthkarReader _reader = SirajAthkarReader(_type);
  bool _showSnooze = false;

  @override
  void initState() {
    super.initState();
    _showSnooze = widget.snoozed;
  }

  void _switchType(SirajAthkar type) {
    if (type == _type) return;
    widget.onInteract?.call();
    setState(() {
      _type = type;
      _reader.reset(type);
      _showSnooze = false;
    });
  }

  Widget _typeChip(SirajAthkar type, String label, IconData icon) {
    final selected = _type == type;
    return Expanded(
      child: InkWell(
        onTap: () => _switchType(type),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 38,
          decoration: BoxDecoration(
            color: selected
                ? widget.accent.withValues(alpha: 0.22)
                : Colors.white.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? widget.accent.withValues(alpha: 0.6)
                  : Colors.white12,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: selected ? widget.accent : Colors.white70),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: selected ? widget.accent : Colors.white70,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _snoozeChip(int minutes) => InkWell(
    onTap: () {
      HapticFeedback.selectionClick();
      widget.onInteract?.call();
      widget.onSnooze(_type, minutes);
    },
    borderRadius: BorderRadius.circular(999),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white24),
      ),
      child: Text(
        'بعد ${sirajArabicDigits(minutes)} دقيقة',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w800,
        ),
      ),
    ),
  );

  Widget _btn(String label, VoidCallback onTap, {Color? bg, Color? fg, bool outline = false}) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: bg ?? Colors.white.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(14),
            border: outline ? Border.all(color: Colors.white24) : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: fg ?? Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = _reader.list;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            _typeChip(SirajAthkar.morning, 'أذكار الصباح', Icons.wb_sunny_rounded),
            const SizedBox(width: 8),
            _typeChip(SirajAthkar.evening, 'أذكار المساء', Icons.nights_stay_rounded),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Text(
                _reader.isDone
                    ? 'تمت الأذكار ✓ تقبّل الله'
                    : 'تم ${sirajArabicDigits(_reader.doneCount)} من ${sirajArabicDigits(_reader.totalCount)} • اضغط للعدّ، واضغط مطولًا لإتمام الذكر',
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ...list.map((zekr) {
          final remaining = _reader.remainingFor(zekr.id);
          final done = remaining == 0;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: done
                  ? null
                  : () {
                      HapticFeedback.selectionClick();
                      widget.onInteract?.call();
                      setState(() => _reader.tap(zekr.id));
                    },
              onLongPress: done
                  ? null
                  : () {
                      HapticFeedback.selectionClick();
                      widget.onInteract?.call();
                      setState(() => _reader.complete(zekr.id));
                    },
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: done
                      ? widget.accent.withValues(alpha: 0.08)
                      : Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: done
                        ? widget.accent.withValues(alpha: 0.35)
                        : Colors.white12,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        zekr.text,
                        style: TextStyle(
                          fontFamily: 'Amiri',
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          height: 1.7,
                          color: done ? Colors.white54 : Colors.white,
                          decoration: done
                              ? TextDecoration.lineThrough
                              : TextDecoration.none,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 34,
                      height: 34,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: done
                            ? const Color(0xFF34D399).withValues(alpha: 0.2)
                            : widget.accent.withValues(alpha: 0.16),
                      ),
                      child: done
                          ? const Icon(
                              Icons.check_rounded,
                              color: Color(0xFF34D399),
                              size: 18,
                            )
                          : Text(
                              sirajArabicDigits(remaining),
                              style: TextStyle(
                                color: widget.accent,
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        if (_showSnooze) ...[
          const SizedBox(height: 2),
          const Text(
            'ذكّرني متى؟',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: sirajAthkarSnoozeOptions.map(_snoozeChip).toList(),
          ),
          const SizedBox(height: 10),
        ],
        Row(
          children: [
            _btn(
              _showSnooze ? 'إلغاء التأجيل' : 'اقرأ لاحقًا',
              () {
                widget.onInteract?.call();
                setState(() => _showSnooze = !_showSnooze);
              },
              outline: true,
              fg: Colors.white70,
            ),
            const SizedBox(width: 10),
            _btn(
              'تم ✓',
              () => widget.onDone(_type),
              bg: const Color(0xFF059669),
            ),
          ],
        ),
      ],
    );
  }
}

/// Tasbih counter for the island: the same counter as the app's Masbaha
/// screen — `masbaha_count` / `masbaha_zekr` / `masbaha_goal` in AppState,
/// so counting here and counting in the full screen share one number.
/// Tap the big circle to count, switch phrase from the chips, pick a
/// goal, reset with confirmation. [onOpenFull] opens the full Masbaha
/// screen (in-app only; the overlay passes null and hides the button).
///
/// The count is read once on open and written on every tap; if the other
/// surface counted meanwhile, reopen to see the latest number (both
/// surfaces write the same key, last write wins while both are open).
///
/// Clan-quest taps are NOT counted here — the full screen owns those
/// (see MasbahaScreen._handleTap); the island is a plain counter.
/// [onInteract] fires on every tap so the parent can keep the card open.
class SirajTasbihView extends StatefulWidget {
  final Color accent;
  final VoidCallback? onOpenFull;
  final VoidCallback? onInteract;

  const SirajTasbihView({
    super.key,
    required this.accent,
    this.onOpenFull,
    this.onInteract,
  });

  @override
  State<SirajTasbihView> createState() => _SirajTasbihViewState();
}

class _SirajTasbihViewState extends State<SirajTasbihView> {
  final AppState _state = AppState.instance;
  late int _count = _state.number('masbaha_count');
  late int _goal = _state.number('masbaha_goal', fallback: sirajTasbihGoalDefault);
  late List<String> _custom = List<String>.of(_state.strings('masbaha_custom'));
  late String _phrase = _initialPhrase();
  bool _animate = false;

  String _initialPhrase() {
    final saved = _state.text('masbaha_zekr');
    final all = sirajTasbihPhrases(_custom);
    return saved != null && all.contains(saved)
        ? saved
        : sirajTasbihDefaultPhrases.first;
  }

  void _save() {
    _state.setNumber('masbaha_count', _count);
    _state.setNumber('masbaha_goal', _goal);
    _state.setText('masbaha_zekr', _phrase);
  }

  void _tap() {
    if (_state.flag('haptics', fallback: true)) {
      HapticFeedback.selectionClick();
    }
    widget.onInteract?.call();
    setState(() {
      _count++;
      _animate = true;
    });
    _save();
    Future.delayed(const Duration(milliseconds: 150), () {
      if (mounted) setState(() => _animate = false);
    });
  }

  Future<void> _reset() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: const Text('تصفير العداد؟'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('إلغاء'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('تصفير'),
            ),
          ],
        ),
      ),
    );
    if (confirmed == true) {
      setState(() => _count = 0);
      _save();
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = sirajTasbihProgress(_count, _goal);
    final phrases = sirajTasbihPhrases(_custom);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(Icons.touch_app_rounded, color: Colors.white70, size: 18),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'المسبحة',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Text(
              '${sirajArabicDigits(_count)} / ${sirajArabicDigits(_goal)}',
              style: TextStyle(
                color: widget.accent,
                fontSize: 13,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 6,
            backgroundColor: Colors.white12,
            valueColor: AlwaysStoppedAnimation<Color>(widget.accent),
          ),
        ),
        const SizedBox(height: 14),
        Center(
          child: GestureDetector(
            onTap: _tap,
            child: AnimatedScale(
              scale: _animate ? 1.06 : 1.0,
              duration: const Duration(milliseconds: 100),
              child: Container(
                width: 150,
                height: 150,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.accent.withValues(alpha: 0.18),
                  border: Border.all(
                    color: widget.accent.withValues(alpha: 0.5),
                    width: 2,
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _phrase,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      sirajArabicDigits(_count),
                      style: TextStyle(
                        color: widget.accent,
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const Text(
                      'اضغط للتسبيح',
                      style: TextStyle(color: Colors.white54, fontSize: 10),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 36,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: phrases.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, i) {
              final p = phrases[i];
              final selected = p == _phrase;
              return InkWell(
                onTap: () {
                  setState(() => _phrase = p);
                  _save();
                },
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: selected
                        ? widget.accent.withValues(alpha: 0.22)
                        : Colors.white.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: selected
                          ? widget.accent.withValues(alpha: 0.6)
                          : Colors.white12,
                    ),
                  ),
                  child: Text(
                    p,
                    style: TextStyle(
                      color: selected ? widget.accent : Colors.white70,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            const Text(
              'الهدف:',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(width: 8),
            ...sirajTasbihGoalOptions.map(
              (g) => Padding(
                padding: const EdgeInsets.only(left: 6),
                child: InkWell(
                  onTap: () {
                    setState(() => _goal = g);
                    _save();
                  },
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _goal == g
                          ? widget.accent.withValues(alpha: 0.22)
                          : Colors.white.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: _goal == g
                            ? widget.accent.withValues(alpha: 0.6)
                            : Colors.white12,
                      ),
                    ),
                    child: Text(
                      sirajArabicDigits(g),
                      style: TextStyle(
                        color: _goal == g ? widget.accent : Colors.white70,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const Spacer(),
            InkWell(
              onTap: _reset,
              borderRadius: BorderRadius.circular(999),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.delete_outline, size: 14, color: Colors.white),
                    SizedBox(width: 4),
                    Text(
                      'تصفير',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        if (widget.onOpenFull != null) ...[
          const SizedBox(height: 12),
          InkWell(
            onTap: widget.onOpenFull,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white24),
              ),
              child: const Text(
                'فتح المسبحة كاملة',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
