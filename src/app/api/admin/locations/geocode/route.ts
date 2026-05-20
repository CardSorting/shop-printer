import { NextResponse } from 'next/server';
import { DomainError } from '@domain/errors';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress?: string;
  provider: 'google';
};

async function geocodeWithGoogle(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new DomainError('Geocoding is not configured. Set GOOGLE_MAPS_GEOCODING_API_KEY.');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Geocoding provider failed with HTTP ${response.status}.`);

  const payload = await response.json() as any;
  if (payload.status !== 'OK' || !payload.results?.[0]?.geometry?.location) {
    throw new DomainError(payload.error_message || 'Address could not be geocoded.');
  }

  const location = payload.results[0].geometry.location;
  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    throw new Error('Geocoding provider returned invalid coordinates.');
  }

  return {
    lat: location.lat,
    lng: location.lng,
    formattedAddress: payload.results[0].formatted_address,
    provider: 'google',
  };
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const body = await readJsonObject(request);
    const address = requireString(body.address, 'address');
    if (address.length > 500) throw new DomainError('address must be 500 characters or fewer.');

    const result = await geocodeWithGoogle(address);
    const services = await getServerServices();
    await services.auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'inventory_location_geocoded',
      targetId: 'inventory_location_geocode',
      details: { provider: result.provider, formattedAddress: result.formattedAddress },
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, 'Failed to geocode inventory location', request);
  }
}
