// Location utilities for browser geolocation

import { STORAGE_KEYS, LOCATION_EXPIRY_MS, LOCATION_TIMEOUT_MS, LOCATION_MAX_AGE_MS } from "@/lib/constants";

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationInfo {
  lat: number;
  lon: number;
  city?: string;
  country?: string;
}

interface StoredLocation {
  coords: Coordinates;
  city?: string;
  country?: string;
  timestamp: number;
}

/**
 * Reverse geocode coordinates to get city/country
 */
async function reverseGeocode(lat: number, lon: number): Promise<{ city?: string; country?: string }> {
  try {
    // Using OpenStreetMap Nominatim (free, no API key needed)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'Ziggy Personal Assistant' } }
    );
    if (response.ok) {
      const data = await response.json();
      return {
        city: data.address?.city || data.address?.town || data.address?.village || data.address?.municipality,
        country: data.address?.country,
      };
    }
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
  }
  return {};
}

/**
 * Get user's location from browser geolocation API
 * Caches the result in localStorage for 24 hours
 */
export async function getLocation(): Promise<LocationInfo | null> {
  // Check cached location first
  const cached = getCachedLocation();
  if (cached) {
    return cached;
  }

  // Request fresh location
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        
        // Get city/country from reverse geocoding
        const { city, country } = await reverseGeocode(coords.lat, coords.lon);
        
        const locationInfo: LocationInfo = {
          ...coords,
          city,
          country,
        };
        
        // Cache the location
        cacheLocation(locationInfo);
        resolve(locationInfo);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
      timeout: LOCATION_TIMEOUT_MS,
      maximumAge: LOCATION_MAX_AGE_MS,
        enableHighAccuracy: false, // Don't need high accuracy for weather
      }
    );
  });
}

/**
 * Get cached location if still valid
 */
function getCachedLocation(): LocationInfo | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_LOCATION);
    if (!stored) return null;

    const data: StoredLocation = JSON.parse(stored);
    const now = Date.now();

    if (now - data.timestamp < LOCATION_EXPIRY_MS) {
      return {
        lat: data.coords.lat,
        lon: data.coords.lon,
        city: data.city,
        country: data.country,
      };
    }

    // Expired, remove it
    localStorage.removeItem(STORAGE_KEYS.USER_LOCATION);
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache location in localStorage
 */
function cacheLocation(location: LocationInfo): void {
  if (typeof window === 'undefined') return;

  try {
    const data: StoredLocation = {
      coords: { lat: location.lat, lon: location.lon },
      city: location.city,
      country: location.country,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.USER_LOCATION, JSON.stringify(data));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Clear cached location
 */
export function clearCachedLocation(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.USER_LOCATION);
}

/**
 * Check if location permission is granted
 */
export async function checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (typeof window === 'undefined' || !navigator.permissions) {
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return 'prompt';
  }
}
