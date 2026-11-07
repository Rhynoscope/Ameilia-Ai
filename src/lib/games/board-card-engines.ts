import { MultiplayerGameType } from "../types";
import { createInitialChessState, applyChessMove } from "./chess-engine";
import { createInitialCheckersState, applyCheckersMove } from "./checkers-engine";

// =========================================================
// 3. COUPLEOPOLIS — PROPERTY TRADING BOARD GAME (Monopoly-Inspired)
// =========================================================

export interface MonopolyTile {
  index: number;
  name: string;
  type: "start" | "property" | "chance" | "tax" | "vacation" | "goto_vacation";
  color?: string;
  price?: number;
  rent?: number;
  emoji: string;
}

export const COUPLEOPOLIS_TILES: MonopolyTile[] = [
  { index: 0, name: "START (+200)", type: "start", emoji: "🚀" },
  { index: 1, name: "Matcha Cafe", type: "property", color: "#38e54d", price: 100, rent: 35, emoji: "🍵" },
  { index: 2, name: "Cozy Bookstore", type: "property", color: "#38e54d", price: 120, rent: 45, emoji: "📚" },
  { index: 3, name: "Sweet Surprise!", type: "chance", emoji: "🎁" },
  { index: 4, name: "Ramen Bar", type: "property", color: "#3ecbff", price: 140, rent: 55, emoji: "🍜" },
  { index: 5, name: "Sushi Spot", type: "property", color: "#3ecbff", price: 160, rent: 65, emoji: "🍣" },
  { index: 6, name: "Cozy Lounge", type: "vacation", emoji: "🛋️" },
  { index: 7, name: "Arcade Palace", type: "property", color: "#ff6bd6", price: 180, rent: 75, emoji: "🕹️" },
  { index: 8, name: "Cinema VIP", type: "property", color: "#ff6bd6", price: 200, rent: 85, emoji: "🍿" },
  { index: 9, name: "Treat Tax (-$100)", type: "tax", emoji: "🧋" },
  { index: 10, name: "Art Museum", type: "property", color: "#ff8c00", price: 220, rent: 95, emoji: "🎨" },
  { index: 11, name: "Botanical Garden", type: "property", color: "#ff8c00", price: 240, rent: 105, emoji: "🌸" },
  { index: 12, name: "Sweet Surprise!", type: "chance", emoji: "💌" },
  { index: 13, name: "Snow Fox Sanctuary", type: "property", color: "#ff4b72", price: 260, rent: 120, emoji: "🦊" },
  { index: 14, name: "Stargazing Peak", type: "property", color: "#ff4b72", price: 280, rent: 135, emoji: "🔭" },
  { index: 15, name: "Teleport to Lounge", type: "goto_vacation", emoji: "✈️" },
  { index: 16, name: "Paris Bakery", type: "property", color: "#ffe033", price: 300, rent: 150, emoji: "🥐" },
  { index: 17, name: "Tokyo Tower View", type: "property", color: "#ffe033", price: 320, rent: 165, emoji: "🗼" },
  { index: 18, name: "Sweet Surprise!", type: "chance", emoji: "✨" },
  { index: 19, name: "Dream Penthouse", type: "property", color: "#a855f7", price: 360, rent: 195, emoji: "🏙️" },
];

const CHANCE_EVENTS = [
  { text: "You surprised each other with boba & snacks! Collect $150.", delta: 150 },
  { text: "Found cheap flight tickets for your next visit! Collect $200.", delta: 200 },
  { text: "Late-night food delivery date! Pay $75.", delta: -75 },
  { text: "Won a plushie at the claw machine! Collect $120.", delta: 120 },
  { text: "Bought matching hoodies! Pay $90.", delta: -90 },
  { text: "Tax refund arrived early! Collect $180.", delta: 180 },
];

export interface MonopolyState {
  turn: 0 | 1;
  phase: "roll" | "buy_decision" | "ended";
  positions: [number, number];
  money: [number, number];
  properties: Record<number, { owner: 0 | 1; level: number }>; // level 1=base, 2=upgraded
  lastDice: [number, number] | null;
  lastEvent: string;
  turnCount: number;
  maxTurns: number;
  pendingTrade: {
    from: 0 | 1;
    offeredProp: number;
    requestedProp: number;
    cashBonus: number;
  } | null;
  winner: 0 | 1 | "draw" | null;
}

export function createInitialMonopolyState(): MonopolyState {
  return {
    turn: 0,
    phase: "roll",
    positions: [0, 0],
    money: [1500, 1500],
    properties: {},
    lastDice: null,
    lastEvent: "Roll the dice to start building your dream date spots!",
    turnCount: 1,
    maxTurns: 36,
    pendingTrade: null,
    winner: null,
  };
}

