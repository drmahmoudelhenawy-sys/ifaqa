import 'package:flutter/material.dart';
import '../models/app_mode.dart';
import '../models/tier.dart';
import '../services/app_state.dart';
import '../theme/app_colors.dart';
import '../widgets/toggle_item.dart';
import 'support_sheet.dart';

class ProfileTab extends StatefulWidget {
  final AppMode appMode;
  final ValueChanged<AppMode> onAppModeChanged;

  const ProfileTab({super.key, required this.appMode, required this.onAppModeChanged});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  final AppState _state = AppState.instance;
  bool isEditing = false;
  late final TextEditingController nameController = TextEditingController(text: _state.displayName);
  late final TextEditingController titleController = TextEditingController(text: _state.userTitle);

  String get displayName => _state.displayName;
  set displayName(String v) => _state.displayName = v;
  String get userTitle => _state.userTitle;
  set userTitle(String v) => _state.userTitle = v;
  int get userXp => _state.xp;

  bool get fastingMode => _state.flag('fasting_mode');
  set fastingMode(bool v) => _state.setFlag('fasting_mode', v);
  bool get soundEnabled => _state.flag('sound', fallback: true);
  set soundEnabled(bool v) => _state.setFlag('sound', v);
  bool get hapticsEnabled => _state.flag('haptics', fallback: true);
  set hapticsEnabled(bool v) => _state.setFlag('haptics', v);
  bool get startWithQuran => _state.flag('start_with_quran');
  set startWithQuran(bool v) => _state.setFlag('start_with_quran', v);
  bool get showIntro => _state.flag('show_intro', fallback: true);
  set showIntro(bool v) => _state.setFlag('show_intro', v);
  bool get showOnLeaderboard => _state.flag('show_on_leaderboard', fallback: true);
  set showOnLeaderboard(bool v) => _state.setFlag('show_on_leaderboard', v);

  bool get notifFastingMonThu => _state.flag('notif_fasting_mon_thu');
  set notifFastingMonThu(bool v) => _state.setFlag('notif_fasting_mon_thu', v);
  bool get notifFastingLunar => _state.flag('notif_fasting_lunar');
  set notifFastingLunar(bool v) => _state.setFlag('notif_fasting_lunar', v);
  bool get notifKahfFriday => _state.flag('notif_kahf_friday');
  set notifKahfFriday(bool v) => _state.setFlag('notif_kahf_friday', v);
  bool get notifMorningAthkar => _state.flag('notif_morning_athkar');
  set notifMorningAthkar(bool v) => _state.setFlag('notif_morning_athkar', v);
  bool get notifEveningAthkar => _state.flag('notif_evening_athkar');
  set notifEveningAthkar(bool v) => _state.setFlag('notif_evening_athkar', v);

  TimeOfDay get wirdTime {
    final minutes = _state.number('wird_minutes', fallback: 8 * 60);
    return TimeOfDay(hour: minutes ~/ 60, minute: minutes % 60);
  }

  set wirdTime(TimeOfDay t) => _state.setNumber('wird_minutes', t.hour * 60 + t.minute);

  @override
  void dispose() {
    nameController.dispose();
    titleController.dispose();
    super.dispose();
  }

  bool get isLite => widget.appMode == AppMode.lite;

  void _saveName() {
    setState(() {
      displayName = nameController.text.trim().isEmpty ? displayName : nameController.text.trim();
      userTitle = titleController.text.trim();
      isEditing = false;
    });
  }

