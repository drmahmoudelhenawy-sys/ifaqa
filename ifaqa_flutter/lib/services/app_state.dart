import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_mode.dart';
import '../models/prayer.dart';

class AppLocation {
  final double latitude;
  final double longitude;
  final bool isDefault;
  const AppLocation({required this.latitude, required this.longitude, required this.isDefault});

  static const AppLocation cairo = AppLocation(latitude: 30.0444, longitude: 31.2357, isDefault: true);
}

/// Everything the user does on this device. Backed by shared_preferences, so it
/// survives restarts. There is no account or server sync yet.
class AppState extends ChangeNotifier {
  AppState._(this._prefs);

  static late final AppState instance;
  final SharedPreferences _prefs;

  static Future<void> init() async {
    instance = AppState._(await SharedPreferences.getInstance());
  }

  static String dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  // ---- Profile ----
  bool get onboarded => _prefs.getBool('onboarded') ?? false;

  AppMode get appMode => _prefs.getString('app_mode') == AppMode.lite.name ? AppMode.lite : AppMode.full;
  set appMode(AppMode mode) {
    _prefs.setString('app_mode', mode.name);
    notifyListeners();
  }

  void completeOnboarding(AppMode mode) {
    _prefs.setBool('onboarded', true);
    appMode = mode;
  }

  String get displayName => _prefs.getString('display_name') ?? 'ضيف إفاقة';
  set displayName(String value) {
    _prefs.setString('display_name', value);
    notifyListeners();
  }

  String get userTitle => _prefs.getString('user_title') ?? '';
  set userTitle(String value) {
    _prefs.setString('user_title', value);
    notifyListeners();
  }

  int get xp => _prefs.getInt('xp') ?? 0;

  void addXp(int amount) {
    if (amount == 0) return;
    final next = xp + amount;
    _prefs.setInt('xp', next < 0 ? 0 : next);
    notifyListeners();
  }

  void resetXp() {
    _prefs.setInt('xp', 0);
    notifyListeners();
  }

  // ---- Generic settings ----
  bool flag(String key, {bool fallback = false}) => _prefs.getBool('flag_$key') ?? fallback;
  void setFlag(String key, bool value) {
    _prefs.setBool('flag_$key', value);
    notifyListeners();
  }

  int number(String key, {int fallback = 0}) => _prefs.getInt('num_$key') ?? fallback;
  void setNumber(String key, int value) => _prefs.setInt('num_$key', value);

  List<String> strings(String key) => _prefs.getStringList('list_$key') ?? const [];
  void setStrings(String key, List<String> value) => _prefs.setStringList('list_$key', value);

  String? text(String key) => _prefs.getString('text_$key');
  void setText(String key, String value) => _prefs.setString('text_$key', value);

  // ---- Daily log ----
  Map<String, dynamic> _day(DateTime date) {
    final raw = _prefs.getString('day_${dateKey(date)}');
    return raw == null ? <String, dynamic>{} : jsonDecode(raw) as Map<String, dynamic>;
  }

  void _saveDay(DateTime date, Map<String, dynamic> day) {
    _prefs.setString('day_${dateKey(date)}', jsonEncode(day));
    notifyListeners();
  }

  PrayerStatus prayerStatus(DateTime date, String prayerId) {
    final name = (_day(date)['status'] as Map?)?[prayerId] as String?;
    return PrayerStatus.values.firstWhere((s) => s.name == name, orElse: () => PrayerStatus.none);
  }

  void setPrayerStatus(DateTime date, String prayerId, PrayerStatus status) {
    final isFajr = prayerId == 'fajr';
    addXp(_prayerXp(status, isFajr) - _prayerXp(prayerStatus(date, prayerId), isFajr));
    final day = _day(date);
    (day['status'] ??= <String, dynamic>{})[prayerId] = status.name;
    _saveDay(date, day);
  }

  int completedPrayers(DateTime date) {
    final statuses = (_day(date)['status'] as Map?) ?? const {};
    return statuses.values.where((s) => s != PrayerStatus.none.name).length;
  }

  static int _prayerXp(PrayerStatus status, bool isFajr) {
    switch (status) {
      case PrayerStatus.none:
        return 0;
      case PrayerStatus.jamaah:
        return isFajr ? 100 : 60;
      case PrayerStatus.ontime:
        return isFajr ? 80 : 40;
      case PrayerStatus.late:
        return 10;
      case PrayerStatus.qada:
        return 5;
    }
  }

  bool dayHas(DateTime date, String listKey, String item) =>
      ((_day(date)[listKey] as List?) ?? const []).contains(item);

  /// Adds or removes [item] from a per-day list, adjusting XP by [xpValue].
  void toggleDayItem(DateTime date, String listKey, String item, {int xpValue = 0}) {
    final day = _day(date);
    final items = List<dynamic>.from((day[listKey] as List?) ?? const []);
    final wasPresent = items.remove(item);
    if (!wasPresent) items.add(item);
    day[listKey] = items;
    addXp(wasPresent ? -xpValue : xpValue);
    _saveDay(date, day);
  }

  // ---- Location ----
  AppLocation get location {
    final lat = _prefs.getDouble('loc_lat');
    final lon = _prefs.getDouble('loc_lon');
    if (lat == null || lon == null) return AppLocation.cairo;
    return AppLocation(latitude: lat, longitude: lon, isDefault: false);
  }

  /// Returns an Arabic error message when the location could not be updated.
  Future<String?> refreshLocation() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return 'خدمة الموقع غير مفعّلة على جهازك.';
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        return 'لم يتم السماح بالوصول إلى الموقع.';
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 20)),
      );
      await _prefs.setDouble('loc_lat', position.latitude);
      await _prefs.setDouble('loc_lon', position.longitude);
      notifyListeners();
      return null;
    } catch (e) {
      debugPrint('refreshLocation failed: $e');
      return 'تعذر تحديد موقعك. حاول مرة أخرى.';
    }
  }
}
