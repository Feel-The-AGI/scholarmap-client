export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      programs: {
        Row: {
          id: string;
          name: string;
          provider: string;
          level: "bachelor" | "masters" | "phd" | "postdoc";
          funding_type: "full" | "partial" | "tuition_only" | "stipend_only";
          countries_eligible: string[];
          countries_of_study: string[];
          fields: string[];
          official_url: string;
          description: string | null;
          who_wins: string | null;
          rejection_reasons: string | null;
          status: "active" | "paused" | "discontinued" | "unknown";
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
          // Enhanced fields
          application_url: string | null;
          benefits: {
            tuition?: boolean;
            stipend?: string;
            housing?: boolean;
            travel?: string;
            insurance?: boolean;
            other?: string;
          } | null;
          contact_email: string | null;
          host_institution: string | null;
          duration: string | null;
          age_min: number | null;
          age_max: number | null;
          gpa_min: number | null;
          language_requirements: string[];
          award_amount: string | null;
          number_of_awards: number | null;
          is_renewable: boolean | null;
        };
        Insert: Omit<Database["public"]["Tables"]["programs"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["programs"]["Insert"]>;
      };
      eligibility_rules: {
        Row: {
          id: string;
          program_id: string;
          rule_type: "gpa" | "degree" | "nationality" | "age" | "work_experience" | "language" | "other";
          operator: "=" | ">=" | "<=" | ">" | "<" | "in" | "not_in" | "exists" | "between";
          value: Json;
          confidence: "high" | "medium" | "inferred";
          source_snippet: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["eligibility_rules"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["eligibility_rules"]["Insert"]>;
      };
      requirements: {
        Row: {
          id: string;
          program_id: string;
          type: "transcript" | "cv" | "essay" | "references" | "proposal" | "test" | "interview" | "other";
          description: string;
          mandatory: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["requirements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["requirements"]["Insert"]>;
      };
      deadlines: {
        Row: {
          id: string;
          program_id: string;
          cycle: string;
          deadline_date: string;
          timezone: string;
          stage: "application" | "interview" | "nomination" | "result";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["deadlines"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["deadlines"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          nationality: string | null;
          degree: string | null;
          gpa_band: "below_2.5" | "2.5_3.0" | "3.0_3.5" | "3.5_4.0" | "above_4.0" | null;
          field: string | null;
          work_experience_years: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      agent_reviews: {
        Row: {
          id: string;
          program_id: string;
          issue_type: string;
          note: string;
          severity: "low" | "medium" | "high";
          resolved: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_reviews"]["Row"], "id" | "created_at">;
        Update: {
          program_id?: string;
          issue_type?: string;
          note?: string;
          severity?: "low" | "medium" | "high";
          resolved?: boolean;
        };
      };
      sources: {
        Row: {
          id: string;
          program_id: string;
          url: string;
          last_fetched_at: string;
          content_hash: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sources"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sources"]["Insert"]>;
      };
    };
  };
};

export type Program = Database["public"]["Tables"]["programs"]["Row"];
export type EligibilityRule = Database["public"]["Tables"]["eligibility_rules"]["Row"];
export type Requirement = Database["public"]["Tables"]["requirements"]["Row"];
export type Deadline = Database["public"]["Tables"]["deadlines"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// ============================================
// V2 User System Types
// ============================================

export type SubscriptionTier = "free" | "pro" | "premium";
export type EducationLevel = "high_school" | "undergraduate" | "graduate" | "professional";
export type TargetDegree = "bachelor" | "masters" | "phd" | "postdoc";
export type OnboardingStatus = "started" | "in_progress" | "completed" | "abandoned";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";
export type ApplicationStatus = "interested" | "applying" | "submitted" | "accepted" | "rejected";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  subscription_tier: SubscriptionTier;
  created_at: string;
  last_active_at: string;
}

export interface Language {
  language: string;
  proficiency: "native" | "fluent" | "intermediate" | "basic";
  test_scores?: {
    test: string;
    score: string;
  };
}

export interface Circumstances {
  financial_need?: boolean;
  refugee?: boolean;
  disability?: boolean;
  first_gen?: boolean;
}

export interface AcademicProfile {
  id: string;
  user_id: string;
  nationality: string | null;
  country_of_residence: string | null;
  date_of_birth: string | null;
  current_education_level: EducationLevel | null;
  current_institution: string | null;
  graduation_year: number | null;
  gpa: number | null;
  target_degree: TargetDegree | null;
  target_fields: string[];
  preferred_countries: string[];
  work_experience_years: number;
  languages: Language[];
  achievements: string[];
  circumstances: Circumstances;
  profile_completeness: number;
  ai_extracted: boolean;
  last_conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingConversation {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  extracted_data: Partial<AcademicProfile>;
  completion_status: OnboardingStatus;
  duration_seconds: number;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface SavedScholarship {
  id: string;
  user_id: string;
  program_id: string;
  notes: string | null;
  reminder_date: string | null;
  created_at: string;
  program?: Program; // Joined data
}

export interface Application {
  id: string;
  user_id: string;
  program_id: string;
  status: ApplicationStatus;
  deadline: string | null;
  submitted_at: string | null;
  notes: string | null;
  documents: { name: string; url: string }[];
  created_at: string;
  updated_at: string;
  program?: Program; // Joined data
}

export interface EligibilityCheck {
  id: string;
  user_id: string | null;
  results_summary: {
    eligible_count: number;
    likely_count: number;
    maybe_count: number;
    total_analyzed: number;
  } | null;
  programs_matched: number;
  created_at: string;
}
