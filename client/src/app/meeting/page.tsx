"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Send,
  Sparkles, MessageSquare, Users2, Brain,
  Volume2, VolumeX, MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMeeting } from "@/hooks/useMeeting";
import { cn } from "@/lib/utils";

export default function MeetingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = sessionStorage.getItem("synapse_user");
    if (!user) {
      router.push("/");
      return;
    }
    const data = JSON.parse(user);
    setUsername(data.username);
    setRoomId(data.roomId);
  }, [router]);

  const [isAiMuted, setIsAiMuted] = useState(false);
  const toggleAiMute = () => setIsAiMuted(prev => !prev);

  const {
    myId,
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

  if (!username) return <div className="h-screen bg-background flex items-center justify-center">Loading session...</div>;

  return (
    <main className="h-screen bg-[#0a0a0a] overflow-hidden flex flex-col font-sans text-zinc-300">
      {/* Top Navbar: Clean & Precise */}
      <nav className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5 bg-[#0a0a0a]">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">S</div>
          <span className="font-heading font-black text-lg md:text-xl tracking-tight text-white">Synapse</span>
          <div className="hidden sm:flex ml-4 md:ml-6 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/10 items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            <span className="text-[8px] md:text-[9px] font-black text-orange-500 uppercase tracking-widest mt-0.5">Live Session</span>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8 text-xs md:text-sm font-medium text-zinc-500">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-all">
            <Users2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-400" />
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Video Grid - Polished & Flexible */}
        <div className="flex-1 p-4 md:p-8 flex flex-col gap-4 md:gap-8 overflow-y-auto items-center justify-start md:justify-center bg-[#0a0a0a]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-w-6xl h-auto md:h-full md:max-h-[750px] min-h-0">
            {/* User Video */}
            <VideoCard
              name={username}
              stream={streams.me}
              isMe={true}
              isMicOn={isMicOn}
              isCamOn={isCamOn}
            />

            {/* Other Participants */}
            {participants.filter(p => p.id !== myId).map(p => (
              <VideoCard
                key={p.id}
                name={p.name}
                stream={streams[p.id]}
              />
            ))}

            {/* AI Co-Pilot Card - Distinctive Design */}
            <AICard status={aiStatus} />
          </div>
        </div>

        {/* Right: Intelligence Feed Sidebar */}
        <div className="w-full md:w-[420px] md:border-l border-white/5 bg-[#0d0d0d] flex flex-col shadow-2xl z-10 transition-all">
          <div className="p-6 md:p-8 pb-3 md:pb-4 flex items-center justify-between">
            <h2 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
              Intelligence Feed
            </h2>
            <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5 text-zinc-700 cursor-pointer hover:text-zinc-500" />
          </div>

          <div
            ref={scrollRef}
            className="flex-1 max-h-[30vh] md:max-h-none overflow-y-auto px-6 md:px-8 space-y-6 md:space-y-8 py-4 md:py-6 custom-scrollbar"
          >
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-2 md:space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]",
                      m.sender === "Synapse AI" ? "text-indigo-400" :
                        m.sender === "System" ? "text-orange-500" : "text-zinc-500"
                    )}>
                      {m.sender}
                      {m.sender === "Synapse AI" && <Sparkles className="inline w-3 h-3 ml-1" />}
                      {m.sender === "Synapse AI" && !isAiMuted && <Volume2 className="inline w-3 h-3 ml-2 text-indigo-400/50" />}
                    </span>
                    <span className="text-[8px] md:text-[9px] text-zinc-700 font-bold">{m.timestamp}</span>
                  </div>
                  <div className={cn(
                    "p-4 md:p-5 rounded-xl md:rounded-2xl text-[12px] md:text-[13px] leading-relaxed",
                    m.sender === "Synapse AI"
                      ? "bg-indigo-500/5 border border-indigo-500/10 text-indigo-100/90 shadow-[0_4px_20px_rgba(79,70,229,0.05)]"
                      : m.sender === "System"
                        ? "bg-orange-500/[0.03] border border-orange-500/10 text-orange-200/40 italic font-medium"
                        : "bg-white/[0.03] border border-white/5 text-zinc-300"
                  )}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {aiStatus === "thinking" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-indigo-400 italic"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                AI IS TYPING...
              </motion.div>
            )}
          </div>

          <div className="p-4 md:p-6 border-t border-white/5 bg-[#0a0a0a]">
            <div className="relative group">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (askAi(message), setMessage(""))}
                placeholder="Type a message or ask AI..."
                className="w-full bg-[#121212] border-white/5 border rounded-xl md:rounded-2xl py-3 md:py-4 pl-5 md:pl-6 pr-12 md:pr-14 text-xs md:text-sm focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-800 text-white"
              />
              <button
                onClick={() => (askAi(message), setMessage(""))}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-2 md:p-2.5 rounded-lg md:rounded-xl text-zinc-600 transition-all group-focus-within:text-indigo-400 hover:bg-indigo-500/10"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Floating Style */}
      <div className="h-auto py-6 md:py-0 md:h-28 px-4 md:px-12 flex items-center justify-center bg-[#0a0a0a] border-t border-white/5 relative z-20">
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 bg-[#121212] p-3 md:p-2.5 rounded-[20px] md:rounded-[24px] border border-white/5 shadow-2xl">
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
          <ControlButton
            active={!isAiMuted}
            icon={isAiMuted ? VolumeX : Volume2}
            onClick={toggleAiMute}
            label={isAiMuted ? "AI Voice" : "AI Voice"}
            variant={isAiMuted ? "default" : "primary"}
          />

          <button
            onClick={() => askAi("Hey Synapse, give me a quick thought on our current focus.")}
            className="px-8 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow-[0_8px_30px_rgba(79,70,229,0.4)] flex items-center gap-3 group transition-all active:scale-95"
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-xs uppercase tracking-[0.2em] text-white">Ask AI</span>
          </button>

          <ControlButton icon={Users2} label="Peers" indicator={String(participants.length + 1)} />
          <div className="w-px h-10 bg-white/5 mx-2" />
          <ControlButton
            active={false}
            variant="danger"
            icon={PhoneOff}
            onClick={() => {
              sessionStorage.removeItem("synapse_user");
              router.push("/");
            }}
            label="Leave"
          />
        </div>
      </div>
    </main>
  );
}

