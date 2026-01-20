import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error_param = searchParams.get("error");
  const error_description = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  // Handle OAuth errors (e.g., user denied access)
  if (error_param) {
    console.error("OAuth error:", error_param, error_description);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error_param)}`);
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("Code exchange error:", error.message);
        // If code already used or expired, try to get existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // User already has a session, redirect to dashboard
          return NextResponse.redirect(`${origin}${next}`);
        }
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
      }
      
      if (data.session) {
        // Check if user has completed onboarding
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("onboarding_complete")
            .eq("id", user.id)
            .single();
          
          // If onboarding not complete, redirect to onboarding
          if (profile && !(profile as { onboarding_complete: boolean }).onboarding_complete) {
            return NextResponse.redirect(`${origin}/onboarding`);
          }
        }
        
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (err) {
      console.error("Unexpected auth error:", err);
      return NextResponse.redirect(`${origin}/login?error=unexpected_error`);
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
