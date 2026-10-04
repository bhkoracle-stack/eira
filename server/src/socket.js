const jwt = require("jsonwebtoken");
const { pool } = require("./db");
const { loadMatch } = require("./routes");

function attachSocket(io) {
  const online = new Map();
  io.online = online;

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Sign in required"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await pool.query("SELECT banned_at FROM users WHERE id = $1", [payload.sub]);
      if (!user.rows[0]) return next(new Error("Session expired"));
      if (user.rows[0].banned_at) return next(new Error("This account is banned"));
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error("Session expired"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    online.set(userId, (online.get(userId) || 0) + 1);
    socket.broadcast.emit("presence", { userId, online: true });

    socket.on("disconnect", () => {
      const nextCount = (online.get(userId) || 1) - 1;
      if (nextCount <= 0) {
        online.delete(userId);
        socket.broadcast.emit("presence", { userId, online: false });
      } else {
        online.set(userId, nextCount);
      }
    });

    socket.on("call:invite", async (payload, ack) => {
      try {
        const { otherId } = await loadMatch(payload?.matchId, userId);
        const room = io.sockets.adapter.rooms.get(`user:${otherId}`);
        if (!room || room.size === 0) {
          ack?.({ error: "They are not online right now" });
          return;
        }
        io.to(`user:${otherId}`).emit("call:invite", {
          matchId: payload.matchId,
          fromUserId: userId,
          fromName: payload.fromName,
          kind: payload.kind === "audio" ? "audio" : "video",
        });
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ error: error.status ? error.message : "Could not start the call" });
      }
    });

    socket.on("call:ready", async (payload) => {
      try {
        const { otherId } = await loadMatch(payload?.matchId, userId);
        io.to(`user:${otherId}`).emit("call:ready", { matchId: payload.matchId });
      } catch {
        /* ignore signaling for a match the user is not in */
      }
    });

    socket.on("call:reject", async (payload) => {
      try {
        const { otherId } = await loadMatch(payload?.matchId, userId);
        io.to(`user:${otherId}`).emit("call:reject", { matchId: payload.matchId });
      } catch {
        /* ignore */
      }
    });

    socket.on("call:offer", async (payload) => {
      try {
        const { otherId } = await loadMatch(payload?.matchId, userId);
        io.to(`user:${otherId}`).emit("call:offer", {
          matchId: payload.matchId,
          sdp: payload.sdp,
        });
      } catch {
        /* ignore */
      }
    });

    socket.on("call:answer", async (payload) => {
      try {
        const { otherId } = await loadMatch(payload?.matchId, userId);
        io.to(`user:${otherId}`).emit("call:answer", {
          matchId: payload.matchId,
          sdp: payload.sdp,
        });
      } catch {
        /* ignore */
      }
    });

    socket.on("call:ice", async (payload) => {
      try {
        const { otherId } = await loadMatch(payload?.matchId, userId);
        io.to(`user:${otherId}`).emit("call:ice", {
          matchId: payload.matchId,
          candidate: payload.candidate,
        });
      } catch {
        /* ignore */
      }
    });

    socket.on("call:end", async (payload) => {
      try {
        const { otherId } = await loadMatch(payload?.matchId, userId);
        io.to(`user:${otherId}`).emit("call:end", { matchId: payload.matchId });
      } catch {
        /* ignore */
      }
    });
  });

  return online;
}

module.exports = { attachSocket };
