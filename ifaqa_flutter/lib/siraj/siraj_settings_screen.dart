import 'package:flutter/material.dart';

import '../services/app_state.dart';
import '../services/reminder_service.dart';
import '../theme/app_colors.dart';
import '../widgets/toggle_item.dart';
import 'siraj_capsule.dart';
import 'siraj_live_service.dart';
import 'siraj_settings.dart';

class SirajSettingsScreen extends StatefulWidget {
  const SirajSettingsScreen({super.key});

  @override
  State<SirajSettingsScreen> createState() => _SirajSettingsScreenState();
}

class _SirajSettingsScreenState extends State<SirajSettingsScreen> {
  final AppState _state = AppState.instance;

  @override
  void initState() {
    super.initState();
    _state.addListener(_changed);
  }

  @override
  void dispose() {
    _state.removeListener(_changed);
    super.dispose();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

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

  @override
  Widget build(BuildContext context) {
    final config = SirajSettings.config();
    final androidLive = ReminderService.supported;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(
          title: const Text(
            'سِراج',
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
