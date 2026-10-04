import { getServerUrl } from "./config";
import type { AdminContent, AdminReport, AdminSummary, AdminSupport, AdminUser, ChatMessage, Match, Profile, User } from "./types";

type Options = {
  method?: string;
  token?: string | null;
  body?: unknown;
  form?: FormData;
};

export async function apiRequest<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${getServerUrl()}${path}`, {
      method: options.method || "GET",
      headers,
      body,
    });
  } catch {
    throw new Error("Can't reach the server. Check the address and that the API is running.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Something went wrong");
  }
  return data as T;
}

export const api = {
  register: (body: unknown) =>
    apiRequest<{ token: string; user: User }>("/auth/register", { method: "POST", body }),
  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  forgotPassword: (email: string) =>
    apiRequest<{ ok: boolean }>("/auth/forgot", { method: "POST", body: { email } }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    apiRequest<{ ok: boolean }>("/auth/reset", {
      method: "POST",
      body: { email, code, newPassword },
    }),
  me: (token: string) => apiRequest<{ user: User }>("/me", { token }),
  updateMe: (token: string, body: unknown) =>
    apiRequest<{ user: User }>("/me", { method: "PATCH", token, body }),
  reverseGeocode: (token: string, latitude: number, longitude: number) =>
    apiRequest<{ city: string; country: string }>(
      `/geo/reverse?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
      { token }
    ),
  uploadPhoto: (token: string, form: FormData) =>
    apiRequest<{ user: User }>("/me/photo", { method: "POST", token, form }),
  deleteMe: (token: string) => apiRequest<{ ok: boolean }>("/me", { method: "DELETE", token }),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    apiRequest<{ ok: boolean }>("/me/password", {
      method: "POST",
      token,
      body: { currentPassword, newPassword },
    }),
  discover: (token: string) => apiRequest<{ profiles: Profile[] }>("/discover", { token }),
  swipe: (token: string, userId: string, liked: boolean) =>
    apiRequest<{ matched: boolean; match: { id: string; user: Profile } | null }>("/swipes", {
      method: "POST",
      token,
      body: { userId, liked },
    }),
  matches: (token: string) => apiRequest<{ matches: Match[] }>("/matches", { token }),
  messages: (token: string, matchId: string) =>
    apiRequest<{ messages: ChatMessage[] }>(`/matches/${matchId}/messages`, { token }),
  sendMessage: (token: string, matchId: string, body: string) =>
    apiRequest<{ message: ChatMessage }>(`/matches/${matchId}/messages`, {
      method: "POST",
      token,
      body: { body },
    }),
  sendAttachment: (token: string, matchId: string, form: FormData) =>
    apiRequest<{ message: ChatMessage }>(`/matches/${matchId}/attachments`, {
      method: "POST",
      token,
      form,
    }),
  block: (token: string, userId: string) =>
    apiRequest<{ ok: boolean }>("/blocks", { method: "POST", token, body: { userId } }),
  report: (token: string, userId: string, reason: string) =>
    apiRequest<{ ok: boolean }>("/reports", { method: "POST", token, body: { userId, reason } }),
  config: () =>
    apiRequest<{
      iceServers: { urls: string; username?: string; credential?: string }[];
      supportEmail?: string;
      copyright?: string;
    }>("/config"),
  sendSupport: (body: { email: string; topic: string; message: string }, token?: string | null) =>
    apiRequest<{ ok: boolean }>("/support", { method: "POST", token, body }),
  adminSummary: (token: string) => apiRequest<AdminSummary>("/admin/summary", { token }),
  adminUsers: (token: string, q = "", filter = "all") =>
    apiRequest<{ users: AdminUser[] }>(
      `/admin/users?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`,
      { token }
    ),
  adminReports: (token: string) => apiRequest<{ reports: AdminReport[] }>("/admin/reports", { token }),
  adminContent: (token: string, userId = "") =>
    apiRequest<{ items: AdminContent[] }>(`/admin/content?userId=${encodeURIComponent(userId)}`, { token }),
  adminSupport: (token: string) => apiRequest<{ requests: AdminSupport[] }>("/admin/support", { token }),
  closeSupport: (token: string, id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/support/${id}/close`, { method: "POST", token }),
  banUser: (token: string, userId: string, reason: string) =>
    apiRequest<{ ok: boolean }>(`/admin/users/${userId}/ban`, { method: "POST", token, body: { reason } }),
  unbanUser: (token: string, userId: string) =>
    apiRequest<{ ok: boolean }>(`/admin/users/${userId}/unban`, { method: "POST", token }),
  deleteUser: (token: string, userId: string) =>
    apiRequest<{ ok: boolean }>(`/admin/users/${userId}`, { method: "DELETE", token }),
  reviewReport: (token: string, reportId: string) =>
    apiRequest<{ ok: boolean }>(`/admin/reports/${reportId}/review`, { method: "POST", token }),
};
