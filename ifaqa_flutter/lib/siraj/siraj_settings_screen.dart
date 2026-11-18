import 'dart:async';

import 'package:flutter/material.dart';

import '../services/app_state.dart';
import '../services/reminder_plan.dart';
import '../services/reminder_service.dart';
import '../theme/app_colors.dart';
import '../widgets/toggle_item.dart';
import 'siraj_capsule.dart';
import 'siraj_live_service.dart';
import 'siraj_overlay.dart';
import 'siraj_reminders.dart';
import 'siraj_settings.dart';
import 'siraj_state.dart';

class SirajSettingsScreen extends StatefulWidget {
  const SirajSettingsScreen({super.key});

  @override
  State<SirajSettingsScreen> createState() => _SirajSettingsScreenState();
}

class _SirajSettingsScreenState extends State<SirajSettingsScreen>
    with WidgetsBindingObserver {
  final AppState _state = AppState.instance;

  final List<SirajWird> _wirds = SirajSettings.wirds();
  final Map<String, TextEditingController> _wirdNameControllers = {};

  /// Whether the user enabled notification access (heads-up dodge).
  bool _notifAccess = false;

  @override
  void initState() {
    super.initState();
    _state.addListener(_changed);
    WidgetsBinding.instance.addObserver(this);
    unawaited(_refreshNotifAccess());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _state.removeListener(_changed);
    for (final c in _wirdNameControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // The overlay permission grant happens in system Settings; when the
      // user comes back, start the overlay if the toggle is on.
      unawaited(_syncOverlayWithSettings());
      // Same for the notification-access grant (heads-up dodge).
      unawaited(_refreshNotifAccess());
    }
  }

  /// Refreshes whether notification access is granted (heads-up dodge).
  Future<void> _refreshNotifAccess() async {
    if (!SirajOverlayService.supported) return;
    final granted = await SirajOverlayService.instance.hasNotificationAccess();
    if (mounted) setState(() => _notifAccess = granted);
  }

  /// Starts/stops the native overlay to match the saved toggle, and repairs
  /// the toggle when the permission is gone (e.g. revoked in Settings).
  Future<void> _syncOverlayWithSettings() async {
    if (!SirajOverlayService.supported) return;
    final svc = SirajOverlayService.instance;
    final enabled =
        _state.flag(SirajSettings.overlayEnabledKey, fallback: false);
    if (!enabled) {
      if (await svc.isShowing) await svc.stopOverlay();
      return;
    }
    if (!await svc.hasPermission()) {
      _state.setFlag(SirajSettings.overlayEnabledKey, false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'إذن «العرض فوق التطبيقات الأخرى» غير مفعّل — فعّله من إعدادات أندرويد.',
            ),
          ),
        );
      }
      return;
    }
    if (!await svc.isShowing) await svc.startOverlay();
  }

  /// Called after the overlay toggle is flipped (the flag is already saved
  /// by [_flag] at this point).
  Future<void> _onOverlayToggleChanged(bool on) async {
    if (!SirajOverlayService.supported) return;
    final svc = SirajOverlayService.instance;
    if (!on) {
      await svc.stopOverlay();
      return;
    }
    if (!await svc.hasPermission()) {
      // Opens system Settings; the grant happens outside the app and the
      // resume handler above starts the overlay once it is granted. The
      // toggle stays on in the meantime.
      await svc.requestPermission();
      return;
    }
    final started = await svc.startOverlay();
    if (!started && mounted) {
      _state.setFlag(SirajSettings.overlayEnabledKey, false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'تعذّر إظهار سِراج فوق التطبيقات — تأكد من الإذن وحاول مجددًا.',
          ),
        ),
      );
    }
  }

  TextEditingController _nameController(SirajWird w) =>
      _wirdNameControllers.putIfAbsent(
        w.id,
        () => TextEditingController(text: w.name),
      );

  void _saveWirds() {
    SirajSettings.saveWirds(_wirds);
    setState(() {});
  }

  void _updateWird(String id, SirajWird Function(SirajWird) update) {
    final i = _wirds.indexWhere((w) => w.id == id);
    if (i < 0) return;
    _wirds[i] = update(_wirds[i]);
    _saveWirds();
  }

  // ---- Generic helpers (same look as the rest of the app) ----

  Widget _flag(
    String label,
    IconData icon,
    String key, {
    bool fallback = true,
    void Function(bool)? onChanged,
  }) {
    final on = _state.flag(key, fallback: fallback);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ToggleItem(
        label: label,
        isOn: on,
        icon: icon,
        onTap: () {
          _state.setFlag(key, !on);
          onChanged?.call(!on);
        },
      ),
    );
  }

  Widget _card(String title, IconData icon, List<Widget> children) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.violet500),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: AppColors.slate800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  Widget _choice<T>({
    required List<(T, String)> options,
    required T selected,
    required ValueChanged<T> onPick,
  }) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final (value, label) in options)
          ChoiceChip(
            label: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 12,
                color: selected == value ? Colors.white : AppColors.slate700,
              ),
            ),
            selected: selected == value,
            selectedColor: AppColors.violet600,
            showCheckmark: false,
            onSelected: (_) => onPick(value),
          ),
      ],
    );
  }

  /// One gesture → action row for the gestures card: the label plus the
  /// five action choices (see [sirajGestureActions]).
  Widget _gestureRow({
    required String label,
    required String selected,
    required String key,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel(label),
        _choice<String>(
          options: const [
            ('prayer_times', 'مواقيت اليوم'),
            ('siraj_tab', 'تبويب سِراج'),
            ('play_pause', 'تشغيل/إيقاف'),
            ('dismiss', 'إخفاء التنبيه'),
            ('none', 'بدون'),
          ],
          selected: selected,
          onPick: (v) => _state.setText(key, v),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _note(String text, {IconData icon = Icons.info_outline}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.slate500),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.slate600,
                height: 1.6,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sliderRow({
    required String label,
    required double value,
    required double min,
    required double max,
    required int divisions,
    required String display,
    required ValueChanged<double> onChanged,
    bool enabled = true,
  }) {
    final row = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: AppColors.slate700,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.violet600.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                display,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: AppColors.violet700,
                ),
              ),
            ),
          ],
        ),
        Slider(
          value: value.clamp(min, max),
          min: min,
          max: max,
          divisions: divisions,
          activeColor: AppColors.violet600,
          onChanged: enabled ? onChanged : null,
        ),
      ],
    );
    if (enabled) return Padding(padding: const EdgeInsets.only(bottom: 4), child: row);
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Opacity(opacity: 0.45, child: IgnorePointer(child: row)),
    );
  }

  Widget _stepper({
    required String label,
    required int value,
    required int min,
    required int max,
    required int step,
    required String display,
    required ValueChanged<int> onChanged,
    bool enabled = true,
  }) {
    Widget btn(IconData icon, VoidCallback? onTap) => InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 36,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppColors.slate100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, size: 18, color: AppColors.slate700),
      ),
    );
    final row = Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: AppColors.slate700,
              ),
            ),
          ),
          btn(
            Icons.remove,
            enabled && value > min
                ? () => onChanged((value - step).clamp(min, max))
                : null,
          ),
          SizedBox(
            width: 64,
            child: Text(
              display,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: AppColors.slate800,
              ),
            ),
          ),
          btn(
            Icons.add,
            enabled && value < max
                ? () => onChanged((value + step).clamp(min, max))
                : null,
          ),
        ],
      ),
    );
    if (enabled) return row;
    return Opacity(opacity: 0.45, child: IgnorePointer(child: row));
  }

  Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          color: AppColors.slate500,
        ),
      ),
    );
  }

  // ---- Athkar time pickers ----

  String _clockOfMinutes(int minutes) => sirajClock(
    DateTime(2000, 1, 1, minutes ~/ 60, minutes % 60),
  );

  Future<void> _pickAthkarTime({required bool morning}) async {
    final config = SirajSettings.config();
    final current = morning
        ? config.morningAthkarMinutes
        : config.eveningAthkarMinutes;
    final initial = current != null
        ? TimeOfDay(hour: current ~/ 60, minute: current % 60)
        : TimeOfDay.now();
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
    );
    if (picked == null) return;
    _state.setText(
      morning
          ? SirajSettings.morningAthkarMinutesKey
          : SirajSettings.eveningAthkarMinutesKey,
      '${picked.hour * 60 + picked.minute}',
    );
  }

  Widget _athkarTimeRow({
    required String label,
    required IconData icon,
    required int? fixedMinutes,
    required int defaultMinutes,
    required String defaultNote,
    required bool morning,
  }) {
    final shown = fixedMinutes ?? defaultMinutes;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                icon,
                size: 18,
                color: AppColors.violet600,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: AppColors.slate700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      fixedMinutes == null
                          ? 'الافتراضي: $defaultNote (${_clockOfMinutes(defaultMinutes)} اليوم)'
                          : 'وقت مخصّص: ${_clockOfMinutes(shown)}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.slate500,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => _pickAthkarTime(morning: morning),
                child: Text(
                  _clockOfMinutes(shown),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: AppColors.violet700,
                  ),
                ),
              ),
              if (fixedMinutes != null)
                TextButton(
                  onPressed: () => _state.setText(
                    morning
                        ? SirajSettings.morningAthkarMinutesKey
                        : SirajSettings.eveningAthkarMinutesKey,
                    '',
                  ),
                  child: const Text(
                    'افتراضي',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: AppColors.slate500,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // ---- Wirds editor ----

  Future<void> _pickFixedTime(SirajWird w) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked == null) return;
    final minutes = picked.hour * 60 + picked.minute;
    _updateWird(
      w.id,
      (old) {
        final times = {...old.fixedMinutes, minutes}.toList()..sort();
        return SirajWird(
          id: old.id,
          name: old.name,
          kind: old.kind,
          enabled: old.enabled,
          afterPrayers: old.afterPrayers,
          fixedMinutes: times,
        );
      },
    );
  }

  Widget _wirdCard(SirajWird w) {
    const kindOptions = [
      (SirajWirdKind.memorization, 'حفظ'),
      (SirajWirdKind.review, 'مراجعة'),
      (SirajWirdKind.reading, 'قراءة'),
    ];
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _nameController(w),
                  decoration: const InputDecoration(
                    hintText: 'اسم الورد',
                    border: InputBorder.none,
                    isDense: true,
                  ),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: AppColors.slate800,
                  ),
                  onChanged: (v) => _updateWird(
                    w.id,
                    (old) => SirajWird(
                      id: old.id,
                      name: v,
                      kind: old.kind,
                      enabled: old.enabled,
                      afterPrayers: old.afterPrayers,
                      fixedMinutes: old.fixedMinutes,
                    ),
                  ),
                ),
              ),
              Switch(
                value: w.enabled,
                activeTrackColor: AppColors.violet600,
                onChanged: (v) => _updateWird(
                  w.id,
                  (old) => SirajWird(
                    id: old.id,
                    name: old.name,
                    kind: old.kind,
                    enabled: v,
                    afterPrayers: old.afterPrayers,
                    fixedMinutes: old.fixedMinutes,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(
                  Icons.delete_outline,
                  color: AppColors.rose500,
                  size: 20,
                ),
                onPressed: () {
                  _wirds.removeWhere((x) => x.id == w.id);
                  _wirdNameControllers.remove(w.id)?.dispose();
                  _saveWirds();
                },
              ),
            ],
          ),
          const SizedBox(height: 4),
          _choice<SirajWirdKind>(
            options: kindOptions,
            selected: w.kind,
            onPick: (k) => _updateWird(
              w.id,
              (old) => SirajWird(
                id: old.id,
                name: old.name,
                kind: k,
                enabled: old.enabled,
                afterPrayers: old.afterPrayers,
                fixedMinutes: old.fixedMinutes,
              ),
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'بعد الصلاة',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              color: AppColors.slate500,
            ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final id in prayerIds)
                FilterChip(
                  label: Text(
                    sirajPrayerLabel(id),
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                      color: w.afterPrayers.contains(id)
                          ? Colors.white
                          : AppColors.slate700,
                    ),
                  ),
                  selected: w.afterPrayers.contains(id),
                  selectedColor: AppColors.violet600,
                  showCheckmark: false,
                  onSelected: (_) => _updateWird(
                    w.id,
                    (old) {
                      final list = [...old.afterPrayers];
                      if (list.contains(id)) {
                        list.remove(id);
                      } else {
                        list.add(id);
                      }
                      return SirajWird(
                        id: old.id,
                        name: old.name,
                        kind: old.kind,
                        enabled: old.enabled,
                        afterPrayers: list,
                        fixedMinutes: old.fixedMinutes,
                      );
                    },
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'أوقات ثابتة',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              color: AppColors.slate500,
            ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final m in w.fixedMinutes)
                Chip(
                  label: Text(
                    _clockOfMinutes(m),
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                    ),
                  ),
                  deleteIcon: const Icon(Icons.close, size: 14),
                  onDeleted: () => _updateWird(
                    w.id,
                    (old) => SirajWird(
                      id: old.id,
                      name: old.name,
                      kind: old.kind,
                      enabled: old.enabled,
                      afterPrayers: old.afterPrayers,
                      fixedMinutes: old.fixedMinutes
                          .where((x) => x != m)
                          .toList(),
                    ),
                  ),
                ),
              ActionChip(
                avatar: const Icon(Icons.add, size: 16),
                label: const Text(
                  'أضف وقتًا',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11),
                ),
                onPressed: () => _pickFixedTime(w),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final config = SirajSettings.config();
    final androidLive = ReminderService.supported;
    final now = DateTime.now();
    final days = buildSirajDays(_state.location, now);
    final today = days.firstWhere(
      (d) => sirajSameDay(d.date, now),
      orElse: () => days.first,
    );
    final morningDefault = today
        .prayer('fajr')
        .adhan
        .add(athkarMorningAfterFajr);
    final eveningDefault = today
        .prayer('asr')
        .adhan
        .add(athkarEveningAfterAsr);
    final morningDefaultMins =
        morningDefault.hour * 60 + morningDefault.minute;
    final eveningDefaultMins =
        eveningDefault.hour * 60 + eveningDefault.minute;

    const accentOptions = <(String?, String, Color)>[
      (null, 'افتراضي', AppColors.amber400),
      ('#F59E0B', 'ذهبي', Color(0xFFF59E0B)),
      ('#10B981', 'زمردي', Color(0xFF10B981)),
      ('#8B5CF6', 'بنفسجي', Color(0xFF8B5CF6)),
      ('#F43F5E', 'وردي', Color(0xFFF43F5E)),
      ('#0EA5E9', 'سماوي', Color(0xFF0EA5E9)),
    ];
    final currentAccent =
        (config.capsuleAccentHex ?? '').isEmpty
            ? null
            : config.capsuleAccentHex;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(
          title: const Text(
            'إعدادات سِراج',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
          backgroundColor: AppColors.slate50,
          surfaceTintColor: Colors.transparent,
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
          children: [
            Container(
              height: 120,
              margin: const EdgeInsets.only(bottom: 6),
              decoration: BoxDecoration(
                color: AppColors.slate200.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Stack(
                children: [
                  Positioned(
                    top: 0,
                    right: 0,
                    left: 0,
                    bottom: 0,
                    child: Center(child: SirajCapsule(preview: true)),
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(bottom: 14),
              child: Text(
                'معاينة حيّة: المس الكبسولة لتبديل الحالات',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: AppColors.slate500,
                ),
              ),
            ),

            // (a) Capsule appearance
            _card('مظهر الكبسولة', Icons.tune, [
              _sectionLabel('الحجم'),
              _choice<String>(
                options: const [
                  ('small', 'صغير'),
                  ('normal', 'عادي'),
                  ('large', 'كبير'),
                ],
                selected: config.capsuleSize,
                onPick: (v) =>
                    _state.setText(SirajSettings.capsuleSizeKey, v),
              ),
              const SizedBox(height: 12),
              _sectionLabel('الشكل'),
              _choice<String>(
                options: const [
                  ('pill', 'كبسولة'),
                  ('circle', 'دائرة'),
                ],
                selected: config.capsuleShape,
                onPick: (v) =>
                    _state.setText(SirajSettings.capsuleShapeKey, v),
              ),
              const SizedBox(height: 12),
              _note(
                'الدائرة شارة صغيرة مستديرة — وقت الصلاة القادمة والعدّ التنازلي فقط — تناسب وضعها أعلى الشاشة حول فتحة الكاميرا الأمامية.',
              ),
              const SizedBox(height: 12),
              _sectionLabel('الحركة'),
              _choice<String>(
                options: const [
                  ('fade', 'تلاشي وتكبير'),
                  ('slide', 'انزلاق'),
                  ('off', 'بدون'),
                ],
                selected: config.capsuleAnimation,
                onPick: (v) =>
                    _state.setText(SirajSettings.capsuleAnimationKey, v),
              ),
              const SizedBox(height: 12),
              _sliderRow(
                label: 'عرض الكبسولة',
                value: config.capsuleWidthFrac,
                min: 0.5,
                max: 1.0,
                divisions: 50,
                display: '${(config.capsuleWidthFrac * 100).round()}٪',
                onChanged: (v) => _state.setText(
                  SirajSettings.capsuleWidthFracKey,
                  v.toStringAsFixed(2),
                ),
              ),
              _stepper(
                label: 'ارتفاع الكبسولة',
                value: config.capsuleHeight.round(),
                min: 36,
                max: 64,
                step: 2,
                display: '${config.capsuleHeight.round()}',
                onChanged: (v) => _state.setText(
                  SirajSettings.capsuleHeightKey,
                  v.toString(),
                ),
              ),
              _sectionLabel('المحاذاة'),
              _choice<String>(
                options: const [
                  ('right', 'يمين'),
                  ('center', 'وسط'),
                  ('left', 'يسار'),
                ],
                selected: config.capsuleAlign,
                onPick: (v) =>
                    _state.setText(SirajSettings.capsuleAlignKey, v),
              ),
              const SizedBox(height: 12),
              _sliderRow(
                label: 'الإزاحة من الأعلى',
                value: config.capsuleTopOffset,
                min: 0,
                max: 80,
                divisions: 16,
                display: '${config.capsuleTopOffset.round()}',
                onChanged: (v) => _state.setText(
                  SirajSettings.capsuleTopOffsetKey,
                  v.toStringAsFixed(0),
                ),
              ),
              _flag(
                'السحب لتغيير موضع الكبسولة',
                Icons.drag_indicator,
                SirajSettings.capsuleDraggableKey,
              ),
              _sliderRow(
                label: 'شفافية الكبسولة',
                value: config.capsuleOpacity,
                min: 0.5,
                max: 1.0,
                divisions: 10,
                display: '${(config.capsuleOpacity * 100).round()}٪',
                onChanged: (v) => _state.setText(
                  SirajSettings.capsuleOpacityKey,
                  v.toStringAsFixed(2),
                ),
              ),
              _sectionLabel('لون التمييز'),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final (hex, label, color) in accentOptions)
                    InkWell(
                      onTap: () => _state.setText(
                        SirajSettings.capsuleAccentHexKey,
                        hex ?? '',
                      ),
                      borderRadius: BorderRadius.circular(999),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: currentAccent == hex
                                    ? AppColors.slate900
                                    : Colors.transparent,
                                width: 2,
                              ),
                            ),
                            child: currentAccent == hex
                                ? const Icon(
                                    Icons.check,
                                    size: 16,
                                    color: Colors.white,
                                  )
                                : null,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            label,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: AppColors.slate600,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              _sectionLabel('صيغة العدّ التنازلي'),
              _choice<String>(
                options: const [
                  ('min_sec', 'دقائق وثوانٍ'),
                  ('min_only', 'دقائق فقط'),
                ],
                selected: config.countdownFormat,
                onPick: (v) =>
                    _state.setText(SirajSettings.countdownFormatKey, v),
              ),
              const SizedBox(height: 12),
              _sectionLabel('محتوى الكبسولة'),
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: AppColors.emerald50,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.mosque_rounded,
                      size: 18,
                      color: AppColors.emerald600,
                    ),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'وقت الصلاة يظهر دائمًا في الكبسولة ولا يمكن إخفاؤه',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: AppColors.emerald700,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.lock_outline,
                      size: 16,
                      color: AppColors.emerald600,
                    ),
                  ],
                ),
              ),
              _flag(
                'أذكار الصباح والمساء',
                Icons.wb_sunny,
                SirajSettings.showAthkarKey,
              ),
              _flag(
                'النفحات القرآنية والحديثية',
                Icons.auto_awesome,
                SirajSettings.showQuotesKey,
              ),
              _flag(
                'التلاوة الجارية',
                Icons.graphic_eq,
                SirajSettings.showMediaKey,
              ),
              _flag(
                'أزرار المشغّل',
                Icons.play_circle,
                SirajSettings.showPlayerKey,
              ),
              _stepper(
                label: 'الإخفاء بعد عدم التفاعل (ثانية)',
                value: config.autoHideIdleSecs,
                min: 0,
                max: 120,
                step: 5,
                display: config.autoHideIdleSecs == 0
                    ? 'افتراضي (٦ ث)'
                    : '${config.autoHideIdleSecs} ث',
                enabled: config.autoHide,
                onChanged: (v) => _state.setNumber(
                  SirajSettings.autoHideIdleSecsKey,
                  v,
                ),
              ),
              if (!config.autoHide)
                _note(
                  'فعّل «الإخفاء التلقائي» من قسم «عام» بالأسفل لتحديد مدة الخمول قبل أن تنكمش الكبسولة إلى مقبض رفيع.',
                ),
            ]),

            // (a2) Capsule gestures
            _card('إيماءات الكبسولة', Icons.touch_app, [
              _note(
                'الضغطة تفتح مواقيت اليوم، والضغطة المطولة تفتح تبويب سِراج. السحب يعمل فقط والكبسولة مصغّرة؛ وأثناء التوسيع السحب لأعلى يغلقها. فوق التطبيقات الأخرى تعمل الضغطة والضغطة المطولة فقط (لفتح التطبيق)، لأن السحب هناك هو تحريك الجزيرة.',
              ),
              _gestureRow(
                label: 'ضغطة',
                selected: config.gestureTap,
                key: SirajSettings.gestureTapKey,
              ),
              _gestureRow(
                label: 'ضغطتان',
                selected: config.gestureDoubleTap,
                key: SirajSettings.gestureDoubleTapKey,
              ),
              _gestureRow(
                label: 'ضغطة مطولة',
                selected: config.gestureLongPress,
                key: SirajSettings.gestureLongPressKey,
              ),
              _gestureRow(
                label: 'سحب لأعلى',
                selected: config.gestureSwipeUp,
                key: SirajSettings.gestureSwipeUpKey,
              ),
              _gestureRow(
                label: 'سحب لأسفل',
                selected: config.gestureSwipeDown,
                key: SirajSettings.gestureSwipeDownKey,
              ),
              _gestureRow(
                label: 'سحب لليسار',
                selected: config.gestureSwipeLeft,
                key: SirajSettings.gestureSwipeLeftKey,
              ),
              _gestureRow(
                label: 'سحب لليمين',
                selected: config.gestureSwipeRight,
                key: SirajSettings.gestureSwipeRightKey,
              ),
            ]),

            // (b) Prayer & adhan
            _card('الصلاة والأذان', Icons.mosque, [
              _sectionLabel('صوت الأذان'),
              _choice<String>(
                options: [for (final s in alarmSounds) (s.id, s.label)],
                selected: config.adhanSound,
                onPick: (v) =>
                    _state.setText(SirajSettings.adhanSoundKey, v),
              ),
              const SizedBox(height: 12),
              _stepper(
                label: 'تذكير قبل الأذان (دقيقة)',
                value: config.remindBeforeMins,
                min: 0,
                max: 60,
                step: 5,
                display: '${config.remindBeforeMins} د',
                onChanged: (v) => _state.setNumber(
                  SirajSettings.remindBeforeMinsKey,
                  v,
                ),
              ),
              _stepper(
                label: 'تذكير بعد الأذان (دقيقة)',
                value: config.remindAfterMins,
                min: 0,
                max: 60,
                step: 5,
                display: '${config.remindAfterMins} د',
                onChanged: (v) =>
                    _state.setNumber(SirajSettings.remindAfterMinsKey, v),
              ),
            ]),

            // (c) Athkar reminders
            _card('تذكير الأذكار', Icons.wb_sunny, [
              _athkarTimeRow(
                label: 'أذكار الصباح',
                icon: Icons.wb_sunny_rounded,
                fixedMinutes: config.morningAthkarMinutes,
                defaultMinutes: morningDefaultMins,
                defaultNote: 'الفجر + ٢٠ دقيقة',
                morning: true,
              ),
              _athkarTimeRow(
                label: 'أذكار المساء',
                icon: Icons.nights_stay_rounded,
                fixedMinutes: config.eveningAthkarMinutes,
                defaultMinutes: eveningDefaultMins,
                defaultNote: 'العصر + ١٥ دقيقة',
                morning: false,
              ),
              _sectionLabel('مدة التأجيل من الإشعار'),
              _choice<int>(
                options: const [
                  (10, '١٠ دقائق'),
                  (15, '١٥ دقيقة'),
                  (30, '٣٠ دقيقة'),
                  (60, 'ساعة'),
                ],
                selected: config.athkarSnoozeMinutes,
                onPick: (v) => _state.setNumber(
                  SirajSettings.athkarSnoozeMinutesKey,
                  v,
                ),
              ),
              _note(
                '«اقرأ لاحقًا» من الإشعار يعيد التذكير بعد هذه المدة؛ ومن الجزيرة تختار المدة (١٠/١٥/٣٠/٦٠ دقيقة) كل مرة.',
              ),
              _note(
                'اضغط على الوقت لتغييره، واضغط «افتراضي» للعودة إلى الوقت المرتبط بالصلاة.',
              ),
            ]),

            // (d) Quran wirds
            _card('أوراد القرآن', Icons.menu_book, [
              if (_wirds.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(bottom: 10),
                  child: Text(
                    'لا توجد أوراد بعد — أضف وردك الأول بالأسفل.',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.slate500,
                    ),
                  ),
                ),
              ..._wirds.map(_wirdCard),
              OutlinedButton.icon(
                onPressed: () {
                  _wirds.add(
                    SirajWird(
                      id: 'wird-${DateTime.now().millisecondsSinceEpoch}',
                      name: 'ورد جديد',
                    ),
                  );
                  _saveWirds();
                },
                icon: const Icon(Icons.add, size: 18),
                label: const Text(
                  'أضف وردًا',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(height: 8),
              _note(
                'يأتي تذكير الورد بعد الصلوات المحددة بـ ١٥ دقيقة، أو في الأوقات الثابتة التي تضيفها.',
              ),
            ]),

            // (e) Player
            _card('المشغّل', Icons.headphones, [
              _sectionLabel('مصدر الصوت'),
              _choice<String>(
                options: const [
                  ('app', 'من التطبيق'),
                  ('device', 'من الجهاز'),
                ],
                selected: config.playerSource,
                onPick: (v) =>
                    _state.setText(SirajSettings.playerSourceKey, v),
              ),
              const SizedBox(height: 12),
              _flag(
                'تشغيل موسيقى الجهاز',
                Icons.music_note,
                SirajSettings.deviceMusicEnabledKey,
                fallback: false,
              ),
              _note(
                'تشغيل موسيقى الجهاز يحتاج إذن الوصول إلى ملفات الصوت على جهازك.',
              ),
            ]),

            // (f) Overlay over other apps
            _card('فوق التطبيقات الأخرى', Icons.layers, [
              _flag(
                'إظهار سِراج فوق التطبيقات الأخرى',
                Icons.picture_in_picture,
                SirajSettings.overlayEnabledKey,
                fallback: false,
                onChanged: _onOverlayToggleChanged,
              ),
              _flag(
                'إظهاره أيضًا عند إغلاق التطبيق',
                Icons.phone_android,
                SirajSettings.overlayShowWhenAppClosedKey,
                fallback: false,
              ),
              _note(
                'الظهور فوق التطبيقات يحتاج إذن «العرض فوق التطبيقات الأخرى» في إعدادات أندرويد، ويعمل فقط مع الطبقة الأصلية (native overlay) — بدونه لن تظهر الكبسولة خارج التطبيق.',
                icon: Icons.warning_amber_rounded,
              ),
              _note(
                'تنبيهات النظام (مثل واتساب) تظهر فوق أي تطبيق — لا يمكن رسم الكبسولة فوقها، فهي من النظام نفسه. عند تفعيل «الوصول للإشعارات» تنزل الجزيرة تلقائيًا تحت التنبيه أثناء ظهوره ثم ترجع لمكانها، والعدّ التنازلي لا يختفي أبدًا.',
                icon: Icons.notifications_active,
              ),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _notifAccess
                          ? 'الوصول للإشعارات: مفعّل'
                          : 'الوصول للإشعارات: غير مفعّل',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.slate600,
                      ),
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () async {
                      if (!SirajOverlayService.supported) return;
                      await SirajOverlayService.instance
                          .openNotificationAccessSettings();
                      // The grant happens in system Settings; the status
                      // refreshes when the app resumes.
                    },
                    icon: const Icon(Icons.open_in_new, size: 18),
                    label: const Text(
                      'فتح إعدادات الوصول للإشعارات',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
            ]),

            // Existing sections (kept as-is)
            _card('عام', Icons.tune, [
              _flag(
                'تفعيل سِراج',
                Icons.nightlight_round,
                SirajSettings.enabledKey,
              ),
              _flag(
                'الظهور داخل التطبيق',
                Icons.phone_android,
                SirajSettings.inAppKey,
              ),
              if (androidLive)
                _flag(
                  'إشعار سِراج الحيّ (شريط الحالة وشاشة القفل)',
                  Icons.notifications_active,
                  SirajSettings.liveKey,
                  onChanged: (on) {
                    if (on) SirajLiveService.instance.ensurePermission();
                  },
                ),
              _flag(
                'الإخفاء التلقائي (يتحوّل إلى مقبض رفيع)',
                Icons.vertical_align_top,
                SirajSettings.autoHideKey,
                fallback: false,
              ),
              _flag(
                'عدم الإزعاج (العدّ التنازلي فقط)',
                Icons.do_not_disturb_on,
                SirajSettings.dndKey,
                fallback: false,
              ),
            ]),
            _card('الثيم', Icons.palette, [
              _choice<String>(
                options: [for (final t in sirajThemes) (t.id, t.name)],
                selected: config.theme,
                onPick: (id) => _state.setText(SirajSettings.themeKey, id),
              ),
            ]),
            _card('أنواع التنبيهات', Icons.notifications, [
              _flag(
                'أوقات الصلاة (بطاقة الأذان)',
                Icons.mosque,
                SirajSettings.kPrayerKey,
              ),
              _flag(
                'الإقامة (عدّاد ما بين الأذان والإقامة)',
                Icons.timer,
                SirajSettings.kIqamahKey,
              ),
              _flag(
                'أذكار الصباح والمساء',
                Icons.wb_sunny,
                SirajSettings.kAthkarKey,
              ),
              _flag(
                'المشغّل (التلاوة الجارية)',
                Icons.graphic_eq,
                SirajSettings.kMediaKey,
              ),
              _flag(
                'نفحات قرآنية وحديثية',
                Icons.auto_awesome,
                SirajSettings.kQuotesKey,
              ),
            ]),
            _card('مصدر النفحات', Icons.menu_book, [
              _choice<String>(
                options: const [
                  ('quran', 'قرآن'),
                  ('hadith', 'حديث'),
                  ('both', 'الاثنان'),
                ],
                selected: _state.text(SirajSettings.quoteSrcKey) ?? 'both',
                onPick: (v) => _state.setText(SirajSettings.quoteSrcKey, v),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
