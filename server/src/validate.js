const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDERS = new Set(["woman", "man", "nonbinary"]);
const INTERESTS = new Set(["women", "men", "everyone"]);

function ageYears(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== month - 1 ||
    dob.getUTCDate() !== day
  ) {
    return null;
  }
  const now = new Date();
  let age = now.getUTCFullYear() - year;
  const monthDelta = now.getUTCMonth() - (month - 1);
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < day)) age -= 1;
  return age;
}

function requireString(value, label, min, max) {
  if (typeof value !== "string") return `${label} is required`;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    return `${label} must be ${min}-${max} characters`;
  }
  return null;
}

function validateSignup(body) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 160) return { error: "Enter a valid email" };

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 72) {
    return { error: "Password must be 8-72 characters" };
  }

  const nameError = requireString(body.displayName, "Name", 2, 40);
  if (nameError) return { error: nameError };

  const birthDate = typeof body.birthDate === "string" ? body.birthDate : "";
  const age = ageYears(birthDate);
  if (age === null || age > 100) return { error: "Enter a real birthday" };
  if (age < 18) return { error: "You must be 18 or older" };

  if (!GENDERS.has(body.gender)) return { error: "Choose a gender" };
  if (!INTERESTS.has(body.interestedIn)) return { error: "Choose who you want to meet" };

  const city = typeof body.city === "string" ? body.city.trim() : "";
  if (city.length > 60) return { error: "City must be 60 characters or fewer" };

  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  if (bio.length > 400) return { error: "Bio must be 400 characters or fewer" };

  return {
    value: {
      email,
      password,
      displayName: body.displayName.trim(),
      birthDate,
      gender: body.gender,
      interestedIn: body.interestedIn,
      city,
      bio,
    },
  };
}

function validateProfilePatch(body) {
  const patch = {};
  if (body.displayName !== undefined) {
    const error = requireString(body.displayName, "Name", 2, 40);
    if (error) return { error };
    patch.displayName = body.displayName.trim();
  }
  if (body.bio !== undefined) {
    if (typeof body.bio !== "string" || body.bio.trim().length > 400) {
      return { error: "Bio must be 400 characters or fewer" };
    }
    patch.bio = body.bio.trim();
  }
  if (body.city !== undefined) {
    if (typeof body.city !== "string" || body.city.trim().length > 60) {
      return { error: "City must be 60 characters or fewer" };
    }
    patch.city = body.city.trim();
  }
  if (body.interestedIn !== undefined) {
    if (!INTERESTS.has(body.interestedIn)) return { error: "Choose who you want to meet" };
    patch.interestedIn = body.interestedIn;
  }
  if (body.maxDistanceKm !== undefined) {
    const distance = Number(body.maxDistanceKm);
    if (!Number.isInteger(distance) || distance < 5 || distance > 500) {
      return { error: "Choose a distance between 5 and 500 km" };
    }
    patch.maxDistanceKm = distance;
  }
  const hasLatitude = body.latitude !== undefined;
  const hasLongitude = body.longitude !== undefined;
  if (hasLatitude || hasLongitude) {
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return { error: "That location could not be read" };
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return { error: "That location could not be read" };
    }
    patch.latitude = latitude;
    patch.longitude = longitude;
  }
  if (body.country !== undefined) {
    if (typeof body.country !== "string" || body.country.trim().length > 60) {
      return { error: "Country must be 60 characters or fewer" };
    }
    patch.country = body.country.trim();
  }
  if (Object.keys(patch).length === 0) return { error: "Nothing to update" };
  return { value: patch };
}

module.exports = { validateSignup, validateProfilePatch, ageYears };
