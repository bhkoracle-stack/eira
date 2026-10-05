const { pool, httpError } = require("./db");

function adminUser(row, publicUrl) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    age: Number(row.age),
    city: row.city || "",
    country: row.country || "",
    bio: row.bio || "",
    photoUrl: row.photo_path ? `${publicUrl}/uploads/${row.photo_path}` : null,
    role: row.role === "admin" ? "admin" : "user",
    banned: Boolean(row.banned_at),
    banReason: row.ban_reason || "",
    reportCount: Number(row.report_count) || 0,
    createdAt: row.created_at,
  };
}

function disconnectUser(app, userId) {
  const io = app.get("io");
  if (io) io.in(`user:${userId}`).disconnectSockets(true);
}

async function loadManagedUser(userId) {
  const result = await pool.query(
    `SELECT id, email, role, photo_path, banned_at
     FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

function registerAdminRoutes(app, { requireAuth, publicUrl, removeUpload }) {
  function requireAdmin(req, res, next) {
    requireAuth(req, res, (error) => {
      if (error) return next(error);
      if (req.role !== "admin") return res.status(403).json({ error: "Admin access required" });
      next();
    });
  }

  app.get("/admin/users", requireAdmin, async (req, res, next) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
      const filter = ["banned", "reported"].includes(req.query.filter) ? req.query.filter : "all";
      const result = await pool.query(
        `SELECT u.id, u.email, u.display_name, u.city, u.country, u.bio, u.photo_path, u.role, u.banned_at, u.ban_reason, u.created_at,
                EXTRACT(YEAR FROM age(u.birth_date))::int AS age,
                (SELECT count(*) FROM reports r WHERE r.reported_id = u.id) AS report_count
         FROM users u
         WHERE ($1 = '' OR u.display_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
           AND (
             $2 = 'all'
             OR ($2 = 'banned' AND u.banned_at IS NOT NULL)
             OR ($2 = 'reported' AND EXISTS (SELECT 1 FROM reports r WHERE r.reported_id = u.id))
           )
         ORDER BY (u.role = 'admin') DESC, u.banned_at DESC NULLS LAST, u.created_at DESC
         LIMIT 100`,
        [q, filter]
      );
      res.json({ users: result.rows.map((row) => adminUser(row, publicUrl(req))) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/admin/users/:id/ban", requireAdmin, async (req, res, next) => {
    try {
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      if (reason.length < 3 || reason.length > 500) {
        return res.status(400).json({ error: "Write a ban reason between 3 and 500 characters" });
      }
      const user = await loadManagedUser(req.params.id);
      if (!user) return res.status(404).json({ error: "Account not found" });
      if (user.id === req.userId || user.role === "admin") {
        return res.status(400).json({ error: "An admin account cannot be banned" });
      }
      await pool.query(
        "UPDATE users SET banned_at = now(), ban_reason = $2 WHERE id = $1",
        [user.id, reason]
      );
      await pool.query(
        "UPDATE reports SET status = 'reviewed' WHERE reported_id = $1 AND status = 'open'",
        [user.id]
      );
      disconnectUser(req.app, user.id);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/admin/users/:id/unban", requireAdmin, async (req, res, next) => {
    try {
      const user = await loadManagedUser(req.params.id);
      if (!user) return res.status(404).json({ error: "Account not found" });
      if (user.role === "admin") return res.status(400).json({ error: "An admin account cannot be changed here" });
      await pool.query("UPDATE users SET banned_at = NULL, ban_reason = NULL WHERE id = $1", [user.id]);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/admin/users/:id", requireAdmin, async (req, res, next) => {
    try {
      const user = await loadManagedUser(req.params.id);
      if (!user) return res.status(404).json({ error: "Account not found" });
      if (user.id === req.userId || user.role === "admin") {
        return res.status(400).json({ error: "An admin account cannot be deleted" });
      }
      const files = await pool.query(
        `SELECT attachment_path AS name FROM messages
         WHERE sender_id = $1 AND attachment_path IS NOT NULL`,
        [user.id]
      );
      disconnectUser(req.app, user.id);
      await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
      removeUpload(user.photo_path);
      for (const row of files.rows) removeUpload(row.name);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/admin/summary", requireAdmin, async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
           (SELECT count(*) FROM users WHERE role = 'user') AS people,
           (SELECT count(*) FROM users WHERE banned_at IS NOT NULL) AS banned,
           (SELECT count(*) FROM reports WHERE status = 'open') AS open_reports,
           (SELECT count(*) FROM support_requests WHERE status = 'open') AS open_support`
      );
      const row = result.rows[0];
      res.json({
        people: Number(row.people),
        banned: Number(row.banned),
        openReports: Number(row.open_reports),
        openSupport: Number(row.open_support),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/admin/support", requireAdmin, async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT s.id, s.email, s.topic, s.message, s.status, s.created_at, u.display_name
         FROM support_requests s
         LEFT JOIN users u ON u.id = s.user_id
         ORDER BY (s.status = 'open') DESC, s.created_at DESC
         LIMIT 100`
      );
      res.json({
        requests: result.rows.map((row) => ({
          id: row.id,
          email: row.email,
          topic: row.topic,
          message: row.message,
          status: row.status,
          createdAt: row.created_at,
          displayName: row.display_name || "",
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/admin/support/:id/close", requireAdmin, async (req, res, next) => {
    try {
      const updated = await pool.query(
        "UPDATE support_requests SET status = 'closed' WHERE id = $1 RETURNING id",
        [req.params.id]
      );
      if (!updated.rowCount) throw httpError(404, "Support message not found");
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/admin/reports", requireAdmin, async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT r.id, r.reason, r.status, r.created_at,
                reporter.display_name AS reporter_name,
                reporter.email AS reporter_email,
                u.id AS user_id, u.email, u.display_name, u.city, u.photo_path, u.role,
                u.banned_at, u.ban_reason, u.created_at AS user_created_at,
                EXTRACT(YEAR FROM age(u.birth_date))::int AS age,
                (SELECT count(*) FROM reports rr WHERE rr.reported_id = u.id) AS report_count
         FROM reports r
         JOIN users reporter ON reporter.id = r.reporter_id
         JOIN users u ON u.id = r.reported_id
         ORDER BY (r.status = 'open') DESC, r.created_at DESC
         LIMIT 100`
      );
      res.json({
        reports: result.rows.map((row) => ({
          id: row.id,
          reason: row.reason,
          status: row.status,
          createdAt: row.created_at,
          reporterName: row.reporter_name,
          reporterEmail: row.reporter_email,
          user: adminUser(
            {
              id: row.user_id,
              email: row.email,
              display_name: row.display_name,
              city: row.city,
              photo_path: row.photo_path,
              role: row.role,
              banned_at: row.banned_at,
              ban_reason: row.ban_reason,
              created_at: row.user_created_at,
              age: row.age,
              report_count: row.report_count,
            },
            publicUrl(req)
          ),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/admin/reports/:id/review", requireAdmin, async (req, res, next) => {
    try {
      const updated = await pool.query(
        "UPDATE reports SET status = 'reviewed' WHERE id = $1 RETURNING id",
        [req.params.id]
      );
      if (!updated.rowCount) throw httpError(404, "Report not found");
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/admin/content", requireAdmin, async (req, res, next) => {
    try {
      const userId = typeof req.query.userId === "string" ? req.query.userId : "";
      const photos = await pool.query(
        `SELECT u.id AS user_id, u.display_name, u.email, u.banned_at, u.photo_path AS path,
                'profile' AS kind, NULL::text AS body, u.created_at
         FROM users u
         WHERE u.photo_path IS NOT NULL AND u.role = 'user'
           AND ($1 = '' OR u.id::text = $1)
         ORDER BY u.created_at DESC
         LIMIT 80`,
        [userId]
      );
      const attachments = await pool.query(
        `SELECT u.id AS user_id, u.display_name, u.email, u.banned_at,
                m.attachment_path AS path, m.attachment_type AS kind, m.body, m.created_at
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.attachment_path IS NOT NULL
           AND ($1 = '' OR u.id::text = $1)
         ORDER BY m.created_at DESC
         LIMIT 80`,
        [userId]
      );
      const reported = await pool.query(
        `SELECT u.id AS user_id, u.display_name, u.email, u.banned_at,
                NULL::text AS path, 'message' AS kind, m.body, m.created_at
         FROM reports r
         JOIN users u ON u.id = r.reported_id
         JOIN matches mt ON mt.user_a = u.id OR mt.user_b = u.id
         JOIN messages m ON m.match_id = mt.id AND m.sender_id = u.id AND m.attachment_path IS NULL
         WHERE ($1 = '' OR u.id::text = $1)
         ORDER BY m.created_at DESC
         LIMIT 80`,
        [userId]
      );
      const items = [...photos.rows, ...attachments.rows, ...reported.rows]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((row) => ({
          id: `${row.kind}:${row.user_id}:${row.path || row.body}:${row.created_at}`,
          kind: row.kind === "image" ? "photo" : row.kind,
          url: row.path ? `${publicUrl(req)}/uploads/${row.path}` : null,
          body: row.body || "",
          createdAt: row.created_at,
          userId: row.user_id,
          displayName: row.display_name,
          email: row.email,
          banned: Boolean(row.banned_at),
        }));
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });
}

module.exports = { registerAdminRoutes };
