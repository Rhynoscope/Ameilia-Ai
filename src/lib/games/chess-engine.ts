export type ChessColor = "w" | "b";
export type ChessPieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type ChessCell = string | null; // e.g. "wp", "bk", or null

export interface ChessMove {
  from: [number, number]; // [row, col] 0..7 (row 0 is rank 8 black, row 7 is rank 1 white)
  to: [number, number];
  piece: string;
  captured?: string | null;
  promotion?: ChessPieceType;
  castling?: "K" | "Q";
  enPassant?: boolean;
  notation: string;
}

export interface ChessState {
  board: ChessCell[][];
  turn: ChessColor;
  castlingRights: {
    wK: boolean;
    wQ: boolean;
    bK: boolean;
    bQ: boolean;
  };
  enPassantTarget: [number, number] | null; // square where en-passant capture lands
  moveHistory: ChessMove[];
  capturedByWhite: string[];
  capturedByBlack: string[];
  inCheck: boolean;
  status: "active" | "checkmate" | "stalemate" | "draw" | "resigned";
  winner: ChessColor | "draw" | null;
  lastMove?: { from: [number, number]; to: [number, number] } | null;
}

export function createInitialChessState(): ChessState {
  const board: ChessCell[][] = [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
  ];

  return {
    board,
    turn: "w",
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassantTarget: null,
    moveHistory: [],
    capturedByWhite: [],
    capturedByBlack: [],
    inCheck: false,
    status: "active",
    winner: null,
    lastMove: null,
  };
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board: ChessCell[][]): ChessCell[][] {
  return board.map((row) => [...row]);
}

function findKing(board: ChessCell[][], color: ChessColor): [number, number] | null {
  const target = `${color}k`;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === target) return [r, c];
    }
  }
  return null;
}

export function isSquareAttacked(
  board: ChessCell[][],
  targetR: number,
  targetC: number,
  byColor: ChessColor
): boolean {
  // Pawn attacks
  const pawnRow = byColor === "w" ? targetR + 1 : targetR - 1;
  for (const dc of [-1, 1]) {
    const pc = targetC + dc;
    if (inBounds(pawnRow, pc) && board[pawnRow][pc] === `${byColor}p`) {
      return true;
    }
  }

  // Knight attacks
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightOffsets) {
    const nr = targetR + dr;
    const nc = targetC + dc;
    if (inBounds(nr, nc) && board[nr][nc] === `${byColor}n`) return true;
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const kr = targetR + dr;
      const kc = targetC + dc;
      if (inBounds(kr, kc) && board[kr][kc] === `${byColor}k`) return true;
    }
  }

  // Orthogonal (Rook / Queen)
  const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of orthoDirs) {
    let r = targetR + dr;
    let c = targetC + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p === `${byColor}r` || p === `${byColor}q`) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // Diagonal (Bishop / Queen)
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let r = targetR + dr;
    let c = targetC + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p === `${byColor}b` || p === `${byColor}q`) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function isKingInCheck(board: ChessCell[][], color: ChessColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const enemy: ChessColor = color === "w" ? "b" : "w";
  return isSquareAttacked(board, kingPos[0], kingPos[1], enemy);
}

function squareToAlgebraic(r: number, c: number): string {
  const files = "abcdefgh";
  return `${files[c]}${8 - r}`;
}

