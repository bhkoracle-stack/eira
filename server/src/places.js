const places = [
  { city: "Bengaluru", country: "India", latitude: 12.9716, longitude: 77.5946, aliases: ["bangalore", "bengaluru"] },
  { city: "Mumbai", country: "India", latitude: 19.076, longitude: 72.8777, aliases: ["bombay", "mumbai"] },
  { city: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, aliases: ["delhi", "new delhi"] },
  { city: "Hyderabad", country: "India", latitude: 17.385, longitude: 78.4867, aliases: ["hyderabad"] },
  { city: "Chennai", country: "India", latitude: 13.0827, longitude: 80.2707, aliases: ["chennai", "madras"] },
  { city: "Kolkata", country: "India", latitude: 22.5726, longitude: 88.3639, aliases: ["kolkata", "calcutta"] },
  { city: "Pune", country: "India", latitude: 18.5204, longitude: 73.8567, aliases: ["pune"] },
  { city: "Jaipur", country: "India", latitude: 26.9124, longitude: 75.7873, aliases: ["jaipur"] },
  { city: "Kochi", country: "India", latitude: 9.9312, longitude: 76.2673, aliases: ["kochi", "cochin"] },
  { city: "Ahmedabad", country: "India", latitude: 23.0225, longitude: 72.5714, aliases: ["ahmedabad"] },
  { city: "Goa", country: "India", latitude: 15.2993, longitude: 74.124, aliases: ["goa", "panaji"] },
];

function findPlace(city) {
  const key = String(city || "").trim().toLowerCase();
  if (!key) return null;
  return places.find((place) => place.aliases.includes(key) || place.city.toLowerCase() === key) || null;
}

function locate(city) {
  const place = findPlace(city);
  if (!place) {
    return { city: String(city || "").trim(), country: "", latitude: null, longitude: null };
  }
  return {
    city: place.city,
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

function distanceKm(fromLat, fromLng, toLat, toLng) {
  const earth = 6371;
  const lat = ((toLat - fromLat) * Math.PI) / 180;
  const lng = ((toLng - fromLng) * Math.PI) / 180;
  const start = (fromLat * Math.PI) / 180;
  const end = (toLat * Math.PI) / 180;
  const arc = Math.sin(lat / 2) ** 2 + Math.cos(start) * Math.cos(end) * Math.sin(lng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(arc)));
}

function nearestPlace(latitude, longitude, maxKm = 75) {
  let best = null;
  let bestKm = maxKm;
  for (const place of places) {
    const km = distanceKm(latitude, longitude, place.latitude, place.longitude);
    if (km <= bestKm) {
      best = place;
      bestKm = km;
    }
  }
  return best;
}

module.exports = { places, findPlace, locate, nearestPlace };
