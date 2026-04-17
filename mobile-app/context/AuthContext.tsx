import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login, register, setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import Constants from "expo-constants";

type AuthContextValue = {
  token: string | null;
  loading: boolean;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const TOKEN_KEY = "@smarthome_token";
const EMAIL_KEY = "@smarthome_email";

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveApiBaseUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv;

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  if (!host) return null;
  return `http://${host}:3000`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBaseUrl(resolveApiBaseUrl());
    setAuthTokenGetter(async () => AsyncStorage.getItem(TOKEN_KEY));
  }, []);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(EMAIL_KEY)])
      .then(([t, e]) => {
        setToken(t);
        setEmail(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      email,
      loading,
      async signIn(userEmail: string, password: string) {
        const res = await login({ email: userEmail, password });
        setToken(res.token);
        setEmail(res.user.email);
        await AsyncStorage.multiSet([
          [TOKEN_KEY, res.token],
          [EMAIL_KEY, res.user.email],
        ]);
      },
      async signUp(userEmail: string, password: string) {
        const res = await register({ email: userEmail, password });
        setToken(res.token);
        setEmail(res.user.email);
        await AsyncStorage.multiSet([
          [TOKEN_KEY, res.token],
          [EMAIL_KEY, res.user.email],
        ]);
      },
      async signOut() {
        setToken(null);
        setEmail(null);
        await AsyncStorage.multiRemove([TOKEN_KEY, EMAIL_KEY]);
      },
    }),
    [token, email, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

