import 'dart:async';
import 'package:flutter/material.dart';
import '../models/prayer_time_info.dart';
import '../services/app_state.dart';
import '../theme/app_colors.dart';

/// Between an adhan and its iqamah, shows how long is left (React `IqamahBanner`).
class IqamahBanner extends StatefulWidget {
  const IqamahBanner({super.key});

  @override
  State<IqamahBanner> createState() => _IqamahBannerState();
}

class _IqamahBannerState extends State<IqamahBanner> {
  Timer? _timer;
  (String, int, int)? _active;

  @override
  void initState() {
    super.initState();
    _check();
    _timer = Timer.periodic(const Duration(seconds: 20), (_) => _check());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _check() {
    final now = DateTime.now();
    (String, int, int)? found;
    for (final p in buildPrayerTimes(AppState.instance.location)) {
      final adhan = DateTime(now.year, now.month, now.day, p.time.hour, p.time.minute);
      final iqamah = adhan.add(Duration(minutes: p.iqamaMins));
      if (!now.isBefore(adhan) && now.isBefore(iqamah)) {
        found = (p.label, now.difference(adhan).inMinutes, (iqamah.difference(now).inSeconds / 60).ceil());
        break;
      }
    }
    if (found != _active && mounted) setState(() => _active = found);
  }

  @override
  Widget build(BuildContext context) {
    final a = _active;
    if (a == null) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppColors.emerald600, AppColors.teal600]),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          const Icon(Icons.notifications_active, color: Colors.white, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(children: [
                TextSpan(text: 'مضى على أذان ${a.$1} '),
                TextSpan(text: '${a.$2} د', style: const TextStyle(color: AppColors.amber300)),
                const TextSpan(text: ' · متبقي على الإقامة '),
                TextSpan(text: '${a.$3} د', style: const TextStyle(color: AppColors.amber300)),
              ]),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
