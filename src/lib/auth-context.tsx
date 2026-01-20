"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { User, AcademicProfile, Subscription } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  academicProfile: AcademicProfile | null;
  subscription: Subscription | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [academicProfile, setAcademicProfile] = useState<AcademicProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchUserData = useCallback(async (userId: string, supabaseUserData?: SupabaseUser) => {
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (userData) {
        setUser(userData as User);
      } else if (supabaseUserData) {
        // Fallback: create a synthetic user object from Supabase auth data
        // This handles the case where the database trigger hasn't run yet
        setUser({
          id: supabaseUserData.id,
          email: supabaseUserData.email || "",
          full_name: supabaseUserData.user_metadata?.full_name || null,
          avatar_url: supabaseUserData.user_metadata?.avatar_url || null,
          onboarding_complete: false,
          subscription_tier: "free",
          created_at: supabaseUserData.created_at,
          last_active_at: new Date().toISOString(),
        });
        
        // Log the error for debugging but don't fail
        if (userError) {
          console.log("User profile not yet created, using auth metadata", userError.message);
        }
      }

      // Fetch academic profile
      const { data: profileData } = await supabase
        .from("academic_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (profileData) {
        setAcademicProfile(profileData as AcademicProfile);
      }

      // Fetch subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (subData) {
        setSubscription(subData as Subscription);
      } else {
        // Fallback: default subscription for new users
        setSubscription({
          id: "",
          user_id: userId,
          tier: "free",
          status: "active",
          stripe_customer_id: null,
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    if (supabaseUser?.id) {
      await fetchUserData(supabaseUser.id, supabaseUser);
    }
  }, [supabaseUser, fetchUserData]);

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setSupabaseUser(initialSession?.user ?? null);
        
        if (initialSession?.user?.id) {
          await fetchUserData(initialSession.user.id, initialSession.user);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
        
        if (newSession?.user?.id) {
          await fetchUserData(newSession.user.id, newSession.user);
        } else {
          setUser(null);
          setAcademicProfile(null);
          setSubscription(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [supabase, fetchUserData]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAcademicProfile(null);
    setSubscription(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        academicProfile,
        subscription,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
