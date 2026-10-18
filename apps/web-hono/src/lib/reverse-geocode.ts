/**
 * District name for a point, from BigDataCloud's free client-side reverse geocoder (no key).
 * Peru's districts are administrative level 8 ("Distrito de Miraflores"). Only the name is
 * kept; the coordinates are not stored by this call. Returns null when the service has no
 * district, so the person types it instead.
 */
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

interface ReverseGeocodeResponse {
  countryCode?: string;
  locality?: string;
  city?: string;
  localityInfo?: { administrative?: { adminLevel?: number; name?: string }[] };
}

export function districtFromReverseGeocode(data: ReverseGeocodeResponse): string | null {
  if (data.countryCode && data.countryCode !== "PE") return null;
  const levels = data.localityInfo?.administrative ?? [];
  const district =
    levels.filter((level) => level.adminLevel === 8 && level.name).at(-1)?.name ??
    data.locality ??
    data.city;
  const name = district?.replace(/^distrito de\s+/i, "").trim();
  return name ? name : null;
}

export async function districtFromPoint(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const url = new URL(REVERSE_GEOCODE_URL);
  url.searchParams.set("latitude", latitude.toFixed(4));
  url.searchParams.set("longitude", longitude.toFixed(4));
  url.searchParams.set("localityLanguage", "es");
  try {
    const response = await fetchImpl(url);
    if (!response.ok) return null;
    return districtFromReverseGeocode((await response.json()) as ReverseGeocodeResponse);
  } catch {
    return null;
  }
}
