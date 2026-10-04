const nodemailer = require("nodemailer");

function mailConfig() {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const from = (process.env.SMTP_FROM || "").trim() || user;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!host || !user || !pass || !from || !Number.isFinite(port)) return null;
  return { host, user, pass, from, port };
}

async function sendResetCode(to, code) {
  const config = mailConfig();
  if (!config) {
    const error = new Error("Email is not set up on this server yet.");
    error.status = 503;
    throw error;
  }
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  try {
    await transport.sendMail({
      from: config.from,
      to,
      subject: "Your Eira password code",
      text: `Your Eira password reset code is ${code}. It expires in 10 minutes.\n\nIf you did not ask for this, you can ignore this email.`,
    });
  } catch (error) {
    if (error && (error.code === "EAUTH" || error.responseCode === 535)) {
      const rejected = new Error("Gmail rejected the mailbox login. Put a Gmail app password in SMTP_PASS, then restart the API.");
      rejected.status = 502;
      throw rejected;
    }
    throw error;
  }
}

module.exports = { sendResetCode, mailConfigured: () => Boolean(mailConfig()) };
