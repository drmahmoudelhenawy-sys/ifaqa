const KAABA_COORDINATES = {
  latitude: 21.4225,
  longitude: 39.8262,
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export interface QiblaDirectionResult {
  bearing: number;
  distanceKm: number;
}

export function calculateQiblaDirection(latitude: number, longitude: number): QiblaDirectionResult {
  const lat1 = toRadians(latitude);
  const lon1 = toRadians(longitude);
  const lat2 = toRadians(KAABA_COORDINATES.latitude);
  const lon2 = toRadians(KAABA_COORDINATES.longitude);
  const deltaLon = lon2 - lon1;

  const y = Math.sin(deltaLon);
  const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(deltaLon);
  const rawBearing = toDegrees(Math.atan2(y, x));
  const bearing = (rawBearing + 360) % 360;

  const earthRadiusKm = 6371;
  const deltaLat = lat2 - lat1;
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const distanceKm = 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));

  return {
    bearing,
    distanceKm,
  };
}

export function normalizeCompassHeading(
  alpha: number | null,
  webkitHeading?: number | null,
  beta?: number | null,
  gamma?: number | null
): number | null {
  // 1. iOS Safari provides true heading directly via webkitCompassHeading
  if (typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading)) {
    return (webkitHeading + 360) % 360;
  }

  if (alpha === null || Number.isNaN(alpha)) {
    return null;
  }

  // 2. Android / standard deviceorientation (alpha is compass angle when device is flat)
  // If beta and gamma exist, we can compute pitch/roll compensation if tilted
  if (beta !== null && beta !== undefined && gamma !== null && gamma !== undefined) {
    const _betaRad = toRadians(beta);
    const _gammaRad = toRadians(gamma);
    const alphaRad = toRadians(alpha);

    // Calculate components
    const cA = Math.cos(alphaRad);
    const sA = Math.sin(alphaRad);
    const cB = Math.cos(_betaRad);
    const sB = Math.sin(_betaRad);
    const cG = Math.cos(_gammaRad);
    const sG = Math.sin(_gammaRad);

    // Calculate normal vector components
    const rA = -cA * sG - sA * sB * cG;
    const rB = -sA * sG + cA * sB * cG;

    // Heading from tilt-compensated vector
    let heading = toDegrees(Math.atan2(rA, rB));
    if (heading < 0) heading += 360;
    
    // If phone is relatively flat, fallback to standard (360 - alpha)
    if (Math.abs(beta) < 50 && Math.abs(gamma) < 50) {
      return (360 - alpha + 360) % 360;
    }
    return (heading + 360) % 360;
  }

  return (360 - alpha + 360) % 360;
}

/**
 * Smooth an angular heading using vector averaging to eliminate jitter and 0/360 wrap-around jumps
 */
export function smoothAngle(prevAngle: number, newAngle: number, alpha = 0.18): number {
  const prevRad = toRadians(prevAngle);
  const newRad = toRadians(newAngle);

  const prevX = Math.cos(prevRad);
  const prevY = Math.sin(prevRad);

  const newX = Math.cos(newRad);
  const newY = Math.sin(newRad);

  const avgX = (1 - alpha) * prevX + alpha * newX;
  const avgY = (1 - alpha) * prevY + alpha * newY;

  let result = toDegrees(Math.atan2(avgY, avgX));
  if (result < 0) result += 360;
  return result;
}

