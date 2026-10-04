import { deleteSecret, readSecret, writeSecret } from "./storage";

const publishedServer = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "") || "";
export const DEFAULT_SERVER = publishedServer || "http://192.168.1.14:4000";
const URL_KEY = "eira_server";

let serverUrl = DEFAULT_SERVER;

export function getServerUrl() {
  return serverUrl;
}

export function mediaUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const base = new URL(serverUrl);
    return `${base.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export async function loadServerUrl() {
  if (publishedServer) {
    serverUrl = publishedServer;
    return serverUrl;
  }
  const stored = await readSecret(URL_KEY);
  if (stored) serverUrl = stored.replace(/\/$/, "");
  return serverUrl;
}

export async function saveServerUrl(url: string) {
  const next = url.trim().replace(/\/$/, "");
  if (!/^https?:\/\//.test(next)) {
    throw new Error("Server address must start with http:// or https://");
  }
  serverUrl = next;
  await writeSecret(URL_KEY, next);
}

export async function clearServerUrl() {
  serverUrl = DEFAULT_SERVER;
  await deleteSecret(URL_KEY);
}