export function calculateNetWorth(state: MonopolyState, seat: 0 | 1): number {
  let total = state.money[seat];
  for (const [tileIdxStr, prop] of Object.entries(state.properties)) {
    if (prop.owner === seat) {
      const tile = COUPLEOPOLIS_TILES[Number(tileIdxStr)];
      if (tile?.price) {
        total += tile.price * prop.level;
      }
    }
  }
  return total;
}

export function applyMonopolyAction(
  state: MonopolyState,
  seat: 0 | 1,
  action: any
): { valid: boolean; state: MonopolyState; error?: string } {
  if (state.phase === "ended") {
    return { valid: false, state, error: "Game has already ended." };
  }

  const next: MonopolyState = JSON.parse(JSON.stringify(state));

  if (action.type === "roll") {
    if (next.turn !== seat || next.phase !== "roll") {
      return { valid: false, state, error: "Not your turn to roll." };
    }

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const steps = d1 + d2;
    next.lastDice = [d1, d2];

    const oldPos = next.positions[seat];
    let newPos = (oldPos + steps) % COUPLEOPOLIS_TILES.length;
    const passedStart = oldPos + steps >= COUPLEOPOLIS_TILES.length;

    let log = `Rolled ${d1} + ${d2} = ${steps}. `;
    if (passedStart) {
      next.money[seat] += 200;
      log += "Passed START (+$200)! ";
    }

    next.positions[seat] = newPos;
    const tile = COUPLEOPOLIS_TILES[newPos];
    log += `Landed on ${tile.emoji} ${tile.name}. `;

    if (tile.type === "property") {
      const owned = next.properties[newPos];
      if (!owned) {
        if (next.money[seat] >= (tile.price || 100)) {
          next.phase = "buy_decision";
          next.lastEvent = log + `Buy for $${tile.price} or pass?`;
          return { valid: true, state: next };
        } else {
          log += "Not enough cash to buy.";
        }
      } else if (owned.owner === seat) {
        // Auto-offer upgrade if level < 3
        const upgradeCost = Math.floor((tile.price || 100) * 0.6);
        if (owned.level < 3 && next.money[seat] >= upgradeCost) {
          next.phase = "buy_decision";
          next.lastEvent = log + `You own this! Upgrade to Lv.${owned.level + 1} for $${upgradeCost}?`;
          return { valid: true, state: next };
        } else {
          log += "Visited your own property!";
        }
      } else {
        const other = owned.owner;
        const rentAmt = (tile.rent || 40) * owned.level;
        next.money[seat] -= rentAmt;
        next.money[other] += rentAmt;
        log += `Paid $${rentAmt} rent!`;
      }
    } else if (tile.type === "chance") {
      const ev = CHANCE_EVENTS[Math.floor(Math.random() * CHANCE_EVENTS.length)];
      next.money[seat] += ev.delta;
      log += ev.text;
    } else if (tile.type === "tax") {
      next.money[seat] -= 100;
      log += "Paid $100 for sweet treats!";
    } else if (tile.type === "goto_vacation") {
      next.positions[seat] = 6;
      log += "Flew straight to the Cozy Lounge!";
    }

    next.lastEvent = log;
    return finishMonopolyTurn(next);
  }

  if (action.type === "buy" || action.type === "skip_buy") {
    if (next.turn !== seat || next.phase !== "buy_decision") {
      return { valid: false, state, error: "No property decision pending." };
    }
    const pos = next.positions[seat];
    const tile = COUPLEOPOLIS_TILES[pos];
    const existing = next.properties[pos];

    if (action.type === "buy" && tile.type === "property") {
      if (!existing && next.money[seat] >= (tile.price || 0)) {
        next.money[seat] -= tile.price || 0;
        next.properties[pos] = { owner: seat, level: 1 };
        next.lastEvent = `Bought ${tile.emoji} ${tile.name} for $${tile.price}!`;
      } else if (existing && existing.owner === seat && existing.level < 3) {
        const upgCost = Math.floor((tile.price || 100) * 0.6);
        if (next.money[seat] >= upgCost) {
          next.money[seat] -= upgCost;
          existing.level += 1;
          next.lastEvent = `Upgraded ${tile.emoji} ${tile.name} to Lv.${existing.level}!`;
        }
      }
    } else {
      next.lastEvent = `Passed on ${tile.emoji} ${tile.name}.`;
    }

    next.phase = "roll";
    return finishMonopolyTurn(next);
  }

  return { valid: false, state, error: "Unknown Monopoly action." };
}

