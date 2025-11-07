// src/services/geocoding.service.ts
// Сервис для получения координат через Google Geocoding API

interface GeocodingResult {
  latitude: string;
  longitude: string;
}

interface GoogleGeocodingResponse {
  results: Array<{
    formatted_address?: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      location_type?: string;
    };
  }>;
  status: string;
}

/**
 * Получить координаты адреса через Google Geocoding API
 * @param address - Полный адрес для геокодирования
 * @returns Координаты или null в случае ошибки
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!address || address.trim().length === 0) {
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const fullUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    const response = await fetch(fullUrl);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GoogleGeocodingResponse;

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return null;
    }

    const location = data.results[0].geometry.location;

    return {
      latitude: location.lat.toFixed(7),
      longitude: location.lng.toFixed(7),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Формирует полный адрес из компонентов для геокодирования
 */
export function buildFullAddress(components: {
  street?: string | null;
  buildingNumber?: string | null;
  apartmentNumber?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string {
  const parts: string[] = [];

  if (components.street) parts.push(components.street);
  if (components.buildingNumber) parts.push(components.buildingNumber);
  if (components.apartmentNumber) parts.push(components.apartmentNumber);
  if (components.postalCode) parts.push(components.postalCode);
  if (components.province) parts.push(components.province);
  if (components.country) parts.push(components.country);

  return parts.join(", ");
}

