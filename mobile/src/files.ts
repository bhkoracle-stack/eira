const MAX_ENCODED_LENGTH = 4_500_000;

export function uploadBody(data: string, name: string, mime: string) {
  const cleaned = data.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  if (!cleaned) throw new Error("Could not read the selected file");
  if (cleaned.length > MAX_ENCODED_LENGTH) throw new Error("That file is too large. Try a smaller one.");
  const type = mime === "image/jpg" ? "image/jpeg" : mime || "application/octet-stream";
  return { data: cleaned, mime: type, name: name || "upload" };
}

function bytesToBase64(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += alphabet[(triple >> 18) & 63];
    out += alphabet[(triple >> 12) & 63];
    out += index + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : "=";
    out += index + 2 < bytes.length ? alphabet[triple & 63] : "=";
  }
  return out;
}

export async function readFileUpload(uri: string, name: string, mime: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Could not read the selected file");
  const bytes = new Uint8Array(await response.arrayBuffer());
  return uploadBody(bytesToBase64(bytes), name, mime);
}
