import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getFirebaseClient } from "./firebase";

export type AuthStatus = "loading" | "authenticated" | "configMissing" | "error";

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  userId: string | null;
  error: string | null;
};

export const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  user: null,
  userId: null,
  error: null
});

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getFirebaseClient();

    if (!client) {
      setStatus("configMissing");
      return;
    }

    const unsubscribe = onAuthStateChanged(client.auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        setStatus("authenticated");
        return;
      }

      void signInAnonymously(client.auth).catch((authError: unknown) => {
        setError(authError instanceof Error ? authError.message : "Anonymous sign-in failed.");
        setStatus("error");
      });
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      userId: user?.uid ?? null,
      error
    }),
    [error, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
