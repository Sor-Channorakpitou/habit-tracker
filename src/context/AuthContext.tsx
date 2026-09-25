import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  demoSignIn: (email?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial session fetch from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
      } else {
        // Check for local demo session
        const demoStored = localStorage.getItem("habit_pulse_demo_session");
        if (demoStored) {
          try {
            const parsed = JSON.parse(demoStored) as Session;
            setSession(parsed);
            setUser(parsed.user);
          } catch {
            localStorage.removeItem("habit_pulse_demo_session");
          }
        }
        setLoading(false);
      }
    });

    // 2. Real-time session listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
      } else {
        const demoStored = localStorage.getItem("habit_pulse_demo_session");
        if (!demoStored) {
          setUser(null);
          setSession(null);
        }
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const demoSignIn = async (email = "sarah.connor@habitpulse.io") => {
    const mockUser: User = {
      id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email,
    };
    const mockSession: Session = {
      access_token: "mock-jwt-token-demo",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh-token",
      user: mockUser,
    };
    try {
      localStorage.setItem("habit_pulse_demo_session", JSON.stringify(mockSession));
    } catch {
      // storage quota or incognito
    }
    setUser(mockUser);
    setSession(mockSession);
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (err: unknown) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err: unknown) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem("habit_pulse_demo_session");
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      return { error };
    } catch (err: unknown) {
      setUser(null);
      setSession(null);
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, demoSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
