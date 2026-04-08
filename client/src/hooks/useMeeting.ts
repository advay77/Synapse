"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Peer, MediaConnection } from "peerjs";

interface Participant {
  id: string;
  name: string;
  isAI?: boolean;
}

interface Message {
  sender: string;
  text: string;
  timestamp: string;
}

interface MeetingHook {
  myId?: string;
  participants: Participant[];
  messages: Message[];
  aiStatus: "idle" | "thinking";
  isMicOn: boolean;
  isCamOn: boolean;
  isListening: boolean;
  streams: Record<string, MediaStream>;
  toggleMic: () => void;
  toggleCam: () => void;
  askAi: (msg: string) => void;
}

// ─── Keyword that triggers AI (say "Hey Synapse" to activate) ─────────────
const WAKE_WORD = "hey synapse";

export function useMeeting(roomId: string, username: string, isAiMuted: boolean = false): MeetingHook {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking">("idle");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [myId, setMyId] = useState<string>();

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  // ─── Speak AI response via browser TTS ──────────────────────────────────
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || isAiMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v =>
      v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Premium")
    );
    if (premiumVoice) utterance.voice = premiumVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, [isAiMuted]);

  // ─── Send message to AI via socket ──────────────────────────────────────
  const askAi = useCallback((msg: string) => {
    if (!msg.trim() || !socketRef.current) return;
    setAiStatus("thinking");
    socketRef.current.emit("ask-ai", { roomId: roomIdRef.current, message: msg });
    setMessages(prev => [...prev, {
      sender: username,
      text: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }]);
  }, [username]);

  // ─── Voice Recognition (Speech → AI) ────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;      // Keep listening continuously
    recognition.interimResults = false; // Only fire on final results
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let awaitingQuery = false;   // true after wake word detected, waiting for follow-up
    let queryBuffer = "";        // collects spoken words after wake word

    recognition.onresult = (event: any) => {
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        if (!results[i].isFinal) continue;
        const transcript = results[i][0].transcript.trim().toLowerCase();

        if (!awaitingQuery) {
          // Check for wake word
          if (transcript.includes(WAKE_WORD)) {
            awaitingQuery = true;
            queryBuffer = transcript.replace(WAKE_WORD, "").trim();
            // If query came in the same sentence as the wake word, fire immediately
            if (queryBuffer.length > 3) {
              askAi(queryBuffer);
              awaitingQuery = false;
              queryBuffer = "";
            }
          }
        } else {
          // We already heard the wake word, this sentence is the query
          queryBuffer = transcript;
          if (queryBuffer.length > 3) {
            askAi(queryBuffer);
            awaitingQuery = false;
            queryBuffer = "";
          }
        }
      }
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if mic is still on (keeps listening persistently)
      if (myStreamRef.current?.getAudioTracks()[0]?.enabled) {
        try { recognition.start(); } catch (_) {}
      }
    };
    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("Speech recognition error:", e.error);
      }
    };

    // Start listening
    try { recognition.start(); } catch (_) {}

    return () => {
      recognition.onend = null; // prevent auto-restart on cleanup
      recognition.stop();
    };
  }, [askAi]);

  // ─── WebRTC + Socket.io Setup ────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !roomId) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        myStreamRef.current = stream;
        setStreams(prev => ({ ...prev, me: stream }));

        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://127.0.0.1:3001";
        const socket = io(serverUrl, {
          transports: ["websocket", "polling"],
          withCredentials: true
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          setMyId(socket.id);
          const url = new URL(serverUrl);
          const peer = new Peer(socket.id as string, {
            host: url.hostname,
            port: Number(url.port) || (url.protocol === "https:" ? 443 : 3001),
            path: "/peerjs",
            secure: url.protocol === "https:"
          });
          peerRef.current = peer;

          peer.on("call", (call: MediaConnection) => {
            call.answer(stream);
            call.on("stream", (remoteStream: MediaStream) => {
              setStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
            });
          });

          socket.emit("join-room", { roomId, username });
        });

        socket.on("room-users", (users: Participant[]) => setParticipants(users));

        socket.on("user-joined", ({ userId, username: joinedUser }: { userId: string; username: string }) => {
          if (userId === socket.id) return;
          setMessages(prev => [...prev, {
            sender: "System",
            text: `${joinedUser} has joined.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }]);
          const call = peerRef.current?.call(userId, stream);
          call?.on("stream", (remoteStream: MediaStream) => {
            setStreams(prev => ({ ...prev, [userId]: remoteStream }));
          });
        });

        socket.on("ai-status", (status: string) => {
          setAiStatus(status === "thinking" ? "thinking" : "idle");
        });

        socket.on("ai-response", ({ text }: { text: string }) => {
          setMessages(prev => [...prev, {
            sender: "Synapse AI",
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }]);
          setAiStatus("idle");
          speak(text);
        });
      });

    return () => {
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      myStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [roomId, username]);

  const toggleMic = () => {
    const audioTrack = myStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
      // Stop/start voice recognition with mic
      if (!audioTrack.enabled) {
        recognitionRef.current?.stop();
      } else {
        try { recognitionRef.current?.start(); } catch (_) {}
      }
    }
  };

  const toggleCam = () => {
    const videoTrack = myStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOn(videoTrack.enabled);
    }
  };

  return {
    myId,
    participants,
    messages,
    aiStatus,
    isMicOn,
    isCamOn,
    isListening,
    streams,
    toggleMic,
    toggleCam,
    askAi
  };
}
