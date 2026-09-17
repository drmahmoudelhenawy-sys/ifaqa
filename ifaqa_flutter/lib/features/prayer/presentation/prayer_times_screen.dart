import 'dart:async';
import 'package:flutter/material.dart';
import 'package:adhan/adhan.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/arabic_numbers.dart';

class PrayerTimesScreen extends StatefulWidget {
  const PrayerTimesScreen({super.key});

  @override
  State<PrayerTimesScreen> createState() => _PrayerTimesScreenState();
}

class _PrayerTimesScreenState extends State<PrayerTimesScreen> {
  Coordinates _coords = Coordinates(30.0444, 31.2357); // Default Cairo
  String _cityName = 'القاهرة، مصر';
  PrayerTimes? _prayerTimes;
  Timer? _timer;
  Duration _timeUntilNext = Duration.zero;
  Prayer _nextPrayer = Prayer.none;

  @override
  void initState() {
    super.initState();
    _calculatePrayers();
    _determinePosition();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateCountdown());
  }

  void _calculatePrayers() {
    final params = CalculationMethod.egyptian.getParameters();
    params.madhab = Madhab.shafi;
    final pt = PrayerTimes.today(_coords, params);
    setState(() {
      _prayerTimes = pt;
      _nextPrayer = pt.nextPrayer();
      _updateCountdown();
    });
  }

  void _updateCountdown() {
    if (_prayerTimes == null) return;
    final next = _prayerTimes!.nextPrayer();
    final nextTime = _prayerTimes!.timeForPrayer(next);
    if (nextTime != null) {
      final now = DateTime.now();
      final diff = nextTime.difference(now);
      if (mounted) {
        setState(() {
          _nextPrayer = next;
          _timeUntilNext = diff.isNegative ? Duration.zero : diff;
        });
      }
    }
  }

  Future<void> _determinePosition() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 5),
        );
        setState(() {
          _coords = Coordinates(pos.latitude, pos.longitude);
          _cityName = 'موقعك الحالي';
        });
        _calculatePrayers();
      }
    } catch (_) {}
  }

  String _prayerNameArabic(Prayer p) {
    switch (p) {
      case Prayer.fajr:
        return 'الفجر';
      case Prayer.sunrise:
        return 'الشروق';
      case Prayer.dhuhr:
        return 'الظهر';
      case Prayer.asr:
        return 'العصر';
      case Prayer.maghrib:
        return 'المغرب';
      case Prayer.isha:
        return 'العشاء';
      case Prayer.none:
        return 'الفجر القادم';
    }
  }

  String _formatTime(DateTime? dt) {
    if (dt == null) return '--:--';
    final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
    final period = dt.hour >= 12 ? 'م' : 'ص';
    final minute = dt.minute.toString().padLeft(2, '0');
    return '${ArabicNumbers.convert(hour)}:${ArabicNumbers.convert(minute)} $period';
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pt = _prayerTimes;

    return Scaffold(
      appBar: AppBar(
        title: const Text('مواقيت الصلاة'),
      ),
      body: pt == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              children: [
                // Next Prayer Big Hero Card
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.primary, AppColors.secondary],
                      begin: Alignment.topRight,
                      end: Alignment.bottomLeft,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.35),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.location_on, size: 16, color: Colors.white70),
                              const SizedBox(width: 4),
                              Text(
                                _cityName,
                                style: const TextStyle(
                                  fontFamily: 'Cairo',
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white24,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              'الصلاة القادمة: ${_prayerNameArabic(_nextPrayer)}',
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      // Countdown timer
                      Text(
                        '${ArabicNumbers.convert(_timeUntilNext.inHours.toString().padLeft(2, '0'))}:${ArabicNumbers.convert((_timeUntilNext.inMinutes % 60).toString().padLeft(2, '0'))}:${ArabicNumbers.convert((_timeUntilNext.inSeconds % 60).toString().padLeft(2, '0'))}',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 34,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'متبقي على أذان ${_prayerNameArabic(_nextPrayer)}',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Title
                Text(
                  'مواقيت صلوات اليوم',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 10),

                // Prayer cards
                _buildPrayerTile('الفجر', pt.fajr, _nextPrayer == Prayer.fajr, Icons.nightlight_round, isDark),
                _buildPrayerTile('الشروق', pt.sunrise, _nextPrayer == Prayer.sunrise, Icons.wb_sunny_outlined, isDark),
                _buildPrayerTile('الظهر', pt.dhuhr, _nextPrayer == Prayer.dhuhr, Icons.wb_sunny, isDark),
                _buildPrayerTile('العصر', pt.asr, _nextPrayer == Prayer.asr, Icons.wb_cloudy_outlined, isDark),
                _buildPrayerTile('المغرب', pt.maghrib, _nextPrayer == Prayer.maghrib, Icons.wb_twilight, isDark),
                _buildPrayerTile('العشاء', pt.isha, _nextPrayer == Prayer.isha, Icons.bedtime, isDark),
              ],
            ),
    );
  }

  Widget _buildPrayerTile(String name, DateTime time, bool isNext, IconData icon, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isNext
            ? AppColors.primary.withOpacity(0.12)
            : (isDark ? AppColors.darkCard : AppColors.lightSurface),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isNext
              ? AppColors.primary
              : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
          width: isNext ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: isNext ? AppColors.primary : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
            size: 20,
          ),
          const SizedBox(width: 14),
          Text(
            name,
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 14,
              fontWeight: isNext ? FontWeight.w900 : FontWeight.bold,
              color: isNext
                  ? AppColors.primary
                  : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
            ),
          ),
          const Spacer(),
          Text(
            _formatTime(time),
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: isNext
                  ? AppColors.primary
                  : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
