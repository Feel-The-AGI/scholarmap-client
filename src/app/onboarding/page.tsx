"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";

// SpeechRecognition type declaration
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ExtractedData {
  full_name?: string;
  nationality?: string;
  country_of_residence?: string;
  current_education_level?: string;
  current_institution?: string;
  graduation_year?: number;
  gpa?: number;
  target_degree?: string;
  target_fields?: string[];
  preferred_countries?: string[];
  work_experience_years?: number;
  languages?: { language: string; proficiency: string }[];
  circumstances?: {
    financial_need?: boolean;
    refugee?: boolean;
    disability?: boolean;
    first_gen?: boolean;
  };
}

const INITIAL_MESSAGE = `Hey there! I'm Ada, your scholarship advisor. Let's chat for a couple of minutes so I can find the perfect scholarships for you.

What's your name and where are you from?`;

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [conversationStep, setConversationStep] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // LocalStorage key for this user
  const localStorageKey = user ? `scholarmap_onboarding_${user.id}` : null;

  // Save to localStorage (instant, no network)
  const saveToLocalStorage = useCallback((msgs: Message[], data: ExtractedData, step: number) => {
    if (!localStorageKey) return;
    try {
      localStorage.setItem(localStorageKey, JSON.stringify({
        messages: msgs,
        extracted_data: data,
        step: step,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn("LocalStorage save failed:", e);
    }
  }, [localStorageKey]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): { messages: Message[], extracted_data: ExtractedData, step: number } | null => {
    if (!localStorageKey) return null;
    try {
      const cached = localStorage.getItem(localStorageKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Only use if less than 24 hours old
        if (data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (e) {
      console.warn("LocalStorage load failed:", e);
    }
    return null;
  }, [localStorageKey]);

  // Clear localStorage on completion
  const clearLocalStorage = useCallback(() => {
    if (!localStorageKey) return;
    try {
      localStorage.removeItem(localStorageKey);
    } catch (e) {
      console.warn("LocalStorage clear failed:", e);
    }
  }, [localStorageKey]);

  // Save conversation progress to database + localStorage
  const saveConversationProgress = useCallback(async (
    msgs: Message[], 
    data: ExtractedData, 
    step: number,
    status: "started" | "in_progress" | "completed" = "in_progress"
  ) => {
    if (!user) return;
    
    // INSTANT: Save to localStorage first (no network delay)
    if (status !== "completed") {
      saveToLocalStorage(msgs, data, step);
    } else {
      clearLocalStorage(); // Clear on completion
    }
    
    // ASYNC: Save to database (can be slower)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      
      if (conversationId) {
        // Update existing conversation
        await client
          .from("onboarding_conversations")
          .update({
            messages: msgs,
            extracted_data: data,
            completion_status: status,
          })
          .eq("id", conversationId);
      } else {
        // Create new conversation
        const { data: newConv } = await client
          .from("onboarding_conversations")
          .insert({
            user_id: user.id,
            messages: msgs,
            extracted_data: data,
            completion_status: status,
          })
          .select("id")
          .single();
        
        if (newConv?.id) {
          setConversationId(newConv.id);
        }
      }
      console.log("Conversation saved at step", step);
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  }, [user, supabase, conversationId, saveToLocalStorage, clearLocalStorage]);

  // Load existing conversation on mount
  useEffect(() => {
    const loadExistingConversation = async () => {
      if (!user) {
        setLoadingConversation(false);
        return;
      }
      
      // FAST PATH: Check localStorage first (instant, no network)
      const cachedConv = loadFromLocalStorage();
      if (cachedConv && cachedConv.messages?.length > 0) {
        setMessages(cachedConv.messages);
        setExtractedData(cachedConv.extracted_data || {});
        setConversationStep(cachedConv.step || Math.floor(cachedConv.messages.length / 2));
        console.log("Restored from localStorage (instant)");
        setLoadingConversation(false);
        
        // Background: sync with database to get conversationId
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existingConv } = await (supabase as any)
            .from("onboarding_conversations")
            .select("id")
            .eq("user_id", user.id)
            .neq("completion_status", "completed")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          
          if (existingConv?.id) {
            setConversationId(existingConv.id);
          }
        } catch (e) {
          // Will create new on next save
        }
        return;
      }
      
      // SLOW PATH: Fetch from database
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingConv } = await (supabase as any)
          .from("onboarding_conversations")
          .select("*")
          .eq("user_id", user.id)
          .neq("completion_status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (existingConv && existingConv.messages?.length > 0) {
          // Resume existing conversation
          setMessages(existingConv.messages);
          setExtractedData(existingConv.extracted_data || {});
          setConversationId(existingConv.id);
          setConversationStep(Math.floor(existingConv.messages.length / 2));
          // Also cache to localStorage
          saveToLocalStorage(existingConv.messages, existingConv.extracted_data || {}, Math.floor(existingConv.messages.length / 2));
          console.log("Resumed from database", existingConv.id);
        } else {
          // Start fresh conversation
          const initialMsg: Message = {
            role: "assistant",
            content: INITIAL_MESSAGE,
            timestamp: new Date().toISOString(),
          };
          setMessages([initialMsg]);
        }
      } catch (error) {
        // No existing conversation, start fresh
        const initialMsg: Message = {
          role: "assistant",
          content: INITIAL_MESSAGE,
          timestamp: new Date().toISOString(),
        };
        setMessages([initialMsg]);
      } finally {
        setLoadingConversation(false);
      }
    };
    
    loadExistingConversation();
  }, [user, supabase, loadFromLocalStorage, saveToLocalStorage]);

  // Check for voice support
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      setVoiceSupported(true);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startListening = () => {
    if (!voiceSupported) return;
    
    const SpeechRecognitionClass = (window as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || 
      (window as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;
    
    recognitionRef.current = new SpeechRecognitionClass();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Call the backend to process the message and extract data
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AGENT_URL || "https://scholarmap-agent.onrender.com"}/onboarding/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages,
            current_step: conversationStep,
            extracted_data: extractedData,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      
      // Update extracted data
      const newExtractedData = { ...extractedData };
      if (data.extracted_data) {
        Object.entries(data.extracted_data).forEach(([key, value]) => {
          if (value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)) {
            (newExtractedData as Record<string, unknown>)[key] = value;
          }
        });
        setExtractedData(newExtractedData);
      }

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      const allMessages = [...updatedMessages, assistantMessage];
      setMessages(allMessages);
      
      // Update step
      const newStep = data.next_step;
      setConversationStep(newStep);

      // SAVE CONVERSATION PROGRESS after each exchange!
      await saveConversationProgress(
        allMessages, 
        newExtractedData, 
        newStep,
        data.is_complete ? "completed" : "in_progress"
      );

      // Check if conversation is complete - use accumulated data!
      if (data.is_complete) {
        await saveProfile(newExtractedData);
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Fallback: continue with simple flow
      handleSimpleFlow(userMessage.content);
    } finally {
      setLoading(false);
    }
  };

  // Simple fallback flow if API fails
  const handleSimpleFlow = (userInput: string) => {
    const step = conversationStep;
    let response = "";
    const newData: ExtractedData = { ...extractedData };

    switch (step) {
      case 0: { // Name and nationality
        const parts = userInput.split(/from|,/i);
        if (parts.length >= 1) newData.full_name = parts[0].replace(/i'm|i am|my name is/i, "").trim();
        if (parts.length >= 2) newData.nationality = parts[1].trim();
        response = `Nice to meet you${newData.full_name ? `, ${newData.full_name}` : ""}! What are you currently studying or what did you last complete? (e.g., "Finished BSc in Computer Science at MIT")`;
        setConversationStep(1);
        break;
      }
      case 1: { // Current education
        if (userInput.toLowerCase().includes("bachelor") || userInput.toLowerCase().includes("bsc") || userInput.toLowerCase().includes("ba")) {
          newData.current_education_level = "undergraduate";
        } else if (userInput.toLowerCase().includes("master") || userInput.toLowerCase().includes("msc") || userInput.toLowerCase().includes("ma")) {
          newData.current_education_level = "graduate";
        } else if (userInput.toLowerCase().includes("phd") || userInput.toLowerCase().includes("doctor")) {
          newData.current_education_level = "professional";
        } else if (userInput.toLowerCase().includes("high school") || userInput.toLowerCase().includes("secondary")) {
          newData.current_education_level = "high_school";
        }
        response = `Got it! So you're looking for a Master's, PhD, or another degree next? And which countries are you interested in studying in?`;
        setConversationStep(2);
        break;
      }
      case 2: { // Target degree and countries
        if (userInput.toLowerCase().includes("master")) newData.target_degree = "masters";
        else if (userInput.toLowerCase().includes("phd") || userInput.toLowerCase().includes("doctor")) newData.target_degree = "phd";
        else if (userInput.toLowerCase().includes("bachelor")) newData.target_degree = "bachelor";
        else if (userInput.toLowerCase().includes("postdoc")) newData.target_degree = "postdoc";
        
        const countries: string[] = [];
        if (userInput.toLowerCase().includes("us") || userInput.toLowerCase().includes("america") || userInput.toLowerCase().includes("usa")) countries.push("United States");
        if (userInput.toLowerCase().includes("uk") || userInput.toLowerCase().includes("britain") || userInput.toLowerCase().includes("england")) countries.push("United Kingdom");
        if (userInput.toLowerCase().includes("canada")) countries.push("Canada");
        if (userInput.toLowerCase().includes("germany")) countries.push("Germany");
        if (userInput.toLowerCase().includes("australia")) countries.push("Australia");
        newData.preferred_countries = countries;
        
        response = `Great choices! Quick question - what was your GPA (roughly)? And do you have any work experience?`;
        setConversationStep(3);
        break;
      }
      case 3: { // GPA and work experience
        const gpaMatch = userInput.match(/(\d+\.?\d*)/);
        if (gpaMatch) newData.gpa = parseFloat(gpaMatch[1]);
        
        const expMatch = userInput.match(/(\d+)\s*(year|month)/i);
        if (expMatch) {
          newData.work_experience_years = expMatch[2].toLowerCase() === "month" 
            ? Math.round(parseInt(expMatch[1]) / 12) 
            : parseInt(expMatch[1]);
        }
        
        response = `Last thing - any special circumstances that might help your application? (First-generation student, financial need, disability, refugee status?)`;
        setConversationStep(4);
        break;
      }
      case 4: { // Circumstances
        newData.circumstances = {
          financial_need: userInput.toLowerCase().includes("financial") || userInput.toLowerCase().includes("aid") || userInput.toLowerCase().includes("need"),
          first_gen: userInput.toLowerCase().includes("first") || userInput.toLowerCase().includes("first-gen") || userInput.toLowerCase().includes("first generation"),
          refugee: userInput.toLowerCase().includes("refugee") || userInput.toLowerCase().includes("displaced"),
          disability: userInput.toLowerCase().includes("disability") || userInput.toLowerCase().includes("disabled"),
        };
        
        response = `Perfect! I've got everything I need. Let me find the best scholarships for you...`;
        setConversationStep(5);
        
        // Save and complete
        setTimeout(() => saveProfile(newData), 1500);
        break;
      }
      default:
        response = "Thanks! Processing your information...";
    }

    setExtractedData(newData);
    const assistantMsg: Message = { role: "assistant", content: response, timestamp: new Date().toISOString() };
    const allMsgs = [...messages, { role: "user" as const, content: userInput, timestamp: new Date().toISOString() }, assistantMsg];
    setMessages(allMsgs);
    
    // Save fallback progress too
    saveConversationProgress(allMsgs, newData, step + 1, step >= 4 ? "completed" : "in_progress");
  };

  const saveProfile = async (data: ExtractedData) => {
    console.log("=== SAVE PROFILE STARTED ===");
    console.log("User:", user?.id);
    console.log("Data to save:", data);
    
    if (!user) {
      console.error("No user found, skipping save but redirecting...");
      router.push("/qualify?from=onboarding");
      return;
    }

    setIsCompleting(true);

    try {
      // Try to upsert user row (create if doesn't exist)
      console.log("Attempting to upsert users table...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: userError } = await (supabase as any)
        .from("users")
        .upsert({ 
          id: user.id,
          email: user.email,
          full_name: data.full_name || user.full_name,
          onboarding_complete: true 
        }, {
          onConflict: "id"
        });
      
      if (userError) {
        console.error("User update error (continuing anyway):", userError);
      } else {
        console.log("Users table updated successfully");
      }

      // Upsert academic profile
      console.log("Attempting to upsert academic_profiles...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase as any)
        .from("academic_profiles")
        .upsert({
          user_id: user.id,
          nationality: data.nationality,
          country_of_residence: data.country_of_residence,
          current_education_level: data.current_education_level,
          current_institution: data.current_institution,
          graduation_year: data.graduation_year,
          gpa: data.gpa,
          target_degree: data.target_degree,
          target_fields: data.target_fields || [],
          preferred_countries: data.preferred_countries || [],
          work_experience_years: data.work_experience_years || 0,
          languages: data.languages || [],
          circumstances: data.circumstances || {},
          profile_completeness: calculateCompleteness(data),
          ai_extracted: true,
        }, {
          onConflict: "user_id"
        });

      if (profileError) {
        console.error("Profile upsert error (continuing anyway):", profileError);
      } else {
        console.log("Academic profile upserted successfully");
      }

      console.log("Refreshing user...");
      await refreshUser().catch(e => console.error("Refresh user error:", e));
      
    } catch (error) {
      console.error("=== SAVE PROFILE ERROR ===", error);
    } finally {
      // ALWAYS redirect - don't leave user stuck
      console.log("=== REDIRECTING TO QUALIFY ===");
      router.push("/qualify?from=onboarding");
    }
  };

  const calculateCompleteness = (data: ExtractedData): number => {
    let score = 0;
    if (data.nationality) score += 15;
    if (data.current_education_level) score += 15;
    if (data.target_degree) score += 15;
    if (data.gpa) score += 10;
    if (data.preferred_countries?.length) score += 10;
    if (data.work_experience_years !== undefined) score += 10;
    if (data.circumstances && Object.keys(data.circumstances).length > 0) score += 10;
    if (data.target_fields?.length) score += 10;
    if (data.full_name) score += 5;
    return Math.min(100, score);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show loading while fetching conversation
  if (loadingConversation) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] bg-stone-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-stone-200 px-4 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm sm:text-base">A</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-stone-900 text-sm sm:text-base">Ada</h1>
            <p className="text-xs text-stone-500 truncate">Your Scholarship Advisor</p>
          </div>
        </div>
      </header>

      {/* Chat Area - scrollable */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 min-h-0">
        <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                    message.role === "user"
                      ? "bg-primary-500 text-white rounded-br-md"
                      : "bg-white shadow-md shadow-stone-200/50 text-stone-900 rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {(loading || isCompleting) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
                <div className="bg-white shadow-md shadow-stone-200/50 rounded-2xl rounded-bl-md px-3 sm:px-4 py-2 sm:py-3">
                {isCompleting ? (
                  <p className="text-stone-600 text-sm">Finding your scholarships...</p>
                ) : (
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - fixed at bottom */}
      <div className="flex-shrink-0 bg-white border-t border-stone-200 px-3 sm:px-4 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            {/* Voice Button */}
            {voiceSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-2 sm:p-3 rounded-xl transition-all flex-shrink-0 ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}

            {/* Text Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "Listening..." : "Type your message..."}
                disabled={loading || isListening}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-stone-200 focus:border-primary-500 focus:ring-0 transition-colors pr-12 text-stone-900 placeholder:text-stone-400 bg-white text-sm sm:text-base"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2 sm:p-3 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          <p className="text-xs text-stone-500 text-center mt-2 hidden sm:block">
            {voiceSupported ? "Tap the microphone to speak, or type your response" : "Type your response and press Enter"}
          </p>
        </div>
      </div>
    </div>
  );
}

