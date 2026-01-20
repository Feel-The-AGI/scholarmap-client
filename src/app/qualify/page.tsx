"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";

type UserProfile = {
  nationality: string;
  age: number | null;
  degree: string;  // Current/highest degree
  target_degree: string;  // What they're looking for (bachelor, masters, phd, postdoc)
  gpa: number | null;
  field_of_study: string;
  work_experience_years: number;
  languages: string[];
  has_financial_need: boolean | null;
  is_refugee: boolean;
  has_disability: boolean;
  additional_info: string;
};

type ProgramMatch = {
  program_id: string;
  program_name: string;
  provider: string;
  level: string;
  funding_type: string;
  match_score: number;
  status: string;
  explanation: string;
  strengths: string[];
  concerns: string[];
  action_items: string[];
};

type EligibilityResults = {
  eligible: ProgramMatch[];
  likely_eligible: ProgramMatch[];
  maybe: ProgramMatch[];
  unlikely: ProgramMatch[];
  not_eligible: ProgramMatch[];
  total_programs_analyzed: number;
  processing_time: number;
  ai_summary: string;
};

const levelConfig: Record<string, { icon: string; color: string; bg: string }> = {
  bachelor: { icon: "🎓", color: "text-blue-700", bg: "bg-blue-100" },
  masters: { icon: "📚", color: "text-purple-700", bg: "bg-purple-100" },
  phd: { icon: "🔬", color: "text-rose-700", bg: "bg-rose-100" },
  postdoc: { icon: "🏆", color: "text-teal-700", bg: "bg-teal-100" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://scholarmap-agent.onrender.com";

export default function QualifyPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const fromOnboarding = searchParams.get("from") === "onboarding";
  
  const [form, setForm] = useState<UserProfile>({
    nationality: "",
    age: null,
    degree: "",
    target_degree: "",
    gpa: null,
    field_of_study: "",
    work_experience_years: 0,
    languages: [],
    has_financial_need: null,
    is_refugee: false,
    has_disability: false,
    additional_info: "",
  });
  const [results, setResults] = useState<EligibilityResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Check eligibility function
  const runEligibilityCheck = useCallback(async (profile: UserProfile) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/check-eligibility`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error("Eligibility check failed:", err);
      setError("Failed to analyze scholarships. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load profile from Supabase on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      try {
        console.log("Loading academic profile for user:", user.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile, error: profileError } = await (supabase as any)
          .from("academic_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          console.log("No profile found:", profileError);
          setLoadingProfile(false);
          return;
        }

        if (profile) {
          console.log("Loaded profile:", profile);
          
          // Map academic_profiles data to form structure
          const loadedForm: UserProfile = {
            nationality: profile.nationality || "",
            age: null, // Calculate from date_of_birth if needed
            degree: profile.current_education_level || "",
            target_degree: profile.target_degree || "",
            gpa: profile.gpa,
            field_of_study: profile.target_fields?.join(", ") || "",
            work_experience_years: profile.work_experience_years || 0,
            languages: profile.languages?.map((l: { language: string }) => l.language) || [],
            has_financial_need: profile.circumstances?.financial_need ?? null,
            is_refugee: profile.circumstances?.refugee ?? false,
            has_disability: profile.circumstances?.disability ?? false,
            additional_info: "",
          };

          setForm(loadedForm);
          setProfileLoaded(true);
          
          // If coming from onboarding AND we have a profile, auto-run check
          if (fromOnboarding && profile.nationality) {
            console.log("Auto-running eligibility check from onboarding...");
            runEligibilityCheck(loadedForm);
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user, supabase, fromOnboarding, runEligibilityCheck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    runEligibilityCheck(form);
  };

  // Count is available for future use
  // const totalMatches = results
  //   ? results.eligible.length + results.likely_eligible.length + results.maybe.length
  //   : 0;

  const renderProgramCard = (match: ProgramMatch, variant: "eligible" | "likely" | "maybe" | "unlikely") => {
    const config = levelConfig[match.level] || { icon: "📄", color: "text-stone-700", bg: "bg-stone-100" };
    const isExpanded = expandedProgram === match.program_id;
    
    const variantStyles = {
      eligible: "bg-green-50 border-green-200 hover:border-green-300",
      likely: "bg-accent-50 border-accent-200 hover:border-accent-300",
      maybe: "bg-amber-50 border-amber-200 hover:border-amber-300",
      unlikely: "bg-stone-50 border-stone-200 hover:border-stone-300",
    };

    return (
      <motion.div
        key={match.program_id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border-2 ${variantStyles[variant]} transition-all overflow-hidden`}
      >
        <button
          onClick={() => setExpandedProgram(isExpanded ? null : match.program_id)}
          className="w-full p-5 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-2xl">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-stone-900 line-clamp-2">{match.program_name}</h4>
                <p className="text-sm text-stone-500">{match.provider}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                match.match_score >= 75 ? "bg-green-100 text-green-700" :
                match.match_score >= 50 ? "bg-amber-100 text-amber-700" :
                "bg-stone-100 text-stone-600"
              }`}>
                {match.match_score}%
              </div>
              <svg 
                className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Brief explanation always visible */}
          <p className="mt-3 text-sm text-stone-600 line-clamp-2">{match.explanation}</p>
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-stone-200"
            >
              <div className="p-5 space-y-4">
                {/* Strengths */}
                {match.strengths.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Why you&apos;re a good fit
                    </h5>
                    <ul className="space-y-1">
                      {match.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Concerns */}
                {match.concerns.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Things to consider
                    </h5>
                    <ul className="space-y-1">
                      {match.concerns.map((c, i) => (
                        <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                          <span className="text-amber-500 mt-1">•</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action items */}
                {match.action_items.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-primary-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Next steps
                    </h5>
                    <ul className="space-y-1">
                      {match.action_items.map((a, i) => (
                        <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                          <span className="text-primary-500 mt-1">{i + 1}.</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* View details link */}
                <Link
                  href={`/programs/${match.program_id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 mt-2"
                >
                  View full program details
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative py-12 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-[10%] w-96 h-96 rounded-full bg-linear-to-tr from-accent-200/40 to-primary-200/20 blur-3xl" />
          <div className="absolute bottom-0 right-[20%] w-64 h-64 rounded-full bg-linear-to-tr from-primary-200/30 to-accent-200/10 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to home
            </Link>

            <div className="flex items-center gap-4 mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-100 text-accent-700 text-sm font-medium">
                <span className="text-xl">🤖</span>
                AI-Powered Matching
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4">
              Find Your Perfect
              <br />
              <span className="text-gradient">Scholarship Match</span>
            </h1>
            <p className="text-lg text-stone-500 max-w-xl">
              Our AI analyzes your profile against every scholarship to find your best opportunities with personalized insights.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Loading profile indicator */}
          {loadingProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-12"
            >
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-stone-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-stone-500">Loading your profile...</p>
              </div>
            </motion.div>
          )}

          {/* Show profile loaded indicator when coming from onboarding */}
          {!loadingProfile && fromOnboarding && profileLoaded && loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-green-800">Profile loaded from onboarding!</p>
                  <p className="text-sm text-green-600">Analyzing scholarships for you...</p>
                </div>
              </div>
            </motion.div>
          )}

          {!loadingProfile && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="relative p-8 md:p-10 rounded-4xl bg-white border border-stone-200/80 shadow-xl shadow-stone-200/30"
          >
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-10">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setStep(s)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      step >= s
                        ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                        : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {s}
                  </button>
                  <span className={`ml-3 text-sm font-medium hidden md:block ${step >= s ? "text-stone-900" : "text-stone-400"}`}>
                    {s === 1 ? "Background" : s === 2 ? "Academic" : "Circumstances"}
                  </span>
                  {s < 3 && <div className="w-16 md:w-24 h-0.5 mx-4 bg-stone-100 rounded" />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-stone-900 mb-3">
                        Nationality <span className="text-primary-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.nationality}
                        onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-stone-200 bg-stone-50 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100 outline-none transition-all text-stone-900 placeholder:text-stone-400"
                        placeholder="e.g., Nigerian, Ghanaian, Kenyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-stone-900 mb-3">
                        Age
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={70}
                        value={form.age || ""}
                        onChange={(e) => setForm({ ...form, age: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-stone-200 bg-stone-50 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100 outline-none transition-all text-stone-900 placeholder:text-stone-400"
                        placeholder="Your current age"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-3">
                      Field of Study / Interest
                    </label>
                    <input
                      type="text"
                      value={form.field_of_study}
                      onChange={(e) => setForm({ ...form, field_of_study: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-stone-200 bg-stone-50 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100 outline-none transition-all text-stone-900 placeholder:text-stone-400"
                      placeholder="e.g., Computer Science, Medicine, Business, Engineering"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-3">
                      Work Experience (years)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={form.work_experience_years}
                      onChange={(e) => setForm({ ...form, work_experience_years: parseInt(e.target.value) || 0 })}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-stone-200 bg-stone-50 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100 outline-none transition-all text-stone-900 placeholder:text-stone-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full px-8 py-4 rounded-2xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                  >
                    Continue
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-3">
                      Current / Highest Degree <span className="text-primary-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {["High School", "BSc/BA", "MSc/MA", "PhD", "Other"].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setForm({ ...form, degree: d })}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            form.degree === d
                              ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-3">
                      What degree are you looking for? <span className="text-primary-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: "bachelor", label: "Bachelor's", icon: "🎓" },
                        { value: "masters", label: "Master's", icon: "📚" },
                        { value: "phd", label: "PhD", icon: "🔬" },
                        { value: "postdoc", label: "Postdoc", icon: "🏆" },
                      ].map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setForm({ ...form, target_degree: d.value })}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                            form.target_degree === d.value
                              ? "bg-accent-500 text-white shadow-lg shadow-accent-500/30"
                              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          }`}
                        >
                          <span>{d.icon}</span>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-3">
                      GPA (on 4.0 scale)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={4}
                      value={form.gpa || ""}
                      onChange={(e) => setForm({ ...form, gpa: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-stone-200 bg-stone-50 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100 outline-none transition-all text-stone-900 placeholder:text-stone-400"
                      placeholder="e.g., 3.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-3">
                      Language Proficiency
                    </label>
                    <input
                      type="text"
                      value={form.languages.join(", ")}
                      onChange={(e) => setForm({ ...form, languages: e.target.value.split(",").map(l => l.trim()).filter(Boolean) })}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-stone-200 bg-stone-50 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100 outline-none transition-all text-stone-900 placeholder:text-stone-400"
                      placeholder="e.g., English (IELTS 7.5), French (B2)"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-4 rounded-2xl border-2 border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 px-8 py-4 rounded-2xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                    >
                      Continue
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-3">
                      Financial Situation
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: true, label: "Need financial aid" },
                        { value: false, label: "Can self-fund" },
                        { value: null, label: "Prefer not to say" },
                      ].map((opt) => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => setForm({ ...form, has_financial_need: opt.value })}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            form.has_financial_need === opt.value
                              ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-3">
                      Special Circumstances
                    </label>
                    <p className="text-sm text-stone-500 mb-3">
                      Many scholarships prioritize applicants from underrepresented groups
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={form.is_refugee}
                          onChange={(e) => setForm({ ...form, is_refugee: e.target.checked })}
                          className="w-5 h-5 rounded border-stone-300 text-primary-500 focus:ring-primary-500"
                        />
                        <div>
                          <span className="font-medium text-stone-900">Refugee or displaced person</span>
                          <p className="text-sm text-stone-500">Seeking asylum or forced to leave home country</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={form.has_disability}
                          onChange={(e) => setForm({ ...form, has_disability: e.target.checked })}
                          className="w-5 h-5 rounded border-stone-300 text-primary-500 focus:ring-primary-500"
                        />
                        <div>
                          <span className="font-medium text-stone-900">Person with disability</span>
                          <p className="text-sm text-stone-500">Physical, sensory, cognitive, or other disability</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-3">
                      Anything else we should know?
                    </label>
                    <textarea
                      value={form.additional_info}
                      onChange={(e) => setForm({ ...form, additional_info: e.target.value })}
                      rows={3}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-stone-200 bg-stone-50 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100 outline-none transition-all text-stone-900 placeholder:text-stone-400 resize-none"
                      placeholder="Leadership experience, awards, research interests, first-generation student, etc."
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-4 rounded-2xl border-2 border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !form.nationality || !form.degree || !form.target_degree}
                      className="flex-1 px-8 py-4 rounded-2xl bg-linear-to-r from-primary-600 to-primary-500 text-white font-semibold shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          AI is analyzing scholarships...
                        </>
                      ) : (
                        <>
                          Find My Matches
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Results */}
          <AnimatePresence>
            {results && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-12 space-y-8"
              >
                {/* AI Summary */}
                <div className="p-6 rounded-3xl bg-linear-to-tr from-primary-50 to-accent-50 border border-primary-200">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">🤖</span>
                    <div>
                      <h3 className="font-bold text-stone-900 mb-2">AI Analysis Summary</h3>
                      <p className="text-stone-700 leading-relaxed">{results.ai_summary}</p>
                      <p className="text-sm text-stone-500 mt-3">
                        Analyzed {results.total_programs_analyzed} scholarships in {results.processing_time.toFixed(1)}s
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-center">
                    <div className="text-3xl font-bold text-green-700">{results.eligible.length}</div>
                    <div className="text-sm text-green-600">Eligible</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-accent-50 border border-accent-200 text-center">
                    <div className="text-3xl font-bold text-accent-700">{results.likely_eligible.length}</div>
                    <div className="text-sm text-accent-600">Likely</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                    <div className="text-3xl font-bold text-amber-700">{results.maybe.length}</div>
                    <div className="text-sm text-amber-600">Maybe</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center">
                    <div className="text-3xl font-bold text-stone-600">{results.not_eligible.length}</div>
                    <div className="text-sm text-stone-500">Not Eligible</div>
                  </div>
                </div>

                {/* Eligible */}
                {results.eligible.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <span className="text-xl">✅</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">Perfect Matches</h3>
                        <p className="text-sm text-stone-500">You meet all the requirements</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {results.eligible.map((m) => renderProgramCard(m, "eligible"))}
                    </div>
                  </section>
                )}

                {/* Likely Eligible */}
                {results.likely_eligible.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
                        <span className="text-xl">🎯</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">Likely Eligible</h3>
                        <p className="text-sm text-stone-500">Strong candidates with minor gaps</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {results.likely_eligible.map((m) => renderProgramCard(m, "likely"))}
                    </div>
                  </section>
                )}

                {/* Maybe */}
                {results.maybe.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <span className="text-xl">🤔</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">Worth Exploring</h3>
                        <p className="text-sm text-stone-500">May require additional qualifications</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {results.maybe.slice(0, 5).map((m) => renderProgramCard(m, "maybe"))}
                    </div>
                    {results.maybe.length > 5 && (
                      <p className="text-center text-sm text-stone-500 mt-4">
                        +{results.maybe.length - 5} more programs
                      </p>
                    )}
                  </section>
                )}

                {/* Browse All CTA */}
                <div className="text-center pt-8">
                  <Link
                    href="/programs"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Browse all programs
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
