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

/** In-page pan/zoom embed — OpenStreetMap (allowed by CSP, no API key) */
export function getMapsEmbedUrl(lat?: string, lng?: string): string {
  const coords = resolveCoords(lat, lng);
  const latitude = Number(coords.lat);
  const longitude = Number(coords.lng);
  const padLng = 0.014;
  const padLat = 0.01;
  const bbox = [
    longitude - padLng,
    latitude - padLat,
    longitude + padLng,
    latitude + padLat,
  ].join('%2C');

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}
