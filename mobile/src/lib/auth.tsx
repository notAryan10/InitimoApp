import { createContext, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api";

type User = { _id: string; username: string; email: string; isAdult?: boolean };
type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
    isAdult: boolean
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On boot, a stored token means we're logged in until the server 401s.
  // ponytail: no JWT decode — first real call rejects a stale token.
  useEffect(() => {
    tokenStore.get().then((t) => {
      if (t) setUser({ _id: "me", username: "", email: "" });
      setLoading(false);
    });
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await api<{ token: string; user: User }>("/api/auth/login", {
      body: { email, password },
      auth: false,
    });
    await tokenStore.set(token);
    setUser(user);
  }

  async function signup(username: string, email: string, password: string, isAdult: boolean) {
    await api("/api/auth/signup", { body: { username, email, password, isAdult }, auth: false });
    await login(email, password); // signup returns no token — log in right after
  }

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout: async () => {
          await tokenStore.clear();
          setUser(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
