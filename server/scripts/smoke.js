const base = process.env.API_URL || "http://127.0.0.1:4000";

async function req(path, options = {}) {
  const headers = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(`${base}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const health = await req("/health");
  assert(health.status === 200 && health.data.ok, "health check failed");

  const underage = await req("/auth/register", {
    method: "POST",
    body: {
      email: "kid@vela.test",
      password: "password123",
      displayName: "Too Young",
      birthDate: "2015-01-01",
      gender: "woman",
      interestedIn: "everyone",
      city: "Pune",
      bio: "",
    },
  });
  assert(underage.status === 400, "underage signup should be rejected");

  const maya = await req("/auth/login", {
    method: "POST",
    body: { email: "maya@vela.test", password: "password123" },
  });
  const arjun = await req("/auth/login", {
    method: "POST",
    body: { email: "arjun@vela.test", password: "password123" },
  });
  assert(maya.status === 200 && arjun.status === 200, "sample login failed");

  const mayaDeck = await req("/discover", { token: maya.data.token });
  const arjunCard = mayaDeck.data.profiles.find((person) => person.displayName === "Arjun Mehta");
  assert(arjunCard, "Maya should see Arjun");

  await req("/swipes", {
    method: "POST",
    token: maya.data.token,
    body: { userId: arjunCard.id, liked: true },
  });

  const arjunDeck = await req("/discover", { token: arjun.data.token });
  const mayaCard = arjunDeck.data.profiles.find((person) => person.displayName === "Maya Shah");
  assert(mayaCard, "Arjun should see Maya");

  const swipe = await req("/swipes", {
    method: "POST",
    token: arjun.data.token,
    body: { userId: mayaCard.id, liked: true },
  });
  assert(swipe.status === 200 && swipe.data.matched, "mutual like should match");

  const sent = await req(`/matches/${swipe.data.match.id}/messages`, {
    method: "POST",
    token: maya.data.token,
    body: { body: "Coffee this week?" },
  });
  assert(sent.status === 201, "message send failed");

  const history = await req(`/matches/${swipe.data.match.id}/messages`, { token: arjun.data.token });
  assert(
    history.data.messages.some((message) => message.body === "Coffee this week?"),
    "message was not stored"
  );

  const stranger = await req("/matches/00000000-0000-0000-0000-000000000000/messages", {
    token: maya.data.token,
  });
  assert(stranger.status === 404, "messages outside a match should be hidden");

  console.log("Smoke test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
