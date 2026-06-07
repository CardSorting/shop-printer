import { WOODBINE_LOCAL_BUSINESS_DEFAULTS } from '@domain/seo/local-business-defaults';

type MapsCoords = {
  lat: string;
  lng: string;
};

function resolveCoords(lat?: string, lng?: string): MapsCoords {
  const resolvedLat = lat ?? String(WOODBINE_LOCAL_BUSINESS_DEFAULTS.lat);
  const resolvedLng = lng ?? String(WOODBINE_LOCAL_BUSINESS_DEFAULTS.lng);
  return { lat: resolvedLat, lng: resolvedLng };
}

export function getMapsSearchUrl(
  street: string,
  locality: string,
  region: string,
  lat?: string,
  lng?: string,
): string {
  const coords = resolveCoords(lat, lng);
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }
  const query = encodeURIComponent(`${street}, ${locality}, ${region}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Embed URL — pan/zoom in-page without a Maps API key */
export function getMapsEmbedUrl(
  street: string,
  locality: string,
  region: string,
  lat?: string,
  lng?: string,
): string {
  const coords = resolveCoords(lat, lng);
  const query = encodeURIComponent(`${street}, ${locality}, ${region}`);
  const params = new URLSearchParams({
    q: lat && lng ? `${coords.lat},${coords.lng}` : query,
    z: '16',
    hl: 'en',
  });
  return `https://maps.google.com/maps?${params.toString()}&output=embed`;
}
