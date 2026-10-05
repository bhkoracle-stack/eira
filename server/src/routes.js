const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { pool, httpError } = require("./db");
const { publicUser, profileCard, USER_COLUMNS } = require("./present");
const { validateSignup, validateProfilePatch } = require("./validate");
const { privacyHtml, termsHtml, copyrightHtml, supportHtml } = require("./legal");
const { locate, nearestPlace } = require("./places");
const { registerAdminRoutes } = require("./admin");
const { sendResetCode, mailConfigured } = require("./mail");

const uploadsDir = path.join(__dirname, "..", "uploads");

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const attachmentTypes = new Set([...imageTypes, "application/pdf", "text/plain"]);

function storedName(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".txt"];
  const safe = allowed.includes(ext) ? ext : ".bin";
  return `${crypto.randomUUID()}${safe}`;
}

function uploader(types, maxBytes) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, cb) => {
      if (types.has(file.mimetype)) cb(null, true);
      else cb(new Error("That file type is not supported"));
    },
  });
}

const upload = uploader(imageTypes, 8 * 1024 * 1024);
const uploadAttachment = uploader(attachmentTypes, 8 * 1024 * 1024);

function isUploadedFile(name) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\./i.test(name || "");
}

function uploadErrorMessage(error) {
  if (error?.code === "LIMIT_FILE_SIZE") return "That file is too large";
  if (error?.message === "That file type is not supported") return error.message;
  return "Could not upload that file";
}

async function saveUpload(file) {
  const name = storedName(file);
  if (!file?.buffer) throw httpError(400, "Choose a file");
  await pool.query("INSERT INTO uploads (name, mime, bytes) VALUES ($1, $2, $3)", [
    name,
    file.mimetype,
    file.buffer,
  ]);
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, name), file.buffer);
  } catch {
    // Hosted copies of this API have a read-only disk. The database row is served instead.
  }
  return name;
}

function removeUpload(name) {
  if (!isUploadedFile(name)) return;
  pool.query("DELETE FROM uploads WHERE name = $1", [name]).catch(() => {});
  fs.unlink(path.join(uploadsDir, path.basename(name)), () => {});
}

function mapMessage(row, publicUrl) {
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    attachmentUrl: row.attachment_path ? `${publicUrl}/uploads/${row.attachment_path}` : null,
    attachmentName: row.attachment_name || null,
    attachmentType: row.attachment_type || null,
  };
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Sign in required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query("SELECT role, banned_at FROM users WHERE id = $1", [payload.sub]);
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: "Session expired. Sign in again." });
    if (row.banned_at) return res.status(403).json({ error: "This account is banned" });
    req.userId = payload.sub;
    req.role = row.role === "admin" ? "admin" : "user";
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Sign in again." });
    }
    next(error);
  }
}

async function loadUser(id) {
  const result = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function assertNotBlocked(userId, otherId) {
  const blocked = await pool.query(
    `SELECT 1 FROM blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)`,
    [userId, otherId]
  );
  if (blocked.rowCount) throw httpError(403, "This profile is not available");
}

async function loadMatch(matchId, userId) {
  const result = await pool.query(
    `SELECT id, user_a, user_b, created_at
     FROM matches
     WHERE id = $1 AND (user_a = $2 OR user_b = $2)`,
    [matchId, userId]
  );
  if (!result.rows[0]) throw httpError(404, "Match not found");
  const match = result.rows[0];
  const otherId = match.user_a === userId ? match.user_b : match.user_a;
  await assertNotBlocked(userId, otherId);
  return { match, otherId };
}

function iceServers() {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  if (process.env.TURN_URL) {
    servers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME || undefined,
      credential: process.env.TURN_CREDENTIAL || undefined,
    });
  }
  return servers;
}

