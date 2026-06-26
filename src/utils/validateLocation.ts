interface LocationValidationResult {
  isValid: boolean;
  distance: number;
}

export const validateLocation = (
  userLat: number,
  userLng: number,
  companyLat: number,
  companyLng: number,
  allowedDistanceInMeters = 50
): LocationValidationResult => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const earthRadius = 6371e3;
  const dLat = toRad(companyLat - userLat);
  const dLng = toRad(companyLng - userLng);
  const lat1 = toRad(userLat);
  const lat2 = toRad(companyLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;

  return {
    isValid: distance <= allowedDistanceInMeters,
    distance: Math.round(distance),
  };
};
