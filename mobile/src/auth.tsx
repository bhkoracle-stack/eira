import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { loadServerUrl } from "./config";
import { deleteSecret, readSecret, writeSecret } from "./storage";
import type { User } from "./types";

const TOKEN_KEY = "eira_token";

type AuthValue = {
  user: User | null;
  token: string | null;
  booting: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadServerUrl();
        const stored = await readSecret(TOKEN_KEY);
        if (!stored) return;
        const result = await api.me(stored);
        if (!active) return;
        setToken(stored);
        setUser(result.user);
      } catch {
        await deleteSecret(TOKEN_KEY);
      } finally {
        if (active) setBooting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      token,
      booting,
      setUser,
      signIn: async (nextToken, nextUser) => {
        await writeSecret(TOKEN_KEY, nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      signOut: async () => {
        await deleteSecret(TOKEN_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
