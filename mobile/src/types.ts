export type Gender = "woman" | "man" | "nonbinary";
export type Interest = "women" | "men" | "everyone";

export type User = {
  id: string;
  email: string;
  displayName: string;
  age: number;
  birthDate: string;
  gender: Gender;
  interestedIn: Interest;
  bio: string;
  city: string;
  country: string;
  maxDistanceKm: number;
  photoUrl: string | null;
  role?: "user" | "admin";
};

export type Profile = {
  id: string;
  displayName: string;
  age: number;
  gender: Gender;
  bio: string;
  city: string;
  country: string;
  distanceKm: number | null;
  photoUrl: string | null;
};

export type Match = {
  id: string;
  createdAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  online: boolean;
  user: Profile;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  age: number;
  city: string;
  country?: string;
  bio?: string;
  photoUrl: string | null;
  role: "user" | "admin";
  banned: boolean;
  banReason: string;
  reportCount: number;
  createdAt: string;
};

export type AdminReport = {
  id: string;
  reason: string;
  status: "open" | "reviewed";
  createdAt: string;
  reporterName: string;
  reporterEmail: string;
  user: AdminUser;
};

export type AdminContent = {
  id: string;
  kind: "profile" | "photo" | "file" | "message";
  url: string | null;
  body: string;
  createdAt: string;
  userId: string;
  displayName: string;
  email: string;
  banned: boolean;
};

export type AdminSupport = {
  id: string;
  email: string;
  topic: string;
  message: string;
  status: "open" | "closed";
  createdAt: string;
  displayName: string;
};

export type AdminSummary = {
  people: number;
  banned: number;
  openReports: number;
  openSupport: number;
};

export type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
};
