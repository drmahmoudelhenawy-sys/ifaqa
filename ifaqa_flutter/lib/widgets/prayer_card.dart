import 'package:flutter/material.dart';
import '../models/prayer.dart';
import '../theme/app_colors.dart';

class PrayerCard extends StatelessWidget {
  final Prayer prayer;
  final VoidCallback onTap;

  const PrayerCard({super.key, required this.prayer, required this.onTap});

  _StatusStyle _statusStyle() {
    switch (prayer.status) {
      case PrayerStatus.jamaah:
        return _StatusStyle(
          gradient: const LinearGradient(
            colors: [AppColors.violet600, AppColors.indigo600, Color(0xFF6D28D9)],
          ),
          foreground: Colors.white,
        );
      case PrayerStatus.ontime:
        return _StatusStyle(
          gradient: const LinearGradient(
            colors: [AppColors.emerald500, AppColors.teal600, AppColors.emerald600],
          ),
          foreground: Colors.white,
        );
      case PrayerStatus.late:
        return _StatusStyle(color: Colors.white, foreground: AppColors.orange600, border: AppColors.orange500.withValues(alpha: 0.4));
      case PrayerStatus.qada:
        return _StatusStyle(color: Colors.white, foreground: AppColors.rose600, border: AppColors.rose500.withValues(alpha: 0.4));
      case PrayerStatus.none:
        return _StatusStyle(color: Colors.white, foreground: AppColors.slate500, border: AppColors.slate100);
    }
  }

  @override
  Widget build(BuildContext context) {
    final style = _statusStyle();
    final isDone = prayer.isDone;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(32),
      child: Container(
        clipBehavior: Clip.antiAlias,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: style.color,
          gradient: style.gradient,
          borderRadius: BorderRadius.circular(32),
          border: style.border != null ? Border.all(color: style.border!) : null,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDone ? 0.08 : 0.03),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              left: -20,
              bottom: -28,
              child: Icon(
                prayer.icon,
                size: 140,
                color: (isDone ? Colors.white : AppColors.slate900).withValues(alpha: isDone ? 0.16 : 0.04),
              ),
            ),
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: isDone ? Colors.white.withValues(alpha: 0.2) : AppColors.slate100,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    isDone ? Icons.check_rounded : prayer.icon,
                    size: 26,
                    color: isDone ? Colors.white : AppColors.slate400,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        prayer.name,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: isDone ? Colors.white : AppColors.slate800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              prayer.fadl,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isDone ? Colors.white.withValues(alpha: 0.85) : AppColors.slate400,
                              ),
                            ),
                          ),
                          if (prayer.sunanPreDone || prayer.sunanPostDone) ...[
                            const SizedBox(width: 6),
                            if (prayer.sunanPreDone)
                              const _Dot(),
                            if (prayer.sunanPostDone)
                              const _Dot(),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                if (isDone)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: Text(
                      prayer.statusLabel,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot();
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 2),
      width: 8,
      height: 8,
      decoration: const BoxDecoration(color: AppColors.amber300, shape: BoxShape.circle),
    );
  }
}

class _StatusStyle {
  final Color? color;
  final Gradient? gradient;
  final Color foreground;
  final Color? border;

  _StatusStyle({this.color, this.gradient, required this.foreground, this.border});
}
