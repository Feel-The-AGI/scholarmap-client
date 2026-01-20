"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, academicProfile, subscription, loading, signOut } = useAuth();
  const router = useRouter();

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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) return null;

  const completeness = academicProfile?.profile_completeness ?? 0;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-black text-stone-900">
              Scholar<span className="text-primary-500">Map</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-600">
                {user.full_name || user.email}
              </span>
              <div className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold uppercase">
                {subscription?.tier || "free"}
              </div>
              <button
                onClick={signOut}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Welcome back{user.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-stone-600">
            Here&apos;s your scholarship journey at a glance.
          </p>
        </motion.div>

        {/* Profile Completeness */}
        {completeness < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-amber-900">Complete Your Profile</h3>
                <p className="text-sm text-amber-700">
                  A complete profile helps us find better scholarship matches.
                </p>
              </div>
              <Link
                href="/onboarding"
                className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
              >
                Complete Now
              </Link>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${completeness}%` }}
              ></div>
            </div>
            <p className="text-xs text-amber-700 mt-2">{completeness}% complete</p>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link
              href="/qualify"
              className="block bg-white rounded-2xl p-6 shadow-lg shadow-stone-200/50 hover:shadow-xl transition-all group"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-stone-900 mb-1">Check Eligibility</h3>
              <p className="text-sm text-stone-600">Find scholarships you qualify for</p>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/programs"
              className="block bg-white rounded-2xl p-6 shadow-lg shadow-stone-200/50 hover:shadow-xl transition-all group"
            >
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent-200 transition-colors">
                <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="font-semibold text-stone-900 mb-1">Browse Programs</h3>
              <p className="text-sm text-stone-600">Explore all available scholarships</p>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="/profile"
              className="block bg-white rounded-2xl p-6 shadow-lg shadow-stone-200/50 hover:shadow-xl transition-all group"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-stone-900 mb-1">Your Profile</h3>
              <p className="text-sm text-stone-600">View and edit your information</p>
            </Link>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-lg shadow-stone-200/50"
        >
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Your Activity</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-stone-50 rounded-xl">
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-sm text-stone-600">Saved</p>
            </div>
            <div className="text-center p-4 bg-stone-50 rounded-xl">
              <p className="text-3xl font-bold text-accent-600">0</p>
              <p className="text-sm text-stone-600">Applied</p>
            </div>
            <div className="text-center p-4 bg-stone-50 rounded-xl">
              <p className="text-3xl font-bold text-emerald-600">0</p>
              <p className="text-sm text-stone-600">Matches</p>
            </div>
            <div className="text-center p-4 bg-stone-50 rounded-xl">
              <p className="text-3xl font-bold text-amber-600">{completeness}%</p>
              <p className="text-sm text-stone-600">Profile</p>
            </div>
          </div>
        </motion.div>

        {/* Upgrade CTA for Free Users */}
        {subscription?.tier === "free" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">Upgrade to Pro</h3>
                <p className="text-white/80">
                  Unlock unlimited AI matching, detailed insights, and application tracking.
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-stone-100 transition-colors shrink-0"
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
