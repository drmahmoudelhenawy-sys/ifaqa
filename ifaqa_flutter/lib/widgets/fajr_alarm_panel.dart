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

  DateTime _nextAlarm() {
    final now = DateTime.now();
    final today = prayerTimesOn(_state.location, now).fajr.subtract(Duration(minutes: offset));
    if (today.isAfter(now)) return today;
    return prayerTimesOn(_state.location, now.add(const Duration(days: 1))).fajr.subtract(Duration(minutes: offset));
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