function registerRoutes(app) {
  const publicUrl = () => String(process.env.PUBLIC_URL || "").replace(/\/$/, "");

  app.get("/uploads/:name", async (req, res, next) => {
    try {
      if (!isUploadedFile(req.params.name)) return next();
      const stored = await pool.query("SELECT mime, bytes FROM uploads WHERE name = $1", [req.params.name]);
      const file = stored.rows[0];
      if (!file) return next();
      res.set("Content-Type", file.mime);
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.send(file.bytes);
    } catch (error) {
      next(error);
    }
  });

  app.get("/health", async (_req, res, next) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/config", (_req, res) => {
    res.json({
      iceServers: iceServers(),
      minAge: 18,
      supportEmail: process.env.SUPPORT_EMAIL || "support@eira.app",
      copyright: "© 2026 Eira. All rights reserved.",
    });
  });

  app.get("/legal/privacy", (_req, res) => {
    res.type("html").send(privacyHtml);
  });

  app.get("/legal/terms", (_req, res) => {
    res.type("html").send(termsHtml);
  });

  app.get("/legal/copyright", (_req, res) => {
    res.type("html").send(copyrightHtml);
  });

  app.get("/legal/support", (_req, res) => {
    res.type("html").send(supportHtml);
  });

  const supportTopics = new Set(["Account", "Profile photo", "Chat", "Calls", "Safety", "Copyright", "Other"]);

  app.post("/support", async (req, res, next) => {
    try {
      let userId = null;
      let accountEmail = "";
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (token) {
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET);
          const user = await pool.query("SELECT id, email FROM users WHERE id = $1", [payload.sub]);
          if (user.rows[0]) {
            userId = user.rows[0].id;
            accountEmail = user.rows[0].email;
          }
        } catch {
          userId = null;
        }
      }
      const email = (typeof req.body?.email === "string" ? req.body.email.trim() : "") || accountEmail;
      const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
        return res.status(400).json({ error: "Enter a valid email so we can reply" });
      }
      if (!supportTopics.has(topic)) return res.status(400).json({ error: "Choose a topic" });
      if (message.length < 10 || message.length > 2000) {
        return res.status(400).json({ error: "Write a message between 10 and 2000 characters" });
      }
      await pool.query(
        `INSERT INTO support_requests (user_id, email, topic, message) VALUES ($1, $2, $3, $4)`,
        [userId, email, topic, message]
      );
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/register", async (req, res, next) => {
    try {
      const parsed = validateSignup(req.body || {});
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      const value = parsed.value;
      const passwordHash = await bcrypt.hash(value.password, 12);
      const place = locate(value.city);
      const inserted = await pool.query(
        `INSERT INTO users (email, password_hash, display_name, birth_date, gender, interested_in, bio, city, country, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          value.email,
          passwordHash,
          value.displayName,
          value.birthDate,
          value.gender,
          value.interestedIn,
          value.bio,
          place.city,
          place.country,
          place.latitude,
          place.longitude,
        ]
      );
      const user = await loadUser(inserted.rows[0].id);
      res.status(201).json({ token: signToken(user.id), user: publicUser(user, publicUrl()) });
    } catch (error) {
      if (error.code === "23505") return res.status(409).json({ error: "That email is already registered" });
      if (error.code === "23514") return res.status(400).json({ error: "You must be 18 or older" });
      next(error);
    }
  });

  function hashResetCode(code) {
    return crypto.createHmac("sha256", process.env.JWT_SECRET || "eira").update(code).digest("hex");
  }

  function resetCodesMatch(code, hash) {
    const nextHash = Buffer.from(hashResetCode(code));
    const current = Buffer.from(String(hash || ""), "utf8");
    if (nextHash.length !== current.length) return false;
    return crypto.timingSafeEqual(nextHash, current);
  }

  app.post("/auth/forgot", async (req, res, next) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
        return res.status(400).json({ error: "Enter the email on your account" });
      }
      if (!mailConfigured()) {
        return res.status(503).json({ error: "Email is not set up on this server yet." });
      }
      const result = await pool.query("SELECT id, banned_at FROM users WHERE email = $1", [email]);
      const user = result.rows[0];
      if (user && !user.banned_at) {
        const recent = await pool.query(
          "SELECT id FROM password_resets WHERE user_id = $1 AND created_at > now() - interval '60 seconds'",
          [user.id]
        );
        if (!recent.rows[0]) {
          const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
          await sendResetCode(email, code);
          await pool.query("DELETE FROM password_resets WHERE user_id = $1", [user.id]);
          await pool.query(
            "INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES ($1, $2, now() + interval '10 minutes')",
            [user.id, hashResetCode(code)]
          );
        }
      }
      res.json({ ok: true });
    } catch (error) {
      if (error.status === 503 || error.status === 502) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  });

  app.post("/auth/reset", async (req, res, next) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
      const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Enter the email on your account" });
      }
      if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "Enter the 6-digit code from the email" });
      if (newPassword.length < 8 || newPassword.length > 72) {
        return res.status(400).json({ error: "New password must be 8-72 characters" });
      }
      const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      const user = userResult.rows[0];
      const resetResult = user
        ? await pool.query(
            `SELECT id, code_hash, attempts FROM password_resets
             WHERE user_id = $1 AND expires_at > now()
             ORDER BY created_at DESC LIMIT 1`,
            [user.id]
          )
        : { rows: [] };
      const reset = resetResult.rows[0];
      if (!reset) return res.status(400).json({ error: "That code is wrong or expired" });
      if (reset.attempts >= 5) {
        await pool.query("DELETE FROM password_resets WHERE user_id = $1", [user.id]);
        return res.status(400).json({ error: "Too many tries. Ask for a new code." });
      }
      if (!resetCodesMatch(code, reset.code_hash)) {
        await pool.query("UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1", [reset.id]);
        return res.status(400).json({ error: "That code is wrong or expired" });
      }
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, user.id]);
      await pool.query("DELETE FROM password_resets WHERE user_id = $1", [user.id]);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/login", async (req, res, next) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const result = await pool.query(`SELECT ${USER_COLUMNS}, password_hash, banned_at FROM users WHERE email = $1`, [email]);
      const row = result.rows[0];
      const valid = row ? await bcrypt.compare(password, row.password_hash) : false;
      if (!row || !valid) return res.status(401).json({ error: "Email or password is wrong" });
      if (row.banned_at) return res.status(403).json({ error: "This account is banned" });
      res.json({ token: signToken(row.id), user: publicUser(row, publicUrl()) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/me", requireAuth, async (req, res, next) => {
    try {
      const user = await loadUser(req.userId);
      if (!user) return res.status(401).json({ error: "Session expired. Sign in again." });
      res.json({ user: publicUser(user, publicUrl()) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/geo/reverse", requireAuth, async (req, res, next) => {
    try {
      const latitude = Number(req.query.latitude);
      const longitude = Number(req.query.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: "That location could not be read" });
      }
      const nearby = nearestPlace(latitude, longitude);
      let city = nearby?.city || "";
      let country = nearby?.country || "";
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          {
            headers: { Accept: "application/json", "User-Agent": "Eira/1.0 (location for nearby people)" },
            signal: AbortSignal.timeout(4000),
          }
        );
        if (response.ok) {
          const data = await response.json();
          const address = data.address || {};
          city = address.city || address.town || address.village || address.municipality || address.city_district || city;
          country = address.country || country;
        }
      } catch {
        /* A nearby known city is enough when the map service is unavailable. */
      }
      city = String(city || "").trim().slice(0, 60);
      country = String(country || "").trim().slice(0, 60);
      if (!city) return res.status(404).json({ error: "That location could not be named. Type your city instead." });
      res.json({ city, country });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/me", requireAuth, async (req, res, next) => {
    try {
      const parsed = validateProfilePatch(req.body || {});
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      const fields = [];
      const values = [];
      const map = {
        displayName: "display_name",
        bio: "bio",
        city: "city",
        interestedIn: "interested_in",
        maxDistanceKm: "max_distance_km",
      };
      for (const [key, column] of Object.entries(map)) {
        if (parsed.value[key] !== undefined) {
          values.push(parsed.value[key]);
          fields.push(`${column} = $${values.length}`);
        }
      }
      const hasGps = parsed.value.latitude !== undefined && parsed.value.longitude !== undefined;
      if (parsed.value.city !== undefined) {
        const place = locate(parsed.value.city);
        const cityIndex = fields.findIndex((field) => field.startsWith("city "));
        if (cityIndex >= 0) values[cityIndex] = place.city || parsed.value.city;
        if (!hasGps) {
          values.push(place.country, place.latitude, place.longitude);
          const countryIndex = values.length - 2;
          fields.push(`country = $${countryIndex}`, `latitude = $${countryIndex + 1}`, `longitude = $${countryIndex + 2}`);
        }
      }
      if (hasGps) {
        values.push(parsed.value.latitude, parsed.value.longitude);
        fields.push(`latitude = $${values.length - 1}`, `longitude = $${values.length}`);
        if (parsed.value.country !== undefined) {
          values.push(parsed.value.country);
          fields.push(`country = $${values.length}`);
        }
      }
      values.push(req.userId);
      await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = $${values.length}`, values);
      const user = await loadUser(req.userId);
      res.json({ user: publicUser(user, publicUrl()) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/me/photo", requireAuth, (req, res, next) => {
    upload.single("photo")(req, res, async (uploadError) => {
      if (uploadError) return res.status(400).json({ error: uploadErrorMessage(uploadError) });
      if (!req.file) return res.status(400).json({ error: "Choose a photo" });
      try {
        const current = await pool.query("SELECT photo_path FROM users WHERE id = $1", [req.userId]);
        const name = await saveUpload(req.file);
        await pool.query("UPDATE users SET photo_path = $1 WHERE id = $2", [name, req.userId]);
        removeUpload(current.rows[0]?.photo_path);
        const user = await loadUser(req.userId);
        res.json({ user: publicUser(user, publicUrl()) });
      } catch (error) {
        next(error);
      }
    });
  });

  app.post("/me/password", requireAuth, async (req, res, next) => {
    try {
      const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
      const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
      if (newPassword.length < 8 || newPassword.length > 72) {
        return res.status(400).json({ error: "New password must be 8-72 characters" });
      }
      const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.userId]);
      const row = result.rows[0];
      if (!row) return res.status(401).json({ error: "Session expired. Sign in again." });
      const valid = await bcrypt.compare(currentPassword, row.password_hash);
      if (!valid) return res.status(400).json({ error: "Current password is wrong" });
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, req.userId]);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/me", requireAuth, async (req, res, next) => {
    try {
      const current = await pool.query("SELECT photo_path FROM users WHERE id = $1", [req.userId]);
      await pool.query("DELETE FROM users WHERE id = $1", [req.userId]);
      removeUpload(current.rows[0]?.photo_path);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/discover", requireAuth, async (req, res, next) => {
    try {
      const me = await loadUser(req.userId);
      if (!me) return res.status(401).json({ error: "Session expired. Sign in again." });
      const distanceKm = `
        CASE
          WHEN $4::float8 IS NULL OR u.latitude IS NULL OR u.longitude IS NULL THEN NULL
          ELSE 6371 * acos(LEAST(1::float8, GREATEST(-1::float8,
            cos(radians($4)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians($5))
            + sin(radians($4)) * sin(radians(u.latitude))
          )))
        END`;
      const result = await pool.query(
        `SELECT * FROM (
           SELECT ${USER_COLUMNS}, (${distanceKm}) AS distance_km
           FROM users u
           WHERE u.id <> $1
             AND u.banned_at IS NULL
             AND u.role = 'user'
             AND NOT EXISTS (
               SELECT 1 FROM swipes s WHERE s.from_user = $1 AND s.to_user = u.id
             )
             AND NOT EXISTS (
               SELECT 1 FROM blocks b
               WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
                  OR (b.blocker_id = u.id AND b.blocked_id = $1)
             )
             AND (
               $2::text = 'everyone'
               OR ($2::text = 'women' AND u.gender = 'woman')
               OR ($2::text = 'men' AND u.gender = 'man')
             )
             AND (
               u.interested_in = 'everyone'
               OR (u.interested_in = 'women' AND $3::text = 'woman')
               OR (u.interested_in = 'men' AND $3::text = 'man')
               OR ($3::text = 'nonbinary' AND u.interested_in = 'everyone')
             )
             AND (
               $7::text = ''
               OR u.country = ''
               OR lower(u.country) = lower($7)
             )
         ) nearby
         ORDER BY
           CASE
             WHEN $6::text <> '' AND lower(city) = lower($6) THEN 0
             WHEN distance_km IS NOT NULL AND distance_km <= $8 THEN 1
             WHEN $7::text <> '' AND lower(country) = lower($7) THEN 2
             ELSE 3
           END,
           distance_km NULLS LAST,
           created_at DESC
         LIMIT 30`,
        [
          req.userId,
          me.interested_in,
          me.gender,
          me.latitude,
          me.longitude,
          me.city || "",
          me.country || "",
          Number(me.max_distance_km) || 50,
        ]
      );
      res.json({ profiles: result.rows.map((row) => profileCard(row, publicUrl())) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/swipes", requireAuth, async (req, res, next) => {
    const targetId = req.body?.userId;
    const liked = req.body?.liked;
    if (typeof targetId !== "string" || typeof liked !== "boolean") {
      return res.status(400).json({ error: "Choose a profile" });
    }
    if (targetId === req.userId) return res.status(400).json({ error: "You cannot choose yourself" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const target = await client.query("SELECT id, banned_at, role FROM users WHERE id = $1", [targetId]);
      if (!target.rows[0] || target.rows[0].banned_at || target.rows[0].role === "admin") {
        throw httpError(404, "Profile not found");
      }
      const blocked = await client.query(
        `SELECT 1 FROM blocks
         WHERE (blocker_id = $1 AND blocked_id = $2)
            OR (blocker_id = $2 AND blocked_id = $1)`,
        [req.userId, targetId]
      );
      if (blocked.rowCount) throw httpError(403, "This profile is not available");

      await client.query(
        `INSERT INTO swipes (from_user, to_user, liked)
         VALUES ($1, $2, $3)
         ON CONFLICT (from_user, to_user) DO UPDATE SET liked = EXCLUDED.liked`,
        [req.userId, targetId, liked]
      );

      let matchId = null;
      if (liked) {
        const mutual = await client.query(
          `SELECT 1 FROM swipes WHERE from_user = $1 AND to_user = $2 AND liked = true`,
          [targetId, req.userId]
        );
        if (mutual.rowCount) {
          const [userA, userB] = [req.userId, targetId].sort();
          const inserted = await client.query(
            `INSERT INTO matches (user_a, user_b)
             VALUES ($1, $2)
             ON CONFLICT (user_a, user_b) DO NOTHING
             RETURNING id`,
            [userA, userB]
          );
          if (inserted.rows[0]) matchId = inserted.rows[0].id;
          else {
            const existing = await client.query(
              "SELECT id FROM matches WHERE user_a = $1 AND user_b = $2",
              [userA, userB]
            );
            matchId = existing.rows[0]?.id || null;
          }
        }
      }
      await client.query("COMMIT");

      let match = null;
      if (matchId) {
        const other = await loadUser(targetId);
        match = {
          id: matchId,
          user: profileCard(other, publicUrl()),
        };
        const io = req.app.get("io");
        const me = await loadUser(req.userId);
        io.to(`user:${targetId}`).emit("match:new", {
          id: matchId,
          user: profileCard(me, publicUrl()),
        });
      }
      res.json({ matched: Boolean(match), match });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  });

  app.get("/matches", requireAuth, async (req, res, next) => {
    try {
      const online = req.app.get("online");
      const result = await pool.query(
        `SELECT m.id AS match_id,
                m.created_at AS match_created_at,
                u.id,
                u.display_name,
                u.gender,
                u.bio,
                u.city,
                u.photo_path,
                EXTRACT(YEAR FROM age(u.birth_date))::int AS age,
                lm.body AS last_body,
                lm.attachment_type AS last_type,
                lm.attachment_name AS last_attachment_name,
                lm.created_at AS last_at
         FROM matches m
         JOIN users u ON u.id = CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END
         LEFT JOIN LATERAL (
           SELECT body, attachment_type, attachment_name, created_at FROM messages
           WHERE match_id = m.id
           ORDER BY created_at DESC
           LIMIT 1
         ) lm ON true
         WHERE (m.user_a = $1 OR m.user_b = $1)
           AND u.banned_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM blocks b
             WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
                OR (b.blocker_id = u.id AND b.blocked_id = $1)
           )
         ORDER BY COALESCE(lm.created_at, m.created_at) DESC`,
        [req.userId]
      );
      res.json({
        matches: result.rows.map((row) => ({
          id: row.match_id,
          createdAt: row.match_created_at,
          lastMessage: row.last_type === "image" ? "Photo" : row.last_body,
          lastMessageAt: row.last_at,
          online: online.has(row.id),
          user: profileCard(row, publicUrl()),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/matches/:matchId/messages", requireAuth, async (req, res, next) => {
    try {
      await loadMatch(req.params.matchId, req.userId);
      const result = await pool.query(
        `SELECT id, match_id, sender_id, body, created_at, attachment_path, attachment_name, attachment_type
         FROM messages
         WHERE match_id = $1
         ORDER BY created_at ASC
         LIMIT 200`,
        [req.params.matchId]
      );
      res.json({
        messages: result.rows.map((row) => mapMessage(row, publicUrl())),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/matches/:matchId/messages", requireAuth, async (req, res, next) => {
    try {
      const { otherId } = await loadMatch(req.params.matchId, req.userId);
      const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
      if (!body || body.length > 2000) {
        return res.status(400).json({ error: "Write a message under 2000 characters" });
      }
      const inserted = await pool.query(
        `INSERT INTO messages (match_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, match_id, sender_id, body, created_at, attachment_path, attachment_name, attachment_type`,
        [req.params.matchId, req.userId, body]
      );
      const message = mapMessage(inserted.rows[0], publicUrl());
      const io = req.app.get("io");
      io.to(`user:${req.userId}`).emit("message:new", message);
      io.to(`user:${otherId}`).emit("message:new", message);
      res.status(201).json({ message });
    } catch (error) {
      next(error);
    }
  });

  app.post("/matches/:matchId/attachments", requireAuth, (req, res, next) => {
    uploadAttachment.single("file")(req, res, async (uploadError) => {
      if (uploadError) return res.status(400).json({ error: uploadErrorMessage(uploadError) });
      if (!req.file) return res.status(400).json({ error: "Choose a file" });
      try {
        const { otherId } = await loadMatch(req.params.matchId, req.userId);
        const kind = imageTypes.has(req.file.mimetype) ? "image" : "file";
        const label = kind === "image" ? "Photo" : req.file.originalname.slice(0, 180);
        const name = await saveUpload(req.file);
        const inserted = await pool.query(
          `INSERT INTO messages (match_id, sender_id, body, attachment_path, attachment_name, attachment_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, match_id, sender_id, body, created_at, attachment_path, attachment_name, attachment_type`,
          [req.params.matchId, req.userId, label, name, req.file.originalname, kind]
        );
        const message = mapMessage(inserted.rows[0], publicUrl());
        const io = req.app.get("io");
        io.to(`user:${req.userId}`).emit("message:new", message);
        io.to(`user:${otherId}`).emit("message:new", message);
        res.status(201).json({ message });
      } catch (error) {
        next(error);
      }
    });
  });

  app.post("/blocks", requireAuth, async (req, res, next) => {
    try {
      const userId = req.body?.userId;
      if (typeof userId !== "string" || userId === req.userId) {
        return res.status(400).json({ error: "Choose someone to block" });
      }
      const exists = await pool.query("SELECT 1 FROM users WHERE id = $1", [userId]);
      if (!exists.rowCount) return res.status(404).json({ error: "Profile not found" });
      await pool.query(
        `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [req.userId, userId]
      );
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/reports", requireAuth, async (req, res, next) => {
    try {
      const userId = req.body?.userId;
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      if (typeof userId !== "string" || userId === req.userId) {
        return res.status(400).json({ error: "Choose someone to report" });
      }
      if (reason.length < 3 || reason.length > 500) {
        return res.status(400).json({ error: "Describe the report in 3-500 characters" });
      }
      const exists = await pool.query("SELECT 1 FROM users WHERE id = $1", [userId]);
      if (!exists.rowCount) return res.status(404).json({ error: "Profile not found" });
      await pool.query(
        "INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3)",
        [req.userId, userId, reason]
      );
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  registerAdminRoutes(app, { requireAuth, publicUrl, removeUpload });
}

module.exports = { registerRoutes, requireAuth, loadMatch, iceServers };
