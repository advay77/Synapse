"use client";

import { useEffect, useState, useRef } from "react";
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
  streams: Record<string, MediaStream>;
  toggleMic: () => void;
  toggleCam: () => void;
  askAi: (msg: string) => void;
}

export function useMeeting(roomId: string, username: string, isAiMuted: boolean = false): MeetingHook {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking">("idle");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [myId, setMyId] = useState<string>();

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || isAiMuted) return;
    window.speechSynthesis.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);

    // Choose a high-quality voice if available
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Premium"));
    if (premiumVoice) utterance.voice = premiumVoice;

    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Slightly higher pitch for a friendly AI feel
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !roomId) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        myStreamRef.current = stream;
        setStreams(prev => ({ ...prev, me: stream }));

        const socket = io("http://127.0.0.1:3001", {
          transports: ["polling", "websocket"],
          withCredentials: true
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          setMyId(socket.id);
          const peer = new Peer(socket.id as string, {
            host: "127.0.0.1",
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
    if (!msg.trim() || !socketRef.current) return;
    setAiStatus("thinking");
    socketRef.current.emit("ask-ai", { roomId, message: msg });
    setMessages(prev => [...prev, {
      sender: username,
      text: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }]);
  };

  return {
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
  };
}
