"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Program } from "@/lib/types";
import { Suspense } from "react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
  }
};

const item = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { type: "spring" as const, damping: 25, stiffness: 200 }
  }
};

const levelConfig = {
  bachelor: { icon: "🎓", label: "Bachelor's", color: "from-blue-500 to-indigo-600", darkBg: "bg-blue-500/20", textColor: "text-blue-400" },
  masters: { icon: "📚", label: "Master's", color: "from-purple-500 to-violet-600", darkBg: "bg-purple-500/20", textColor: "text-purple-400" },
  phd: { icon: "🔬", label: "PhD", color: "from-rose-500 to-pink-600", darkBg: "bg-rose-500/20", textColor: "text-rose-400" },
  postdoc: { icon: "🏆", label: "Postdoc", color: "from-teal-500 to-emerald-600", darkBg: "bg-teal-500/20", textColor: "text-teal-400" },
};

function AuthCodeHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      router.replace(`/auth/callback?code=${code}`);
    }
  }, [searchParams, router]);
  
  return null;
}

function HomeContent() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("programs").select("*").eq("status", "active").order("name");
      setPrograms(data ?? []);
      setLoading(false);
    };
    fetchPrograms();
  }, []);

  const levels = ["bachelor", "masters", "phd", "postdoc"] as const;
  const grouped = levels.reduce(
    (acc, level) => ({ ...acc, [level]: programs.filter((p) => p.level === level) }),
    {} as Record<string, Program[]>
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[150px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[150px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-40 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[150px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                AI-Powered Scholarship Discovery
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] mb-6">
                <span className="text-white">Your Path to</span>{" "}
                <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
                  Funded
                </span>
                <br />
                <span className="text-white">Education</span>
              </h1>

              <p className="text-lg md:text-xl text-stone-400 max-w-lg mb-8 leading-relaxed">
                Discover life-changing scholarships curated by AI, verified by humans. 
                From Bachelor&apos;s to PhD — find your perfect match.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/programs"
                  className="group inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 transition-all active:scale-[0.98]"
                >
                  Browse All Programs
                  <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/qualify"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98]"
                >
                  Check Eligibility
                </Link>
              </div>
            </motion.div>

            {/* Right: Stats Cards */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                {levels.map((level) => {
                  const config = levelConfig[level];
                  return (
                    <motion.div key={level} variants={item}>
                      <Link
                        href={`/programs?level=${level}`}
                        className="group relative block p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all hover:-translate-y-1"
                      >
                        {/* Gradient accent on hover */}
                        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r ${config.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${config.darkBg} mb-4`}>
                          <span className="text-2xl">{config.icon}</span>
                        </div>
                        <div className={`text-4xl font-bold ${config.textColor} mb-1`}>
                          {loading ? (
                            <span className="inline-block w-8 h-8 bg-white/10 rounded animate-pulse" />
                          ) : (
                            grouped[level]?.length ?? 0
                          )}
                        </div>
                        <div className="text-sm font-medium text-stone-300">{config.label}</div>
                        <div className="text-xs text-stone-500 mt-0.5">scholarships</div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Programs */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between mb-12"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Featured Programs
              </h2>
              <p className="text-stone-400">Recently added and verified opportunities</p>
            </div>
            <Link
              href="/programs"
              className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors"
            >
              View all
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 animate-pulse">
                  <div className="h-6 bg-white/10 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-white/5 rounded w-1/2 mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-white/5 rounded-full" />
                    <div className="h-6 w-24 bg-white/5 rounded-full" />
                  </div>
                </div>
              ))
            ) : (
              programs.slice(0, 6).map((program) => (
                <motion.div key={program.id} variants={item}>
                  <Link
                    href={`/programs/${program.id}`}
                    className="group block p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-primary-500/30 hover:bg-white/10 transition-all hover:-translate-y-1"
                  >
                    <h3 className="font-semibold text-lg text-white mb-1 group-hover:text-primary-400 transition-colors line-clamp-1">
                      {program.name}
                    </h3>
                    <p className="text-sm text-stone-400 mb-4">{program.provider}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${
                        program.level === 'phd' ? 'bg-rose-500/20 text-rose-400' :
                        program.level === 'masters' ? 'bg-purple-500/20 text-purple-400' :
                        program.level === 'bachelor' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-teal-500/20 text-teal-400'
                      }`}>
                        {program.level}
                      </span>
                      <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-accent-500/20 text-accent-400 capitalize">
                        {program.funding_type.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </motion.div>

          {programs.length > 6 && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mt-10 md:hidden"
            >
              <Link
                href="/programs"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300"
              >
                View all {programs.length} programs
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How ScholarMap Works
            </h2>
            <p className="text-stone-400 max-w-2xl mx-auto">
              We use AI to discover, extract, and verify scholarship information so you can focus on what matters — your application.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              { step: "01", title: "Discover", desc: "Our AI scans trusted sources to find scholarships matching your profile", icon: "🔍" },
              { step: "02", title: "Extract", desc: "Key details like eligibility, deadlines, and requirements are automatically extracted", icon: "📋" },
              { step: "03", title: "Match", desc: "Get personalized recommendations based on your background and goals", icon: "🎯" },
            ].map((stepItem) => (
              <motion.div
                key={stepItem.step}
                variants={item}
                className="relative group"
              >
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary-500/10 to-accent-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 mb-6">
                    <span className="text-3xl">{stepItem.icon}</span>
                  </div>
                  <span className="text-xs font-mono text-primary-400 font-semibold">{stepItem.step}</span>
                  <h3 className="text-xl font-bold text-white mt-1 mb-2">{stepItem.title}</h3>
                  <p className="text-stone-400 text-sm leading-relaxed">{stepItem.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary-500/20 via-accent-500/10 to-purple-500/20 border border-white/10 p-12 md:p-16 text-center"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary-500/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-accent-500/20 rounded-full blur-[100px]" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Find Your Perfect Scholarship?
              </h2>
              <p className="text-stone-400 max-w-xl mx-auto mb-8">
                Enter your details and let our AI match you with opportunities you actually qualify for.
              </p>
              <Link
                href="/qualify"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-stone-900 bg-white rounded-2xl shadow-xl hover:bg-stone-100 transition-all active:scale-[0.98]"
              >
                Check Your Eligibility
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trusted By / Stats Section */}
      <section className="py-16 px-6 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { value: `${programs.length}+`, label: "Active Scholarships" },
              { value: "50+", label: "Countries Covered" },
              { value: "$10M+", label: "Funding Available" },
              { value: "24/7", label: "AI Matching" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-stone-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <AuthCodeHandler />
      </Suspense>
      <HomeContent />
    </>
  );
}
