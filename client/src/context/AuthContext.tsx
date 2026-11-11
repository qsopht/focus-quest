import { createContext, ReactNode, useContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearToken, getToken, setToken } from "../api/client";

interface AuthContextValue {
  isAuthed: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(() => !!getToken());
  const qc = useQueryClient();

  const login = (token: string) => {
    setToken(token);
    setIsAuthed(true);
  };

  const logout = () => {
    clearToken();
    qc.clear();
    setIsAuthed(false);
  };

  return <AuthContext.Provider value={{ isAuthed, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
