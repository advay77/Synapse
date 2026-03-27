"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brain, ArrowRight, Layers, Key, Github, Sparkles, Binary, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function JoinPage() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  const generateRoomId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segment = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setRoomId(`SNPS-${segment(4)}-${segment(4)}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      sessionStorage.setItem("synapse_user", JSON.stringify({ username, roomId }));
      router.push("/meeting");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden bg-background">
      {/* Complex AI-looking Background Infrastructure */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] md:w-[800px] md:h-[800px] bg-indigo-600/10 blur-[100px] md:blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] md:w-[600px] md:h-[600px] bg-purple-600/10 blur-[100px] md:blur-[150px] rounded-full animate-pulse [animation-delay:2s]" />
        
        {/* Animated Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Top Navigation */}
      <nav className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-20">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 md:gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center text-white font-black text-lg md:text-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform">
            S
          </div>
          <span className="text-xl md:text-2xl font-heading font-black tracking-tighter text-white uppercase italic">Synapse</span>
        </motion.div>
      </nav>

      {/* Main Join Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-lg z-10 px-2"
      >
        <div className="glass-card rounded-[30px] md:rounded-[40px] p-8 md:p-12 flex flex-col items-center gap-8 md:gap-10 border-indigo-500/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Decorative floating elements inside card */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 blur-[40px] rounded-full pointer-events-none" />
          
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner relative group"
          >
            <Brain className="w-8 h-8 md:w-10 md:h-10 group-hover:text-white transition-colors" />
            <div className="absolute -right-1 -bottom-1 w-5 h-5 md:w-6 md:h-6 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
            </div>
          </motion.div>

          <div className="text-center space-y-2 md:space-y-3">
            <h1 className="text-3xl md:text-5xl font-heading font-black text-white tracking-tighter uppercase leading-none italic">
               The Protocol.
            </h1>
            <p className="text-zinc-500 text-[8px] md:text-[9px] tracking-[0.3em] md:tracking-[0.4em] font-black uppercase italic flex items-center justify-center gap-2">
               <Cpu className="w-3 h-3" /> NEURAL SYNC ACTIVE <Binary className="w-3 h-3" />
            </p>
          </div>

          <form onSubmit={handleJoin} className="w-full space-y-6 md:space-y-8">
            <div className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] md:text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] ml-2">ENTITY IDENTITY</label>
                <div className="relative group">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Advay-X01"
                    className="w-full bg-white/[0.03] border-white/5 border rounded-2xl py-3 md:py-4 px-5 md:px-6 text-sm text-white focus:bg-white/[0.05] focus:border-indigo-500/30 transition-all outline-none placeholder:text-zinc-800"
                  />
                  <Layers className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-indigo-400 transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[8px] md:text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">SYNAPSE NODE</label>
                  <button 
                    type="button"
                    onClick={generateRoomId}
                    className="text-[8px] md:text-[9px] font-black text-indigo-500 hover:text-indigo-300 uppercase tracking-[0.2em] transition-colors"
                  >
                    Generate Entry
                  </button>
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    required
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="SNPS-####-####"
                    className="w-full bg-white/[0.03] border-white/5 border rounded-2xl py-3 md:py-4 px-5 md:px-6 text-sm text-white focus:bg-white/[0.05] focus:border-indigo-500/30 transition-all outline-none placeholder:text-zinc-800"
                  />
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-indigo-400 transition-colors" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!username.trim() || !roomId.trim()}
              onMouseEnter={() => username.trim() && roomId.trim() && setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`w-full h-14 md:h-16 rounded-2xl font-black text-xs uppercase tracking-[0.2em] synapse-btn flex items-center justify-center gap-3 group overflow-hidden relative transition-all duration-300 ${username.trim() && roomId.trim()
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)] cursor-pointer"
                : "bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5 shadow-none opacity-40"
                }`}
            >
              <AnimatePresence mode="wait">
                {!(username.trim() && roomId.trim()) ? (
                  <motion.div 
                    key="locked"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                  >
                    Authorization Required
                  </motion.div>
                ) : isHovered ? (
                  <motion.div 
                    key="hover"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    Initialize Link <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="idle"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                  >
                    Access Mainframe
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </form>

          <button className="text-zinc-600 hover:text-indigo-400 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-colors">
            <div className="w-5 h-5 rounded-lg border border-zinc-800 flex items-center justify-center text-[8px] font-black">•</div>
            DEPLOY SECONDARY NODE
          </button>
        </div>
      </motion.div>

      {/* Enhanced Footer Interface */}
      <div className="flex flex-col md:flex-row items-center gap-6 mt-12 md:mt-0 md:absolute md:bottom-12 md:left-12 z-20">
        <div className="flex -space-x-3 items-center">
          {[1, 2, 3, 4].map(i => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl border-[2px] md:border-[3px] border-background bg-zinc-900 overflow-hidden shadow-xl"
            >
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+105}`} alt="user" className="scale-125" />
            </motion.div>
          ))}
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl border-[2px] md:border-[3px] border-background bg-zinc-800 flex items-center justify-center text-[8px] md:text-[9px] font-black text-zinc-400 shadow-xl">+38</div>
        </div>
        <div className="flex flex-col gap-0.5 items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse" />
            <span className="text-[8px] md:text-[9px] font-black text-orange-500 uppercase tracking-widest">ACTIVE MAINFRAME</span>
          </div>
          <div className="text-[8px] font-bold text-zinc-700 uppercase tracking-tighter">Syncing with 142 Neural Nodes</div>
        </div>
      </div>

      <div className="mt-8 md:mt-0 md:absolute md:bottom-12 md:right-12 text-center md:text-right opacity-30 z-0">
        <p className="max-w-[320px] leading-relaxed text-[10px] md:text-[12px] font-black tracking-[0.4em] uppercase text-zinc-500">
           DEVELOPED BY ADVAY ANAND
        </p>
      </div>
    </main>
  );
}