export function getLegalMovesForSquare(
  state: ChessState,
  fromR: number,
  fromC: number
): ChessMove[] {
  const piece = state.board[fromR]?.[fromC];
  if (!piece) return [];
  const color = piece[0] as ChessColor;
  if (color !== state.turn) return [];
  const type = piece[1] as ChessPieceType;
  const enemy: ChessColor = color === "w" ? "b" : "w";

  const pseudoMoves: ChessMove[] = [];

  const addMove = (
    toR: number,
    toC: number,
    opts: Partial<ChessMove> = {}
  ) => {
    const captured = opts.enPassant
      ? `${enemy}p`
      : state.board[toR][toC];
    const pSymbol = type === "p" ? "" : type.toUpperCase();
    const capSymbol = captured ? "x" : "";
    const filePrefix =
      type === "p" && captured ? "abcdefgh"[fromC] : "";
    const promoSuffix = opts.promotion ? `=${opts.promotion.toUpperCase()}` : "";
    const notation = opts.castling
      ? opts.castling === "K"
        ? "O-O"
        : "O-O-O"
      : `${pSymbol}${filePrefix}${capSymbol}${squareToAlgebraic(toR, toC)}${promoSuffix}`;

    pseudoMoves.push({
      from: [fromR, fromC],
      to: [toR, toC],
      piece,
      captured,
      promotion: opts.promotion,
      castling: opts.castling,
      enPassant: opts.enPassant,
      notation,
    });
  };

  if (type === "p") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    const promoRow = color === "w" ? 0 : 7;

    // 1 step forward
    const r1 = fromR + dir;
    if (inBounds(r1, fromC) && !state.board[r1][fromC]) {
      if (r1 === promoRow) {
        addMove(r1, fromC, { promotion: "q" });
      } else {
        addMove(r1, fromC);
      }

      // 2 steps forward from start
      const r2 = fromR + dir * 2;
      if (fromR === startRow && inBounds(r2, fromC) && !state.board[r2][fromC]) {
        addMove(r2, fromC);
      }
    }

    // Captures
    for (const dc of [-1, 1]) {
      const nc = fromC + dc;
      if (!inBounds(r1, nc)) continue;
      const target = state.board[r1][nc];
      if (target && target[0] === enemy) {
        if (r1 === promoRow) {
          addMove(r1, nc, { promotion: "q" });
        } else {
          addMove(r1, nc);
        }
      } else if (
        state.enPassantTarget &&
        state.enPassantTarget[0] === r1 &&
        state.enPassantTarget[1] === nc
      ) {
        addMove(r1, nc, { enPassant: true });
      }
    }
  } else if (type === "n") {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of offsets) {
      const nr = fromR + dr;
      const nc = fromC + dc;
      if (!inBounds(nr, nc)) continue;
      const target = state.board[nr][nc];
      if (!target || target[0] === enemy) {
        addMove(nr, nc);
      }
    }
  } else if (type === "b" || type === "r" || type === "q") {
    const dirs: [number, number][] = [];
    if (type === "b" || type === "q") {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (type === "r" || type === "q") {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    for (const [dr, dc] of dirs) {
      let r = fromR + dr;
      let c = fromC + dc;
      while (inBounds(r, c)) {
        const target = state.board[r][c];
        if (!target) {
          addMove(r, c);
        } else {
          if (target[0] === enemy) addMove(r, c);
          break;
        }
        r += dr;
        c += dc;
      }
    }
  } else if (type === "k") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = fromR + dr;
        const nc = fromC + dc;
        if (!inBounds(nr, nc)) continue;
        const target = state.board[nr][nc];
        if (!target || target[0] === enemy) {
          addMove(nr, nc);
        }
      }
    }

    // Castling
    const homeRow = color === "w" ? 7 : 0;
    if (fromR === homeRow && fromC === 4 && !isKingInCheck(state.board, color)) {
      const canK = color === "w" ? state.castlingRights.wK : state.castlingRights.bK;
      const canQ = color === "w" ? state.castlingRights.wQ : state.castlingRights.bQ;

      if (
        canK &&
        state.board[homeRow][7] === `${color}r` &&
        !state.board[homeRow][5] &&
        !state.board[homeRow][6] &&
        !isSquareAttacked(state.board, homeRow, 5, enemy) &&
        !isSquareAttacked(state.board, homeRow, 6, enemy)
      ) {
        addMove(homeRow, 6, { castling: "K" });
      }

      if (
        canQ &&
        state.board[homeRow][0] === `${color}r` &&
        !state.board[homeRow][1] &&
        !state.board[homeRow][2] &&
        !state.board[homeRow][3] &&
        !isSquareAttacked(state.board, homeRow, 3, enemy) &&
        !isSquareAttacked(state.board, homeRow, 2, enemy)
      ) {
        addMove(homeRow, 2, { castling: "Q" });
      }
    }
  }

  // Filter moves that leave own king in check
  return pseudoMoves.filter((m) => {
    const nextB = simulateMoveOnBoard(state.board, m);
    return !isKingInCheck(nextB, color);
  });
}

