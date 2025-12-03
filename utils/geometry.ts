export function calculatePolygonArea(
  coordinates: { latitude: number; longitude: number }[]
): number {
  if (coordinates.length < 3) return 0;

  const EARTH_RADIUS_M = 6378137;
  
  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  let area = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[(i + 1) % coordinates.length];

    const lat1 = toRadians(p1.latitude);
    const lat2 = toRadians(p2.latitude);
    const lon1 = toRadians(p1.longitude);
    const lon2 = toRadians(p2.longitude);

    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs((area * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
  
  return area / 10000;
}

export function getPolygonCenter(
  coordinates: { latitude: number; longitude: number }[]
): { latitude: number; longitude: number } {
  if (coordinates.length === 0) {
    return { latitude: 0, longitude: 0 };
  }

  let totalLat = 0;
  let totalLng = 0;

  coordinates.forEach(coord => {
    totalLat += coord.latitude;
    totalLng += coord.longitude;
  });

  return {
    latitude: totalLat / coordinates.length,
    longitude: totalLng / coordinates.length,
  };
}
