require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const { migrate } = require("./db");
const { registerRoutes } = require("./routes");
const { attachSocket } = require("./socket");

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(
  "/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Wait a few minutes and try again." },
  })
);
app.use(
  "/support",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many support messages. Try again later." },
  })
);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

registerRoutes(app);

app.get("/", (_req, res) => {
  res.type("html").send("<!doctype html><meta charset=\"utf-8\"><title>Eira</title><p>Eira API is running.</p>");
});

app.use((_req, res) => {
  res.status(404).json({ error: "That page was not found" });
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  const parseFailed = error.type === "entity.parse.failed";
  const status = parseFailed ? 400 : Number(error.status || error.statusCode) || 500;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  if (safeStatus >= 500) console.error(error);
  const message =
    safeStatus < 500 && typeof error.message === "string" && error.message
      ? parseFailed
        ? "That request was not valid"
        : error.message
      : "Something went wrong";
  res.status(safeStatus).json({ error: message });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const online = attachSocket(io);
app.set("io", io);
app.set("online", online);

const port = Number(process.env.PORT) || 4000;

migrate()
  .then(() => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`Eira API listening on http://0.0.0.0:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database setup failed", error);
    process.exit(1);
  });
