import React, { createContext, useContext, useState, useEffect } from "react";
import { authService, isSupabaseConfigured } from "../services/supabaseApi";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if Supabase is configured
    setIsConfigured(isSupabaseConfigured());

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    authService.getSession().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email, password, username) => {
    const data = await authService.signUp(email, password, username);
    return data;
  };

  const signIn = async (email, password) => {
    const data = await authService.signIn(email, password);
    setSession(data.session);
    setUser(data.user);
    return data;
  };

  const signInWithGoogle = async () => {
    const data = await authService.signInWithGoogle();
    return data;
  };

  const signOut = async () => {
    await authService.signOut();
    setSession(null);
    setUser(null);
  };

  const value = {
    user,
    session,
    loading,
    isConfigured,
    signUp,
    signInWithGoogle,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
