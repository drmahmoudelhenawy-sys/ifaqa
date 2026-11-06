import 'dart:math' as math;

class QiblaResult {
  final double bearing;
  final double distanceKm;
  const QiblaResult({required this.bearing, required this.distanceKm});
}

const double _kaabaLat = 21.4225;
const double _kaabaLon = 39.8262;

double _toRad(double deg) => deg * math.pi / 180;
double _toDeg(double rad) => rad * 180 / math.pi;

QiblaResult calculateQiblaDirection(double latitude, double longitude) {
  final lat1 = _toRad(latitude);
  final lon1 = _toRad(longitude);
  final lat2 = _toRad(_kaabaLat);
  final lon2 = _toRad(_kaabaLon);
  final deltaLon = lon2 - lon1;

  final y = math.sin(deltaLon);
  final x = math.cos(lat1) * math.tan(lat2) - math.sin(lat1) * math.cos(deltaLon);
  final rawBearing = _toDeg(math.atan2(y, x));
  final bearing = (rawBearing + 360) % 360;

  const earthRadiusKm = 6371.0;
  final deltaLat = lat2 - lat1;
  final haversine = math.sin(deltaLat / 2) * math.sin(deltaLat / 2) + math.cos(lat1) * math.cos(lat2) * math.sin(deltaLon / 2) * math.sin(deltaLon / 2);
  final distanceKm = 2 * earthRadiusKm * math.asin(math.sqrt(haversine));

  return QiblaResult(bearing: bearing, distanceKm: distanceKm);
}
