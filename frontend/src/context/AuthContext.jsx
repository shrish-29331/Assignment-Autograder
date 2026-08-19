import { createContext, useContext, useMemo, useState } from "react";
import { authApi } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("autograder_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username, password) => {
    const { data } = await authApi.login({ username, password });
    localStorage.setItem("autograder_token", data.access_token);
    localStorage.setItem("autograder_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (username, password, fullName, role) => {
    const { data } = await authApi.register({
      username,
      password,
      full_name: fullName,
      role,
    });
    localStorage.setItem("autograder_token", data.access_token);
    localStorage.setItem("autograder_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("autograder_token");
    localStorage.removeItem("autograder_user");
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, register, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
