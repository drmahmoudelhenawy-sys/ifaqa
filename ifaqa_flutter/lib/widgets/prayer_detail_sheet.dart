import 'package:flutter/material.dart';
import '../models/prayer.dart';
import '../theme/app_colors.dart';

class PrayerDetailSheet extends StatelessWidget {
  final Prayer prayer;
  final void Function(PrayerStatus status) onStatusSelected;
  final void Function(String type) onSunnahToggled;

  const PrayerDetailSheet({
    super.key,
    required this.prayer,
    required this.onStatusSelected,
    required this.onSunnahToggled,
  });

  @override
  Widget build(BuildContext context) {
    final title = prayer.name == 'الجمعة' ? 'صلاة الجمعة' : 'صلاة ${prayer.name}';

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                InkWell(
                  onTap: () => Navigator.of(context).pop(),
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    width: 32,
                    height: 32,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: AppColors.slate100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close, size: 16, color: AppColors.slate500),
                  ),
                ),
                const Spacer(),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.slate800),
                    ),
                    const Text(
                      'تسجيل أداء الصلاة',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: AppColors.violet600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            if (prayer.sunanConfig.hasPre || prayer.sunanConfig.hasPost) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.slate50,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: AppColors.slate100),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'السنن الرواتب',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.slate400),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.amber100,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.auto_awesome, size: 10, color: AppColors.amber700),
                              const SizedBox(width: 4),
                              Text(
                                prayer.name == 'الجمعة' ? 'سنة الجمعة' : 'بيت في الجنة',
                                style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.amber700),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        if (prayer.sunanConfig.hasPre)
                          Expanded(
                            child: _SunnahButton(
                              label: 'سنة قبلية',
                              count: prayer.sunanConfig.preCount,
                              done: prayer.sunanPreDone,
                              onTap: () => onSunnahToggled('pre'),
                            ),
                          ),
                        if (prayer.sunanConfig.hasPre && prayer.sunanConfig.hasPost)
                          const SizedBox(width: 8),
                        if (prayer.sunanConfig.hasPost)
                          Expanded(
                            child: _SunnahButton(
                              label: 'سنة بعدية',
                              count: prayer.sunanConfig.postCount,
                              done: prayer.sunanPostDone,
                              onTap: () => onSunnahToggled('post'),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.6,
              children: [
                _StatusButton(
                  label: 'جماعة',
                  icon: Icons.groups,
                  xp: prayer.isFajr ? 100 : (prayer.name == 'الجمعة' ? 80 : 60),
                  color: AppColors.violet600,
                  bg: const Color(0xFFF5F3FF),
                  border: const Color(0xFFDDD6FE),
                  onTap: () => onStatusSelected(PrayerStatus.jamaah),
                ),
                _StatusButton(
                  label: 'في الوقت',
                  icon: Icons.check_circle,
                  xp: prayer.isFajr ? 80 : 40,
                  color: AppColors.emerald600,
                  bg: AppColors.emerald50,
                  border: const Color(0xFFA7F3D0),
                  onTap: () => onStatusSelected(PrayerStatus.ontime),
                ),
                _StatusButton(
                  label: 'متأخرة',
                  icon: Icons.access_time,
                  xp: 10,
                  color: AppColors.orange600,
                  bg: const Color(0xFFFFF7ED),
                  border: const Color(0xFFFED7AA),
                  onTap: () => onStatusSelected(PrayerStatus.late),
                ),
                _StatusButton(
                  label: 'قضاء',
                  icon: Icons.error_outline,
                  xp: 5,
                  color: AppColors.rose600,
                  bg: const Color(0xFFFFF1F2),
                  border: const Color(0xFFFECDD3),
                  onTap: () => onStatusSelected(PrayerStatus.qada),
                ),
              ],
            ),
            if (prayer.status != PrayerStatus.none) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.slate100,
                    foregroundColor: AppColors.slate500,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () => onStatusSelected(PrayerStatus.none),
                  icon: const Icon(Icons.delete_outline, size: 15),
                  label: const Text('إلغاء تسجيل الصلاة', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ),
            ],
            SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
          ],
        ),
      ),
    );
  }
}

class _SunnahButton extends StatelessWidget {
  final String label;
  final int count;
  final bool done;
  final VoidCallback onTap;

  const _SunnahButton({required this.label, required this.count, required this.done, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          gradient: done ? const LinearGradient(colors: [AppColors.amber400, AppColors.amber500]) : null,
          color: done ? null : Colors.white,
          border: Border.all(color: done ? AppColors.amber500 : AppColors.slate200),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: done ? Colors.white.withValues(alpha: 0.25) : AppColors.slate100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.check, size: 12, color: done ? Colors.white : AppColors.slate300),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: done ? Colors.white : AppColors.slate700)),
                Text('$count ركعات', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: done ? Colors.white70 : AppColors.slate400)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final int xp;
  final Color color;
  final Color bg;
  final Color border;
  final VoidCallback onTap;

  const _StatusButton({
    required this.label,
    required this.icon,
    required this.xp,
    required this.color,
    required this.bg,
    required this.border,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        decoration: BoxDecoration(
          color: bg,
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(18),
        ),
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2)],
              ),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: color)),
            Text('+$xp XP', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: color.withValues(alpha: 0.75))),
          ],
        ),
      ),
    );
  }
}
