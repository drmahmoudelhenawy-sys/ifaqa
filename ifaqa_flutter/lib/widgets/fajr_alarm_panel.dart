import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../models/prayer_time_info.dart';
import '../services/app_state.dart';
import '../services/reminder_plan.dart';
import '../services/reminder_service.dart';
import '../theme/app_colors.dart';

/// Fajr alarm settings. [section] picks the "alarm" (on/off + timing) or the
/// "customize" (sound) part, matching the two tabs of the prayer screen.
enum FajrAlarmSection { alarm, sound }

class FajrAlarmPanel extends StatefulWidget {
  final FajrAlarmSection section;
  const FajrAlarmPanel({super.key, required this.section});

  @override
  State<FajrAlarmPanel> createState() => _FajrAlarmPanelState();
}

class _FajrAlarmPanelState extends State<FajrAlarmPanel> {
  final AppState _state = AppState.instance;
  final AudioPlayer _player = AudioPlayer();
  String? _playing;

  bool get enabled => _state.flag('fajr_alarm');
  int get offset => _state.number('fajr_alarm_offset');
  String get sound => _state.text('fajr_alarm_sound') ?? 'cairo';

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _toggle(bool on) async {
    if (on && ReminderService.supported) {
      final granted = await ReminderService.instance.requestPermissions();
      if (!granted && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('اسمح بالإشعارات من إعدادات الجهاز حتى يعمل المنبّه.')),
        );
      }
    }
    setState(() => _state.setFlag('fajr_alarm', on));
  }

  Future<void> _preview(AlarmSound s) async {
    if (s.id == 'system') return;
    try {
      if (_playing == s.id) {
        await _player.stop();
        setState(() => _playing = null);
        return;
      }
      setState(() => _playing = s.id);
      await _player.setAsset('assets/audio/adhan/${s.id}.mp3');
      await _player.play();
      if (mounted && _playing == s.id) setState(() => _playing = null);
    } catch (_) {
      if (mounted) setState(() => _playing = null);
    }
  }

  bool get fixed => _state.text(fajrModeKey) == 'fixed';
  int get fixedMinutes => _state.number(fajrFixedKey, fallback: fajrFixedDefault);
  FajrAlarmTheme get theme => fajrThemeById(_state.text(fajrThemeKey));

  DateTime _alarmOn(DateTime day) {
    if (fixed) return DateTime(day.year, day.month, day.day, fixedMinutes ~/ 60, fixedMinutes % 60);
    return prayerTimesOn(_state.location, day).fajr.subtract(Duration(minutes: offset));
  }

  DateTime _nextAlarm() {
    final now = DateTime.now();
    final today = _alarmOn(now);
    if (today.isAfter(now)) return today;
    return _alarmOn(now.add(const Duration(days: 1)));
  }

  Future<void> _pickFixedTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: fixedMinutes ~/ 60, minute: fixedMinutes % 60),
    );
    if (picked != null && mounted) setState(() => _state.setNumber(fajrFixedKey, picked.hour * 60 + picked.minute));
  }

  Widget _modeChip(String label, bool value) {
    final selected = fixed == value;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _state.setText(fajrModeKey, value ? 'fixed' : 'relative')),
      selectedColor: AppColors.emerald100,
      labelStyle: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: selected ? AppColors.emerald700 : AppColors.slate600),
    );
  }

  Widget _themePreview(FajrAlarmTheme t) {
    final body = fajrBody(t, fixed: fixed, offset: offset);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Color(t.background), borderRadius: BorderRadius.circular(18)),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: Color(t.accent), shape: BoxShape.circle),
            child: const Icon(Icons.alarm, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.title, style: TextStyle(color: Color(t.accent), fontWeight: FontWeight.w900, fontSize: 13)),
                const SizedBox(height: 2),
                Text(body, style: TextStyle(color: Color(t.text), fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _clock(DateTime t) {
    final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
    return '$h:${t.minute.toString().padLeft(2, '0')} ${t.hour < 12 ? 'ص' : 'م'}';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!ReminderService.supported)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.amber300)),
            child: const Text(
              'المنبّه والتذكيرات تعمل في تطبيق أندرويد فقط، ولا تصدر أي تنبيه من المتصفح.',
              style: TextStyle(fontSize: 12, height: 1.6, fontWeight: FontWeight.bold, color: AppColors.amber700),
            ),
          ),
        if (widget.section == FajrAlarmSection.alarm) ..._alarmSection() else ..._soundSection(),
      ],
    );
  }

  List<Widget> _alarmSection() {
    return [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF022C22), Color(0xFF0F172A)], begin: Alignment.topRight, end: Alignment.bottomLeft),
          borderRadius: BorderRadius.circular(28),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('منبّه الفجر', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  Text(
                    enabled ? 'المنبّه القادم: ${_clock(_nextAlarm())}' : 'المنبّه متوقف',
                    style: TextStyle(color: enabled ? AppColors.emerald400 : Colors.white60, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            Switch(value: enabled, onChanged: _toggle, activeThumbColor: AppColors.emerald400),
          ],
        ),
      ),
      const SizedBox(height: 16),
      const Text('موعد التنبيه', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.slate700)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [_modeChip('قبل الأذان', false), _modeChip('وقت ثابت', true)]),
      const SizedBox(height: 8),
      if (fixed)
        InkWell(
          onTap: _pickFixedTime,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.emerald500)),
            child: Row(
              children: [
                const Icon(Icons.access_time, color: AppColors.emerald600),
                const SizedBox(width: 10),
                const Expanded(child: Text('وقت المنبّه كل يوم', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800))),
                Text(
                  _clock(DateTime(2000, 1, 1, fixedMinutes ~/ 60, fixedMinutes % 60)),
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.emerald700),
                ),
              ],
            ),
          ),
        )
      else
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: fajrOffsets.map((m) {
          final selected = offset == m;
          return ChoiceChip(
            label: Text(m == 0 ? 'مع الأذان' : 'قبل الأذان بـ $m د'),
            selected: selected,
            onSelected: (_) => setState(() => _state.setNumber('fajr_alarm_offset', m)),
            selectedColor: AppColors.emerald100,
            labelStyle: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: selected ? AppColors.emerald700 : AppColors.slate600),
          );
        }).toList(),
      ),
      const SizedBox(height: 12),
      const Text(
        'يستمر صوت المنبّه حتى تفتح الإشعار أو تمسحه. المواعيد محسوبة من موقعك وتتحدث تلقائيًا.',
        style: TextStyle(fontSize: 11, height: 1.6, fontWeight: FontWeight.bold, color: AppColors.slate400),
      ),
    ];
  }

  List<Widget> _soundSection() {
    return [
      const Text('شكل الإشعار', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.slate700)),
      const SizedBox(height: 8),
      ...fajrThemes.map((t) {
        final selected = theme.id == t.id;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: InkWell(
            onTap: () => setState(() => _state.setText(fajrThemeKey, t.id)),
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: selected ? Color(t.accent) : AppColors.slate100, width: selected ? 2 : 1),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _themePreview(t),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(6, 8, 6, 2),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(t.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
                              Text(t.subtitle, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                            ],
                          ),
                        ),
                        if (selected) Icon(Icons.check_circle, color: Color(t.accent)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
      const SizedBox(height: 8),
      const Text('صوت المنبّه', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.slate700)),
      const SizedBox(height: 8),
      ...alarmSounds.map((s) {
        final selected = sound == s.id;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: InkWell(
            onTap: () => setState(() => _state.setText('fajr_alarm_sound', s.id)),
            borderRadius: BorderRadius.circular(18),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: selected ? AppColors.emerald50 : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: selected ? AppColors.emerald500 : AppColors.slate100),
              ),
              child: Row(
                children: [
                  Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? AppColors.emerald600 : AppColors.slate300, size: 20),
                  const SizedBox(width: 10),
                  Expanded(child: Text(s.label, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800))),
                  if (s.id != 'system')
                    IconButton(
                      onPressed: () => _preview(s),
                      icon: Icon(_playing == s.id ? Icons.stop_circle : Icons.play_circle, color: AppColors.emerald600),
                      tooltip: 'استماع',
                    ),
                ],
              ),
            ),
          ),
        );
      }),
    ];
  }
}
