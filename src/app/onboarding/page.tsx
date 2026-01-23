"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";

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

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Conversation state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Audio state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize AudioContext
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play PCM audio from queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    setIsSpeaking(true);
    
    const audioContext = initAudioContext();
    
    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!;
      
      try {
        // Convert PCM to audio buffer (24kHz, 16-bit, mono)
        const bytes = new Uint8Array(audioData);
        const numSamples = bytes.length / 2;
        const audioBuffer = audioContext.createBuffer(1, numSamples, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        const dataView = new DataView(audioData);
        for (let i = 0; i < numSamples; i++) {
          const int16 = dataView.getInt16(i * 2, true);
          channelData[i] = int16 / 32768;
        }
        
        // Play buffer
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch (e) {
        console.error("Error playing audio:", e);
      }
    }
    
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, [initAudioContext]);

  // Connect to Live API
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      mediaStreamRef.current = stream;
      
      // Connect to WebSocket
      const wsUrl = (process.env.NEXT_PUBLIC_AGENT_URL || "https://scholarmap-agent.onrender.com")
        .replace("https://", "wss://")
        .replace("http://", "ws://");
      
      const ws = new WebSocket(`${wsUrl}/live/ada`);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setIsConnecting(false);
        
        // Start audio processing
        startAudioProcessing(stream);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "audio") {
          // Queue audio for playback
          const audioData = Uint8Array.from(atob(data.data), c => c.charCodeAt(0)).buffer;
          audioQueueRef.current.push(audioData);
          playNextAudio();
        } else if (data.type === "transcript") {
          // Update current transcript (Ada's response)
          setCurrentTranscript(data.data);
        } else if (data.type === "turn_complete") {
          // Ada finished speaking - add to messages
          if (currentTranscript) {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: currentTranscript,
              timestamp: new Date().toISOString()
            }]);
            setCurrentTranscript("");
          }
        } else if (data.type === "error") {
          console.error("Server error:", data.data);
          setConnectionError(data.data);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionError("Connection error");
        setIsConnecting(false);
      };
      
      ws.onclose = () => {
        console.log("WebSocket closed");
        setIsConnected(false);
        stopAudioProcessing();
      };
      
    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to connect");
      setIsConnecting(false);
    }
  }, [playNextAudio, currentTranscript]);

  // Start processing microphone audio
  const startAudioProcessing = useCallback((stream: MediaStream) => {
    const audioContext = initAudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create analyzer for audio level visualization
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);
    
    // Create processor to send audio to WebSocket
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    
    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isListening) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate audio level
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      setAudioLevel(Math.sqrt(sum / inputData.length) * 10);
      
      // Resample from AudioContext sample rate to 16kHz
      const targetSampleRate = 16000;
      const ratio = audioContext.sampleRate / targetSampleRate;
      const newLength = Math.round(inputData.length / ratio);
      const resampledData = new Int16Array(newLength);
      
      for (let i = 0; i < newLength; i++) {
        const srcIndex = Math.round(i * ratio);
        const sample = Math.max(-1, Math.min(1, inputData[srcIndex] || 0));
        resampledData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      
      // Send to WebSocket as base64
      const base64 = btoa(String.fromCharCode(...new Uint8Array(resampledData.buffer)));
      wsRef.current.send(JSON.stringify({ type: "audio", data: base64 }));
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    // Audio level animation
    const updateLevel = () => {
      if (!analyzer) return;
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(avg / 255);
      if (isConnected) requestAnimationFrame(updateLevel);
    };
    requestAnimationFrame(updateLevel);
  }, [initAudioContext, isListening, isConnected]);

  // Stop audio processing
  const stopAudioProcessing = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (!isConnected) {
      connect();
      return;
    }
    setIsListening(prev => !prev);
  }, [isConnected, connect]);

  // Send text message
  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    // Add user message
    setMessages(prev => [...prev, {
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    }]);
    
    // Send to WebSocket
    wsRef.current.send(JSON.stringify({ type: "text", data: text }));
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopAudioProcessing();
    setIsConnected(false);
    setIsListening(false);
  }, [stopAudioProcessing]);

  // Save profile when conversation is complete
  const saveProfile = useCallback(async () => {
    if (!user || isCompleting) return;
    
    setIsCompleting(true);
    
    try {
      // Parse extracted data from conversation (simplified - would need NLP in production)
      const profileData = {
        user_id: user.id,
        ...extractedData,
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      
      // Save to database
      const { error } = await client
        .from("academic_profiles")
        .upsert(profileData, { onConflict: "user_id" });
      
      if (error) throw error;
      
      // Update user's onboarding status
      await client
        .from("users")
        .update({ onboarding_complete: true })
        .eq("id", user.id);
      
      await refreshUser();
      router.push("/dashboard");
      
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setIsCompleting(false);
    }
  }, [user, extractedData, supabase, refreshUser, router, isCompleting]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/login?redirectTo=/onboarding");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
        <div className="w-12 h-12 border-4 border-stone-700 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex flex-col overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute -top-20 -left-20 w-80 h-80 bg-primary-500/10 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-20 -right-20 w-80 h-80 bg-accent-500/10 rounded-full blur-[120px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-4 border-b border-white/5 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center ${isSpeaking ? 'animate-pulse' : ''}`}>
                <span className="text-xl">🎓</span>
              </div>
              {isConnected && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-stone-900" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Ada</h1>
              <p className="text-xs text-stone-400">
                {isConnected ? (isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Connected") : "Voice Assistant"}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => router.push("/dashboard")}
            className="text-stone-400 hover:text-white transition-colors"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 relative z-10">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Initial prompt if not connected */}
          {!isConnected && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center">
                <span className="text-5xl">🎤</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Meet Ada, Your Scholarship Advisor</h2>
              <p className="text-stone-400 max-w-md mx-auto mb-8">
                Have a quick voice conversation with Ada to find scholarships perfectly matched to your profile.
              </p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-50"
              >
                {isConnecting ? "Connecting..." : "Start Conversation"}
              </button>
              {connectionError && (
                <p className="mt-4 text-red-400 text-sm">{connectionError}</p>
              )}
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user" 
                    ? "bg-primary-500 text-white" 
                    : "bg-white/10 text-stone-100 border border-white/5"
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Current transcript (Ada speaking) */}
          {currentTranscript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/10 text-stone-100 border border-white/5">
                <p className="text-sm leading-relaxed">{currentTranscript}</p>
              </div>
            </motion.div>
          )}

          {/* Speaking/Listening indicator */}
          {isConnected && (isSpeaking || isListening) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-1 rounded-full ${isSpeaking ? "bg-accent-500" : "bg-primary-500"}`}
                    animate={{
                      height: isSpeaking || isListening 
                        ? [8, 24 * (0.3 + Math.random() * 0.7), 8] 
                        : 8
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
                <span className="text-xs text-stone-400 ml-2">
                  {isSpeaking ? "Ada is speaking..." : "Listening..."}
                </span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Controls */}
      {isConnected && (
        <div className="flex-shrink-0 px-4 py-6 border-t border-white/5 relative z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            {/* Mic button */}
            <button
              onClick={toggleListening}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? "bg-red-500 shadow-lg shadow-red-500/40" 
                  : "bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50"
              }`}
            >
              {/* Audio level ring */}
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-400"
                  animate={{ scale: 1 + audioLevel * 0.5, opacity: 1 - audioLevel }}
                  transition={{ duration: 0.1 }}
                />
              )}
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {isListening ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                )}
              </svg>
            </button>

            {/* End conversation */}
            <button
              onClick={saveProfile}
              disabled={isCompleting || messages.length < 4}
              className="px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompleting ? "Saving..." : "Finish & Find Scholarships"}
            </button>
          </div>
          
          <p className="text-center text-xs text-stone-500 mt-4">
            {isListening ? "Tap the mic to stop" : "Tap the mic to speak"}
          </p>
        </div>
      )}
    </div>
  );
}
