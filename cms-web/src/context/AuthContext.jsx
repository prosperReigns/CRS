import { createContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../api/auth";
import { registerUnauthorizedHandler } from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = (payload) => {
    localStorage.setItem("user", JSON.stringify(payload.user));
    localStorage.setItem("accessToken", payload.access);
    localStorage.setItem("refreshToken", payload.refresh);
    setUser(payload.user);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  const value = useMemo(() => ({ user, setUser, login, logout }), [user]);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
    return () => registerUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken || user) return;

    getCurrentUser()
      .then((currentUser) => {
        localStorage.setItem("user", JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        logout();
      });
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
