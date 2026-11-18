import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';
import 'package:flutter/services.dart';

import '../data/athkar_data.dart';
import '../models/prayer.dart';
import '../models/zekr.dart';
import '../screens/athkar_screen.dart';
import '../screens/masbaha_screen.dart';
import '../screens/quran_reader_screen.dart';
import '../services/app_state.dart';
import '../services/audio_service.dart';
import '../services/islamic_calendar_service.dart';
import '../services/mushaf_service.dart';
import '../theme/app_colors.dart';
import 'siraj_reminders.dart';
import 'siraj_settings.dart';
import 'siraj_state.dart';

/// Colors of the capsule: black glass with a gold or emerald glow.
class SirajTheme {
  final String id;
  final String name;
  final Color bgTop;
  final Color bgBottom;
  final Color accent;

  /// ARGB of the colorized Android notification.
  final int liveColor;

  const SirajTheme(
    this.id,
    this.name,
    this.bgTop,
    this.bgBottom,
    this.accent,
    this.liveColor,
  );
}

const List<SirajTheme> sirajThemes = [
  SirajTheme(
    'night',
    'ليلي أسود',
    Color(0xFF0A0D12),
    Color(0xFF020304),
    AppColors.amber400,
    0xFF0B0F14,
  ),
  SirajTheme(
    'emerald',
    'زمردي',
    Color(0xFF07382C),
    Color(0xFF031C16),
    AppColors.emerald400,
    0xFF065F46,
  ),
  SirajTheme(
    'gold',
    'ذهبي',
    Color(0xFF2E2108),
    Color(0xFF150E03),
    AppColors.amber300,
    0xFF92400E,
  ),
];

SirajTheme sirajThemeById(String? id) =>
    sirajThemes.firstWhere((t) => t.id == id, orElse: () => sirajThemes.first);

enum _Mode { none, panel, card }

/// Dynamic-Island-style capsule. Mount it inside a Stack (it fills it, but only
/// the capsule and, while expanded, a tap-outside scrim take touches).
/// With [preview] it cycles demo states and never expands (settings page).
class SirajCapsule extends StatefulWidget {
  final bool preview;

  /// Long-press the capsule to open the Siraj tab (AppShell passes this).
  final VoidCallback? onOpenSirajTab;
  const SirajCapsule({super.key, this.preview = false, this.onOpenSirajTab});

  @override
  State<SirajCapsule> createState() => _SirajCapsuleState();
}

