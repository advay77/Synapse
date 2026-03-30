"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Send, 
  Sparkles, Users2, Brain, 
  MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMeeting } from "@/hooks/useMeeting";
import { cn } from "@/lib/utils"; // Assume utility for tailwind classes

export default function MeetingRoom() {
  const { id: roomId } = useParams<{ id: string }>();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = sessionStorage.getItem("synapse_user");
    if (!user) {
      router.push("/");
      return;
    }
    setUsername(JSON.parse(user).username);
  }, [router]);

  const { 
    participants, 
    messages, 
    aiStatus, 
    isMicOn, 
    isCamOn, 
    streams, 
    toggleMic, 
    toggleCam, 
    askAi 
  } = useMeeting(roomId, username);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!username) return null;

  return (
    <main className="h-screen bg-[#0a0a0a] overflow-hidden flex flex-col font-sans">
      {/* Top Navbar */}
      <nav className="h-16 flex items-center justify-between px-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold">S</div>
          <span className="font-heading font-bold text-lg tracking-tight">Synapse</span>
          <div className="ml-4 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-[10px] font-bold text-orange-500/80 uppercase">Live Session</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-zinc-400">
          <button className="hover:text-white transition-colors">Docs</button>
          <button className="hover:text-white transition-colors">About</button>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center cursor-pointer">
            <Users2 className="w-4 h-4" />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video Grid */}
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
            {/* User Video */}
            <VideoCard 
              name={username} 
              stream={streams.me} 
              isMe={true} 
              isMicOn={isMicOn}
              isCamOn={isCamOn}
            />

            {/* Other Participants */}
            {participants.map(p => (
                p.id !== username && // Simple check for now
                <VideoCard 
                  key={p.id} 
                  name={p.name} 
                  stream={streams[p.id]} 
                />
            ))}

            {/* AI Co-Pilot Card */}
            <AICard status={aiStatus} />
          </div>
        </div>

        {/* Right: Intelligence Feed Sidebar */}
        <div className="w-[380px] border-l border-white/5 bg-[#0d0d0d] flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
               Intelligence Feed
            </h2>
            <MoreHorizontal className="w-4 h-4 text-zinc-600" />
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 space-y-6 pb-6"
          >
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      m.sender === "Synapse AI" ? "text-indigo-400" : 
                      m.sender === "System" ? "text-orange-500" : "text-zinc-500"
                    )}>
                      {m.sender} {m.sender === "Synapse AI" && <Sparkles className="inline w-2.5 h-2.5 ml-1" />}
                    </span>
                    <span className="text-[9px] text-zinc-600">{m.timestamp}</span>
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    m.sender === "Synapse AI" 
                      ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-100" 
                      : m.sender === "System"
                      ? "bg-orange-500/5 border border-orange-500/10 text-orange-200/60 italic text-xs"
                      : "bg-white/5 border border-white/5 text-zinc-300"
                  )}>
                    {m.text}
                    {m.sender === "Synapse AI" && (
                       <div className="flex gap-2 mt-3">
                          <button className="px-3 py-1 rounded bg-indigo-500/20 border border-indigo-500/30 text-[10px] uppercase font-bold text-indigo-300 hover:bg-indigo-500/30 transition-colors">
                            Yes, Flag
                          </button>
                          <button className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
                            Dismiss
                          </button>
                       </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {aiStatus === "thinking" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 italic"
              >
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" />
                </div>
                AI IS TYPING...
              </motion.div>
            )}
          </div>

          {/* AI Input Area */}
          <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
            <div className="relative group">
              <input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (askAi(message), setMessage(""))}
                placeholder="Type a message or ask AI..."
                className="w-full bg-[#121212] border-white/5 border rounded-xl py-3 pl-4 pr-12 text-sm focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700"
              />
              <button 
                onClick={() => (askAi(message), setMessage(""))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-zinc-500 group-focus-within:text-indigo-400 hover:bg-white/5"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="h-24 px-8 flex items-center justify-center bg-[#0d0d0d]/80 backdrop-blur-xl border-t border-white/5 z-20">
         <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-white/5 scale-110">
            <ControlButton 
              active={isMicOn} 
              icon={isMicOn ? Mic : MicOff} 
              onClick={toggleMic} 
              label={isMicOn ? "Unmuted" : "Muted"}
            />
            <ControlButton 
              active={isCamOn} 
              icon={isCamOn ? Video : VideoOff} 
              onClick={toggleCam} 
              label="Camera"
            />
            
            <button 
              onClick={() => askAi("Summarize the meeting so far.")}
              className="px-6 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center gap-2 group transition-all"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest">Ask AI</span>
            </button>

            <ControlButton icon={Users2} label="Peers" indicator="2" />
            <div className="w-[1px] h-8 bg-white/5 mx-2" />
            <ControlButton 
              active={false} 
              variant="danger" 
              icon={PhoneOff} 
              onClick={() => router.push("/")} 
              label="Leave"
            />
         </div>
      </div>
    </main>
  );
}