function finishMonopolyTurn(state: MonopolyState): { valid: boolean; state: MonopolyState } {
  state.turnCount += 1;

  if (state.money[0] <= 0 || state.money[1] <= 0 || state.turnCount > state.maxTurns) {
    state.phase = "ended";
    const nw0 = calculateNetWorth(state, 0);
    const nw1 = calculateNetWorth(state, 1);
    if (nw0 > nw1) state.winner = 0;
    else if (nw1 > nw0) state.winner = 1;
    else state.winner = "draw";
    state.lastEvent += ` Game Over! Final Net Worth: $${nw0} vs $${nw1}.`;
  } else {
    state.turn = state.turn === 0 ? 1 : 0;
  }

  return { valid: true, state };
}

// =========================================================
// 4. WILD COLORS — UNO-STYLE COLOR & NUMBER CARD GAME
// =========================================================

export type UnoColor = "red" | "yellow" | "green" | "blue" | "wild";
export type UnoValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild4";

export interface UnoCard {
  id: string;
  color: UnoColor;
  value: UnoValue;
}

export interface UnoState {
  hands: [UnoCard[], UnoCard[]];
  deck: UnoCard[];
  discardPile: UnoCard[];
  currentColor: Exclude<UnoColor, "wild">;
  currentValue: UnoValue;
  turn: 0 | 1;
  status: "active" | "finished";
  winner: 0 | 1 | null;
  lastAction: string;
}