  Future<void> _toggleAppMode() async {
    if (widget.appMode == AppMode.full) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: const Text('تأكيد التحويل'),
            content: const Text('التحويل للنمط الهادئ سيخفي التحديات والنقاط والفعاليات. هل أنت متأكد؟'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
              TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('تأكيد')),
            ],
          ),
        ),
      );
      if (confirmed != true) return;
      widget.onAppModeChanged(AppMode.lite);
    } else {
      widget.onAppModeChanged(AppMode.full);
    }
  }

  Future<void> _resetScore() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: const Text('تحذير'),
          content: const Text('سيتم مسح جميع نقاطك. هل أنت متأكد؟'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('تصفير')),
          ],
        ),
      ),
    );
    if (confirmed == true && mounted) {
      _state.resetXp();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم التصفير.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final tier = getTierForXp(userXp);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        _buildIdentityCard(tier),
        const SizedBox(height: 14),
        _buildAppModeCard(),
        const SizedBox(height: 14),
        _buildPreferencesCard(),
        const SizedBox(height: 14),
        _buildNotificationsCard(),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.transparent,
              builder: (_) => const SupportSheet(),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.violet600,
              side: const BorderSide(color: Color(0xFFDDD6FE)),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            ),
            icon: const Icon(Icons.forum, size: 16),
            label: const Text('الدعم والمقترحات', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
          ),
        ),
        const SizedBox(height: 10),
        if (!isLite)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _resetScore,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.rose600,
                  side: const BorderSide(color: Color(0xFFFECDD3)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                ),
                icon: const Icon(Icons.warning_amber_rounded, size: 16),
                label: const Text('تصفير العدادات والنقاط', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
              ),
            ),
          ),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.slate600,
              side: const BorderSide(color: AppColors.slate200),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            ),
            icon: const Icon(Icons.logout, size: 16),
            label: const Text('تسجيل الخروج', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
          ),
        ),
      ],
    );
  }

  Widget _buildIdentityCard(Tier tier) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppColors.slate900, Color(0xFF312E81), Color(0xFF1E1B4B)], begin: Alignment.topRight, end: Alignment.bottomLeft),
        borderRadius: BorderRadius.circular(36),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(999)),
              child: const Text('الهوية الإيمانية', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Color(0xFFC4B5FD))),
            ),
          ),
          const SizedBox(height: 12),
          if (!isLite)
            Container(
              width: 96,
              height: 96,
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.1),
                border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
              ),
              child: Image.asset(tier.img, fit: BoxFit.contain),
            ),
          const SizedBox(height: 12),
          if (isEditing)
            Column(
              children: [
                TextField(
                  controller: nameController,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    hintText: 'الاسم',
                    hintStyle: const TextStyle(color: Colors.white38),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.1),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: titleController,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                  decoration: InputDecoration(
                    hintText: 'اللقب (مثال: محب الخير)',
                    hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.1),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _saveName,
                    style: FilledButton.styleFrom(backgroundColor: AppColors.emerald500, padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                    icon: const Icon(Icons.check_circle, size: 16),
                    label: const Text('حفظ التعديلات', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                  ),
                ),
              ],
            )
          else
            Column(
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(displayName, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: () => setState(() => isEditing = true),
                      borderRadius: BorderRadius.circular(999),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), shape: BoxShape.circle),
                        child: const Icon(Icons.edit, size: 13, color: Colors.white70),
                      ),
                    ),
                  ],
                ),
                if (userTitle.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFF3B0764).withValues(alpha: 0.6), borderRadius: BorderRadius.circular(999)),
                      child: Text(userTitle, style: const TextStyle(color: Color(0xFFC4B5FD), fontSize: 11, fontWeight: FontWeight.w900)),
                    ),
                  ),
              ],
            ),
          if (!isLite) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(999)),
              child: Text('${tier.name}  •  $userXp XP', style: const TextStyle(color: AppColors.amber300, fontSize: 12, fontWeight: FontWeight.w900)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAppModeCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.bolt, color: AppColors.amber500, size: 18),
              SizedBox(width: 8),
              Text('نمط التطبيق', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(16)),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _toggleAppMode,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        gradient: !isLite ? const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600]) : null,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.bolt, size: 14, color: !isLite ? Colors.white : AppColors.slate500),
                          const SizedBox(width: 6),
                          Text('كامل (تفاعلي)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: !isLite ? Colors.white : AppColors.slate500)),
                        ],
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: _toggleAppMode,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        gradient: isLite ? const LinearGradient(colors: [AppColors.emerald600, AppColors.teal600]) : null,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.dark_mode, size: 14, color: isLite ? Colors.white : AppColors.slate500),
                          const SizedBox(width: 6),
                          Text('هادئ (بدون نقاط)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: isLite ? Colors.white : AppColors.slate500)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const Text('النمط الهادئ يخفي النقاط والتحديات للتركيز التام على العبادة', textAlign: TextAlign.center, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
        ],
      ),
    );
  }

  Widget _buildPreferencesCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.palette, color: AppColors.violet500, size: 18),
              SizedBox(width: 8),
              Text('المظهر والتفضيلات', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
            ],
          ),
          const SizedBox(height: 14),
          ToggleItem(label: 'وضع الصيام (الإمساكية التلقائية)', isOn: fastingMode, icon: Icons.restaurant, onTap: () => setState(() => fastingMode = !fastingMode)),
          const SizedBox(height: 8),
          ToggleItem(label: 'تشغيل المؤثرات الصوتية', isOn: soundEnabled, icon: soundEnabled ? Icons.volume_up : Icons.volume_off, onTap: () => setState(() => soundEnabled = !soundEnabled)),
          const SizedBox(height: 8),
          ToggleItem(label: 'تشغيل اهتزازات اللمس', isOn: hapticsEnabled, icon: Icons.vibration, onTap: () => setState(() => hapticsEnabled = !hapticsEnabled)),
          const SizedBox(height: 8),
          ToggleItem(label: 'فتح المصحف تلقائيًا عند بدء التطبيق', isOn: startWithQuran, icon: Icons.menu_book, onTap: () => setState(() => startWithQuran = !startWithQuran)),
          const SizedBox(height: 8),
          ToggleItem(label: 'عرض شاشة الترحيب عند الفتح', isOn: showIntro, icon: Icons.play_circle_outline, onTap: () => setState(() => showIntro = !showIntro)),
          if (!isLite) ...[
            const SizedBox(height: 8),
            ToggleItem(label: 'إظهار اسمي ونقاطي في المتصدرين', isOn: showOnLeaderboard, icon: showOnLeaderboard ? Icons.visibility : Icons.visibility_off, onTap: () => setState(() => showOnLeaderboard = !showOnLeaderboard)),
          ],
        ],
      ),
    );
  }

  Widget _buildNotificationsCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.notifications, color: AppColors.violet500, size: 18),
              SizedBox(width: 8),
              Text('الإشعارات والتذكيرات الذكية', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
            ],
          ),
          const SizedBox(height: 14),
          ToggleItem(label: 'صيام الاثنين والخميس', isOn: notifFastingMonThu, icon: Icons.restaurant, onTap: () => setState(() => notifFastingMonThu = !notifFastingMonThu)),
          const SizedBox(height: 8),
          ToggleItem(label: 'صيام الأيام البيض (13، 14، 15)', isOn: notifFastingLunar, icon: Icons.dark_mode, onTap: () => setState(() => notifFastingLunar = !notifFastingLunar)),
          const SizedBox(height: 8),
          ToggleItem(label: 'قراءة سورة الكهف (يوم الجمعة)', isOn: notifKahfFriday, icon: Icons.menu_book, onTap: () => setState(() => notifKahfFriday = !notifKahfFriday)),
          const SizedBox(height: 8),
          ToggleItem(label: 'أذكار الصباح', isOn: notifMorningAthkar, icon: Icons.wb_sunny, onTap: () => setState(() => notifMorningAthkar = !notifMorningAthkar)),
          const SizedBox(height: 8),
          ToggleItem(label: 'أذكار المساء', isOn: notifEveningAthkar, icon: Icons.dark_mode, onTap: () => setState(() => notifEveningAthkar = !notifEveningAthkar)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate100)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Row(
                  children: [
                    Icon(Icons.notifications_active, size: 13, color: AppColors.amber500),
                    SizedBox(width: 6),
                    Text('تذكير الورد اليومي (حدد الموعد)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate700)),
                  ],
                ),
                const SizedBox(height: 10),
                InkWell(
                  onTap: () async {
                    final picked = await showTimePicker(context: context, initialTime: wirdTime);
                    if (picked != null) setState(() => wirdTime = picked);
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
                    child: Text(wirdTime.format(context), style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800)),
                  ),
                ),
                const SizedBox(height: 8),
                const Text('سيصلك إشعار لتلاوة وردك اليومي في هذا الوقت.', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