// Subcomponents

function VideoCard({ name, stream, isMe, isMicOn = true, isCamOn = true }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative group rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl aspect-video transition-all hover:border-indigo-500/30">
      {stream && isCamOn ? (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted={isMe} 
          className="w-full h-full object-cover scale-x-[-1]" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
           <div className="w-24 h-24 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-600 font-bold text-3xl">
              {name[0]?.toUpperCase()}
           </div>
        </div>
      )}

      {/* Overlay info */}
      <div className="absolute top-4 left-4 flex gap-2">
         {/* Could add icons for mic/cam status of others here */}
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
        {!isMicOn && <MicOff className="w-3 h-3 text-red-400" />}
        <span className="text-xs font-bold tracking-tight text-white/90">{isMe ? "You" : name}</span>
      </div>
{/* Thinking indicator for peer? Not needed per request. */}
    </div>
  );
}

function AICard({ status }: { status: "idle" | "thinking" }) {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950/20 via-zinc-900 to-zinc-900 border border-indigo-500/20 shadow-2xl aspect-video flex flex-col items-center justify-center transition-all">
       <div className={cn(
         "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15)_0%,transparent_70%)]",
         status === "thinking" && "animate-pulse"
       )} />
       
       <div className={cn(
         "w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 relative",
         status === "thinking" ? "bg-indigo-600 shadow-[0_0_40px_rgba(79,70,229,0.4)] ai-pulse" : "bg-zinc-800 border border-indigo-500/30"
       )}>
          <Brain className={cn(
            "w-12 h-12 transition-all",
            status === "thinking" ? "text-white" : "text-indigo-400"
          )} />
       </div>

       <div className="mt-8 text-center space-y-4 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors",
              status === "thinking" ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-zinc-800 border-white/5 text-zinc-500"
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === "thinking" ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" : "bg-zinc-600"
              )} />
              Active Synapse
            </div>

            <div className={cn(
              "px-4 py-1.5 rounded-xl border flex items-center gap-3 transition-all",
              status === "thinking" ? "bg-indigo-500/20 border-indigo-500/30" : "bg-zinc-900/50 border-white/5"
            )}>
               <span className={cn(
                 "text-xs font-bold uppercase tracking-[0.2em] transition-colors",
                 status === "thinking" ? "text-indigo-200" : "text-zinc-600"
               )}>{status === "thinking" ? "thinking" : "listening"}</span>
               
               {status === "thinking" && (
                 <div className="flex gap-1 items-center h-4">
                   {[1,2,3,4].map(i => (
                     <div 
                       key={i} 
                       className="w-1 bg-indigo-400 rounded-full voice-wave"
                       style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.15}s` }}
                     />
                   ))}
                 </div>
               )}
            </div>
          </div>

          <div className="space-y-1">
             <h3 className="text-xl font-heading font-bold text-white">AI Co-Pilot</h3>
             <p className="max-w-[280px] text-zinc-500 text-[10px] uppercase leading-relaxed font-medium tracking-tight">
               Ready to analyze and assist your workspace.
             </p>
          </div>
       </div>

       {status === "thinking" && (
         <div className="absolute bottom-4 left-4 flex items-center gap-2 text-indigo-400/60 font-medium italic text-[10px]">
           AI IS THINKING...
         </div>
       )}
    </div>
  );
}

function ControlButton({ icon: Icon, active = true, onClick, label, variant = "default", indicator }: any) {
  return (
    <div className="flex flex-col items-center gap-1.5">
       <button 
        onClick={onClick}
        className={cn(
          "relative w-12 h-12 rounded-xl flex items-center justify-center transition-all synapse-btn border",
          variant === "danger" 
            ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" 
            : active 
              ? "bg-[#121212] border-white/10 text-zinc-400 hover:border-white/20 hover:text-white" 
              : "bg-zinc-800 border-white/5 text-zinc-600"
        )}
      >
        <Icon className="w-5 h-5" />
        {indicator && (
           <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full text-[8px] font-bold text-white flex items-center justify-center border-2 border-[#0d0d0d]">
             {indicator}
           </span>
        )}
      </button>
      <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
    </div>
  );
}
