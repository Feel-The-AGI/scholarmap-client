"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic features",
    features: [
      "Browse all scholarships",
      "3 AI eligibility checks/month",
      "Save up to 5 scholarships",
      "Basic search filters",
    ],
    notIncluded: [
      "Unlimited AI matching",
      "Detailed insights",
      "Application tracking",
      "Priority support",
    ],
    cta: "Current Plan",
    ctaLink: "/signup",
    popular: false,
    tier: "free",
    gradient: "from-stone-600 to-stone-700",
    iconBg: "bg-stone-500/20",
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/month",
    description: "For serious scholarship seekers",
    features: [
      "Everything in Free",
      "Unlimited AI eligibility checks",
      "Detailed match insights",
      "Save unlimited scholarships",
      "Application tracking",
      "Deadline reminders",
      "Priority email support",
    ],
    notIncluded: [
      "AI essay review",
      "1-on-1 advisor chat",
    ],
    cta: "Upgrade to Pro",
    ctaLink: "/checkout?plan=pro",
    popular: true,
    tier: "pro",
    gradient: "from-primary-500 to-primary-600",
    iconBg: "bg-primary-500/20",
  },
  {
    name: "Premium",
    price: "$19.99",
    period: "/month",
    description: "Maximum support for your journey",
    features: [
      "Everything in Pro",
      "AI essay review (5/month)",
      "Personal advisor chat",
      "Document organization",
      "Interview prep resources",
      "Early access to new features",
      "Dedicated support",
    ],
    notIncluded: [],
    cta: "Go Premium",
    ctaLink: "/checkout?plan=premium",
    popular: false,
    tier: "premium",
    gradient: "from-accent-500 to-teal-600",
    iconBg: "bg-accent-500/20",
  },
];

export default function PricingPage() {
  const { user, subscription } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const currentTier = subscription?.tier || "free";

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 py-16 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[150px]"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-accent-500/10 rounded-full blur-[150px]"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-6">
            <span className="text-lg">💎</span>
            Simple Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Simple, Transparent{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">
              Pricing
            </span>
          </h1>
          <p className="text-xl text-stone-400 max-w-2xl mx-auto">
            Choose the plan that fits your scholarship journey. Upgrade or downgrade anytime.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-1.5 inline-flex border border-white/10">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                billingPeriod === "monthly"
                  ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billingPeriod === "yearly"
                  ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              Yearly
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400">-20%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className={`relative rounded-3xl overflow-hidden ${
                plan.popular 
                  ? "ring-2 ring-primary-500 shadow-2xl shadow-primary-500/20" 
                  : "border border-white/10"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-semibold text-center py-1.5">
                  MOST POPULAR
                </div>
              )}
              
              {/* Card background */}
              <div className={`bg-white/5 backdrop-blur-sm h-full ${plan.popular ? "pt-8" : ""}`}>
                <div className="p-8">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${plan.iconBg} flex items-center justify-center mb-4`}>
                    {plan.tier === "free" && <span className="text-2xl">🌱</span>}
                    {plan.tier === "pro" && <span className="text-2xl">🚀</span>}
                    {plan.tier === "premium" && <span className="text-2xl">👑</span>}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-stone-400 text-sm mb-6">{plan.description}</p>
                  
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-black text-white">
                      {billingPeriod === "yearly" && plan.price !== "$0"
                        ? `$${(parseFloat(plan.price.replace("$", "")) * 0.8 * 12).toFixed(0)}`
                        : plan.price}
                    </span>
                    <span className="text-stone-500">
                      {billingPeriod === "yearly" && plan.price !== "$0" ? "/year" : plan.period}
                    </span>
                  </div>

                  {/* CTA Button */}
                  {currentTier === plan.tier ? (
                    <div className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-stone-500 font-semibold text-center">
                      Current Plan
                    </div>
                  ) : (
                    <Link
                      href={user ? plan.ctaLink : "/signup"}
                      className={`block w-full py-3.5 rounded-xl font-semibold text-center transition-all ${
                        plan.popular
                          ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      {user ? plan.cta : "Get Started"}
                    </Link>
                  )}

                  {/* Features */}
                  <div className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-stone-300">{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 opacity-50">
                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <span className="text-sm text-stone-500">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-24"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
              },
              {
                q: "Is my payment secure?",
                a: "Absolutely. We use Stripe for payment processing, which is trusted by millions of businesses worldwide. We never store your card details."
              },
              {
                q: "What happens to my saved scholarships if I downgrade?",
                a: "Your saved scholarships are never deleted. If you exceed the free tier limit, you'll just need to upgrade again to save more."
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-stone-500 text-sm mb-6">Trusted by students worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-6 text-stone-500">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-sm text-stone-300">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              <span className="text-sm text-stone-300">Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-sm text-stone-300">Money-back Guarantee</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
