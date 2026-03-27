"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Peer, MediaConnection } from "peerjs";
import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

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
  aiStatus: "listening" | "thinking" | "speaking";
  isMicOn: boolean;
  isCamOn: boolean;
  isAiMuted: boolean;
  streams: Record<string, MediaStream>;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleAiMute: () => void;
  askAi: (msg: string) => void;
}

export function useMeeting(roomId: string, username: string): MeetingHook {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiStatus, setAiStatus] = useState<"listening" | "thinking" | "speaking">("listening");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [myId, setMyId] = useState<string>();

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !roomId) return;

    // --- 1. Initialize Vapi (Low-Latency Buddy) ---
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => setAiStatus("listening"));
    vapi.on("speech-start", () => setAiStatus("speaking"));
    vapi.on("speech-end", () => setAiStatus("listening"));

    vapi.on("message", (msg: any) => {
      if (msg.type === "transcript" && msg.transcriptType === "final") {
        setMessages(prev => [...prev, {
          sender: msg.role === "assistant" ? "Synapse AI" : username,
          text: msg.transcript,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    });

    // Start Vapi Call immediately on join (Buddy auto-greet handled by Vapi agent config)
    vapi.start({
      name: "Synapse Buddy",
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `You are Synapse, a friendly buddy and AI co-pilot for ${username}. You're chill, smart, and help with the meeting context. Talk casual.` }
        ]
      },
      voice: {
        provider: "11labs",
        voiceId: "josh"
      }
    });

    // --- 2. Conventional Media & WebRTC ---
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        myStreamRef.current = stream;
        setStreams(prev => ({ ...prev, me: stream }));

        const hostname = window.location.hostname;
        const socket = io(`http://${hostname}:3001`);
        socketRef.current = socket;

        socket.on("connect", () => {
          setMyId(socket.id);
          const peer = new Peer(socket.id as string, {
            host: hostname,
            port: 3001,
            path: "/peerjs"
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

        socket.on("user-joined", ({ userId, username: joinedUser }: { userId: string, username: string }) => {
          if (userId === socket.id) return;
          setMessages(prev => [...prev, {
            sender: "System",
            text: `${joinedUser} has joined.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          const call = peerRef.current?.call(userId, stream);
          call?.on("stream", (remoteStream: MediaStream) => {
            setStreams(prev => ({ ...prev, [userId]: remoteStream }));
          });
        });

        // Backend AI sync still works for non-Vapi events if any
        socket.on("ai-response", ({ text }: { text: string }) => {
          setMessages(prev => [...prev, {
            sender: "Synapse AI",
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        });
      });

    return () => {
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      vapiRef.current?.stop();
      myStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [roomId, username]);

  const toggleMic = () => {
    const audioTrack = myStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);

      // Also tell Vapi if mic is off (mute)
      if (audioTrack.enabled) vapiRef.current?.setMuted(false);
      else vapiRef.current?.setMuted(true);
    }
  };

  const toggleCam = () => {
    const videoTrack = myStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOn(videoTrack.enabled);
    }
  };

  const askAi = (msg: string) => {
    if (!msg.trim()) return;
    vapiRef.current?.send({ type: "add-message", message: { role: "user", content: msg } });
  };

  return {
    myId,
    participants,
    messages,
    aiStatus,
    isMicOn,
    isCamOn,
    isAiMuted,
    streams,
    toggleMic,
    toggleCam,
    toggleAiMute: () => {
      setIsAiMuted(prev => {
        const nextMuted = !prev;
        if (vapiRef.current) {
          vapiRef.current.send({
            type: "control",
            control: nextMuted ? "mute-assistant" : "unmute-assistant"
          });
        }
        return nextMuted;
      });
    },
    askAi
  };
}
