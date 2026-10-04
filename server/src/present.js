function publicUser(row, publicUrl) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    age: Number(row.age),
    birthDate: row.birth_date instanceof Date
      ? row.birth_date.toISOString().slice(0, 10)
      : String(row.birth_date).slice(0, 10),
    gender: row.gender,
    interestedIn: row.interested_in,
    bio: row.bio,
    city: row.city,
    country: row.country || "",
    maxDistanceKm: Number(row.max_distance_km) || 50,
    photoUrl: row.photo_path ? `${publicUrl}/uploads/${row.photo_path}` : null,
    role: row.role === "admin" ? "admin" : "user",
    createdAt: row.created_at,
  };
}

function profileCard(row, publicUrl) {
  return {
    id: row.id,
    displayName: row.display_name,
    age: Number(row.age),
    gender: row.gender,
    bio: row.bio,
    city: row.city,
    country: row.country || "",
    distanceKm: row.distance_km == null ? null : Math.round(Number(row.distance_km)),
    photoUrl: row.photo_path ? `${publicUrl}/uploads/${row.photo_path}` : null,
  };
}

const USER_COLUMNS = `
  id, email, display_name, birth_date, gender, interested_in, bio, city, country, latitude, longitude, max_distance_km, photo_path, role, created_at,
  EXTRACT(YEAR FROM age(birth_date))::int AS age
`;

module.exports = { publicUser, profileCard, USER_COLUMNS };
