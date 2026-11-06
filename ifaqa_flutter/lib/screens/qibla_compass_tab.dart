import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_compass/flutter_compass.dart';
import '../services/app_state.dart';
import '../services/qibla_service.dart';
import '../theme/app_colors.dart';
import '../widgets/compass_rose_painter.dart';

class QiblaCompassTab extends StatefulWidget {
  const QiblaCompassTab({super.key});

  @override
  State<QiblaCompassTab> createState() => _QiblaCompassTabState();
}

class _QiblaCompassTabState extends State<QiblaCompassTab> {
  final AppState _state = AppState.instance;
  bool locating = false;

  @override
  void initState() {
    super.initState();
    if (_state.location.isDefault) _refresh();
  }

  Future<void> _refresh() async {
    setState(() => locating = true);
    final error = await _state.refreshLocation();
    if (!mounted) return;
    setState(() => locating = false);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final location = _state.location;
    final result = calculateQiblaDirection(location.latitude, location.longitude);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Column(
        children: [
          InkWell(
            onTap: locating ? null : _refresh,
            borderRadius: BorderRadius.circular(999),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(color: AppColors.slate900, borderRadius: BorderRadius.circular(999)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_on, size: 13, color: AppColors.amber400),
                  const SizedBox(width: 6),
                  Text(
                    locating ? 'جارٍ تحديد موقعك...' : (location.isDefault ? 'القاهرة (موقع افتراضي) · اضغط للتحديد' : 'حسب موقعك الحالي · اضغط للتحديث'),
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          StreamBuilder<CompassEvent>(
            stream: FlutterCompass.events,
            builder: (context, snapshot) {
              final heading = snapshot.data?.heading;
              // Turn the whole dial so its north follows the real north.
              final dialAngle = heading == null ? 0.0 : -heading * math.pi / 180;
              final diff = heading == null ? null : ((result.bearing - heading + 540) % 360) - 180;
              final aligned = diff != null && diff.abs() < 5;
              return Column(
                children: [
                  SizedBox(
                    width: 240,
                    height: 240,
                    child: Transform.rotate(
                      angle: dialAngle,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          CustomPaint(size: const Size(240, 240), painter: CompassRosePainter(ringColor: aligned ? AppColors.emerald400 : AppColors.slate200, tickColor: AppColors.slate400)),
                          Transform.rotate(
                            angle: result.bearing * math.pi / 180,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: const BoxDecoration(color: AppColors.emerald600, shape: BoxShape.circle),
                                  child: const Icon(Icons.mosque, color: Colors.white, size: 18),
                                ),
                                Container(width: 3, height: 75, color: AppColors.emerald600),
                                // Mirrors the top half so the needle pivots on the dial's centre.
                                const SizedBox(height: 113),
                              ],
                            ),
                          ),
                          Container(width: 14, height: 14, decoration: BoxDecoration(color: AppColors.slate800, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2))),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    heading == null
                        ? 'البوصلة غير متاحة على هذا الجهاز؛ استخدم الزاوية من الشمال.'
                        : (aligned ? 'أنت متجه إلى القبلة ✓' : 'لف الهاتف حتى يشير السهم الأخضر للأعلى'),
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: aligned ? AppColors.emerald600 : AppColors.slate500),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _statCard('اتجاه القبلة', '${result.bearing.round()}°', Icons.explore, AppColors.emerald600),
              const SizedBox(width: 12),
              _statCard('المسافة للكعبة', '${result.distanceKm.round()} كم', Icons.straighten, AppColors.violet600),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.amber300)),
            child: const Row(
              children: [
                Icon(Icons.info_outline, size: 16, color: AppColors.amber700),
                SizedBox(width: 8),
                Expanded(
                  child: Text('وجّه أعلى الهاتف نحو السهم الأخضر لمعرفة اتجاه القبلة من موقعك. فعّل خدمة الموقع لدقة أكبر.', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.amber800, height: 1.5)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.slate100)),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
        ],
      ),
    );
  }
}
