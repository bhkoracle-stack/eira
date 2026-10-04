require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const { pool, migrate } = require("./db");
const { locate, places } = require("./places");

const people = [
  {
    email: "maya@vela.test",
    displayName: "Maya Shah",
    birthDate: "1998-04-12",
    gender: "woman",
    interestedIn: "men",
    city: "Bengaluru",
    bio: "Product designer who cooks too much dal on Sundays. Looking for someone who likes long walks and short voice notes.",
    photo: "maya.jpg",
  },
  {
    email: "arjun@vela.test",
    displayName: "Arjun Mehta",
    birthDate: "1995-11-02",
    gender: "man",
    interestedIn: "women",
    city: "Mumbai",
    bio: "Architect. I will suggest a filter-coffee place within ten minutes of meeting you.",
    photo: "arjun.jpg",
  },
  {
    email: "leela@vela.test",
    displayName: "Leela Nair",
    birthDate: "1999-07-21",
    gender: "woman",
    interestedIn: "everyone",
    city: "Kochi",
    bio: "Marine biologist, terrible at small talk, excellent at tide charts and breakfast plans.",
    photo: "leela.jpg",
  },
  {
    email: "kabir@vela.test",
    displayName: "Kabir Das",
    birthDate: "1993-01-18",
    gender: "man",
    interestedIn: "women",
    city: "Delhi",
    bio: "Journalist. I read on the metro and cook for friends on Friday nights.",
    photo: "kabir.jpg",
  },
  {
    email: "ananya@vela.test",
    displayName: "Ananya Rao",
    birthDate: "2001-09-09",
    gender: "woman",
    interestedIn: "men",
    city: "Hyderabad",
    bio: "Classical violin, weekend cricket, and a serious opinion about biryani.",
    photo: "ananya.jpg",
  },
  {
    email: "rohan@vela.test",
    displayName: "Rohan Iyer",
    birthDate: "1996-06-30",
    gender: "man",
    interestedIn: "everyone",
    city: "Chennai",
    bio: "Software engineer who leaves the office on time to play badminton.",
    photo: "rohan.jpg",
  },
  {
    email: "sara@vela.test",
    displayName: "Sara Qureshi",
    birthDate: "1994-12-14",
    gender: "woman",
    interestedIn: "men",
    city: "Pune",
    bio: "High-school history teacher. Ask me about old forts, not about marking papers.",
    photo: "sara.jpg",
  },
  {
    email: "dev@vela.test",
    displayName: "Dev Kapoor",
    birthDate: "1992-03-03",
    gender: "man",
    interestedIn: "women",
    city: "Jaipur",
    bio: "Runs a small ceramics studio. I like early mornings and people who text back.",
    photo: "dev.jpg",
  },
];

async function seed() {
  await migrate();
  const passwordHash = await bcrypt.hash("password123", 12);
  for (const person of people) {
    await pool.query(
      `INSERT INTO users (email, password_hash, display_name, birth_date, gender, interested_in, bio, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [
        person.email,
        passwordHash,
        person.displayName,
        person.birthDate,
        person.gender,
        person.interestedIn,
        person.bio,
        person.city,
      ]
    );
    await pool.query(
      `UPDATE users SET photo_path = $1 WHERE email = $2 AND photo_path IS NULL`,
      [person.photo, person.email]
    );
    const place = locate(person.city);
    await pool.query(
      `UPDATE users
       SET city = $1, country = $2, latitude = $3, longitude = $4,
           max_distance_km = COALESCE(max_distance_km, 50)
       WHERE email = $5`,
      [place.city, place.country, place.latitude, place.longitude, person.email]
    );
  }
  for (const place of places) {
    await pool.query(
      `UPDATE users
       SET city = $1, country = $2, latitude = $3, longitude = $4
       WHERE latitude IS NULL AND lower(city) = ANY($5::text[])`,
      [place.city, place.country, place.latitude, place.longitude, place.aliases]
    );
  }
  const threads = [
    ["maya@vela.test", "arjun@vela.test", [
      ["maya@vela.test", "That studio sounds lovely ✨"],
      ["arjun@vela.test", "Come by Saturday, I'll save you the best cup ☕"],
      ["maya@vela.test", "Deal. I'll bring flowers 🌸"],
      ["arjun@vela.test", "Can't wait to see you 😍"],
    ]],
    ["maya@vela.test", "kabir@vela.test", [
      ["kabir@vela.test", "Your biryani take is the one that matters 😄"],
      ["maya@vela.test", "Obviously. I'll defend it in person 🔥"],
      ["kabir@vela.test", "Friday night, then? 🌙"],
    ]],
    ["leela@vela.test", "rohan@vela.test", [
      ["rohan@vela.test", "Badminton tomorrow? 🏸"],
      ["leela@vela.test", "Only if breakfast is included 🥞"],
      ["rohan@vela.test", "Done. I'll bring the playlist 🎧"],
    ]],
    ["sara@vela.test", "dev@vela.test", [
      ["dev@vela.test", "The new bowls came out of the kiln ✨"],
      ["sara@vela.test", "Save me a blue one 💙"],
      ["dev@vela.test", "Already wrapped. Tea after school? ☕"],
    ]],
  ];

  for (const [emailA, emailB, lines] of threads) {
    const ids = await pool.query("SELECT id, email FROM users WHERE email = ANY($1::text[])", [[emailA, emailB]]);
    const byEmail = Object.fromEntries(ids.rows.map((row) => [row.email, row.id]));
    const left = byEmail[emailA];
    const right = byEmail[emailB];
    if (!left || !right) continue;
    await pool.query(
      `INSERT INTO swipes (from_user, to_user, liked) VALUES ($1, $2, true)
       ON CONFLICT (from_user, to_user) DO UPDATE SET liked = true`,
      [left, right]
    );
    await pool.query(
      `INSERT INTO swipes (from_user, to_user, liked) VALUES ($1, $2, true)
       ON CONFLICT (from_user, to_user) DO UPDATE SET liked = true`,
      [right, left]
    );
    const [userA, userB] = [left, right].sort();
    const match = await pool.query(
      `INSERT INTO matches (user_a, user_b) VALUES ($1, $2)
       ON CONFLICT (user_a, user_b) DO UPDATE SET user_a = EXCLUDED.user_a
       RETURNING id`,
      [userA, userB]
    );
    for (const [email, body] of lines) {
      const exists = await pool.query(
        "SELECT 1 FROM messages WHERE match_id = $1 AND sender_id = $2 AND body = $3",
        [match.rows[0].id, byEmail[email], body]
      );
      if (exists.rowCount) continue;
      await pool.query(
        "INSERT INTO messages (match_id, sender_id, body) VALUES ($1, $2, $3)",
        [match.rows[0].id, byEmail[email], body]
      );
    }
  }

  const adminPlace = locate("Bengaluru");
  await pool.query(
    `INSERT INTO users (
       email, password_hash, display_name, birth_date, gender, interested_in, bio,
       city, country, latitude, longitude, role
     )
     VALUES ($1, $2, 'Eira Admin', '1990-01-15', 'nonbinary', 'everyone', '', $3, $4, $5, $6, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
    [
      "admin@vela.test",
      passwordHash,
      adminPlace.city,
      adminPlace.country,
      adminPlace.latitude,
      adminPlace.longitude,
    ]
  );

  console.log("Seeded sample adults and emoji chats. Password for every sample account: password123");
  console.log("Admin: admin@vela.test");
  await pool.end();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
