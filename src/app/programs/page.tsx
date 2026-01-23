"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Program } from "@/lib/types";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 15, filter: "blur(6px)" },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { type: "spring" as const, damping: 25, stiffness: 200 }
  }
};

const levelConfig: Record<string, { icon: string; label: string; color: string; bg: string; darkBg: string }> = {
  bachelor: { icon: "🎓", label: "Bachelor's", color: "text-blue-400", bg: "bg-blue-100", darkBg: "bg-blue-500/20" },
  masters: { icon: "📚", label: "Master's", color: "text-purple-400", bg: "bg-purple-100", darkBg: "bg-purple-500/20" },
  phd: { icon: "🔬", label: "PhD", color: "text-rose-400", bg: "bg-rose-100", darkBg: "bg-rose-500/20" },
  postdoc: { icon: "🏆", label: "Postdoc", color: "text-teal-400", bg: "bg-teal-100", darkBg: "bg-teal-500/20" },
};

export default function ProgramsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[150px]"></div>
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-12 h-12 border-4 border-stone-700 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-stone-400">Loading programs...</p>
        </div>
      </div>
    }>
      <ProgramsContent />
    </Suspense>
  );
}

function ProgramsContent() {
  const searchParams = useSearchParams();
  const level = searchParams.get("level");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      const supabase = createClient();
      let query = supabase.from("programs").select("*").eq("status", "active");
      if (level) query = query.eq("level", level);
      const { data } = await query.order("name");
      setPrograms(data ?? []);
      setLoading(false);
    };
    fetchPrograms();
  }, [level]);

  const levels = ["all", "bachelor", "masters", "phd", "postdoc"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[150px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-accent-500/10 rounded-full blur-[150px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <div className="relative py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-300 mb-6 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to home
            </Link>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {level ? (
                <>
                  {levelConfig[level]?.icon} {levelConfig[level]?.label || level.charAt(0).toUpperCase() + level.slice(1)}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">
                    Programs
                  </span>
                </>
              ) : (
                <>
                  All{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">
                    Programs
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg text-stone-400 max-w-2xl">
              {loading 
                ? "Loading scholarships..." 
                : `${programs.length} scholarship${programs.length !== 1 ? 's' : ''} available`
              }
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-24 z-40 px-6 py-4 bg-stone-950/80 backdrop-blur-xl border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
            {levels.map((l) => {
              const isActive = (l === "all" && !level) || l === level;
              const config = levelConfig[l];
              return (
                <Link
                  key={l}
                  href={l === "all" ? "/programs" : `/programs?level=${l}`}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30"
                      : "bg-white/5 text-stone-400 border border-white/10 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {config?.icon && <span>{config.icon}</span>}
                  {l === "all" ? "All" : config?.label || l}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="px-6 py-12 relative z-10">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 animate-pulse">
                  <div className="h-6 bg-white/10 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-white/5 rounded w-1/2 mb-4" />
                  <div className="h-16 bg-white/5 rounded mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-white/10 rounded-full" />
                    <div className="h-6 w-24 bg-white/10 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : programs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No programs found</h3>
              <p className="text-stone-400 mb-6">
                {level ? `No ${level} scholarships available yet.` : "No scholarships available yet."}
              </p>
              <Link
                href="/programs"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-400 bg-primary-500/10 rounded-xl hover:bg-primary-500/20 transition-colors border border-primary-500/20"
              >
                View all programs
              </Link>
            </motion.div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {programs.map((program) => {
                const config = levelConfig[program.level] || { icon: "📄", color: "text-stone-400", bg: "bg-stone-100", darkBg: "bg-stone-500/20" };
                return (
                  <motion.div key={program.id} variants={item}>
                    <Link
                      href={`/programs/${program.id}`}
                      className="group block h-full p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-primary-500/50 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-primary-500/10 transition-all hover:-translate-y-1"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-lg text-white group-hover:text-primary-400 transition-colors line-clamp-2 flex-1">
                          {program.name}
                        </h3>
                        <span className="text-2xl shrink-0">{config.icon}</span>
                      </div>

                      {/* Provider */}
                      <p className="text-sm text-stone-500 mb-4">{program.provider}</p>

                      {/* Description */}
                      {program.description && (
                        <p className="text-sm text-stone-400 line-clamp-2 mb-4 leading-relaxed">
                          {program.description}
                        </p>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${config.darkBg} ${config.color}`}>
                          {program.level}
                        </span>
                        <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-accent-500/20 text-accent-400 capitalize">
                          {program.funding_type.replace("_", " ")}
                        </span>
                      </div>

                      {/* Fields */}
                      {program.fields.length > 0 && (
                        <div className="pt-4 border-t border-white/5">
                          <div className="flex flex-wrap gap-1.5">
                            {program.fields.slice(0, 3).map((field) => (
                              <span key={field} className="text-xs px-2 py-1 rounded-lg bg-white/5 text-stone-400 border border-white/5">
                                {field}
                              </span>
                            ))}
                            {program.fields.length > 3 && (
                              <span className="text-xs px-2 py-1 text-stone-500">
                                +{program.fields.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hover indicator */}
                      <div className="flex items-center gap-1 mt-4 text-sm font-medium text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        View details
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