// Optimized Grid Components

function VideoCard({ name, stream, isMe, isMicOn = true, isCamOn = true }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative group rounded-[32px] overflow-hidden bg-[#181818] border border-white/5 shadow-2xl aspect-video transition-all hover:border-indigo-500/40">
      {stream && isCamOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMe}
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1c1c1c] to-[#121212]">
          <div className="w-28 h-28 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center text-zinc-600 font-bold text-4xl shadow-2xl">
            {name ? name[0]?.toUpperCase() : "?"}
          </div>
        </div>
      )}

      {/* Participant Name Tag */}
      <div className="absolute bottom-6 left-6 flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/10">
        {!isMicOn && <MicOff className="w-3.5 h-3.5 text-red-500" />}
        <span className="text-xs font-black tracking-tight text-white/90">{name}</span>
      </div>
    </div>
  );
}

function AICard({ status }: { status: "idle" | "thinking" }) {
  return (
    <div className="relative rounded-[24px] md:rounded-[32px] overflow-hidden bg-gradient-to-br from-[#121212] to-[#181818] border border-indigo-500/20 shadow-2xl aspect-video flex flex-col items-center justify-center">
      {/* Background Animation Effect */}
      <div className={cn(
        "absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.08)_0%,transparent_70%)]",
        status === "thinking" && "animate-pulse"
      )} />

      <div className={cn(
        "w-16 h-16 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 shadow-2xl",
        status === "thinking" ? "bg-indigo-600 shadow-[0_0_60px_rgba(79,70,229,0.3)] scale-110" : "bg-[#1c1c1c] border border-indigo-500/20",
        status === "thinking" && "ai-pulse"
      )}>
        <Brain className={cn(
          "w-8 h-8 md:w-12 md:h-12 transition-all duration-500",
          status === "thinking" ? "text-white" : "text-indigo-400"
        )} />

        {status === "thinking" && (
          <div className="absolute -right-1 -bottom-1 md:-right-3 md:-bottom-3 w-8 h-8 md:w-12 md:h-12 rounded-full bg-indigo-500 border-[3px] md:border-[6px] border-[#181818] flex items-center justify-center">
            <Volume2 className="w-3 h-3 md:w-5 md:h-5 text-white" />
          </div>
        )}
      </div>

      <div className="mt-6 md:mt-10 text-center space-y-2 md:space-y-4 z-10">
        <div className="flex flex-col items-center gap-2 md:gap-4">
          <div className={cn(
            "px-3 md:px-4 py-1 md:py-1.5 rounded-full border text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all duration-500",
            status === "thinking" ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_4px_15px_rgba(79,70,229,0.2)]" : "bg-[#1c1c1c] border-white/5 text-zinc-600"
          )}>
            <div className={cn(
              "w-1 h-1 md:w-1.5 md:h-1.5 rounded-full",
              status === "thinking" ? "bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,1)]" : "bg-zinc-700"
            )} />
            Active Synapse
          </div>

          <div className={cn(
            "px-3 md:px-5 py-1 md:py-2 rounded-xl md:rounded-2xl border flex items-center gap-3 md:gap-4 transition-all duration-500",
            status === "thinking" ? "bg-indigo-500/10 border-indigo-500/20" : "bg-black/20 border-white/5"
          )}>
            <span className={cn(
              "text-[8px] md:text-xs font-black uppercase tracking-[0.3em] transition-colors duration-500",
              status === "thinking" ? "text-indigo-200" : "text-zinc-700"
            )}>{status}</span>

            {status === "thinking" && (
              <div className="flex gap-1 items-center h-3 md:h-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="w-0.5 md:w-1 bg-indigo-400 rounded-full voice-wave"
                    style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1 md:space-y-1.5">
          <h3 className="text-lg md:text-2xl font-heading font-black text-white tracking-tight">AI Co-Pilot</h3>
          <p className="max-w-[200px] md:max-w-[300px] text-zinc-600 text-[8px] md:text-[10px] uppercase leading-relaxed font-bold tracking-widest px-4">
            Listening and buddying up for your workspace.
          </p>
        </div>
      </div>

      {status === "thinking" && (
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-3 text-indigo-400/50 font-black italic text-[7px] md:text-[9px] tracking-widest">
          <Volume2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
          AI IS THINKING...
        </div>
      )}
    </div>
  );
}

function ControlButton({ icon: Icon, active = true, onClick, label, variant = "default", indicator }: any) {
  return (
    <div className="flex flex-col items-center gap-1 md:gap-2">
      <button
        onClick={onClick}
        className={cn(
          "relative w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all synapse-btn border",
          variant === "danger"
            ? "bg-[#2a1a1a] border-red-900/20 text-red-500 hover:bg-red-500 hover:text-white"
            : variant === "primary"
              ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white shadow-[0_0_20px_rgba(79,70,229,0.1)]"
              : active
                ? "bg-[#181818] border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                : "bg-zinc-900 border-white/5 text-zinc-700"
        )}
      >
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
        {indicator && (
          <span className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 w-4 h-4 md:w-5 md:h-5 bg-indigo-600 rounded-full text-[8px] md:text-[9px] font-black text-white flex items-center justify-center border-2 md:border-[3px] border-[#121212]">
            {indicator}
          </span>
        )}
      </button>
      <span className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-zinc-600">{label}</span>
    </div>
  );
}
