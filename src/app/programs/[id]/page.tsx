"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Program, EligibilityRule, Requirement, Deadline } from "@/lib/types";

const levelConfig: Record<string, { icon: string; label: string; color: string; bg: string; darkBg: string }> = {
  bachelor: { icon: "🎓", label: "Bachelor's", color: "text-blue-400", bg: "bg-blue-100", darkBg: "bg-blue-500/20" },
  masters: { icon: "📚", label: "Master's", color: "text-purple-400", bg: "bg-purple-100", darkBg: "bg-purple-500/20" },
  phd: { icon: "🔬", label: "PhD", color: "text-rose-400", bg: "bg-rose-100", darkBg: "bg-rose-500/20" },
  postdoc: { icon: "🏆", label: "Postdoc", color: "text-teal-400", bg: "bg-teal-100", darkBg: "bg-teal-500/20" },
};

// Format eligibility rule value for human-readable display
function formatRuleValue(rule: EligibilityRule): string {
  const val = rule.value as Record<string, unknown>;
  const operator = rule.operator;
  const ruleType = rule.rule_type;

  if (operator === "exists" || operator === "=") {
    if (val.condition && typeof val.condition === "string") {
      return val.condition;
    }
    if (typeof val === "string") return val;
    const firstVal = Object.values(val).find(v => typeof v === "string");
    if (firstVal) return firstVal as string;
    return "Required";
  }

  if (operator === "in" || operator === "not_in") {
    const prefix = operator === "not_in" ? "Not from " : "";
    if (val.countries && Array.isArray(val.countries)) {
      const countries = val.countries as string[];
      if (countries.length <= 3) return prefix + countries.join(", ");
      return `${prefix}${countries.slice(0, 3).join(", ")} +${countries.length - 3} more`;
    }
    if (val.regions && Array.isArray(val.regions)) {
      return prefix + (val.regions as string[]).join(", ");
    }
    if (val.degrees && Array.isArray(val.degrees)) {
      return (val.degrees as string[]).join(", ");
    }
    if (val.groups && Array.isArray(val.groups)) {
      return (val.groups as string[]).join(", ");
    }
    const arrayVal = Object.values(val).find(v => Array.isArray(v)) as string[] | undefined;
    if (arrayVal) {
      if (arrayVal.length <= 3) return prefix + arrayVal.join(", ");
      return `${prefix}${arrayVal.slice(0, 3).join(", ")} +${arrayVal.length - 3} more`;
    }
  }

  if (operator === ">=" || operator === ">" || operator === "<=" || operator === "<") {
    const symbol = operator === ">=" ? "≥" : operator === "<=" ? "≤" : operator;
    if (ruleType === "gpa" && val.min !== undefined) {
      return `GPA ${symbol} ${val.min}`;
    }
    if (ruleType === "age" && val.max !== undefined) {
      return `Age ${symbol} ${val.max}`;
    }
    if (ruleType === "age" && val.min !== undefined) {
      return `Age ${symbol} ${val.min}`;
    }
    if (ruleType === "work_experience" && val.years !== undefined) {
      return `${symbol} ${val.years} year${val.years !== 1 ? "s" : ""} experience`;
    }
    if (val.min !== undefined) return `${symbol} ${val.min}`;
    if (val.max !== undefined) return `${symbol} ${val.max}`;
  }

  if (operator === "between") {
    if (val.min !== undefined && val.max !== undefined) {
      if (ruleType === "age") return `Age ${val.min}-${val.max}`;
      if (ruleType === "gpa") return `GPA ${val.min}-${val.max}`;
      return `${val.min} - ${val.max}`;
    }
  }

  const condition = val.condition || val.requirement || val.description;
  if (condition && typeof condition === "string") return condition;

  const jsonStr = JSON.stringify(val);
  if (jsonStr.length < 100) return jsonStr.replace(/[{}"]|\\n/g, "").replace(/,/g, ", ");
  return "See details";
}

export default function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{
    program: Program | null;
    rules: EligibilityRule[];
    requirements: Requirement[];
    deadlines: Deadline[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [{ data: program }, { data: rules }, { data: requirements }, { data: deadlines }] = await Promise.all([
        supabase.from("programs").select("*").eq("id", id).single(),
        supabase.from("eligibility_rules").select("*").eq("program_id", id),
        supabase.from("requirements").select("*").eq("program_id", id),
        supabase.from("deadlines").select("*").eq("program_id", id).order("deadline_date"),
      ]);
      setData({
        program: program as Program | null,
        rules: (rules ?? []) as EligibilityRule[],
        requirements: (requirements ?? []) as Requirement[],
        deadlines: (deadlines ?? []) as Deadline[],
      });
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[150px]"></div>
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-12 h-12 border-4 border-stone-700 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-stone-400">Loading program details...</p>
        </div>
      </div>
    );
  }

  if (!data?.program) {
    notFound();
  }

  const { program, rules, requirements, deadlines } = data;
  const config = levelConfig[program.level] || { icon: "📄", label: program.level, color: "text-stone-400", bg: "bg-stone-100", darkBg: "bg-stone-500/20" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[180px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[150px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      {/* Hero Section */}
      <div className="relative py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Breadcrumb */}
            <Link 
              href="/programs" 
              className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-300 mb-8 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All programs
            </Link>

            {/* Tags */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${config.darkBg} ${config.color}`}>
                <span>{config.icon}</span>
                {config.label}
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent-500/20 text-accent-400 capitalize">
                {program.funding_type.replace("_", " ")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {program.name}
            </h1>

            {/* Provider */}
            <p className="text-xl text-stone-400 mb-8">{program.provider}</p>

            {/* CTA */}
            <div className="flex flex-wrap gap-4">
              <a
                href={program.application_url || program.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 transition-all active:scale-[0.98]"
              >
                {program.application_url ? "Apply Now" : "Visit Official Site"}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              {program.application_url && (
                <a
                  href={program.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-stone-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
                >
                  Learn More
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </a>
              )}
              {program.last_verified_at && (
                <span className="inline-flex items-center gap-2 px-4 py-2 text-sm text-stone-500">
                  <svg className="w-4 h-4 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified {new Date(program.last_verified_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              {program.description && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    About This Scholarship
                  </h2>
                  <p className="text-stone-300 leading-relaxed">{program.description}</p>
                </motion.section>
              )}

              {/* Who Wins */}
              {program.who_wins && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="p-8 rounded-3xl bg-accent-500/10 border border-accent-500/20"
                >
                  <h2 className="text-xl font-bold text-accent-400 mb-4 flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    Who Usually Wins
                  </h2>
                  <p className="text-accent-200/80 leading-relaxed">{program.who_wins}</p>
                </motion.section>
              )}

              {/* Rejection Reasons */}
              {program.rejection_reasons && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20"
                >
                  <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    Common Rejection Reasons
                  </h2>
                  <p className="text-amber-200/80 leading-relaxed">{program.rejection_reasons}</p>
                </motion.section>
              )}

              {/* Countries Eligible */}
              {program.countries_eligible && program.countries_eligible.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-2xl">🌍</span>
                    Open to Applicants From
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {program.countries_eligible.slice(0, 20).map((country) => (
                      <span key={country} className="text-sm px-3 py-1.5 rounded-xl bg-primary-500/10 text-primary-300 border border-primary-500/20">
                        {country}
                      </span>
                    ))}
                    {program.countries_eligible.length > 20 && (
                      <span className="text-sm px-3 py-1.5 rounded-xl bg-white/5 text-stone-400">
                        +{program.countries_eligible.length - 20} more countries
                      </span>
                    )}
                  </div>
                </motion.section>
              )}

              {/* Benefits */}
              {program.benefits && Object.keys(program.benefits).length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.23 }}
                  className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20"
                >
                  <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    What&apos;s Covered
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {program.benefits.tuition && (
                      <div className="flex items-center gap-2 text-emerald-300">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Tuition fees
                      </div>
                    )}
                    {program.benefits.housing && (
                      <div className="flex items-center gap-2 text-emerald-300">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Housing/Accommodation
                      </div>
                    )}
                    {program.benefits.insurance && (
                      <div className="flex items-center gap-2 text-emerald-300">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Health insurance
                      </div>
                    )}
                    {program.benefits.stipend && (
                      <div className="flex items-center gap-2 text-emerald-300">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Stipend: {program.benefits.stipend}
                      </div>
                    )}
                    {program.benefits.travel && (
                      <div className="flex items-center gap-2 text-emerald-300">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Travel: {program.benefits.travel}
                      </div>
                    )}
                    {program.benefits.other && (
                      <div className="flex items-center gap-2 text-emerald-300 sm:col-span-2">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {program.benefits.other}
                      </div>
                    )}
                  </div>
                </motion.section>
              )}

              {/* Eligibility Rules */}
              {rules.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    Eligibility Criteria
                  </h2>
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <div key={rule.id} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-stone-300 capitalize font-medium">
                                {rule.rule_type}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                                rule.confidence === "high" ? "bg-emerald-500/20 text-emerald-400" :
                                rule.confidence === "medium" ? "bg-amber-500/20 text-amber-400" :
                                "bg-white/10 text-stone-500"
                              }`}>
                                {rule.confidence} confidence
                              </span>
                            </div>
                            <p className="text-stone-300 text-sm">
                              {formatRuleValue(rule)}
                            </p>
                            {rule.source_snippet && (
                              <p className="text-xs text-stone-500 mt-2 italic border-l-2 border-white/10 pl-3">
                                &quot;{rule.source_snippet}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Requirements */}
              {requirements.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    Application Requirements
                  </h2>
                  <div className="space-y-3">
                    {requirements.map((req) => (
                      <div key={req.id} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${req.mandatory ? "bg-primary-500" : "bg-stone-600"}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-lg bg-white/10 text-stone-300 capitalize font-medium">
                              {req.type}
                            </span>
                            {!req.mandatory && (
                              <span className="text-xs text-stone-500">Optional</span>
                            )}
                          </div>
                          <p className="text-stone-300 mt-1">{req.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Timeline */}
              {deadlines.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 sticky top-32"
                >
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-xl">📅</span>
                    Timeline
                  </h3>
                  <div className="relative pl-6">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-500 via-primary-500/50 to-white/10" />
                    
                    <div className="space-y-6">
                      {deadlines.map((deadline, i) => (
                        <div key={deadline.id} className="relative">
                          <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-stone-900 shadow-sm ${
                            i === 0 ? "bg-primary-500" : "bg-stone-600"
                          }`} />
                          
                          <div>
                            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                              {deadline.stage}
                            </span>
                            <div className="text-sm font-semibold text-white mt-0.5">
                              {new Date(deadline.deadline_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })}
                            </div>
                            {deadline.cycle && (
                              <span className="text-xs text-stone-500">{deadline.cycle}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Fields */}
              {program.fields.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  className="p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Fields of Study
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {program.fields.map((field) => (
                      <span key={field} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 text-stone-300 border border-white/5">
                        {field}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Quick Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-3xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20"
              >
                <h3 className="text-lg font-bold text-white mb-4">Quick Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Level</span>
                    <span className="capitalize text-white">{program.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Funding</span>
                    <span className="capitalize text-white">{program.funding_type.replace("_", " ")}</span>
                  </div>
                  {program.award_amount && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">Award</span>
                      <span className="text-white">{program.award_amount}</span>
                    </div>
                  )}
                  {program.duration && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">Duration</span>
                      <span className="text-white">{program.duration}</span>
                    </div>
                  )}
                  {program.host_institution && program.host_institution !== program.provider && (
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-400 shrink-0">Institution</span>
                      <span className="text-right text-white">{program.host_institution}</span>
                    </div>
                  )}
                  {program.countries_of_study && program.countries_of_study.length > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-400 shrink-0">Study in</span>
                      <span className="text-right text-white">
                        {program.countries_of_study.slice(0, 2).join(", ")}
                        {program.countries_of_study.length > 2 && ` +${program.countries_of_study.length - 2}`}
                      </span>
                    </div>
                  )}
                  {(program.age_min || program.age_max) && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">Age</span>
                      <span className="text-white">
                        {program.age_min && program.age_max ? `${program.age_min}-${program.age_max}` :
                         program.age_max ? `Up to ${program.age_max}` :
                         `${program.age_min}+`}
                      </span>
                    </div>
                  )}
                  {program.gpa_min && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">Min GPA</span>
                      <span className="text-white">{program.gpa_min}</span>
                    </div>
                  )}
                  {program.number_of_awards && (
                    <div className="flex justify-between">
                      <span className="text-stone-400"># Awards</span>
                      <span className="text-white">{program.number_of_awards}</span>
                    </div>
                  )}
                  {program.is_renewable !== null && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">Renewable</span>
                      <span className="text-white">{program.is_renewable ? "Yes" : "No"}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-400">Status</span>
                    <span className="flex items-center gap-1.5 text-white">
                      <span className={`w-2 h-2 rounded-full ${program.status === 'active' ? 'bg-accent-500' : 'bg-amber-500'}`} />
                      {program.status}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Language Requirements */}
              {program.language_requirements && program.language_requirements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32 }}
                  className="p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">🗣️</span>
                    Language Requirements
                  </h3>
                  <div className="space-y-2">
                    {program.language_requirements.map((req, i) => (
                      <div key={i} className="text-sm px-3 py-2 rounded-xl bg-white/5 text-stone-300 border border-white/5">
                        {req}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Contact */}
              {program.contact_email && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className="text-xl">✉️</span>
                    Contact
                  </h3>
                  <a 
                    href={`mailto:${program.contact_email}`}
                    className="text-sm text-primary-400 hover:text-primary-300 underline underline-offset-2"
                  >
                    {program.contact_email}
                  </a>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
