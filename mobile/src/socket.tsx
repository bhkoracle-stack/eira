import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getServerUrl } from "./config";
import { useAuth } from "./auth";

export type IncomingCall = {
  matchId: string;
  fromUserId: string;
  fromName: string;
  kind?: "audio" | "video";
};

type SocketValue = {
  socket: Socket | null;
  incoming: IncomingCall | null;
  clearIncoming: () => void;
  setInCall: (value: boolean) => void;
  notice: { matchId: string; name: string } | null;
  clearNotice: () => void;
};

const SocketContext = createContext<SocketValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [notice, setNotice] = useState<{ matchId: string; name: string } | null>(null);
  const inCall = useRef(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setIncoming(null);
      return;
    }
    const next = io(getServerUrl(), {
      auth: { token },
      transports: ["websocket"],
    });
    next.on("call:invite", (payload: IncomingCall) => {
      if (inCall.current) {
        next.emit("call:reject", { matchId: payload.matchId });
        return;
      }
      setIncoming(payload);
    });
    next.on("match:new", (payload: { id: string; user: { displayName: string } }) => {
      setNotice({ matchId: payload.id, name: payload.user.displayName });
    });
    setSocket(next);
    return () => {
      next.removeAllListeners();
      next.close();
    };
  }, [token]);

  const value = useMemo<SocketValue>(
    () => ({
      socket,
      incoming,
      clearIncoming: () => setIncoming(null),
      setInCall: (next) => {
        inCall.current = next;
      },
      notice,
      clearNotice: () => setNotice(null),
    }),
    [socket, incoming, notice]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const value = useContext(SocketContext);
  if (!value) throw new Error("useSocket must be used inside SocketProvider");
  return value;
}