class _SirajCapsuleState extends State<SirajCapsule>
    with TickerProviderStateMixin {
  // omega ~ 19 rad/s, zeta ~ 0.62 (same feel as the Windows island).
  static final SpringDescription _spring = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 19.0 * 19.0,
    ratio: 0.62,
  );

  late final AnimationController _w = AnimationController.unbounded(
    vsync: this,
    value: 196,
  );
  late final AnimationController _h = AnimationController.unbounded(
    vsync: this,
    value: 38,
  );
  Size? _lastTarget;

  Timer? _tick;
  Timer? _collapseTimer;
  List<SirajDay> _days = const [];
  String _daysSignature = '';
  SirajPrayer? _nextPrayer;
  late SirajState _state = _idleFallback();
  SirajConfig _config = const SirajConfig();

  _Mode _mode = _Mode.none;
  SirajState? _card;
  final Set<String> _dismissed = {};
  DateTime _lastActive = DateTime.now();
  bool _hidden = false;
  bool _pinned = false;
  bool _ready = false;
  int _demo = 0;
  int _zekrCount = 0;
  String? _zekrKey;

  /// In-progress drag offsets (applied visually until drag end persists them).
  double _dragDx = 0;
  double _dragDy = 0;

  SirajState _idleFallback() => const SirajState(
    kind: SirajKind.idle,
    title: 'سِراج',
    priority: SirajPriority.idle,
    key: 'idle',
  );

  @override
  void initState() {
    super.initState();
    AppState.instance.addListener(_recompute);
    AudioService.instance.addListener(_recompute);
    _recompute();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => _recompute());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _ready = true;
    _syncSize();
  }

  @override
  void dispose() {
    _tick?.cancel();
    _collapseTimer?.cancel();
    AppState.instance.removeListener(_recompute);
    AudioService.instance.removeListener(_recompute);
    _w.dispose();
    _h.dispose();
    super.dispose();
  }

  // ---- State ----

  void _recompute() {
    if (!mounted) return;
    final now = DateTime.now();
    _config = SirajSettings.config();
    final app = AppState.instance;
    final sig =
        '${sirajDateKey(now)}|${app.location.latitude.toStringAsFixed(2)}|${app.location.longitude.toStringAsFixed(2)}';
    if (sig != _daysSignature) {
      _daysSignature = sig;
      _days = buildSirajDays(app.location, now);
    }
    // The next prayer, for the prayer chip: the capsule always shows the
    // prayer time, even while it is showing media, a quote or Athkar.
    _nextPrayer = null;
    for (final d in _days) {
      for (final p in d.prayers) {
        if (p.adhan.isAfter(now)) {
          _nextPrayer = p;
          break;
        }
      }
      if (_nextPrayer != null) break;
    }
    final next = widget.preview
        ? _demoState(now)
        : computeSirajState(
            now: now,
            days: _days,
            config: _config,
            signals: SirajSettings.signals(now),
          );

    if (!widget.preview) {
      final alert =
          (next.kind == SirajKind.adhanNow ||
              next.kind == SirajKind.athkarDue) &&
          !_dismissed.contains(next.key) &&
          _contentVisible(next.kind);
      if (alert && _mode == _Mode.none) {
        _card = next;
        _mode = _Mode.card;
        _lastActive = now;
        _armCollapse(next.kind == SirajKind.adhanNow ? 25 : 30);
      }
      // The expanded card tracks its own state, e.g. the adhan card stays until dismissed.
      if (_mode == _Mode.card && _card != null && _card!.key == next.key) {
        _card = next;
      }
      if (_mode == _Mode.card &&
          _card?.kind == SirajKind.media &&
          next.kind != SirajKind.media) {
        _collapse();
      }
      // Auto-hide: collapse to the thin handle after the configured idle
      // time (or 6s when the idle-seconds setting is 0 / unset).
      final idleSecs = _config.autoHideIdleSecs > 0
          ? _config.autoHideIdleSecs
          : 6;
      _hidden =
          _config.autoHide &&
          _mode == _Mode.none &&
          next.kind == SirajKind.idle &&
          now.difference(_lastActive).inSeconds >= idleSecs;
    } else {
      _hidden = false;
    }
    if (_ready) {
      setState(() => _state = next);
      _syncSize();
    } else {
      _state = next;
    }
  }

  SirajState _demoState(DateTime now) {
    switch (_demo % 6) {
      case 0:
        return SirajState(
          kind: SirajKind.idle,
          title: 'الظهر',
          subtitle: 'بعد',
          target: now.add(const Duration(hours: 1, minutes: 23, seconds: 45)),
          priority: 10,
          key: 'd0',
          prayerId: 'dhuhr',
        );
      case 1:
        return SirajState(
          kind: SirajKind.iqamah,
          title: 'إقامة الظهر',
          subtitle: 'بعد',
          target: now.add(const Duration(minutes: 4, seconds: 12)),
          priority: 90,
          key: 'd1',
          prayerId: 'dhuhr',
        );
      case 2:
        return const SirajState(
          kind: SirajKind.adhanNow,
          title: 'حان الآن موعد أذان العصر',
          subtitle: 'حيّ على الصلاة',
          priority: 100,
          key: 'd2',
          prayerId: 'asr',
        );
      case 3:
        return const SirajState(
          kind: SirajKind.athkarDue,
          title: 'أذكار الصباح',
          subtitle: 'ابدأ يومك بذكر الله',
          priority: 70,
          key: 'd3',
          athkar: SirajAthkar.morning,
        );
      case 4:
        return const SirajState(
          kind: SirajKind.quote,
          title: '﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾',
          subtitle: 'الرعد ٢٨',
          priority: 30,
          key: 'd4',
        );
      default:
        return const SirajState(
          kind: SirajKind.media,
          title: 'سورة الكهف',
          subtitle: 'مشاري العفاسي',
          priority: 50,
          key: 'd5',
        );
    }
  }

  /// Whether a pill kind is allowed to show (content toggles). The prayer
  /// chip is never hidden — see the STANDING RULE in siraj_state.dart.
  bool _contentVisible(SirajKind kind) {
    switch (kind) {
      case SirajKind.athkarDue:
        return _config.showAthkar;
      case SirajKind.quote:
        return _config.showQuotes;
      case SirajKind.media:
        return _config.showMedia;
      default:
        return true;
    }
  }

  /// A pill state with hidden kinds replaced by the idle prayer countdown,
  /// so prayer time stays visible even when every other kind is off.
  SirajState _effectivePillState(SirajState s) {
    if (_contentVisible(s.kind)) return s;
    final p = _nextPrayer;
    return SirajState(
      kind: SirajKind.idle,
      title: p?.label ?? 'سِراج',
      subtitle: 'بعد',
      target: p?.adhan,
      priority: SirajPriority.idle,
      key: 'idle',
      prayerId: p?.id,
    );
  }

  /// Accent override from settings (hex like '#10B981'), or null for the
  /// theme accent.
  Color? _accentOverride() {
    final hex = _config.capsuleAccentHex;
    if (hex == null || hex.isEmpty) return null;
    final clean = hex.replaceFirst('#', '');
    final value = int.tryParse(clean, radix: 16);
    if (value == null) return null;
    return Color(clean.length == 6 ? 0xFF000000 | value : value);
  }

  SirajTheme _effectiveTheme(SirajTheme base) {
    final accent = _accentOverride();
    if (accent == null) return base;
    return SirajTheme(
      base.id,
      base.name,
      base.bgTop,
      base.bgBottom,
      accent,
      base.liveColor,
    );
  }

  /// Persist a finished drag: vertical movement becomes the top offset
  /// (0–80), horizontal position picks the alignment (left/center/right).
  void _finishDrag() {
    final dx = _dragDx;
    final dy = _dragDy;
    if (dx == 0 && dy == 0) return;
    final screenW = MediaQuery.sizeOf(context).width;
    final w = _lastTarget?.width ?? 200;
    final baseCx = switch (_config.capsuleAlign) {
      'left' => w / 2,
      'right' => screenW - w / 2,
      _ => screenW / 2,
    };
    final cx = baseCx + dx;
    final align = cx < screenW / 3
        ? 'left'
        : cx > screenW * 2 / 3
        ? 'right'
        : 'center';
    final top = (_config.capsuleTopOffset + dy).clamp(0.0, 80.0);
    setState(() {
      _dragDx = 0;
      _dragDy = 0;
    });
    final app = AppState.instance;
    if (align != _config.capsuleAlign) {
      app.setText(SirajSettings.capsuleAlignKey, align);
    }
    app.setText(SirajSettings.capsuleTopOffsetKey, top.toStringAsFixed(1));
    _touch();
  }

  // ---- Expansion ----

  void _touch() => _lastActive = DateTime.now();

  void _armCollapse(int secs) {
    _collapseTimer?.cancel();
    if (_pinned) return;
    _collapseTimer = Timer(Duration(seconds: secs), _collapse);
  }

  void _collapse() {
    _collapseTimer?.cancel();
    if (!mounted) return;
    final card = _card;
    if (card != null) _dismissed.add(card.key);
    _touch();
    setState(() {
      _mode = _Mode.none;
      _card = null;
      _pinned = false;
    });
    _syncSize();
  }

  void _openPanel() {
    _touch();
    setState(() {
      _mode = _Mode.panel;
      _card = null;
    });
    _armCollapse(12);
    _syncSize();
  }

  void _openCard(SirajState s) {
    _touch();
    setState(() {
      _mode = _Mode.card;
      _card = s;
    });
    _armCollapse(25);
    _syncSize();
  }

  void _onTap() {
    if (widget.preview) {
      _demo++;
      _recompute();
      return;
    }
    if (_hidden) {
      _touch();
      _recompute();
      return;
    }
    if (_mode != _Mode.none) return;
    switch (_effectivePillState(_state).kind) {
      case SirajKind.adhanNow:
      case SirajKind.athkarDue:
      case SirajKind.media:
        _openCard(_state);
      default:
        _openPanel();
    }
  }

  // ---- Size / spring ----

  Size _targetSize(double screenW) {
    final maxW = screenW - 24;
    if (_hidden) return const Size(56, 7);
    double w;
    double h;
    switch (_mode) {
      case _Mode.none:
        // Configured capsule height (36–64), default 44.
        h = _config.capsuleHeight.clamp(36.0, 64.0);
        switch (_state.kind) {
          case SirajKind.idle:
            w = 200;
          case SirajKind.iqamah:
            w = 236;
          case SirajKind.adhanNow:
            w = 236;
          case SirajKind.athkarDue:
            // Room for the prayer chip + the Athkar title.
            w = 340;
          case SirajKind.quote:
            // Room for the prayer chip + the quote.
            w = 360;
            if (_state.title.length > 34) h = 58;
          case SirajKind.media:
            // Room for the prayer chip + the track title + play button.
            w = 360;
        }
        // Width fraction caps the pill width (default 0.92 ≈ full width).
        w = math.min(w, screenW * _config.capsuleWidthFrac.clamp(0.5, 1.0));
      case _Mode.panel:
        w = 360;
        h = 340;
      case _Mode.card:
        w = 360;
        switch (_card?.kind) {
          case SirajKind.adhanNow:
            h = 168;
          case SirajKind.athkarDue:
            h = 290;
          default:
            h = 138;
        }
    }
    return Size(math.min(w, maxW), h);
  }

  void _syncSize() {
    if (!mounted) return;
    final target = _targetSize(MediaQuery.sizeOf(context).width);
    if (_lastTarget == target) return;
    _lastTarget = target;
    _w.animateWith(
      SpringSimulation(_spring, _w.value, target.width, _w.velocity),
    );
    _h.animateWith(
      SpringSimulation(_spring, _h.value, target.height, _h.velocity),
    );
  }

  // ---- Build ----

  @override
  Widget build(BuildContext context) {
    final theme = _effectiveTheme(sirajThemeById(_config.theme));
    final top = widget.preview
        ? 0.0
        : MediaQuery.paddingOf(context).top +
              6 +
              _config.capsuleTopOffset +
              _dragDy;
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncSize());
    final capsule = _capsule(theme);
    if (widget.preview) return Center(child: capsule);
    final align = switch (_config.capsuleAlign) {
      'left' => Alignment.topLeft,
      'right' => Alignment.topRight,
      _ => Alignment.topCenter,
    };
    return Stack(
      children: [
        if (_mode != _Mode.none)
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _collapse,
            ),
          ),
        Positioned(
          top: top,
          left: 0,
          right: 0,
          child: Align(
            alignment: align,
            child: Transform.translate(
              offset: Offset(_dragDx, 0),
              child: capsule,
            ),
          ),
        ),
      ],
    );
  }

  Widget _capsule(SirajTheme theme) {
    final target = _lastTarget ?? const Size(196, 38);
    // Dragging is only active while the capsule is collapsed: while
    // expanded, the swipe-up-to-collapse gesture keeps working.
    final canDrag =
        !widget.preview && _config.capsuleDraggable && _mode == _Mode.none;
    return GestureDetector(
      onTap: _onTap,
      onLongPress: widget.preview ? null : widget.onOpenSirajTab,
      onPanUpdate: canDrag
          ? (d) => setState(() {
              _dragDx += d.delta.dx;
              _dragDy += d.delta.dy;
            })
          : null,
      onPanEnd: canDrag ? (_) => _finishDrag() : null,
      onVerticalDragEnd: (d) {
        if ((d.primaryVelocity ?? 0) < -150 && _mode != _Mode.none) _collapse();
      },
      child: AnimatedBuilder(
        animation: Listenable.merge([_w, _h]),
        builder: (context, _) {
          final w = math.max(24.0, _w.value);
          final h = math.max(6.0, _h.value);
          final radius = math.min(h / 2, 30.0);
          return Opacity(
            opacity: _config.capsuleOpacity.clamp(0.5, 1.0),
            child: Container(
            width: w,
            height: h,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [theme.bgTop, theme.bgBottom],
              ),
              border: Border.all(
                color: theme.accent.withValues(alpha: _hidden ? 0.5 : 0.2),
                width: 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: theme.accent.withValues(alpha: 0.18),
                  blurRadius: 22,
                  spreadRadius: -2,
                ),
                const BoxShadow(
                  color: Color(0x66000000),
                  blurRadius: 14,
                  offset: Offset(0, 5),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(radius),
              child: OverflowBox(
                alignment: Alignment.topCenter,
                minWidth: target.width,
                maxWidth: target.width,
                minHeight: target.height,
                maxHeight: target.height,
                child: Material(
                  type: MaterialType.transparency,
                  child: _hidden
                      ? const SizedBox.shrink()
                      : AnimatedSwitcher(
                          duration: const Duration(milliseconds: 220),
                          child: KeyedSubtree(
                            key: ValueKey(
                              '${_mode.name}-${_card?.key ?? _state.key}',
                            ),
                            child: _content(theme),
                          ),
                        ),
                ),
              ),
            ),
          ),
          );
        },
      ),
    );
  }

  Widget _content(SirajTheme theme) {
    switch (_mode) {
      case _Mode.none:
        return _pill(theme, _effectivePillState(_state));
      case _Mode.panel:
        return _panel(theme);
      case _Mode.card:
        final c = _card ?? _state;
        switch (c.kind) {
          case SirajKind.adhanNow:
            return _adhanCard(theme, c);
          case SirajKind.athkarDue:
            return _athkarCard(theme, c);
          case SirajKind.media:
            return _mediaCard(theme, c);
          default:
            return _panel(theme);
        }
    }
  }

  // ---- Pill ----

  TextStyle _t(
    double size, {
    Color color = Colors.white,
    FontWeight weight = FontWeight.w800,
    String? font,
  }) => TextStyle(
    fontSize: size,
    fontWeight: weight,
    color: color,
    fontFamily: font,
    height: 1.25,
    fontFeatures: const [FontFeature.tabularFigures()],
  );

  /// "العصر ٠١:٢٣" — the next prayer and its countdown. Shown in every pill
  /// that is not itself about a prayer, so the prayer time is always visible.
  Widget _prayerChip(SirajTheme theme) {
    final p = _nextPrayer;
    if (p == null) return const SizedBox.shrink();
    final left = p.adhan.difference(DateTime.now());
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.mosque_rounded, size: 15, color: theme.accent),
        const SizedBox(width: 5),
        Text(
          '${p.label} ${sirajFormatCountdown(left, _config.countdownFormat)}',
          style: _t(12, color: theme.accent, weight: FontWeight.w900),
        ),
      ],
    );
  }

  Widget _pillDivider() => Container(
    width: 1,
    height: 18,
    margin: const EdgeInsets.symmetric(horizontal: 8),
    color: Colors.white24,
  );

  Widget _pill(SirajTheme theme, SirajState s) {
    final accent = theme.accent;
    Widget icon(IconData i, [Color? c]) =>
        Icon(i, size: 17, color: c ?? accent);
    Widget line;
    switch (s.kind) {
      case SirajKind.idle:
      case SirajKind.iqamah:
        final left = s.target?.difference(DateTime.now());
        final iq = s.kind == SirajKind.iqamah;
        line = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon(
              iq ? Icons.notifications_active_rounded : Icons.nightlight_round,
              iq ? AppColors.emerald400 : accent,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '${s.title} ${s.target == null ? '' : 'بعد '}',
                    ),
                    if (left != null)
                      TextSpan(
                        text: sirajFormatCountdown(
                          left,
                          _config.countdownFormat,
                        ),
                        style: _t(
                          13,
                          color: iq ? AppColors.emerald400 : accent,
                          weight: FontWeight.w900,
                        ),
                      ),
                  ],
                ),
                style: _t(12.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case SirajKind.adhanNow:
        line = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon(Icons.mosque_rounded),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                s.title,
                style: _t(12.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case SirajKind.athkarDue:
        line = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _prayerChip(theme),
            _pillDivider(),
            icon(
              s.athkar == SirajAthkar.morning
                  ? Icons.wb_sunny_rounded
                  : Icons.nights_stay_rounded,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                '${s.title} · اضغط للبدء',
                style: _t(12.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        );
      case SirajKind.quote:
        line = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _prayerChip(theme),
            _pillDivider(),
            icon(Icons.auto_awesome),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                s.title,
                style: _t(14, font: 'Amiri', weight: FontWeight.w700),
                maxLines: s.title.length > 34 ? 2 : 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ),
          ],
        );
      case SirajKind.media:
        final playing = AudioService.instance.playing || widget.preview;
        line = Row(
          children: [
            _prayerChip(theme),
            _pillDivider(),
            icon(Icons.graphic_eq_rounded),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                s.title,
                style: _t(12.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (_config.showPlayer)
              InkResponse(
                radius: 18,
                onTap: widget.preview
                    ? null
                    : () => AudioService.instance.toggle(),
              child: Padding(
                padding: const EdgeInsets.all(6),
                child: Icon(
                  playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                  size: 20,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Center(child: line),
    );
  }

  // ---- Cards ----

  Widget _pinButton(SirajTheme theme) => InkResponse(
    radius: 16,
    onTap: () {
      setState(() => _pinned = !_pinned);
      if (_pinned) {
        _collapseTimer?.cancel();
      } else {
        _armCollapse(10);
      }
    },
    child: Icon(
      _pinned ? Icons.push_pin : Icons.push_pin_outlined,
      size: 16,
      color: _pinned ? theme.accent : Colors.white38,
    ),
  );

  Widget _btn(
    String label,
    VoidCallback onTap, {
    required Color bg,
    Color fg = Colors.white,
    bool outline = false,
  }) => Expanded(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 38,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: outline ? Colors.transparent : bg,
          borderRadius: BorderRadius.circular(16),
          border: outline ? Border.all(color: Colors.white24) : null,
        ),
        child: Text(
          label,
          style: _t(12.5, color: fg, weight: FontWeight.w900),
        ),
      ),
    ),
  );

  Widget _adhanCard(SirajTheme theme, SirajState s) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: theme.accent.withValues(alpha: 0.14),
                  border: Border.all(
                    color: theme.accent.withValues(alpha: 0.4),
                  ),
                ),
                child: Icon(
                  Icons.mosque_rounded,
                  color: theme.accent,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.title, style: _t(15, weight: FontWeight.w900)),
                    const SizedBox(height: 2),
                    Text(
                      s.subtitle,
                      style: _t(
                        12,
                        color: Colors.white60,
                        weight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              _pinButton(theme),
            ],
          ),
          const Spacer(),
          Row(
            children: [
              _btn('صليت ✓', () {
                final id = s.prayerId;
                final date = s.prayerDate;
                if (id != null && date != null && !widget.preview) {
                  AppState.instance.setPrayerStatus(
                    date,
                    id,
                    PrayerStatus.ontime,
                  );
                  }
                _collapse();
              }, bg: AppColors.emerald600),
              const SizedBox(width: 10),
              _btn(
                'لاحقًا',
                _collapse,
                bg: Colors.white10,
                outline: true,
                fg: Colors.white70,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Zekr _counterZekr(SirajAthkar type) {
    final id = type == SirajAthkar.morning ? 'm15' : 'e15';
    final list = type == SirajAthkar.morning ? morningAdhkar : eveningAdhkar;
    return list.firstWhere((z) => z.id == id, orElse: () => list.first);
  }

  Widget _athkarCard(SirajTheme theme, SirajState s) {
    final type = s.athkar ?? SirajAthkar.morning;
    final zekr = _counterZekr(type);
    if (_zekrKey != s.key) {
      _zekrKey = s.key;
      _zekrCount = 0;
    }
    final done = _zekrCount >= zekr.count;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                type == SirajAthkar.morning
                    ? Icons.wb_sunny_rounded
                    : Icons.nights_stay_rounded,
                color: theme.accent,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(s.title, style: _t(15, weight: FontWeight.w900)),
              ),
              _pinButton(theme),
            ],
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Row(
              children: [
                GestureDetector(
                  onTap: () {
                    if (done) return;
                    HapticFeedback.selectionClick();
                    setState(() => _zekrCount++);
                    _touch();
                    _armCollapse(30);
                  },
                  child: SizedBox(
                    width: 78,
                    height: 78,
                    child: CustomPaint(
                      painter: _RingPainter(
                        progress: _zekrCount / zekr.count,
                        color: done ? AppColors.emerald400 : theme.accent,
                      ),
                      child: Center(
                        child: done
                            ? const Icon(
                                Icons.check_rounded,
                                color: AppColors.emerald400,
                                size: 34,
                              )
                            : Text(
                                sirajArabicDigits(zekr.count - _zekrCount),
                                style: _t(
                                  24,
                                  color: Colors.white,
                                  weight: FontWeight.w900,
                                ),
                              ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    zekr.text,
                    style: _t(
                      16,
                      font: 'Amiri',
                      weight: FontWeight.w700,
                      color: Colors.white,
                    ).copyWith(height: 1.7),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _btn(
                'افتح الأذكار كاملة',
                () => _openAthkar(type),
                bg: Colors.white10,
                outline: true,
                fg: Colors.white70,
              ),
              const SizedBox(width: 10),
              _btn('تم', () {
                if (!widget.preview) SirajSettings.markAthkarDone(type);
                _collapse();
              }, bg: AppColors.emerald600),
            ],
          ),
        ],
      ),
    );
  }

  Widget _mediaCard(SirajTheme theme, SirajState s) {
    final audio = AudioService.instance;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: theme.accent.withValues(alpha: 0.14),
              border: Border.all(color: theme.accent.withValues(alpha: 0.4)),
            ),
            child: Icon(Icons.graphic_eq_rounded, color: theme.accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  s.title,
                  style: _t(15, weight: FontWeight.w900),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  s.subtitle,
                  style: _t(12, color: Colors.white60, weight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          InkResponse(
            radius: 28,
            onTap: widget.preview ? null : () => audio.toggle(),
            child: Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: theme.accent,
              ),
              child: Icon(
                audio.playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                color: Colors.black,
                size: 28,
              ),
            ),
          ),
        ],
      ),
    );
  }

  static const _gregMonths = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  Widget _panel(SirajTheme theme) {
    final now = DateTime.now();
    SirajDay? today;
    for (final d in _days) {
      if (sirajSameDay(d.date, now)) today = d;
    }
    final hijri = gregorianToHijri(
      now,
      offsetDays: AppState.instance.number('hijri_offset'),
    );
    final greg =
        '${sirajArabicDigits(now.day)} ${_gregMonths[now.month - 1]} ${sirajArabicDigits(now.year)}';
    final morning = now.isBefore(
      today?.prayer('asr').adhan ?? DateTime(now.year, now.month, now.day, 15),
    );
    final type = morning ? AthkarType.morning : AthkarType.evening;

    SirajPrayer? current;
    SirajPrayer? next;
    if (today != null) {
      for (final p in today.prayers) {
        if (!p.adhan.isAfter(now)) {
          current = p;
        } else {
          next ??= p;
        }
      }
    }

    Widget row(SirajPrayer p) {
      final isCurrent = current?.id == p.id;
      final isNext = next?.id == p.id;
      final done =
          AppState.instance.prayerStatus(now, p.id) != PrayerStatus.none;
      final inIqamah = isCurrent && p.iqamaMins > 0 && now.isBefore(p.iqamah);
      return Container(
        height: 31,
        margin: const EdgeInsets.only(bottom: 3),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: isCurrent
              ? theme.accent.withValues(alpha: 0.14)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: isCurrent
              ? Border.all(color: theme.accent.withValues(alpha: 0.45))
              : null,
        ),
        child: Row(
          children: [
            Icon(
              done ? Icons.check_circle_rounded : Icons.circle_outlined,
              size: 15,
              color: done ? AppColors.emerald400 : Colors.white30,
            ),
            const SizedBox(width: 10),
            Text(
              p.label,
              style: _t(
                13,
                weight: isCurrent ? FontWeight.w900 : FontWeight.w700,
                color: isCurrent ? theme.accent : Colors.white,
              ),
            ),
            if (isNext)
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: Text('التالية', style: _t(10, color: Colors.white54)),
              ),
            const Spacer(),
            if (inIqamah)
              Padding(
                padding: const EdgeInsets.only(left: 10),
                child: Text(
                  'إقامة ${sirajFormatCountdown(p.iqamah.difference(now), _config.countdownFormat)}',
                  style: _t(11, color: AppColors.emerald400),
                ),
              ),
            Text(
              sirajClock(p.adhan),
              style: _t(12.5, color: Colors.white70, weight: FontWeight.w700),
            ),
          ],
        ),
      );
    }

    Widget action(IconData icon, String label, VoidCallback onTap) => Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: theme.accent),
              const SizedBox(height: 2),
              Text(label, style: _t(10, weight: FontWeight.w800), maxLines: 1),
            ],
          ),
        ),
      ),
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: Row(
              children: [
                Icon(Icons.nightlight_round, color: theme.accent, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sirajArabicDigits(hijri.label),
                        style: _t(13.5, weight: FontWeight.w900),
                      ),
                      Text(
                        greg,
                        style: _t(
                          11,
                          color: Colors.white54,
                          weight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                _pinButton(theme),
              ],
            ),
          ),
          const SizedBox(height: 8),
          if (today != null) ...today.prayers.map(row),
          const Spacer(),
          Row(
            children: [
              action(
                morning ? Icons.wb_sunny_rounded : Icons.nights_stay_rounded,
                morning ? 'أذكار الصباح' : 'أذكار المساء',
                () => _openAthkar(
                  type == AthkarType.morning
                      ? SirajAthkar.morning
                      : SirajAthkar.evening,
                ),
              ),
              const SizedBox(width: 8),
              action(Icons.menu_book_rounded, 'تابع المصحف', _openMushaf),
              const SizedBox(width: 8),
              action(Icons.touch_app_rounded, 'المسبحة', () {
                _collapse();
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const MasbahaScreen()),
                );
              }),
            ],
          ),
        ],
      ),
    );
  }

  void _openAthkar(SirajAthkar type) {
    final nav = Navigator.of(context);
    _collapse();
    nav.push(
      MaterialPageRoute(
        builder: (_) => AthkarScreen(
          type: type == SirajAthkar.morning
              ? AthkarType.morning
              : AthkarType.evening,
        ),
      ),
    );
  }

  Future<void> _openMushaf() async {
    final nav = Navigator.of(context);
    _collapse();
    final page = await MushafService.instance.lastReadPage() ?? 1;
    nav.push(
      MaterialPageRoute(builder: (_) => QuranReaderScreen(initialPage: page)),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double progress;
  final Color color;
  const _RingPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final c = rect.center;
    final r = size.shortestSide / 2 - 5;
    final base = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..color = Colors.white.withValues(alpha: 0.12);
    final arc = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..color = color;
    canvas.drawCircle(c, r, base);
    canvas.drawArc(
      Rect.fromCircle(center: c, radius: r),
      -math.pi / 2,
      2 * math.pi * progress.clamp(0.0, 1.0),
      false,
      arc,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.progress != progress || old.color != color;
}