function buildUnoDeck(): UnoCard[] {
  const colors: Exclude<UnoColor, "wild">[] = ["red", "yellow", "green", "blue"];
  const values: UnoValue[] = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "skip",
    "reverse",
    "draw2",
  ];

  const deck: UnoCard[] = [];
  let idCounter = 1;
  for (const c of colors) {
    for (const v of values) {
      deck.push({ id: `c_${idCounter++}`, color: c, value: v });
      if (v !== "0") {
        deck.push({ id: `c_${idCounter++}`, color: c, value: v });
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c_${idCounter++}`, color: "wild", value: "wild" });
    deck.push({ id: `c_${idCounter++}`, color: "wild", value: "wild4" });
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createInitialUnoState(): UnoState {
  const deck = buildUnoDeck();
  const hand0 = deck.splice(0, 7);
  const hand1 = deck.splice(0, 7);

  let firstIdx = deck.findIndex((c) => c.color !== "wild" && !["skip", "reverse", "draw2"].includes(c.value));
  if (firstIdx < 0) firstIdx = 0;
  const [firstCard] = deck.splice(firstIdx, 1);

  return {
    hands: [hand0, hand1],
    deck,
    discardPile: [firstCard],
    currentColor: firstCard.color === "wild" ? "red" : firstCard.color,
    currentValue: firstCard.value,
    turn: 0,
    status: "active",
    winner: null,
    lastAction: "Game started! Match the top card by color, number, or play a Wild card.",
  };
}

export function canPlayUnoCard(state: UnoState, card: UnoCard): boolean {
  if (card.color === "wild") return true;
  if (card.color === state.currentColor) return true;
  if (card.value === state.currentValue) return true;
  return false;
}

function drawFromUnoDeck(state: UnoState, count: number): UnoCard[] {
  const drawn: UnoCard[] = [];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      if (state.discardPile.length > 1) {
        const top = state.discardPile.pop()!;
        state.deck = [...state.discardPile];
        state.discardPile = [top];
        for (let k = state.deck.length - 1; k > 0; k--) {
          const j = Math.floor(Math.random() * (k + 1));
          [state.deck[k], state.deck[j]] = [state.deck[j], state.deck[k]];
        }
      } else {
        state.deck = buildUnoDeck();
      }
    }
    const c = state.deck.pop();
    if (c) drawn.push(c);
  }
  return drawn;
}

export function applyUnoAction(
  state: UnoState,
  seat: 0 | 1,
  action: { type: "play" | "draw"; cardId?: string; chosenColor?: Exclude<UnoColor, "wild"> }
): { valid: boolean; state: UnoState; error?: string } {
  if (state.status !== "active") {
    return { valid: false, state, error: "Game is already over." };
  }
  if (state.turn !== seat) {
    return { valid: false, state, error: "Wait for your turn!" };
  }

  const next: UnoState = JSON.parse(JSON.stringify(state));
  const myHand = next.hands[seat];
  const other: 0 | 1 = seat === 0 ? 1 : 0;

  if (action.type === "draw") {
    const [card] = drawFromUnoDeck(next, 1);
    if (card) myHand.push(card);
    next.turn = other;
    next.lastAction = `Drew 1 card from the deck.`;
    return { valid: true, state: next };
  }

  if (action.type === "play") {
    const idx = myHand.findIndex((c) => c.id === action.cardId);
    if (idx < 0) {
      return { valid: false, state, error: "Card not found in your hand." };
    }
    const card = myHand[idx];
    if (!canPlayUnoCard(next, card)) {
      return { valid: false, state, error: "Card doesn't match the current color or value!" };
    }

    myHand.splice(idx, 1);
    next.discardPile.push(card);
    next.currentValue = card.value;
    next.currentColor =
      card.color === "wild" ? action.chosenColor || "red" : card.color;

    if (myHand.length === 0) {
      next.status = "finished";
      next.winner = seat;
      next.lastAction = `Played ${card.value.toUpperCase()} and won the game! 🎉`;
      return { valid: true, state: next };
    }

    // In 2-player UNO: Skip, Reverse, Draw +2, and Wild +4 all keep turn on current player (skip opponent's turn)!
    if (card.value === "skip" || card.value === "reverse") {
      next.turn = seat;
      next.lastAction = `Played ${card.value.toUpperCase()}! Opponent skipped — play again!`;
    } else if (card.value === "draw2") {
      const drawn = drawFromUnoDeck(next, 2);
      next.hands[other].push(...drawn);
      next.turn = seat;
      next.lastAction = `Played DRAW +2! Opponent drew 2 cards and lost their turn!`;
    } else if (card.value === "wild4") {
      const drawn = drawFromUnoDeck(next, 4);
      next.hands[other].push(...drawn);
      next.turn = seat;
      next.lastAction = `Played WILD +4 (${next.currentColor.toUpperCase()})! Opponent drew 4 cards!`;
    } else if (card.value === "wild") {
      next.turn = other;
      next.lastAction = `Played WILD and switched color to ${next.currentColor.toUpperCase()}!`;
    } else {
      next.turn = other;
      next.lastAction = `Played ${next.currentColor.toUpperCase()} ${card.value.toUpperCase()}.`;
    }

    return { valid: true, state: next };
  }

  return { valid: false, state, error: "Invalid UNO action." };
}

// =========================================================
// 5. OUR LIFE TOGETHER — LIFE PATH BOARD GAME
// =========================================================

export interface LifeNode {
  index: number;
  title: string;
  type: "start" | "career" | "payday" | "adventure" | "milestone" | "house" | "finish";
  emoji: string;
  description: string;
  cashDelta: number;
  loveDelta: number;
}

export const LIFE_PATH_NODES: LifeNode[] = [
  { index: 0, title: "Journey Begins!", type: "start", emoji: "🚗", description: "Choose your starting path!", cashDelta: 0, loveDelta: 10 },
  { index: 1, title: "First Coffee Date", type: "milestone", emoji: "☕", description: "Talked for hours!", cashDelta: -20, loveDelta: 25 },
  { index: 2, title: "Payday!", type: "payday", emoji: "💵", description: "Collect salary bonus!", cashDelta: 250, loveDelta: 5 },
  { index: 3, title: "Late Night Gaming", type: "adventure", emoji: "🎮", description: "Co-op victory together!", cashDelta: 0, loveDelta: 30 },
  { index: 4, title: "Airport Reunion", type: "milestone", emoji: "✈️", description: "Best hug in the world!", cashDelta: -150, loveDelta: 50 },
  { index: 5, title: "Payday!", type: "payday", emoji: "💰", description: "Career boost!", cashDelta: 300, loveDelta: 5 },
  { index: 6, title: "Adopt a Pet Together", type: "milestone", emoji: "🐱", description: "So much cuteness!", cashDelta: -80, loveDelta: 45 },
  { index: 7, title: "Road Trip Adventure", type: "adventure", emoji: "🏞️", description: "Singing in the car!", cashDelta: -100, loveDelta: 40 },
  { index: 8, title: "Cozy Apartment", type: "house", emoji: "🏡", description: "Decorating your space!", cashDelta: -300, loveDelta: 60 },
  { index: 9, title: "Payday!", type: "payday", emoji: "💎", description: "Big promotion!", cashDelta: 400, loveDelta: 10 },
  { index: 10, title: "Sushi & Ramen Feast", type: "adventure", emoji: "🍣", description: "Favorite meal night!", cashDelta: -60, loveDelta: 35 },
  { index: 11, title: "Dream Vacation", type: "milestone", emoji: "🏝️", description: "Unforgettable memories!", cashDelta: -200, loveDelta: 65 },
  { index: 12, title: "Payday!", type: "payday", emoji: "🏦", description: "Investment returns!", cashDelta: 450, loveDelta: 10 },
  { index: 13, title: "Stargazing Anniversary", type: "milestone", emoji: "🌌", description: "Wishing on shooting stars!", cashDelta: -50, loveDelta: 55 },
  { index: 14, title: "Happily Ever After!", type: "finish", emoji: "👑", description: "Reached the finish line!", cashDelta: 500, loveDelta: 80 },
];

export interface LifeGameState {
  turn: 0 | 1;
  positions: [number, number];
  cash: [number, number];
  lovePoints: [number, number];
  careers: [string, string];
  milestones: [string[], string[]];
  lastSpin: number | null;
  lastEvent: string;
  status: "choose_path" | "active" | "finished";
  winner: 0 | 1 | "draw" | null;
}

export function createInitialLifeState(): LifeGameState {
  return {
    turn: 0,
    positions: [0, 0],
    cash: [1000, 1000],
    lovePoints: [50, 50],
    careers: ["", ""],
    milestones: [[], []],
    lastSpin: null,
    lastEvent: "Pick your starting dream career, then spin the wheel!",
    status: "choose_path",
    winner: null,
  };
}

export function applyLifeAction(
  state: LifeGameState,
  seat: 0 | 1,
  action: { type: "choose_career" | "spin"; career?: string }
): { valid: boolean; state: LifeGameState; error?: string } {
  const next: LifeGameState = JSON.parse(JSON.stringify(state));

  if (action.type === "choose_career") {
    next.careers[seat] = action.career || "Creative Designer";
    if (next.careers[0] && next.careers[1]) {
      next.status = "active";
      next.lastEvent = "Both careers chosen! Spin the wheel to move along the Life Path!";
    } else {
      next.lastEvent = `Chose ${next.careers[seat]}! Waiting for partner to pick or spin.`;
      if (next.status === "choose_path") next.status = "active";
    }
    return { valid: true, state: next };
  }

  if (action.type === "spin") {
    if (next.status === "finished") {
      return { valid: false, state, error: "Game already finished." };
    }
    if (next.turn !== seat) {
      return { valid: false, state, error: "It is your partner's turn to spin!" };
    }
    if (!next.careers[seat]) {
      next.careers[seat] = seat === 0 ? "Tech Innovator" : "Creative Artist";
    }

    const spin = Math.floor(Math.random() * 4) + 1; // 1..4 steps so players hit plenty of nodes
    next.lastSpin = spin;

    const maxIdx = LIFE_PATH_NODES.length - 1;
    const newPos = Math.min(maxIdx, next.positions[seat] + spin);
    next.positions[seat] = newPos;

    const node = LIFE_PATH_NODES[newPos];
    next.cash[seat] += node.cashDelta + 100; // base salary per turn
    next.lovePoints[seat] += node.loveDelta;
    if (!next.milestones[seat].includes(`${node.emoji} ${node.title}`)) {
      next.milestones[seat].push(`${node.emoji} ${node.title}`);
    }

    next.lastEvent = `Spun a ${spin}! Landed on ${node.emoji} ${node.title} — ${node.description} (${
      node.cashDelta >= 0 ? `+$${node.cashDelta + 100}` : `+$${100 + node.cashDelta}`
    }, +${node.loveDelta} ❤️)`;

    const other: 0 | 1 = seat === 0 ? 1 : 0;
    if (next.positions[0] === maxIdx && next.positions[1] === maxIdx) {
      next.status = "finished";
      const score0 = next.cash[0] + next.lovePoints[0] * 15;
      const score1 = next.cash[1] + next.lovePoints[1] * 15;
      next.winner = score0 > score1 ? 0 : score1 > score0 ? 1 : "draw";
      next.lastEvent += ` Both reached Happily Ever After! Final Life Score: ${score0} vs ${score1}!`;
    } else if (next.positions[other] < maxIdx) {
      next.turn = other;
    }

    return { valid: true, state: next };
  }

  return { valid: false, state, error: "Invalid Life action." };
}

// =========================================================
// 6. PARTY GAMES ARCADE (Trivia, Draw & Guess, Would You Rather, RPS, Memory Match)
// =========================================================

export const TRIVIA_QUESTIONS = [
  {
    q: "What is Amelia's favorite comfort food or Japanese dish to enjoy?",
    options: ["Sushi & Ramen", "Deep Dish Pizza", "Fish & Chips", "Tacos"],
    answer: 0,
    category: "Couple & Favorites",
  },
  {
    q: "Which snowy, fluffy animal is known for diving headfirst into snowdrifts?",
    options: ["Arctic Fox", "Red Panda", "Capuchin Monkey", "Quokka"],
    answer: 0,
    category: "Animals",
  },
  {
    q: "In classic UNO, how many cards does each player start with?",
    options: ["5 cards", "7 cards", "8 cards", "10 cards"],
    answer: 1,
    category: "Game Night",
  },
  {
    q: "Which planet in our solar system has the most moons?",
    options: ["Jupiter", "Saturn", "Neptune", "Uranus"],
    answer: 1,
    category: "Fun Trivia",
  },
  {
    q: "What is the sweetest thing to do first when reuniting after a long-distance stretch?",
    options: ["Longest tightest hug at arrivals", "Check emails", "Take a nap alone", "Argue about traffic"],
    answer: 0,
    category: "Couple Vibes",
  },
  {
    q: "In Chess, which piece is the only one that can jump over other pieces?",
    options: ["Bishop", "Queen", "Knight", "Rook"],
    answer: 2,
    category: "Game Night",
  },
  {
    q: "Which studio created classics like Spirited Away and Howl's Moving Castle?",
    options: ["Studio Ghibli", "Pixar", "Kyoto Animation", "DreamWorks"],
    answer: 0,
    category: "Movies & Cozy Nights",
  },
];

export const WOULD_YOU_RATHER_PROMPTS = [
  {
    q: "For our next cozy weekend together, which would you rather do?",
    a: "🍜 Late-night ramen run + movie marathon in bed",
    b: "🎡 Sunset amusement park + arcade prizes",
  },
  {
    q: "If we could teleport anywhere right this second for dinner:",
    a: "🗼 Tokyo street food & neon lights",
    b: "🥐 Cozy candlelit cafe in Paris",
  },
  {
    q: "Which superpower would be better for our relationship?",
    a: "⚡ Instant teleportation to each other's room anytime",
    b: "⏳ Pause time whenever we're hanging out together",
  },
  {
    q: "Dream cozy home vibe together:",
    a: "🏡 Cabin in the snowy mountains with a fireplace",
    b: "🌊 Beachfront loft with ocean waves outside",
  },
  {
    q: "When we play games together, what's the better vibe?",
    a: "🤝 Teaming up in co-op against the world",
    b: "🏆 Trash-talking playfully in 1v1 board games",
  },
];

export const DRAW_WORDS = [
  "SNOW FOX",
  "SUSHI ROLL",
  "BOBA TEA",
  "SHOOTING STAR",
  "AIRPLANE HUG",
  "SLEEPY CAT",
  "GAMING CONTROLLER",
  "LOVE LETTER",
  "PIZZA SLICE",
  "CROWN",
];

export function createInitialPartyState(gameType: MultiplayerGameType): any {
  if (gameType === "party_trivia") {
    return {
      round: 0,
      scores: [0, 0],
      answers: [null, null] as [number | null, number | null],
      questions: TRIVIA_QUESTIONS,
      status: "active",
      winner: null,
      lastEvent: "Pick the right answer! Both players answer each round.",
    };
  }

  if (gameType === "party_wyr") {
    return {
      round: 0,
      matches: 0,
      choices: [null, null] as ["A" | "B" | null, "A" | "B" | null],
      history: [] as { q: string; p0: string; p1: string; matched: boolean }[],
      prompts: WOULD_YOU_RATHER_PROMPTS,
      status: "active",
      winner: null,
    };
  }

  if (gameType === "party_rps") {
    return {
      round: 1,
      scores: [0, 0],
      picks: [null, null] as ["rock" | "paper" | "scissors" | null, "rock" | "paper" | "scissors" | null],
      lastRoundText: "First to 3 wins! Lock in Rock, Paper, or Scissors!",
      status: "active",
      winner: null,
    };
  }

  if (gameType === "party_draw") {
    const word = DRAW_WORDS[0];
    return {
      round: 1,
      drawer: 0 as 0 | 1,
      word,
      strokes: [] as { points: [number, number][]; color: string; size: number }[],
      guesses: [] as { sender: string; text: string; correct: boolean }[],
      scores: [0, 0],
      status: "active",
      winner: null,
      lastEvent: "Drawer sketches the secret word in MS Paint style while partner guesses!",
    };
  }

  // party_memory (Memory Match)
  const emojis = ["🦊", "🍣", "💖", "🎮", "🧋", "🌸", "✈️", "👑"];
  const deck = [...emojis, ...emojis].map((emoji, i) => ({
    id: i,
    emoji,
    flipped: false,
    matchedBy: null as 0 | 1 | null,
  }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    cards: deck,
    turn: 0 as 0 | 1,
    flippedIndices: [] as number[],
    scores: [0, 0],
    status: "active",
    winner: null,
    lastEvent: "Flip two cards to find matching pixel-date icons!",
  };
}

export function applyPartyAction(
  gameType: MultiplayerGameType,
  state: any,
  seat: 0 | 1,
  action: any
): { valid: boolean; state: any; error?: string } {
  const next = JSON.parse(JSON.stringify(state));

  if (gameType === "party_trivia") {
    if (next.status !== "active") return { valid: false, state, error: "Trivia finished." };
    const qObj = next.questions[next.round];
    if (!qObj) return { valid: false, state };

    next.answers[seat] = Number(action.choice);
    if (next.answers[0] !== null && next.answers[1] !== null) {
      if (next.answers[0] === qObj.answer) next.scores[0] += 100;
      if (next.answers[1] === qObj.answer) next.scores[1] += 100;
      next.lastEvent = `Correct answer: "${qObj.options[qObj.answer]}"!`;
      if (next.round + 1 >= next.questions.length) {
        next.status = "finished";
        next.winner =
          next.scores[0] > next.scores[1]
            ? 0
            : next.scores[1] > next.scores[0]
            ? 1
            : "draw";
      } else {
        next.round += 1;
        next.answers = [null, null];
      }
    }
    return { valid: true, state: next };
  }

  if (gameType === "party_wyr") {
    if (next.status !== "active") return { valid: false, state };
    const prompt = next.prompts[next.round];
    next.choices[seat] = action.choice;
    if (next.choices[0] && next.choices[1]) {
      const matched = next.choices[0] === next.choices[1];
      if (matched) next.matches += 1;
      next.history.push({
        q: prompt.q,
        p0: next.choices[0] === "A" ? prompt.a : prompt.b,
        p1: next.choices[1] === "A" ? prompt.a : prompt.b,
        matched,
      });
      if (next.round + 1 >= next.prompts.length) {
        next.status = "finished";
        next.winner = "draw";
      } else {
        next.round += 1;
        next.choices = [null, null];
      }
    }
    return { valid: true, state: next };
  }

  if (gameType === "party_rps") {
    if (next.status !== "active") return { valid: false, state };
    next.picks[seat] = action.pick;
    if (next.picks[0] && next.picks[1]) {
      const p0 = next.picks[0];
      const p1 = next.picks[1];
      if (p0 === p1) {
        next.lastRoundText = `Both threw ${p0.toUpperCase()}! Tie round!`;
      } else if (
        (p0 === "rock" && p1 === "scissors") ||
        (p0 === "paper" && p1 === "rock") ||
        (p0 === "scissors" && p1 === "paper")
      ) {
        next.scores[0] += 1;
        next.lastRoundText = `${p0.toUpperCase()} beats ${p1.toUpperCase()}! Player 1 takes Round ${next.round}!`;
      } else {
        next.scores[1] += 1;
        next.lastRoundText = `${p1.toUpperCase()} beats ${p0.toUpperCase()}! Player 2 takes Round ${next.round}!`;
      }
      next.round += 1;
      next.picks = [null, null];
      if (next.scores[0] >= 3 || next.scores[1] >= 3) {
        next.status = "finished";
        next.winner = next.scores[0] >= 3 ? 0 : 1;
      }
    }
    return { valid: true, state: next };
  }

  if (gameType === "party_draw") {
    if (action.type === "stroke" && seat === next.drawer) {
      next.strokes.push(action.stroke);
      return { valid: true, state: next };
    }
    if (action.type === "clear" && seat === next.drawer) {
      next.strokes = [];
      return { valid: true, state: next };
    }
    if (action.type === "guess") {
      const guessText = String(action.text || "").trim();
      const isCorrect =
        guessText.toUpperCase() === String(next.word).toUpperCase();
      next.guesses.push({
        sender: action.senderName || `Player ${seat + 1}`,
        text: guessText,
        correct: isCorrect,
      });
      if (isCorrect) {
        next.scores[seat] += 100;
        next.scores[next.drawer] += 50;
        next.lastEvent = `🎉 Guessed "${next.word}" correctly! Switching drawer!`;
        if (next.round >= 4) {
          next.status = "finished";
          next.winner =
            next.scores[0] > next.scores[1]
              ? 0
              : next.scores[1] > next.scores[0]
              ? 1
              : "draw";
        } else {
          next.round += 1;
          next.drawer = next.drawer === 0 ? 1 : 0;
          next.word = DRAW_WORDS[next.round % DRAW_WORDS.length];
          next.strokes = [];
        }
      }
      return { valid: true, state: next };
    }
    return { valid: false, state, error: "Invalid Draw action." };
  }

  if (gameType === "party_memory") {
    if (next.status !== "active" || next.turn !== seat) {
      return { valid: false, state, error: "Wait for your turn!" };
    }
    const idx = Number(action.cardIndex);
    const card = next.cards[idx];
    if (!card || card.matchedBy !== null || next.flippedIndices.includes(idx)) {
      return { valid: false, state, error: "Card already flipped." };
    }

    if (next.flippedIndices.length >= 2) {
      next.flippedIndices = [];
    }
    next.flippedIndices.push(idx);

    if (next.flippedIndices.length === 2) {
      const [i1, i2] = next.flippedIndices;
      const c1 = next.cards[i1];
      const c2 = next.cards[i2];
      if (c1.emoji === c2.emoji) {
        c1.matchedBy = seat;
        c2.matchedBy = seat;
        next.scores[seat] += 1;
        next.flippedIndices = [];
        next.lastEvent = `Matched ${c1.emoji}! Go again!`;

        if (next.cards.every((c: any) => c.matchedBy !== null)) {
          next.status = "finished";
          next.winner =
            next.scores[0] > next.scores[1]
              ? 0
              : next.scores[1] > next.scores[0]
              ? 1
              : "draw";
        }
      } else {
        next.turn = seat === 0 ? 1 : 0;
        next.lastEvent = `${c1.emoji} & ${c2.emoji} didn't match! Partner's turn.`;
      }
    }

    return { valid: true, state: next };
  }

  return { valid: false, state, error: "Unknown game type." };
}

export function createInitialGameState(gameType: MultiplayerGameType): any {
  switch (gameType) {
    case "chess":
      return createInitialChessState();
    case "checkers":
      return createInitialCheckersState();
    case "monopoly":
      return createInitialMonopolyState();
    case "uno":
      return createInitialUnoState();
    case "life":
      return createInitialLifeState();
    default:
      return createInitialPartyState(gameType);
  }
}

export function getGameTitle(gameType: MultiplayerGameType): string {
  switch (gameType) {
    case "chess":
      return "Royal Pixel Chess";
    case "checkers":
      return "Arcade Checkers";
    case "monopoly":
      return "Coupleopolis (Property Trading)";
    case "uno":
      return "Wild Colors (Card Battle)";
    case "life":
      return "Our Life Together (Board Game)";
    case "party_trivia":
      return "Couple & General Trivia Battle";
    case "party_draw":
      return "Skribbl Draw & Guess";
    case "party_wyr":
      return "Would You Rather (Couple Sync)";
    case "party_rps":
      return "Rock Paper Scissors Showdown";
    case "party_memory":
      return "Pixel Date Memory Match";
  }
}

export function processMultiplayerGameMove(
  gameType: MultiplayerGameType,
  state: any,
  seat: 0 | 1,
  payload: any
): { valid: boolean; state: any; winner?: string | null; error?: string } {
  if (gameType === "chess") {
    const myColor = seat === 0 ? "w" : "b";
    if (state.turn !== myColor) {
      return { valid: false, state, error: "Wait for your opponent's move!" };
    }
    const res = applyChessMove(state, payload.from, payload.to, payload.promotion);
    const winner =
      res.state.winner === "w"
        ? "seat_0"
        : res.state.winner === "b"
        ? "seat_1"
        : res.state.winner === "draw"
        ? "draw"
        : null;
    return { ...res, winner };
  }

  if (gameType === "checkers") {
    const myColor = seat === 0 ? "r" : "b";
    if (state.turn !== myColor) {
      return { valid: false, state, error: "Wait for your opponent's move!" };
    }
    const res = applyCheckersMove(state, payload.from, payload.to);
    const winner =
      res.state.winner === "r"
        ? "seat_0"
        : res.state.winner === "b"
        ? "seat_1"
        : null;
    return { ...res, winner };
  }

  if (gameType === "monopoly") {
    const res = applyMonopolyAction(state, seat, payload);
    const winner =
      res.state.winner === 0
        ? "seat_0"
        : res.state.winner === 1
        ? "seat_1"
        : res.state.winner === "draw"
        ? "draw"
        : null;
    return { ...res, winner };
  }

  if (gameType === "uno") {
    const res = applyUnoAction(state, seat, payload);
    const winner =
      res.state.winner === 0
        ? "seat_0"
        : res.state.winner === 1
        ? "seat_1"
        : null;
    return { ...res, winner };
  }

  if (gameType === "life") {
    const res = applyLifeAction(state, seat, payload);
    const winner =
      res.state.winner === 0
        ? "seat_0"
        : res.state.winner === 1
        ? "seat_1"
        : res.state.winner === "draw"
        ? "draw"
        : null;
    return { ...res, winner };
  }

  const res = applyPartyAction(gameType, state, seat, payload);
  const winner =
    res.state.winner === 0
      ? "seat_0"
      : res.state.winner === 1
      ? "seat_1"
      : res.state.winner === "draw"
      ? "draw"
      : null;
  return { ...res, winner };
}
