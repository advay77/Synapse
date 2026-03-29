"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Peer, MediaConnection } from "peerjs";
import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY || "";

if (typeof window !== "undefined") {
  if (!VAPI_PUBLIC_KEY) {
    console.warn("VAPI Configuration Missing: Neural node cannot synchronize without a public key.");
  } else {
    console.log(`VAPI Connecting with key: ${VAPI_PUBLIC_KEY.slice(0, 4)}... (Check if this matches your Vapi dashboard)`);
  }
}

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

    vapi.on("error", (err: any) => {
      console.error("Vapi Runtime Error:", JSON.stringify(err, null, 2));
      setMessages(prev => [...prev, {
        sender: "System",
        text: "Neural node failed to synchronize. Ensure NEXT_PUBLIC_VAPI_PUBLIC_KEY (and optionally VAPI_PUBLIC_KEY) is configured in your client environments.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    vapi.on("message", (msg: any) => {
      if (msg.type === "transcript" && msg.transcriptType === "final") {
        setMessages(prev => [...prev, {
          sender: msg.role === "assistant" ? "Synapse AI" : username,
          text: msg.transcript,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    });



    // Start Vapi Call immediately on join
    vapi.start({
      name: "Synapse AI",
      firstMessage: "Yo what's up buddy",
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI participant in a live meeting. Your role is to act as a thoughtful and slightly challenging participant (devil’s advocate) for ${username}. 

            Behavior rules:
            * Speak naturally, like a human in a meeting
            * Keep responses concise (1–3 sentences)
            * Do not give long monologues
            * Respond only when prompted or when directly addressed
            * Avoid interrupting frequently

            Personality:
            * Question assumptions politely
            * Challenge ideas with logic
            * Ask follow-up questions when something is unclear
            * Do not blindly agree

            Conversation style:
            * Use a conversational tone
            * Avoid formal or robotic language
            * Do not say “as an AI”
            * Use the speaker’s name occasionally if available

            Voice behavior:
            * Add small pauses naturally
            * Keep speech smooth and clear
            * Do not rush responses

            Context handling:
            * Base responses only on recent conversation
            * If unsure, ask for clarification instead of guessing

            Limitations:
            * Do not hallucinate facts
            * Do not dominate the conversation
            * Stay relevant to the topic being discussed

            Goal:
            Act like a real meeting participant who adds value through critical thinking, not just answers.`
          }
        ]
      },
      voice: {
        provider: "11labs",
        voiceId: "clara"
      }
    });

    // --- 2. Conventional Media & WebRTC ---
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        myStreamRef.current = stream;
        setStreams(prev => ({ ...prev, me: stream }));

        const socket = io(`http://127.0.0.1:3001`, { 
          transports: ["polling", "websocket"],
          withCredentials: true 
        });
        socketRef.current = socket;
        
        socket.on("connect", () => {
          setMyId(socket.id);
          const peer = new Peer(socket.id as string, {
            host: '127.0.0.1',
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