function simulateMoveOnBoard(board: ChessCell[][], move: ChessMove): ChessCell[][] {
  const next = cloneBoard(board);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = next[fr][fc];
  if (!piece) return next;
  const color = piece[0] as ChessColor;

  next[fr][fc] = null;
  if (move.enPassant) {
    next[fr][tc] = null;
  }
  if (move.castling === "K") {
    next[fr][5] = next[fr][7];
    next[fr][7] = null;
  } else if (move.castling === "Q") {
    next[fr][3] = next[fr][0];
    next[fr][0] = null;
  }

  next[tr][tc] = move.promotion ? `${color}${move.promotion}` : piece;
  return next;
}

export function getAllLegalMoves(state: ChessState): ChessMove[] {
  const all: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p[0] === state.turn) {
        all.push(...getLegalMovesForSquare(state, r, c));
      }
    }
  }
  return all;
}

export function applyChessMove(
  state: ChessState,
  from: [number, number],
  to: [number, number],
  promotion: ChessPieceType = "q"
): { valid: boolean; state: ChessState; error?: string } {
  if (state.status !== "active") {
    return { valid: false, state, error: "Game has already ended." };
  }

  const legalMoves = getLegalMovesForSquare(state, from[0], from[1]);
  const matched = legalMoves.find(
    (m) => m.to[0] === to[0] && m.to[1] === to[1]
  );

  if (!matched) {
    return { valid: false, state, error: "That move is not legal." };
  }

  if (matched.promotion) {
    matched.promotion = promotion || "q";
  }

  const nextBoard = simulateMoveOnBoard(state.board, matched);
  const color = state.turn;
  const nextTurn: ChessColor = color === "w" ? "b" : "w";

  // Update castling rights
  const cr = { ...state.castlingRights };
  if (matched.piece === "wk") {
    cr.wK = false;
    cr.wQ = false;
  } else if (matched.piece === "bk") {
    cr.bK = false;
    cr.bQ = false;
  }
  if (from[0] === 7 && from[1] === 0) cr.wQ = false;
  if (from[0] === 7 && from[1] === 7) cr.wK = false;
  if (from[0] === 0 && from[1] === 0) cr.bQ = false;
  if (from[0] === 0 && from[1] === 7) cr.bK = false;
  if (to[0] === 7 && to[1] === 0) cr.wQ = false;
  if (to[0] === 7 && to[1] === 7) cr.wK = false;
  if (to[0] === 0 && to[1] === 0) cr.bQ = false;
  if (to[0] === 0 && to[1] === 7) cr.bK = false;

  // En passant target
  let ep: [number, number] | null = null;
  if (matched.piece[1] === "p" && Math.abs(to[0] - from[0]) === 2) {
    ep = [(from[0] + to[0]) / 2, from[1]];
  }

  const capturedByWhite = [...state.capturedByWhite];
  const capturedByBlack = [...state.capturedByBlack];
  if (matched.captured) {
    if (color === "w") capturedByWhite.push(matched.captured);
    else capturedByBlack.push(matched.captured);
  }

  const nextState: ChessState = {
    board: nextBoard,
    turn: nextTurn,
    castlingRights: cr,
    enPassantTarget: ep,
    moveHistory: [...state.moveHistory, matched],
    capturedByWhite,
    capturedByBlack,
    inCheck: isKingInCheck(nextBoard, nextTurn),
    status: "active",
    winner: null,
    lastMove: { from, to },
  };

  const enemyLegal = getAllLegalMoves(nextState);
  if (enemyLegal.length === 0) {
    if (nextState.inCheck) {
      nextState.status = "checkmate";
      nextState.winner = color;
      matched.notation += "#";
    } else {
      nextState.status = "stalemate";
      nextState.winner = "draw";
    }
  } else if (nextState.inCheck) {
    matched.notation += "+";
  }

  return { valid: true, state: nextState };
}
