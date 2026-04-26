/**
 * AuthProvider — manages user state, login/logout, cookie-based persistence.
 */

import { useCallback, useEffect, useState } from "react";
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from "../services/api";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiLogin(email, password);
    setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (email, username, password, fullName) => {
    const res = await apiRegister(email, username, password, fullName);
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

