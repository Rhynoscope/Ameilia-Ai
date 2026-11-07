"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  GameHistoryRecord,
  MultiplayerGameType,
  VirtualDateRoom,
} from "@/lib/types";
import {
  COUPLEOPOLIS_TILES,
  LIFE_PATH_NODES,
  UnoCard,
  UnoColor,
  canPlayUnoCard,
  calculateNetWorth,
} from "@/lib/games/board-card-engines";
import { getLegalMovesForSquare } from "@/lib/games/chess-engine";
import { getValidCheckersMoves } from "@/lib/games/checkers-engine";
import { PixelAvatar, AvatarCustomizer } from "./PixelAvatar";
import {
  AvatarConfig,
  loadHerAvatar,
  loadMyAvatar,
} from "@/lib/pixel-avatar";
import {
  Copy,
  Check,
  RefreshCw,
  Send,
  Users,
  Trophy,
  Sparkles,
  LogOut,
  Gamepad2,
  History,
  Palette,
  Play,
  Share2,
} from "lucide-react";

export interface CatalogGame {
  id: MultiplayerGameType;
  title: string;
  category: "Board Games" | "Card Games" | "Party Games" | "Couple Games" | "Quick Games";
  players: string;
  emoji: string;
  badgeColor: string;
  description: string;
  memoryTip?: string;
}

export const MULTIPLAYER_GAME_CATALOG: CatalogGame[] = [
  {
    id: "chess",
    title: "Royal Pixel Chess",
    category: "Board Games",
    players: "2 Players Online / Co-Op",
    emoji: "♟️",
    badgeColor: "#ffe033",
    description:
      "Full 8x8 Chess with legal move highlights, check & checkmate detection, castling, en passant, pawn promotion, and algebraic history.",
    memoryTip: "Strategy night classic — play across two devices or pass-and-play!",
  },
  {
    id: "checkers",
    title: "Arcade Checkers",
    category: "Board Games",
    players: "2 Players Online / Co-Op",
    emoji: "🔴",
    badgeColor: "#ff5252",
    description:
      "Fast-paced 8x8 Checkers with diagonal movement, multi-jump combos, king crowning, and instant turn sync.",
  },
  {
    id: "monopoly",
    title: "Coupleopolis (Property Trading)",
    category: "Board Games",
    players: "2 Players Online / Co-Op",
    emoji: "🎩",
    badgeColor: "#38e54d",
    description:
      "Monopoly-inspired property trading board game! Roll the dice, buy Matcha Cafes, Ramen Bars & Snow Fox Sanctuaries, upgrade spots, and build net worth!",
    memoryTip: "Features Amelia's favorite spots like Sushi Spot, Ramen Bar & Snow Fox Sanctuary!",
  },
  {
    id: "uno",
    title: "Wild Colors (Card Battle)",
    category: "Card Games",
    players: "2 Players Online / Co-Op",
    emoji: "🃏",
    badgeColor: "#ff8c00",
    description:
      "UNO-inspired color & number shedding card game! Play Skip, Reverse, Draw +2, Wild, and Wild +4 cards to empty your hand first.",
  },
  {
    id: "life",
    title: "Our Life Together",
    category: "Couple Games",
    players: "2 Players Online / Co-Op",
    emoji: "🚗",
    badgeColor: "#ff6bd6",
    description:
      "Game of Life-inspired winding path adventure! Pick dream careers, spin the wheel, hit Airport Reunions, Adopt a Pet, and collect Love & Cash points.",
    memoryTip: "Built for long-distance couples dreaming up future adventures together!",
  },
  {
    id: "party_draw",
    title: "Skribbl Draw & Guess",
    category: "Party Games",
    players: "2 Players Online / Co-Op",
    emoji: "🎨",
    badgeColor: "#3ecbff",
    description:
      "Real-time MS Paint drawing canvas! One player sketches the secret prompt while the other guesses in live chat.",
  },
  {
    id: "party_trivia",
    title: "Couple & Cozy Trivia Battle",
    category: "Party Games",
    players: "2 Players Online / Co-Op",
    emoji: "🧠",
    badgeColor: "#a855f7",
    description:
      "Jeoparty-style head-to-head trivia rounds mixing Amelia's favorite things, animals, movies, and fun facts!",
  },
  {
    id: "party_wyr",
    title: "Would You Rather (Couple Sync)",
    category: "Couple Games",
    players: "2 Players Online / Co-Op",
    emoji: "💭",
    badgeColor: "#f43f5e",
    description:
      "Lock in your answers secretly and see if your relationship wavelengths match on cozy dates, travel, and superpowers!",
  },
  {
    id: "party_rps",
    title: "Rock Paper Scissors Showdown",
    category: "Quick Games",
    players: "2 Players Online / Co-Op",
    emoji: "✌️",
    badgeColor: "#eab308",
    description:
      "Best-of-5 simultaneous throw showdown! Perfect for settling who picks the movie tonight.",
  },
  {
    id: "party_memory",
    title: "Pixel Date Memory Match",
    category: "Quick Games",
    players: "2 Players Online / Co-Op",
    emoji: "🦊",
    badgeColor: "#14b8a6",
    description:
      "Take turns flipping cards to match snow foxes, sushi rolls, boba, and crowns!",
  },
];

const CHESS_UNICODE: Record<string, string> = {
  wk: "♔",
  wq: "♕",
  wr: "♖",
  wb: "♗",
  wn: "♘",
  wp: "♙",
  bk: "♚",
  bq: "♛",
  br: "♜",
  bb: "♝",
  bn: "♞",
  bp: "♟",
};

const PIXEL_REACTIONS = [
  { emoji: "💖", label: "Love!" },
  { emoji: "😂", label: "Haha!" },
  { emoji: "🔥", label: "Spicy Move!" },
  { emoji: "😱", label: "No Way!" },
  { emoji: "🎉", label: "GG!" },
  { emoji: "🦊", label: "Snow Fox!" },
];

interface VirtualDatesArenaProps {
  initialRoomCode?: string | null;
  onSelectChatPrompt?: (prompt: string) => void;
}

