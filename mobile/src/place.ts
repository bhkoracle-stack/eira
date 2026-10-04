import { Platform } from "react-native";
import * as Location from "expo-location";
import { api } from "./api";

function locationError(error: unknown) {
  if (typeof navigator !== "undefined" && "geolocation" in navigator === false) {
    return new Error("This browser cannot read your location. Type your city instead.");
  }
  const code = typeof error === "object" && error && "code" in error ? Number((error as { code: number }).code) : 0;
  if (code === 1) return new Error("Location permission is needed. Allow location for this site and try again.");
  if (error instanceof Error && error.message) return error;
  return new Error("Could not read your location. Allow location for this site and try again.");
}

export async function readCurrentPlace(token?: string | null) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.isSecureContext === false) {
    throw new Error("Location works on http://localhost:8081. A Wi-Fi address cannot ask the browser for location.");
  }
  let permission;
  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch (error) {
    throw locationError(error);
  }
  if (permission.status !== "granted") {
    throw new Error("Location permission is needed to show people near you.");
  }

  let position;
  try {
    position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Location timed out. Allow location for this site and try again.")), 12000);
      }),
    ]);
  } catch (error) {
    throw locationError(error);
  }

  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  let city = "";
  let country = "";
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places[0];
    city = place?.city || place?.district || place?.subregion || place?.region || "";
    country = place?.country || "";
  } catch {
    city = "";
  }
  if (!city && token) {
    const named = await api.reverseGeocode(token, latitude, longitude);
    city = named.city;
    country = named.country || country;
  }
  if (!city) throw new Error("Your position was found, but the city name could not be read. Type your city instead.");
  return { latitude, longitude, city, country };
}
