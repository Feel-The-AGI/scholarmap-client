"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

function DashboardContent() {
  const { user, academicProfile, subscription, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [error, setError] = useState<string | null>(null);

  // Handle URL error (e.g., from failed OAuth)
  useEffect(() => {
    if (urlError) {
      setError(decodeURIComponent(urlError).replace(/\+/g, " "));
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [urlError]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Check if onboarding needs to be completed
  useEffect(() => {
    if (!loading && user && !user.onboarding_complete) {
      router.push("/onboarding");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stone-700 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-stone-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const completeness = academicProfile?.profile_completeness ?? 0;
  const firstName = user.full_name?.split(" ")[0] || "";

  const stats = [
    { label: "Saved", value: "0", icon: "💾", color: "from-blue-500 to-indigo-600", bgColor: "bg-blue-500/10" },
    { label: "Applied", value: "0", icon: "📤", color: "from-accent-500 to-teal-600", bgColor: "bg-accent-500/10" },
    { label: "Matches", value: "0", icon: "✨", color: "from-emerald-500 to-green-600", bgColor: "bg-emerald-500/10" },
    { label: "Profile", value: `${completeness}%`, icon: "👤", color: "from-amber-500 to-orange-600", bgColor: "bg-amber-500/10" },
  ];

  const quickActions = [
    {
      href: "/qualify",
      title: "Check Eligibility",
      description: "Find scholarships you qualify for",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-primary-500 to-primary-600",
      shadow: "shadow-primary-500/20",
    },
    {
      href: "/programs",
      title: "Browse Programs",
      description: "Explore all available scholarships",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: "from-accent-500 to-accent-600",
      shadow: "shadow-accent-500/20",
    },
    {
      href: "/onboarding",
      title: "Update Profile",
      description: "Improve your match accuracy",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary-500/5 blur-[150px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent-500/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-stone-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <h1 className="text-xl font-black text-white hidden sm:block">
                Scholar<span className="text-primary-400">Map</span>
              </h1>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user.full_name || user.email}</p>
                  <p className="text-xs text-stone-400 uppercase">{subscription?.tier || "free"} plan</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 rounded-xl text-sm font-medium text-stone-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Welcome back{firstName ? `, ${firstName}` : ""}! 👋
          </h1>
          <p className="text-stone-400 text-lg">
            Here&apos;s your scholarship journey at a glance.
          </p>
        </motion.div>

        {/* Profile Completeness */}
        {completeness < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="text-amber-400">⚡</span>
                  Complete Your Profile
                </h3>
                <p className="text-sm text-stone-400 mt-1">
                  A complete profile helps us find better scholarship matches.
                </p>
              </div>
              <Link
                href="/onboarding"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 text-sm whitespace-nowrap"
              >
                Complete Now
              </Link>
            </div>
            <div className="relative">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completeness}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                />
              </div>
              <p className="text-xs text-stone-500 mt-2">{completeness}% complete</p>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <div className={`w-10 h-1 rounded-full bg-gradient-to-r ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold text-white mb-1 group-hover:scale-105 transition-transform origin-left">
                {stat.value}
              </p>
              <p className="text-sm text-stone-400">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {quickActions.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <Link
                href={action.href}
                className={`block h-full p-6 rounded-2xl bg-gradient-to-br ${action.color} shadow-xl ${action.shadow} hover:scale-[1.02] transition-all group`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <h3 className="font-semibold text-white text-lg mb-1">{action.title}</h3>
                <p className="text-sm text-white/80">{action.description}</p>
                <div className="mt-4 flex items-center gap-1 text-white/80 text-sm font-medium">
                  <span>Get started</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Upgrade CTA for Free Users */}
        {subscription?.tier === "free" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-8 rounded-2xl bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-primary-500/20 border border-primary-500/20 relative overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-500/10 rounded-full blur-2xl" />
            
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <span>✨</span>
                  Upgrade to Pro
                </h3>
                <p className="text-stone-300">
                  Unlock unlimited AI matching, detailed insights, and application tracking.
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-6 py-3 bg-white text-stone-900 font-semibold rounded-xl hover:bg-stone-100 transition-colors shrink-0 shadow-xl"
              >
                View Plans
              </Link>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

// Loading fallback for Suspense
function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-stone-700 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-stone-500">Loading...</p>
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
