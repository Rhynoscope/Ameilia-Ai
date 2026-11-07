import { NextRequest, NextResponse } from "next/server";
import {
  getVirtualDateRoom,
  recordGameHistory,
  saveVirtualDateRoom,
} from "@/lib/db";
import {
  createInitialGameState,
  getGameTitle,
  processMultiplayerGameMove,
} from "@/lib/games/board-card-engines";
import { MultiplayerGameType } from "@/lib/types";
import { DEFAULT_HER_AVATAR } from "@/lib/pixel-avatar";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const room = await getVirtualDateRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ room });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const room = await getVirtualDateRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const body: any = await req.json();
    const { action, playerId, playerName, seatOverride, payload } = body;
    const now = new Date().toISOString();

    const players = Array.isArray(room.players) ? [...room.players] : [];
    const playerIdx = players.findIndex((p: any) => p.id === playerId);
    if (playerIdx >= 0) {
      players[playerIdx] = {
        ...players[playerIdx],
        connected: true,
        lastSeenAt: now,
      };
    }

    // Allow adding Co-op / Pass & Play second player on demand if waiting
    if (action === "add_second_player") {
      if (players.length < 2) {
        players.push({
          id: `${playerId || "host"}_p2`,
          name: body.partnerName || "Amelia",
          seat: 1,
          avatar: body.partnerAvatar || DEFAULT_HER_AVATAR,
          connected: true,
          lastSeenAt: now,
        });
      }
      room.players = players;
      room.status = "playing";
      room.version = (room.version || 1) + 1;
      await saveVirtualDateRoom(room);
      return NextResponse.json({ room });
    }

    if (action === "switch_game" && body.gameType) {
      const nextGame = body.gameType as MultiplayerGameType;
      room.gameType = nextGame;
      room.state = createInitialGameState(nextGame);
      room.status = players.length >= 2 ? "playing" : "waiting";
      room.winner = null;
      room.version = (room.version || 1) + 1;
      room.chat = [
        ...(room.chat || []),
        {
          id: `sys_${Date.now()}`,
          senderId: "system",
          senderName: "Ameilia Arcade",
          text: `Switched game to ${getGameTitle(nextGame)}!`,
          createdAt: now,
        },
      ];
      await saveVirtualDateRoom(room);
      return NextResponse.json({ room });
    }

    if (action === "rematch") {
      room.state = createInitialGameState(room.gameType as MultiplayerGameType);
      room.status = "playing";
      room.winner = null;
      room.version = (room.version || 1) + 1;
      room.chat = [
        ...(room.chat || []),
        {
          id: `sys_${Date.now()}`,
          senderId: "system",
          senderName: "Ameilia Arcade",
          text: `🔄 Rematch started for ${getGameTitle(
            room.gameType as MultiplayerGameType
          )}!`,
          createdAt: now,
        },
      ];
      await saveVirtualDateRoom(room);
      return NextResponse.json({ room });
    }

    if (action === "chat" && body.text) {
      const msg = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        senderId: playerId || "guest",
        senderName:
          playerName ||
          (playerIdx >= 0 ? players[playerIdx].name : "Player"),
        text: String(body.text).trim().slice(0, 300),
        createdAt: now,
      };
      room.chat = [...(room.chat || []), msg].slice(-60);
      room.players = players;
      room.version = (room.version || 1) + 1;
      await saveVirtualDateRoom(room);
      return NextResponse.json({ room });
    }

    if (action === "reaction" && body.emoji) {
      const react = {
        id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        senderId: playerId || "guest",
        senderName:
          playerName ||
          (playerIdx >= 0 ? players[playerIdx].name : "Player"),
        emoji: String(body.emoji),
        label: String(body.label || ""),
        createdAt: now,
      };
      room.reactions = [...(room.reactions || []), react].slice(-20);
      room.players = players;
      room.version = (room.version || 1) + 1;
      await saveVirtualDateRoom(room);
      return NextResponse.json({ room });
    }

    if (action === "move") {
      const seat: 0 | 1 =
        seatOverride === 0 || seatOverride === 1
          ? seatOverride
          : playerIdx >= 0
          ? players[playerIdx].seat
          : 0;

      // Ensure 2nd seat exists if someone makes a move in 2P mode
      if (players.length < 2) {
        players.push({
          id: `${room.hostId}_partner`,
          name: "Amelia",
          seat: 1,
          avatar: DEFAULT_HER_AVATAR,
          connected: true,
          lastSeenAt: now,
        });
      }

      const moveResult = processMultiplayerGameMove(
        room.gameType as MultiplayerGameType,
        room.state,
        seat,
        payload
      );

      if (!moveResult.valid) {
        return NextResponse.json(
          { error: moveResult.error || "Invalid move", room },
          { status: 400 }
        );
      }

      room.state = moveResult.state;
      room.players = players;
      room.status = moveResult.winner ? "finished" : "playing";

      if (moveResult.winner) {
        const winnerName =
          moveResult.winner === "seat_0"
            ? players[0]?.name || "Player 1"
            : moveResult.winner === "seat_1"
            ? players[1]?.name || "Player 2"
            : "Draw / Co-op Sync!";
        room.winner = winnerName;

        try {
          await recordGameHistory({
            room_code: room.code,
            game_type: room.gameType,
            game_title: getGameTitle(room.gameType as MultiplayerGameType),
            players: players.map((p: any) => ({
              name: p.name,
              avatar: p.avatar,
            })),
            winner: winnerName,
            summary: `${players[0]?.name || "Player 1"} vs ${
              players[1]?.name || "Amelia"
            } — Winner: ${winnerName}`,
          });
        } catch {}
      }

      room.version = (room.version || 1) + 1;
      await saveVirtualDateRoom(room);
      return NextResponse.json({ room });
    }

    return NextResponse.json({ room });
  } catch (err: any) {
    console.error("Room action error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process room action" },
      { status: 500 }
    );
  }
}