export function VirtualDatesArena({
  initialRoomCode,
  onSelectChatPrompt,
}: VirtualDatesArenaProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("Ryan");
  const [myAvatar, setMyAvatar] = useState<AvatarConfig>(() => loadMyAvatar());
  const [herAvatar, setHerAvatar] = useState<AvatarConfig>(() => loadHerAvatar());
  const [showAvatarStudio, setShowAvatarStudio] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<GameHistoryRecord[]>([]);

  // Room state
  const [room, setRoom] = useState<VirtualDateRoom | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState(initialRoomCode || "");
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeSeatControl, setActiveSeatControl] = useState<"auto" | 0 | 1>("auto");

  // Chat & Reactions
  const [chatInput, setChatInput] = useState("");
  const [floatingReaction, setFloatingReaction] = useState<{
    emoji: string;
    senderName: string;
    label: string;
  } | null>(null);
  const lastReactionIdRef = useRef<string | null>(null);

  // Chess / Checkers selection state
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(
    null
  );
  // UNO wild color picker
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);

  // Draw & Guess canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const currentStrokeRef = useRef<[number, number][]>([]);
  const [drawGuessInput, setDrawGuessInput] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let pid = localStorage.getItem("amelia_mp_player_id");
      if (!pid) {
        pid = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        localStorage.setItem("amelia_mp_player_id", pid);
      }
      setPlayerId(pid);

      const savedName = localStorage.getItem("amelia_mp_player_name");
      if (savedName) setPlayerName(savedName);

      const urlParams = new URLSearchParams(window.location.search);
      const urlRoom = initialRoomCode || urlParams.get("room");
      if (urlRoom) {
        setJoinCodeInput(urlRoom.toUpperCase());
        handleJoinRoom(urlRoom.toUpperCase(), pid, savedName || "Amelia");
      }
    }
    fetchGameHistory();
  }, [initialRoomCode]);

  const fetchGameHistory = async () => {
    try {
      const res = await fetch("/api/games/room");
      const data: any = await res.json();
      if (Array.isArray(data.history)) setHistoryList(data.history);
    } catch {}
  };

  // Real-time room polling + BroadcastChannel sync
  useEffect(() => {
    if (!room?.code) return;

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`amelia_room_${room.code}`);
      bc.onmessage = (ev) => {
        if (ev.data?.room && ev.data.room.version >= (room.version || 0)) {
          setRoom(ev.data.room);
        }
      };
    } catch {}

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/games/room/${room.code}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data: any = await res.json();
          if (data.room) {
            setRoom((prev) => {
              if (!prev || data.room.version >= prev.version) {
                return data.room;
              }
              return prev;
            });
          }
        }
      } catch {}
    }, 1000);

    return () => {
      clearInterval(interval);
      bc?.close();
    };
  }, [room?.code]);

  // Show incoming reaction toast
  useEffect(() => {
    if (!room?.reactions || room.reactions.length === 0) return;
    const latest = room.reactions[room.reactions.length - 1];
    if (latest && latest.id !== lastReactionIdRef.current) {
      lastReactionIdRef.current = latest.id;
      setFloatingReaction({
        emoji: latest.emoji,
        senderName: latest.senderName,
        label: latest.label,
      });
      const t = setTimeout(() => setFloatingReaction(null), 2600);
      return () => clearTimeout(t);
    }
  }, [room?.reactions]);

  // Redraw canvas when party_draw strokes change
  useEffect(() => {
    if (room?.gameType !== "party_draw" || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    const strokes = room.state?.strokes || [];
    for (const s of strokes) {
      if (!s.points || s.points.length === 0) continue;
      ctx.strokeStyle = s.color || "#000";
      ctx.lineWidth = s.size || 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0][0], s.points[0][1]);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i][0], s.points[i][1]);
      }
      ctx.stroke();
    }
  }, [room?.gameType, room?.state?.strokes]);

  const broadcastUpdate = (updatedRoom: VirtualDateRoom) => {
    setRoom(updatedRoom);
    try {
      const bc = new BroadcastChannel(`amelia_room_${updatedRoom.code}`);
      bc.postMessage({ room: updatedRoom });
      bc.close();
    } catch {}
  };

  const handleCreateRoom = async (
    gameType: MultiplayerGameType,
    sameDeviceCoOp = true
  ) => {
    setLoadingRoom(true);
    setRoomError(null);
    setSelectedSquare(null);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("amelia_mp_player_name", playerName);
      }
      const res = await fetch("/api/games/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          gameType,
          playerId,
          playerName: playerName || "Ryan",
          avatar: myAvatar,
          playWithPartnerOnSameDevice: sameDeviceCoOp,
          partnerName: "Amelia",
          partnerAvatar: herAvatar,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create room");
      broadcastUpdate(data.room);
    } catch (e: any) {
      setRoomError(e.message);
    } finally {
      setLoadingRoom(false);
    }
  };

  const handleJoinRoom = async (
    codeToJoin?: string,
    pidOverride?: string,
    nameOverride?: string
  ) => {
    const clean = (codeToJoin || joinCodeInput).trim().toUpperCase();
    if (!clean) return;
    setLoadingRoom(true);
    setRoomError(null);
    setSelectedSquare(null);
    try {
      const res = await fetch("/api/games/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          roomCode: clean,
          playerId: pidOverride || playerId,
          playerName: nameOverride || playerName || "Amelia",
          avatar: myAvatar,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data.error || "Room not found");
      broadcastUpdate(data.room);
    } catch (e: any) {
      setRoomError(e.message);
    } finally {
      setLoadingRoom(false);
    }
  };

  const getEffectiveSeat = (): 0 | 1 => {
    if (!room) return 0;
    if (activeSeatControl === 0 || activeSeatControl === 1) {
      return activeSeatControl;
    }
    // If both players are on this device (host_partner) or user wants smooth co-op, auto-detect whose turn it is if second player is local partner
    const myPlayer = room.players.find((p) => p.id === playerId);
    const secondIsLocalPartner = room.players[1]?.id?.endsWith("_partner") || room.players[1]?.id?.endsWith("_p2");

    if (secondIsLocalPartner) {
      if (room.gameType === "chess") {
        return room.state.turn === "w" ? 0 : 1;
      }
      if (room.gameType === "checkers") {
        return room.state.turn === "r" ? 0 : 1;
      }
      if (
        room.gameType === "monopoly" ||
        room.gameType === "uno" ||
        room.gameType === "life" ||
        room.gameType === "party_memory"
      ) {
        return room.state.turn === 1 ? 1 : 0;
      }
      if (room.gameType === "party_trivia") {
        return room.state.answers?.[0] === null ? 0 : 1;
      }
      if (room.gameType === "party_wyr") {
        return room.state.choices?.[0] === null ? 0 : 1;
      }
      if (room.gameType === "party_rps") {
        return room.state.picks?.[0] === null ? 0 : 1;
      }
    }

    return myPlayer ? myPlayer.seat : 0;
  };

  const sendRoomAction = async (
    action: string,
    payload?: any,
    extra?: Record<string, any>
  ) => {
    if (!room) return;
    setRoomError(null);
    const seat = getEffectiveSeat();
    try {
      const res = await fetch(`/api/games/room/${room.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          playerId,
          playerName: room.players[seat]?.name || playerName,
          seatOverride: seat,
          payload,
          ...extra,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) {
        setRoomError(data.error || "Invalid move");
        if (data.room) broadcastUpdate(data.room);
        return;
      }
      if (data.room) {
        broadcastUpdate(data.room);
        if (data.room.status === "finished") {
          fetchGameHistory();
        }
      }
    } catch (e: any) {
      setRoomError(e.message);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!room) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/dates?room=${room.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch {}
  };

  const handleCopyRoomCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  // =========================================================
  // RENDER ACTIVE MULTIPLAYER GAME ROOM
  // =========================================================
  if (room) {
    const p0 = room.players[0] || {
      id: "p0",
      name: playerName || "Ryan",
      seat: 0 as const,
      avatar: myAvatar,
      connected: true,
    };
    const p1 = room.players[1] || {
      id: "p1",
      name: "Amelia (Waiting / Click Join)",
      seat: 1 as const,
      avatar: herAvatar,
      connected: false,
    };

    const effectiveSeat = getEffectiveSeat();
    const gameMeta =
      MULTIPLAYER_GAME_CATALOG.find((g) => g.id === room.gameType) ||
      MULTIPLAYER_GAME_CATALOG[0];

    return (
      <div className="space-y-4">
        {/* Floating Pixel Reaction Banner */}
        {floatingReaction && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#ffe033] text-black border-[3px] border-black rounded-2xl px-5 py-2.5 shadow-[0_6px_0_#000] flex items-center gap-2.5 animate-bounce font-black text-sm">
            <span className="text-2xl">{floatingReaction.emoji}</span>
            <span>
              {floatingReaction.senderName}: {floatingReaction.label}
            </span>
          </div>
        )}

        {/* Top Room Control Bar */}
        <div className="bg-[#261c7a] text-white border-[3px] border-black rounded-2xl p-3 sm:p-4 shadow-[0_6px_0_#000] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: gameMeta.badgeColor }}
              className="w-11 h-11 rounded-xl border-[2.5px] border-black shadow-[0_3px_0_#000] flex items-center justify-center text-2xl shrink-0"
            >
              {gameMeta.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg tracking-wide drop-shadow-[0_2px_0_#000]">
                  {gameMeta.title}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-[#38e54d] text-[#05290a] border-2 border-black">
                  ● LIVE ROOM
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/85 font-bold mt-0.5 flex-wrap">
                <span>
                  Room Code:{" "}
                  <strong className="text-[#ffe033] font-mono tracking-wider text-sm">
                    {room.code}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="px-2 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/30 text-[11px] flex items-center gap-1"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedCode ? "Copied" : "Copy Code"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="px-2.5 py-0.5 rounded-lg bg-[#ffe033] hover:bg-[#ffea70] text-black font-black border-2 border-black shadow-[0_2px_0_#000] text-[11px] flex items-center gap-1"
                >
                  <Share2 className="w-3 h-3" />
                  {copiedInvite ? "Invite Link Copied!" : "Copy Invite Link"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Switch Game inside Room */}
            <select
              value={room.gameType}
              onChange={(e) =>
                sendRoomAction("switch_game", null, {
                  gameType: e.target.value,
                })
              }
              className="px-2.5 py-1.5 rounded-xl bg-[#fffdf7] text-black font-extrabold text-xs border-2 border-black shadow-[0_3px_0_#000]"
            >
              {MULTIPLAYER_GAME_CATALOG.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => sendRoomAction("rematch")}
              className="px-3 py-1.5 rounded-xl bg-[#3ecbff] hover:bg-[#6cdaff] text-black font-extrabold text-xs border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rematch</span>
            </button>

            <button
              type="button"
              onClick={() => setRoom(null)}
              className="px-3 py-1.5 rounded-xl bg-[#ff5252] hover:bg-[#ff6b6b] text-white font-extrabold text-xs border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lobby</span>
            </button>
          </div>
        </div>

        {/* Players Banner & Seat Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[p0, p1].map((p, idx) => {
            const isSeatTurn =
              (room.gameType === "chess" &&
                ((room.state.turn === "w" && idx === 0) ||
                  (room.state.turn === "b" && idx === 1))) ||
              (room.gameType === "checkers" &&
                ((room.state.turn === "r" && idx === 0) ||
                  (room.state.turn === "b" && idx === 1))) ||
              ((room.gameType === "monopoly" ||
                room.gameType === "uno" ||
                room.gameType === "life" ||
                room.gameType === "party_memory") &&
                room.state.turn === idx);

            return (
              <div
                key={idx}
                onClick={() => setActiveSeatControl(idx as 0 | 1)}
                className={`cursor-pointer p-3 rounded-2xl border-[3px] border-black shadow-[0_4px_0_#000] flex items-center justify-between transition-all ${
                  isSeatTurn
                    ? "bg-[#ffe033] text-black ring-2 ring-[#38e54d]"
                    : "bg-[#fffdf7] text-[#1a1a2e]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative bg-[#3529a8] rounded-xl p-1 border-2 border-black">
                    <PixelAvatar
                      avatar={p.avatar}
                      size={44}
                      showCrown={
                        Boolean(room.winner && room.winner.includes(p.name))
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black/10 border border-black/20">
                        P{idx + 1}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold opacity-80 flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          p.connected ? "bg-[#16a34a]" : "bg-amber-500"
                        }`}
                      />
                      <span>
                        {isSeatTurn ? "🎯 Current Turn!" : "Ready"}
                      </span>
                    </div>
                  </div>
                </div>

                {idx === 1 && room.players.length < 2 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendRoomAction("add_second_player", null, {
                        partnerName: "Amelia",
                        partnerAvatar: herAvatar,
                      });
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#38e54d] text-black font-black text-xs border-2 border-black shadow-[0_2px_0_#000]"
                  >
                    + Add Amelia Here
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Error / Winner Alert */}
        {roomError && (
          <div className="bg-[#ff5252] text-white font-bold text-xs px-4 py-2.5 rounded-xl border-2 border-black shadow-[0_3px_0_#000] flex items-center justify-between">
            <span>⚠️ {roomError}</span>
            <button onClick={() => setRoomError(null)} className="font-black">
              ✕
            </button>
          </div>
        )}

        {room.winner && (
          <div className="bg-[#38e54d] text-[#05290a] border-[3px] border-black rounded-2xl p-4 shadow-[0_5px_0_#000] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/trophy-strip.png"
                alt="Trophy"
                className="w-10 h-10 object-cover object-left"
                style={{ imageRendering: "pixelated" }}
              />
              <div>
                <div className="font-black text-base sm:text-lg">
                  🏆 Winner: {room.winner}!
                </div>
                <div className="text-xs font-bold opacity-90">
                  Match saved to your Couple Game History! Ready for a rematch?
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => sendRoomAction("rematch")}
              className="px-4 py-2 rounded-xl bg-[#ffe033] hover:bg-[#ffea70] text-black font-black text-xs sm:text-sm border-2 border-black shadow-[0_3px_0_#000]"
            >
              🔄 Play Rematch
            </button>
          </div>
        )}

        {/* Main Two-Column Arena: Left = Game Board, Right = Chat & Reactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* LEFT 2 COLS: Interactive Game Stage */}
          <div className="lg:col-span-2 bg-[#fffdf7] text-[#1a1a2e] border-[3px] border-black rounded-2xl p-3 sm:p-5 shadow-[0_6px_0_#000]">
            {/* 1. CHESS */}
            {room.gameType === "chess" && (() => {
              const st = room.state;
              const legalMoves = selectedSquare
                ? getLegalMovesForSquare(st, selectedSquare[0], selectedSquare[1])
                : [];

              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#eef2ff] border-2 border-black rounded-xl px-3 py-2">
                    <div className="font-black text-xs sm:text-sm">
                      {st.status === "checkmate"
                        ? `♛ Checkmate! ${st.winner === "w" ? p0.name : p1.name} Wins!`
                        : st.status === "stalemate"
                        ? "🤝 Stalemate — Draw!"
                        : `${st.turn === "w" ? `⚪ ${p0.name} (White)` : `⚫ ${p1.name} (Black)`} to move${
                            st.inCheck ? " — ⚠️ CHECK!" : ""
                          }`}
                    </div>
                    <div className="text-xs font-bold text-gray-700">
                      Moves: {st.moveHistory?.length || 0}
                    </div>
                  </div>

                  <div className="max-w-[400px] mx-auto aspect-square border-[3.5px] border-black rounded-xl overflow-hidden shadow-[0_5px_0_#000] grid grid-cols-8">
                    {st.board.map((row: any[], rIdx: number) =>
                      row.map((cell: string | null, cIdx: number) => {
                        const isDark = (rIdx + cIdx) % 2 === 1;
                        const isSelected =
                          selectedSquare?.[0] === rIdx &&
                          selectedSquare?.[1] === cIdx;
                        const isLegalDest = legalMoves.some(
                          (m) => m.to[0] === rIdx && m.to[1] === cIdx
                        );
                        const isLastMove =
                          (st.lastMove?.from?.[0] === rIdx &&
                            st.lastMove?.from?.[1] === cIdx) ||
                          (st.lastMove?.to?.[0] === rIdx &&
                            st.lastMove?.to?.[1] === cIdx);

                        return (
                          <button
                            key={`${rIdx}-${cIdx}`}
                            type="button"
                            onClick={() => {
                              if (isLegalDest && selectedSquare) {
                                sendRoomAction("move", {
                                  from: selectedSquare,
                                  to: [rIdx, cIdx],
                                  promotion: "q",
                                });
                                setSelectedSquare(null);
                              } else if (cell && cell[0] === st.turn) {
                                setSelectedSquare([rIdx, cIdx]);
                              } else {
                                setSelectedSquare(null);
                              }
                            }}
                            className={`relative flex items-center justify-center text-2xl sm:text-3xl select-none transition-colors ${
                              isSelected
                                ? "bg-[#ffe033]"
                                : isLastMove
                                ? "bg-[#fde047]/70"
                                : isDark
                                ? "bg-[#6d59d6]"
                                : "bg-[#f3f0ff]"
                            }`}
                          >
                            {isLegalDest && (
                              <span
                                className={`w-3.5 h-3.5 rounded-full border-2 border-black z-10 ${
                                  cell ? "bg-[#ff5252]" : "bg-[#38e54d]"
                                }`}
                              />
                            )}
                            {cell && (
                              <span
                                className={`leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] ${
                                  cell[0] === "w"
                                    ? "text-white [text-shadow:0_2px_0_#000,-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]"
                                    : "text-[#111827]"
                                }`}
                              >
                                {CHESS_UNICODE[cell]}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Move History Strip */}
                  {st.moveHistory?.length > 0 && (
                    <div className="bg-white border-2 border-black rounded-xl p-2 text-xs font-bold flex items-center gap-1.5 overflow-x-auto">
                      <span className="text-gray-500 shrink-0">Moves:</span>
                      {st.moveHistory.slice(-12).map((m: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#eef2ff] border border-black/20 shrink-0"
                        >
                          {m.notation}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 2. CHECKERS */}
            {room.gameType === "checkers" && (() => {
              const st = room.state;
              const allValid = getValidCheckersMoves(st);
              const movesForSelected = selectedSquare
                ? allValid.filter(
                    (m) =>
                      m.from[0] === selectedSquare[0] &&
                      m.from[1] === selectedSquare[1]
                  )
                : [];

              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#eef2ff] border-2 border-black rounded-xl px-3 py-2">
                    <div className="font-black text-xs sm:text-sm">
                      {st.status === "finished"
                        ? `🏆 ${st.winner === "r" ? p0.name : p1.name} Wins Checkers!`
                        : `${
                            st.turn === "r"
                              ? `🔴 ${p0.name} (Red)`
                              : `🔵 ${p1.name} (Blue)`
                          }'s Turn`}
                    </div>
                    <div className="text-xs font-extrabold flex gap-3">
                      <span>🔴 Captured: {st.redCaptured}</span>
                      <span>🔵 Captured: {st.blackCaptured}</span>
                    </div>
                  </div>

                  <div className="max-w-[400px] mx-auto aspect-square border-[3.5px] border-black rounded-xl overflow-hidden shadow-[0_5px_0_#000] grid grid-cols-8">
                    {st.board.map((row: any[], rIdx: number) =>
                      row.map((cell: string | null, cIdx: number) => {
                        const isDark = (rIdx + cIdx) % 2 === 1;
                        const isSelected =
                          selectedSquare?.[0] === rIdx &&
                          selectedSquare?.[1] === cIdx;
                        const isDest = movesForSelected.some(
                          (m) => m.to[0] === rIdx && m.to[1] === cIdx
                        );

                        return (
                          <button
                            key={`${rIdx}-${cIdx}`}
                            type="button"
                            onClick={() => {
                              if (isDest && selectedSquare) {
                                sendRoomAction("move", {
                                  from: selectedSquare,
                                  to: [rIdx, cIdx],
                                });
                                setSelectedSquare(null);
                              } else if (cell && cell[0] === st.turn) {
                                setSelectedSquare([rIdx, cIdx]);
                              } else {
                                setSelectedSquare(null);
                              }
                            }}
                            className={`relative flex items-center justify-center ${
                              isSelected
                                ? "bg-[#ffe033]"
                                : isDark
                                ? "bg-[#3529a8]"
                                : "bg-[#fffdf7]"
                            }`}
                          >
                            {isDest && (
                              <span className="w-4 h-4 rounded-full bg-[#38e54d] border-2 border-black animate-pulse" />
                            )}
                            {cell && (
                              <div
                                className={`w-4/5 h-4/5 rounded-full border-[2.5px] border-black shadow-[0_3px_0_#000] flex items-center justify-center font-black text-xs ${
                                  cell[0] === "r"
                                    ? "bg-[#ff4b72] text-white"
                                    : "bg-[#3ecbff] text-black"
                                }`}
                              >
                                {cell.endsWith("k") ? "👑" : ""}
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 3. COUPLEOPOLIS (MONOPOLY-INSPIRED) */}
            {room.gameType === "monopoly" && (() => {
              const st = room.state;
              const currentTile = COUPLEOPOLIS_TILES[st.positions[st.turn]];

              return (
                <div className="space-y-4">
                  {/* Cash & Net Worth Bar */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[0, 1].map((seatIdx) => (
                      <div
                        key={seatIdx}
                        className="bg-[#eef2ff] border-2 border-black rounded-xl p-2.5 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-black">
                            {seatIdx === 0 ? p0.name : p1.name}
                          </div>
                          <div className="text-[11px] font-bold text-gray-600">
                            Net Worth: ${calculateNetWorth(st, seatIdx as 0 | 1)}
                          </div>
                        </div>
                        <div className="text-base font-black text-[#16a34a]">
                          ${st.money[seatIdx]}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Center Action Box */}
                  <div className="bg-[#261c7a] text-white border-[3px] border-black rounded-2xl p-4 text-center space-y-3 shadow-[0_4px_0_#000]">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#ffe033]">
                      Turn {st.turnCount} / {st.maxTurns} •{" "}
                      {st.turn === 0 ? p0.name : p1.name}&apos;s Turn
                    </div>
                    <p className="text-sm font-extrabold">{st.lastEvent}</p>

                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      {st.phase === "roll" && (
                        <button
                          type="button"
                          onClick={() =>
                            sendRoomAction("move", { type: "roll" })
                          }
                          className="px-6 py-2.5 rounded-xl bg-[#38e54d] hover:bg-[#4df060] text-black font-black text-sm border-[2.5px] border-black shadow-[0_4px_0_#000] active:translate-y-0.5 flex items-center gap-2"
                        >
                          <span>🎲 Roll Dice</span>
                        </button>
                      )}

                      {st.phase === "buy_decision" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              sendRoomAction("move", { type: "buy" })
                            }
                            className="px-5 py-2 rounded-xl bg-[#38e54d] text-black font-black text-xs sm:text-sm border-2 border-black shadow-[0_3px_0_#000]"
                          >
                            🏠 Buy / Upgrade {currentTile?.name}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              sendRoomAction("move", { type: "skip_buy" })
                            }
                            className="px-4 py-2 rounded-xl bg-[#ff5252] text-white font-black text-xs sm:text-sm border-2 border-black shadow-[0_3px_0_#000]"
                          >
                            Pass
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 20-Tile Board Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {COUPLEOPOLIS_TILES.map((t) => {
                      const prop = st.properties[t.index];
                      const p0Here = st.positions[0] === t.index;
                      const p1Here = st.positions[1] === t.index;

                      return (
                        <div
                          key={t.index}
                          className={`relative rounded-xl border-2 border-black p-2 flex flex-col justify-between min-h-[82px] shadow-[0_2px_0_#000] ${
                            p0Here || p1Here ? "bg-[#fff9db] ring-2 ring-black" : "bg-white"
                          }`}
                        >
                          {t.color && (
                            <div
                              style={{ backgroundColor: t.color }}
                              className="h-2.5 -mx-2 -mt-2 mb-1 rounded-t-[10px] border-b-2 border-black"
                            />
                          )}
                          <div className="text-center">
                            <div className="text-lg leading-none">{t.emoji}</div>
                            <div className="text-[10px] font-black leading-tight mt-1 line-clamp-2">
                              {t.name}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-bold mt-1">
                            {t.price ? <span>${t.price}</span> : <span />}
                            {prop && (
                              <span
                                className={`px-1.5 rounded border border-black text-[9px] font-black ${
                                  prop.owner === 0
                                    ? "bg-[#38e54d] text-black"
                                    : "bg-[#ff6bd6] text-black"
                                }`}
                              >
                                P{prop.owner + 1} ★{prop.level}
                              </span>
                            )}
                          </div>

                          {(p0Here || p1Here) && (
                            <div className="absolute -top-2 -right-1 flex gap-0.5">
                              {p0Here && (
                                <span className="px-1.5 py-0.5 rounded-full bg-[#38e54d] text-black border border-black text-[9px] font-black">
                                  P1
                                </span>
                              )}
                              {p1Here && (
                                <span className="px-1.5 py-0.5 rounded-full bg-[#ff6bd6] text-black border border-black text-[9px] font-black">
                                  P2
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 4. WILD COLORS (UNO-INSPIRED CARD GAME) */}
            {room.gameType === "uno" && (() => {
              const st = room.state;
              const viewingSeat = effectiveSeat;
              const myHand: UnoCard[] = st.hands?.[viewingSeat] || [];
              const otherSeat = viewingSeat === 0 ? 1 : 0;
              const oppCount = st.hands?.[otherSeat]?.length || 0;

              const colorHex: Record<string, string> = {
                red: "#ff4b4b",
                yellow: "#ffe033",
                green: "#38e54d",
                blue: "#3ecbff",
                wild: "#1a1a2e",
              };

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#eef2ff] border-2 border-black rounded-xl px-3 py-2">
                    <div className="text-xs font-black">
                      {st.lastAction}
                    </div>
                    <div className="text-xs font-extrabold">
                      Opponent Cards: <span className="px-2 py-0.5 rounded bg-black text-white">{oppCount}</span>
                    </div>
                  </div>

                  {/* Center Discard & Draw Pile */}
                  <div className="flex items-center justify-center gap-6 py-4 bg-[#261c7a] rounded-2xl border-[3px] border-black shadow-inner">
                    {/* Draw Deck */}
                    <button
                      type="button"
                      onClick={() => sendRoomAction("move", { type: "draw" })}
                      className="w-24 h-36 rounded-2xl bg-[#1a1a2e] hover:bg-black text-white border-[3px] border-black shadow-[0_5px_0_#000] active:translate-y-0.5 flex flex-col items-center justify-center gap-1"
                    >
                      <span className="text-2xl">🃏</span>
                      <span className="font-black text-xs">DRAW CARD</span>
                    </button>

                    {/* Active Top Card */}
                    <div
                      style={{
                        backgroundColor: colorHex[st.currentColor] || "#ff4b4b",
                      }}
                      className={`w-24 h-36 rounded-2xl border-[3px] border-black shadow-[0_5px_0_#000] flex flex-col items-center justify-center p-2 ${
                        st.currentColor === "yellow" || st.currentColor === "green"
                          ? "text-black"
                          : "text-white"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase opacity-85">
                        {st.currentColor}
                      </span>
                      <span className="text-2xl font-black uppercase my-1">
                        {st.currentValue}
                      </span>
                    </div>
                  </div>

                  {/* Wild Color Selector Modal */}
                  {pendingWildCard && (
                    <div className="bg-[#ffe033] border-[3px] border-black rounded-2xl p-3 text-center space-y-2">
                      <div className="font-black text-xs">
                        Choose a color for your {pendingWildCard.value.toUpperCase()}:
                      </div>
                      <div className="flex justify-center gap-2">
                        {(["red", "yellow", "green", "blue"] as Exclude<UnoColor, "wild">[]).map(
                          (col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => {
                                sendRoomAction("move", {
                                  type: "play",
                                  cardId: pendingWildCard.id,
                                  chosenColor: col,
                                });
                                setPendingWildCard(null);
                              }}
                              style={{ backgroundColor: colorHex[col] }}
                              className="px-4 py-2 rounded-xl border-2 border-black font-black text-xs uppercase shadow-[0_2px_0_#000]"
                            >
                              {col}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Player Hand */}
                  <div>
                    <div className="text-xs font-black mb-2 flex items-center justify-between">
                      <span>
                        Viewing {viewingSeat === 0 ? p0.name : p1.name}&apos;s Hand ({myHand.length} cards)
                      </span>
                      <span className="text-[11px] text-gray-600">
                        Click a player banner above to switch seat in Pass & Play
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {myHand.map((card) => {
                        const playable =
                          st.turn === viewingSeat && canPlayUnoCard(st, card);
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => {
                              if (card.color === "wild") {
                                setPendingWildCard(card);
                              } else {
                                sendRoomAction("move", {
                                  type: "play",
                                  cardId: card.id,
                                });
                              }
                            }}
                            style={{
                              backgroundColor: colorHex[card.color],
                            }}
                            className={`w-16 h-24 rounded-xl border-[2.5px] border-black shadow-[0_4px_0_#000] flex flex-col items-center justify-center p-1 transition-transform ${
                              card.color === "yellow" || card.color === "green"
                                ? "text-black"
                                : "text-white"
                            } ${
                              playable
                                ? "hover:-translate-y-1.5 ring-2 ring-black"
                                : "opacity-75"
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase">
                              {card.color}
                            </span>
                            <span className="text-base font-black uppercase">
                              {card.value}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 5. OUR LIFE TOGETHER (LIFE PATH BOARD GAME) */}
            {room.gameType === "life" && (() => {
              const st = room.state;
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    {[0, 1].map((idx) => (
                      <div
                        key={idx}
                        className="bg-[#eef2ff] border-2 border-black rounded-xl p-2.5"
                      >
                        <div className="font-black text-xs">
                          {idx === 0 ? p0.name : p1.name} •{" "}
                          <span className="text-[#6d28d9]">
                            {st.careers?.[idx] || "Dreamer"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs font-extrabold">
                          <span className="text-[#16a34a]">💵 ${st.cash?.[idx]}</span>
                          <span className="text-[#e11d48]">❤️ {st.lovePoints?.[idx]} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#261c7a] text-white border-[3px] border-black rounded-2xl p-4 text-center space-y-3">
                    <p className="text-sm font-extrabold">{st.lastEvent}</p>
                    <button
                      type="button"
                      onClick={() => sendRoomAction("move", { type: "spin" })}
                      className="px-6 py-2.5 rounded-xl bg-[#ff6bd6] hover:bg-[#ff85de] text-black font-black text-sm border-[2.5px] border-black shadow-[0_4px_0_#000] active:translate-y-0.5"
                    >
                      🎡 Spin the Wheel ({st.turn === 0 ? p0.name : p1.name})
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {LIFE_PATH_NODES.map((node) => {
                      const p0Here = st.positions?.[0] === node.index;
                      const p1Here = st.positions?.[1] === node.index;
                      return (
                        <div
                          key={node.index}
                          className={`relative p-2.5 rounded-xl border-2 border-black text-center shadow-[0_2px_0_#000] ${
                            p0Here || p1Here ? "bg-[#ffe033]" : "bg-white"
                          }`}
                        >
                          <div className="text-xl">{node.emoji}</div>
                          <div className="text-[10px] font-black mt-1">
                            {node.title}
                          </div>
                          {(p0Here || p1Here) && (
                            <div className="mt-1 flex justify-center gap-1">
                              {p0Here && (
                                <span className="px-1.5 rounded bg-[#38e54d] border border-black text-[9px] font-black">
                                  P1
                                </span>
                              )}
                              {p1Here && (
                                <span className="px-1.5 rounded bg-[#ff6bd6] border border-black text-[9px] font-black">
                                  P2
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 6. PARTY GAMES: TRIVIA / WYR / RPS / DRAW / MEMORY */}
            {room.gameType === "party_trivia" && (() => {
              const st = room.state;
              const qObj = st.questions?.[st.round] || st.questions?.[0];
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#eef2ff] border-2 border-black rounded-xl px-3 py-2 text-xs font-black">
                    <span>
                      Question {st.round + 1} / {st.questions?.length}
                    </span>
                    <span>
                      Scores: {p0.name} ({st.scores?.[0]}) — {p1.name} ({st.scores?.[1]})
                    </span>
                  </div>
                  <div className="bg-[#261c7a] text-white border-[3px] border-black rounded-2xl p-4 text-center space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#ffe033] text-black text-[10px] font-black">
                      {qObj?.category}
                    </span>
                    <h4 className="text-base sm:text-lg font-black">
                      {qObj?.q}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {qObj?.options?.map((opt: string, oIdx: number) => (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() =>
                          sendRoomAction("move", { choice: oIdx })
                        }
                        className="p-3 rounded-xl bg-white hover:bg-[#ffe033] text-left font-extrabold text-xs sm:text-sm border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {room.gameType === "party_wyr" && (() => {
              const st = room.state;
              const prompt = st.prompts?.[st.round] || st.prompts?.[0];
              return (
                <div className="space-y-4">
                  <div className="bg-[#261c7a] text-white border-[3px] border-black rounded-2xl p-4 text-center space-y-2">
                    <div className="text-xs font-black text-[#ffe033]">
                      Couple Wavelength Sync • Matches: {st.matches}
                    </div>
                    <h4 className="text-base sm:text-lg font-black">
                      {prompt?.q}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => sendRoomAction("move", { choice: "A" })}
                      className="p-4 rounded-2xl bg-[#3ecbff] hover:bg-[#6cdaff] text-black font-black text-sm border-[2.5px] border-black shadow-[0_4px_0_#000]"
                    >
                      {prompt?.a}
                    </button>
                    <button
                      type="button"
                      onClick={() => sendRoomAction("move", { choice: "B" })}
                      className="p-4 rounded-2xl bg-[#ff6bd6] hover:bg-[#ff85de] text-black font-black text-sm border-[2.5px] border-black shadow-[0_4px_0_#000]"
                    >
                      {prompt?.b}
                    </button>
                  </div>
                  {st.history?.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      {st.history.map((h: any, i: number) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-[#eef2ff] border-2 border-black text-xs font-bold flex items-center justify-between"
                        >
                          <span>{h.q}</span>
                          <span className="px-2 py-0.5 rounded bg-[#ffe033] border border-black font-black">
                            {h.matched ? "💖 MATCHED!" : "Different Picks"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {room.gameType === "party_rps" && (() => {
              const st = room.state;
              return (
                <div className="space-y-4 text-center">
                  <div className="bg-[#261c7a] text-white border-[3px] border-black rounded-2xl p-4">
                    <div className="text-xs font-black text-[#ffe033]">
                      Round {st.round} • Score: {p0.name} {st.scores?.[0]} - {st.scores?.[1]} {p1.name}
                    </div>
                    <p className="text-sm font-black mt-1">{st.lastRoundText}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "rock", emoji: "🪨", label: "Rock" },
                      { id: "paper", emoji: "📄", label: "Paper" },
                      { id: "scissors", emoji: "✂️", label: "Scissors" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          sendRoomAction("move", { pick: item.id })
                        }
                        className="p-4 rounded-2xl bg-[#ffe033] hover:bg-[#ffea70] text-black font-black border-[3px] border-black shadow-[0_4px_0_#000] active:translate-y-0.5 flex flex-col items-center gap-1"
                      >
                        <span className="text-3xl">{item.emoji}</span>
                        <span className="text-xs">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {room.gameType === "party_memory" && (() => {
              const st = room.state;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[#eef2ff] border-2 border-black rounded-xl px-3 py-2 text-xs font-black">
                    <span>{st.lastEvent}</span>
                    <span>
                      {p0.name}: {st.scores?.[0]} | {p1.name}: {st.scores?.[1]}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5 max-w-[360px] mx-auto">
                    {st.cards?.map((c: any, idx: number) => {
                      const isShown =
                        c.matchedBy !== null ||
                        st.flippedIndices?.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            sendRoomAction("move", { cardIndex: idx })
                          }
                          className={`aspect-square rounded-2xl border-[2.5px] border-black shadow-[0_3px_0_#000] text-2xl flex items-center justify-center font-black transition-transform active:scale-95 ${
                            isShown
                              ? "bg-[#ffe033] text-black"
                              : "bg-[#3529a8] text-white"
                          }`}
                        >
                          {isShown ? c.emoji : "❓"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {room.gameType === "party_draw" && (() => {
              const st = room.state;
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#261c7a] text-white border-2 border-black rounded-xl px-3 py-2">
                    <div className="text-xs font-black">
                      🎨 Secret Word (Drawer):{" "}
                      <span className="px-2 py-0.5 rounded bg-[#ffe033] text-black font-mono">
                        {st.word}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[
                        "#000000",
                        "#ff4b4b",
                        "#38e54d",
                        "#3ecbff",
                        "#ff8c00",
                        "#ff6bd6",
                      ].map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setBrushColor(col)}
                          style={{ backgroundColor: col }}
                          className={`w-5 h-5 rounded-full border-2 border-white ${
                            brushColor === col ? "scale-125" : ""
                          }`}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          sendRoomAction("move", { type: "clear" })
                        }
                        className="ml-2 px-2 py-0.5 rounded bg-[#ff5252] text-white text-[10px] font-black border border-black"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <canvas
                    ref={canvasRef}
                    width={460}
                    height={280}
                    onPointerDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x =
                        ((e.clientX - rect.left) / rect.width) *
                        e.currentTarget.width;
                      const y =
                        ((e.clientY - rect.top) / rect.height) *
                        e.currentTarget.height;
                      setIsDrawing(true);
                      currentStrokeRef.current = [[x, y]];
                    }}
                    onPointerMove={(e) => {
                      if (!isDrawing) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x =
                        ((e.clientX - rect.left) / rect.width) *
                        e.currentTarget.width;
                      const y =
                        ((e.clientY - rect.top) / rect.height) *
                        e.currentTarget.height;
                      currentStrokeRef.current.push([x, y]);
                      const ctx = e.currentTarget.getContext("2d");
                      if (ctx && currentStrokeRef.current.length > 1) {
                        const pts = currentStrokeRef.current;
                        ctx.strokeStyle = brushColor;
                        ctx.lineWidth = brushSize;
                        ctx.lineCap = "round";
                        ctx.beginPath();
                        ctx.moveTo(
                          pts[pts.length - 2][0],
                          pts[pts.length - 2][1]
                        );
                        ctx.lineTo(
                          pts[pts.length - 1][0],
                          pts[pts.length - 1][1]
                        );
                        ctx.stroke();
                      }
                    }}
                    onPointerUp={() => {
                      if (!isDrawing) return;
                      setIsDrawing(false);
                      if (currentStrokeRef.current.length > 0) {
                        sendRoomAction("move", {
                          type: "stroke",
                          stroke: {
                            points: currentStrokeRef.current,
                            color: brushColor,
                            size: brushSize,
                          },
                        });
                      }
                    }}
                    className="w-full bg-white border-[3px] border-black rounded-xl cursor-crosshair touch-none shadow-inner"
                  />

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!drawGuessInput.trim()) return;
                      sendRoomAction("move", {
                        type: "guess",
                        text: drawGuessInput.trim(),
                        senderName: playerName,
                      });
                      setDrawGuessInput("");
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={drawGuessInput}
                      onChange={(e) => setDrawGuessInput(e.target.value)}
                      placeholder="Type your guess for the drawing..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#38e54d] text-black font-black text-xs border-2 border-black shadow-[0_2px_0_#000]"
                    >
                      Guess!
                    </button>
                  </form>
                </div>
              );
            })()}
          </div>

          {/* RIGHT COL: Pixel Reactions & Live Room Chat */}
          <div className="bg-[#fffdf7] text-[#1a1a2e] border-[3px] border-black rounded-2xl p-3.5 shadow-[0_6px_0_#000] flex flex-col h-[430px]">
            <div className="font-black text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>💬 In-Game Chat & Reactions</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#ffe033] border border-black">
                Live Sync
              </span>
            </div>

            {/* Quick Pixel Reaction Bar */}
            <div className="grid grid-cols-6 gap-1 mb-2.5">
              {PIXEL_REACTIONS.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() =>
                    sendRoomAction("reaction", null, {
                      emoji: r.emoji,
                      label: r.label,
                    })
                  }
                  title={r.label}
                  className="py-1.5 rounded-xl bg-[#eef2ff] hover:bg-[#ffe033] border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 text-base flex items-center justify-center"
                >
                  {r.emoji}
                </button>
              ))}
            </div>

            {/* Messages Scroll */}
            <div className="flex-1 overflow-y-auto space-y-2 bg-white border-2 border-black rounded-xl p-2.5 text-xs">
              {(room.chat || []).map((m) => (
                <div
                  key={m.id}
                  className={`p-2 rounded-lg border border-black/20 ${
                    m.senderId === "system"
                      ? "bg-[#fff9db] font-bold text-[#1a1a2e]"
                      : "bg-[#f3f4f6]"
                  }`}
                >
                  <span className="font-black text-[#3529a8] mr-1.5">
                    {m.senderName}:
                  </span>
                  <span className="font-medium break-words">{m.text}</span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatInput.trim()) return;
                sendRoomAction("chat", null, { text: chatInput.trim() });
                setChatInput("");
              }}
              className="mt-2.5 flex gap-1.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send a message to the room..."
                className="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-[#38e54d] hover:bg-[#4df060] text-black font-black border-2 border-black shadow-[0_2px_0_#000]"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER GAME LOBBY & CATALOG
  // =========================================================
  const categories = [
    "All",
    "Board Games",
    "Card Games",
    "Party Games",
    "Couple Games",
    "Quick Games",
  ];

  const filteredGames =
    selectedCategory === "All"
      ? MULTIPLAYER_GAME_CATALOG
      : MULTIPLAYER_GAME_CATALOG.filter((g) => g.category === selectedCategory);

  return (
    <div className="space-y-5">
      {/* Top Skribbl / Jeoparty Lobby Banner */}
      <div className="bg-[#261c7a] text-white border-[3.5px] border-black rounded-3xl p-4 sm:p-5 shadow-[0_7px_0_#000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Player Identity & Avatars */}
          <div className="flex items-center gap-3.5">
            <div
              onClick={() => setShowAvatarStudio(!showAvatarStudio)}
              className="relative bg-[#3529a8] border-[3px] border-black rounded-2xl p-1.5 shadow-[0_4px_0_#000] cursor-pointer hover:scale-105 transition-transform flex items-center gap-1"
              title="Click to customize your Jeoparty Pixel Characters!"
            >
              <PixelAvatar avatar={myAvatar} size={52} />
              <PixelAvatar avatar={herAvatar} size={52} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ffe033] text-black text-[11px] font-black border-2 border-black mb-1">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>ONLINE MULTIPLAYER VIRTUAL DATES</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-wide drop-shadow-[0_2px_0_#000]">
                Play Together Live Across Any Device!
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (typeof window !== "undefined") {
                      localStorage.setItem(
                        "amelia_mp_player_name",
                        e.target.value
                      );
                    }
                  }}
                  placeholder="Your Name"
                  className="w-32 px-2.5 py-1 rounded-xl bg-[#fffdf7] text-black font-extrabold text-xs border-2 border-black"
                />
                <button
                  type="button"
                  onClick={() => setShowAvatarStudio(!showAvatarStudio)}
                  className="px-3 py-1 rounded-xl bg-[#ff6bd6] hover:bg-[#ff85de] text-black font-black text-xs border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>{showAvatarStudio ? "Hide Character Studio" : "Customize Characters"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowHistory(!showHistory);
                    fetchGameHistory();
                  }}
                  className="px-3 py-1 rounded-xl bg-[#3ecbff] hover:bg-[#6cdaff] text-black font-black text-xs border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Match History ({historyList.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Join Private Room by Code */}
          <div className="bg-[#3529a8] border-[2.5px] border-black rounded-2xl p-3 shadow-[0_4px_0_#000] flex flex-col gap-2 min-w-[240px]">
            <div className="text-xs font-black text-[#ffe033] uppercase tracking-wider">
              🔑 Have an Invite Room Code?
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="6-DIGIT CODE"
                maxLength={8}
                className="w-full px-3 py-1.5 rounded-xl bg-[#fffdf7] text-black font-mono font-black text-xs uppercase border-2 border-black"
              />
              <button
                type="button"
                disabled={loadingRoom || !joinCodeInput.trim()}
                onClick={() => handleJoinRoom()}
                className="px-4 py-1.5 rounded-xl bg-[#38e54d] hover:bg-[#4df060] text-black font-black text-xs border-2 border-black shadow-[0_3px_0_#000] disabled:opacity-50 shrink-0"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>

        {roomError && (
          <div className="mt-3 bg-[#ff5252] text-white text-xs font-extrabold px-3 py-2 rounded-xl border-2 border-black">
            ⚠️ {roomError}
          </div>
        )}
      </div>

      {/* Collapsible Jeoparty Character Customizer */}
      {showAvatarStudio && (
        <AvatarCustomizer
          initialMyAvatar={myAvatar}
          initialHerAvatar={herAvatar}
          onChangeMyAvatar={setMyAvatar}
          onChangeHerAvatar={setHerAvatar}
          onClose={() => setShowAvatarStudio(false)}
        />
      )}

      {/* Collapsible Match History */}
      {showHistory && (
        <div className="bg-[#fffdf7] text-[#1a1a2e] border-[3px] border-black rounded-2xl p-4 shadow-[0_5px_0_#000] space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#eab308]" />
              <span>Recent Couple Multiplayer Matches</span>
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs font-black px-2 py-0.5 rounded bg-gray-200 border border-black"
            >
              Close
            </button>
          </div>
          {historyList.length === 0 ? (
            <p className="text-xs text-gray-600 font-semibold">
              No completed matches yet — start any game below to record your couple scoreboard!
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {historyList.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-xl bg-[#eef2ff] border-2 border-black flex items-center justify-between text-xs font-bold"
                >
                  <div>
                    <span className="font-black">{h.game_title}</span> —{" "}
                    <span>{h.summary}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#ffe033] border border-black font-black text-[10px]">
                    🏆 {h.winner}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl font-black text-xs border-[2.5px] border-black transition-all shrink-0 ${
              selectedCategory === cat
                ? "bg-[#ffe033] text-black shadow-[0_3px_0_#000] -translate-y-0.5"
                : "bg-[#fffdf7] text-[#1a1a2e] hover:bg-[#eef2ff]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Playable Multiplayer Game Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            className="bg-[#fffdf7] text-[#1a1a2e] border-[3px] border-black rounded-2xl p-4 shadow-[0_6px_0_#000] flex flex-col justify-between gap-3 hover:-translate-y-0.5 transition-transform"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ backgroundColor: game.badgeColor }}
                    className="w-12 h-12 rounded-2xl border-[2.5px] border-black shadow-[0_3px_0_#000] flex items-center justify-center text-2xl shrink-0"
                  >
                    {game.emoji}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#eef2ff] border border-black">
                      {game.category}
                    </span>
                    <h3 className="font-black text-base mt-0.5">
                      {game.title}
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-[#dcffe2] text-[#05290a] border border-black shrink-0">
                  {game.players}
                </span>
              </div>

              <p className="text-xs font-semibold text-gray-700 leading-relaxed">
                {game.description}
              </p>

              {game.memoryTip && (
                <div className="text-[11px] font-bold bg-[#fff9db] border-2 border-black rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#eab308] shrink-0" />
                  <span>{game.memoryTip}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t-2 border-dashed border-black/15 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loadingRoom}
                onClick={() => handleCreateRoom(game.id, true)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#38e54d] hover:bg-[#4df060] text-[#05290a] font-black text-xs border-[2.5px] border-black shadow-[0_3px_0_#000] active:translate-y-0.5 flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Now (Create Room)</span>
              </button>

              {onSelectChatPrompt && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectChatPrompt(
                      `Write a cute, playful text inviting Amelia to play a round of "${game.title}" with me tonight on our Virtual Dates arcade!`
                    )
                  }
                  className="py-2 px-3 rounded-xl bg-[#ff6bd6] hover:bg-[#ff85de] text-black font-black text-xs border-[2.5px] border-black shadow-[0_3px_0_#000] active:translate-y-0.5"
                  title="Ask Ameilia AI to draft a sweet game invite text"
                >
                  💌 Draft Invite
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
