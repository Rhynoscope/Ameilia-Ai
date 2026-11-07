import { NextRequest, NextResponse } from "next/server";
import {
  getGameHistory,
  getVirtualDateRoom,
  saveVirtualDateRoom,
} from "@/lib/db";
import {
  createInitialGameState,
  getGameTitle,
} from "@/lib/games/board-card-engines";
import { MultiplayerGameType, RoomPlayer } from "@/lib/types";
import { DEFAULT_HER_AVATAR, DEFAULT_MY_AVATAR } from "@/lib/pixel-avatar";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET() {
  try {
    const history = await getGameHistory(25);
    return NextResponse.json({ history });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    const {
      action,
      roomCode,
      gameType = "chess",
      playerId,
      playerName = "Player 1",
      avatar = DEFAULT_MY_AVATAR,
      playWithPartnerOnSameDevice = false,
      partnerName = "Amelia",
      partnerAvatar = DEFAULT_HER_AVATAR,
    } = body;

    const pid = playerId || `p_${Date.now()}`;

    if (action === "join" && roomCode) {
      const existing = await getVirtualDateRoom(roomCode);
      if (!existing) {
        return NextResponse.json(
          { error: `Room "${roomCode.toUpperCase()}" was not found. Check the code and try again!` },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const players: RoomPlayer[] = Array.isArray(existing.players)
        ? [...existing.players]
        : [];

      const existingIdx = players.findIndex((p) => p.id === pid);
      if (existingIdx >= 0) {
        players[existingIdx] = {
          ...players[existingIdx],
          name: playerName || players[existingIdx].name,
          avatar: avatar || players[existingIdx].avatar,
          connected: true,
          lastSeenAt: now,
        };
      } else if (players.length < 2) {
        const seat: 0 | 1 = players.some((p) => p.seat === 0) ? 1 : 0;
        players.push({
          id: pid,
          name: playerName || (seat === 1 ? "Amelia" : "Player 1"),
          seat,
          avatar: avatar || (seat === 1 ? DEFAULT_HER_AVATAR : DEFAULT_MY_AVATAR),
          connected: true,
          lastSeenAt: now,
        });
      } else {
        // Replace disconnected or second seat if re-joining from another browser
        players[1] = {
          ...players[1],
          id: pid,
          name: playerName || players[1].name,
          avatar: avatar || players[1].avatar,
          connected: true,
          lastSeenAt: now,
        };
      }

      const nextStatus =
        players.length >= 2 && existing.status === "waiting"
          ? "playing"
          : existing.status;

      const updatedRoom = {
        ...existing,
        status: nextStatus,
        players,
        version: (existing.version || 1) + 1,
      };

      await saveVirtualDateRoom(updatedRoom);
      return NextResponse.json({ room: updatedRoom });
    }

    // Create new room
    let code = generateRoomCode();
    for (let attempt = 0; attempt < 4; attempt++) {
      const check = await getVirtualDateRoom(code);
      if (!check) break;
      code = generateRoomCode();
    }

    const now = new Date().toISOString();
    const players: RoomPlayer[] = [
      {
        id: pid,
        name: playerName || "Ryan",
        seat: 0,
        avatar: avatar || DEFAULT_MY_AVATAR,
        connected: true,
        lastSeenAt: now,
      },
    ];

    if (playWithPartnerOnSameDevice) {
      players.push({
        id: `${pid}_partner`,
        name: partnerName || "Amelia",
        seat: 1,
        avatar: partnerAvatar || DEFAULT_HER_AVATAR,
        connected: true,
        lastSeenAt: now,
      });
    }

    const initialRoom = {
      code,
      gameType: gameType as MultiplayerGameType,
      status: (players.length >= 2 ? "playing" : "waiting") as
        | "waiting"
        | "playing"
        | "finished",
      hostId: pid,
      players,
      state: createInitialGameState(gameType as MultiplayerGameType),
      chat: [
        {
          id: `sys_${Date.now()}`,
          senderId: "system",
          senderName: "Ameilia Arcade",
          text: `Welcome to ${getGameTitle(
            gameType as MultiplayerGameType
          )}! Share Room Code ${code} or the invite link so both players can play live!`,
          createdAt: now,
        },
      ],
      reactions: [],
      winner: null,
      version: 1,
    };

    await saveVirtualDateRoom(initialRoom);
    return NextResponse.json({ room: initialRoom });
  } catch (err: any) {
    console.error("Game room POST error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create or join game room" },
      { status: 500 }
    );
  }
}
