export type CheckersColor = "r" | "b"; // r = Red (Player 1, moves up), b = Black/Blue (Player 2, moves down)
export type CheckersCell = "r" | "rk" | "b" | "bk" | null;

export interface CheckersMove {
  from: [number, number];
  to: [number, number];
  captured?: [number, number] | null;
}

export interface CheckersState {
  board: CheckersCell[][];
  turn: CheckersColor;
  mustJumpFrom: [number, number] | null;
  redCaptured: number; // pieces captured by red
  blackCaptured: number; // pieces captured by black
  status: "active" | "finished";
  winner: CheckersColor | null;
  moveCount: number;
  lastMove?: { from: [number, number]; to: [number, number] } | null;
}

export function createInitialCheckersState(): CheckersState {
  const board: CheckersCell[][] = Array.from({ length: 8 }, () =>
    Array(8).fill(null)
  );

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = "b";
    }
  }

  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = "r";
    }
  }

  return {
    board,
    turn: "r",
    mustJumpFrom: null,
    redCaptured: 0,
    blackCaptured: 0,
    status: "active",
    winner: null,
    moveCount: 0,
    lastMove: null,
  };
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getPieceDirs(piece: CheckersCell): [number, number][] {
  if (!piece) return [];
  if (piece === "rk" || piece === "bk") {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
  }
  if (piece === "r") {
    return [
      [-1, -1],
      [-1, 1],
    ];
  }
  return [
    [1, -1],
    [1, 1],
  ];
}

export function getCheckersMovesForSquare(
  board: CheckersCell[][],
  r: number,
  c: number,
  onlyJumps = false
): CheckersMove[] {
  const piece = board[r]?.[c];
  if (!piece) return [];
  const color: CheckersColor = piece[0] as CheckersColor;
  const enemy: CheckersColor = color === "r" ? "b" : "r";
  const dirs = getPieceDirs(piece);
  const moves: CheckersMove[] = [];

  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;

    if (!onlyJumps && !board[nr][nc]) {
      moves.push({ from: [r, c], to: [nr, nc], captured: null });
    } else if (board[nr][nc] && board[nr][nc]![0] === enemy) {
      const jr = r + dr * 2;
      const jc = c + dc * 2;
      if (inBounds(jr, jc) && !board[jr][jc]) {
        moves.push({
          from: [r, c],
          to: [jr, jc],
          captured: [nr, nc],
        });
      }
    }
  }

  return moves;
}

export function getValidCheckersMoves(state: CheckersState): CheckersMove[] {
  if (state.status !== "active") return [];

  if (state.mustJumpFrom) {
    const [mr, mc] = state.mustJumpFrom;
    return getCheckersMovesForSquare(state.board, mr, mc, true);
  }

  const allJumps: CheckersMove[] = [];
  const allSteps: CheckersMove[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p[0] === state.turn) {
        const pieceMoves = getCheckersMovesForSquare(state.board, r, c, false);
        for (const m of pieceMoves) {
          if (m.captured) allJumps.push(m);
          else allSteps.push(m);
        }
      }
    }
  }

  // Standard checkers: if a jump is available, jumps are prioritized, or allow any legal move
  return allJumps.length > 0 ? [...allJumps, ...allSteps] : allSteps;
}

export function applyCheckersMove(
  state: CheckersState,
  from: [number, number],
  to: [number, number]
): { valid: boolean; state: CheckersState; error?: string } {
  if (state.status !== "active") {
    return { valid: false, state, error: "Game is already over." };
  }

  const validMoves = getValidCheckersMoves(state);
  const move = validMoves.find(
    (m) =>
      m.from[0] === from[0] &&
      m.from[1] === from[1] &&
      m.to[0] === to[0] &&
      m.to[1] === to[1]
  );

  if (!move) {
    return { valid: false, state, error: "Invalid Checkers move." };
  }

  const nextBoard = state.board.map((row) => [...row]);
  let movingPiece = nextBoard[from[0]][from[1]]!;
  nextBoard[from[0]][from[1]] = null;

  let redCap = state.redCaptured;
  let blackCap = state.blackCaptured;

  if (move.captured) {
    nextBoard[move.captured[0]][move.captured[1]] = null;
    if (state.turn === "r") redCap++;
    else blackCap++;
  }

  // King promotion
  let promotedJustNow = false;
  if (movingPiece === "r" && to[0] === 0) {
    movingPiece = "rk";
    promotedJustNow = true;
  } else if (movingPiece === "b" && to[0] === 7) {
    movingPiece = "bk";
    promotedJustNow = true;
  }

  nextBoard[to[0]][to[1]] = movingPiece;

  // Check multi-jump continuation
  let nextTurn: CheckersColor = state.turn === "r" ? "b" : "r";
  let mustJumpFrom: [number, number] | null = null;

  if (move.captured && !promotedJustNow) {
    const followUpJumps = getCheckersMovesForSquare(
      nextBoard,
      to[0],
      to[1],
      true
    );
    if (followUpJumps.length > 0) {
      nextTurn = state.turn;
      mustJumpFrom = [to[0], to[1]];
    }
  }

  const nextState: CheckersState = {
    board: nextBoard,
    turn: nextTurn,
    mustJumpFrom,
    redCaptured: redCap,
    blackCaptured: blackCap,
    status: "active",
    winner: null,
    moveCount: state.moveCount + 1,
    lastMove: { from, to },
  };

  // Win check: check if nextTurn has any pieces or legal moves
  const remainingMoves = getValidCheckersMoves(nextState);
  if (remainingMoves.length === 0) {
    nextState.status = "finished";
    nextState.winner = state.turn;
  }

  return { valid: true, state: nextState };
}
