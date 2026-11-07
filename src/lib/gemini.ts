import { GoogleGenAI } from "@google/genai";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSetting, getMemories, getImportantDates, getSettingSync, getLearnedPreferences } from "./db";
import {
  ChatAttachment,
  CommunicationProfile,
  ExtractedMemorySuggestion,
  ImprovementResult,
  ScreenshotAnalysisResult,
  SituationContext,
  StarterItem,
  SuggestedReply,
  TextingPreferences,
  ThinkingMode,
} from "./types";
import { DEFAULT_COMMUNICATION_PROFILE } from "./constants";

export function getGeminiModel(): string {
  let model: string | undefined;
  try {
    const ctx = getCloudflareContext();
    if ((ctx?.env as any)?.GEMINI_MODEL) model = (ctx.env as any).GEMINI_MODEL;
  } catch {}
  if (!model) {
    model = process.env.GEMINI_MODEL || getSettingSync<string>("gemini_model", "gemini-3.5-flash-lite");
  }
  // Automatically migrate discontinued or unavailable legacy models
  if (
    !model ||
    model === "gemini-2.5-flash" ||
    model === "gemini-1.5-flash" ||
    model === "gemini-1.5-pro" ||
    model === "gemini-2.0-flash"
  ) {
    return "gemini-3.5-flash-lite";
  }
  return model;
}

export function getGeminiApiKey(): string | undefined {
  try {
    const ctx = getCloudflareContext();
    if ((ctx?.env as any)?.GEMINI_API_KEY) return (ctx.env as any).GEMINI_API_KEY;
  } catch {}

  try {
    const globalEnv = (globalThis as any).__CLOUDFLARE_ENV__;
    if (globalEnv?.GEMINI_API_KEY) return globalEnv.GEMINI_API_KEY;
  } catch {}

  try {
    const globalCtx = (globalThis as any)[Symbol.for("__cloudflare-context__")];
    if (globalCtx?.env?.GEMINI_API_KEY) return globalCtx.env.GEMINI_API_KEY;
  } catch {}

  return process.env.GEMINI_API_KEY || undefined;
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

export function isDemoMode(): boolean {
  return getGeminiClient() === null;
}

/**
 * Formats and prioritizes memories based on query keywords and active context
 */
function formatPrioritizedMemories(memories: any[], queryContext = ""): string {
  if (memories.length === 0) {
    return "No specific memories recorded yet.";
  }

  const queryTokens = queryContext
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["what", "when", "where", "which", "could", "would", "should", "tell", "about", "with", "have", "been", "that", "this", "help"].includes(w));

  const scored = memories.map((m) => {
    let score = 0;
    const text = `${m.title} ${m.content} ${m.category} ${m.related_keys || ""} ${m.approx_date || ""}`.toLowerCase();

    for (const token of queryTokens) {
      if (text.includes(token)) score += 3;
      if (m.title.toLowerCase().includes(token)) score += 5;
      if (m.category.toLowerCase().includes(token)) score += 4;
      if ((m.related_keys || "").toLowerCase().includes(token)) score += 6;
    }

    if (m.status === "promise") score += 2;
    if (m.category === "Dislikes & Pet Peeves" || m.category === "Personal Boundaries") score += 2;

    return { memory: m, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // If query tokens matched, prioritize top 25 highest relevance items, else provide comprehensive list
  const selected = queryTokens.length > 0 ? scored.slice(0, 25).map((s) => s.memory) : memories;

  return selected
    .map((m) => {
      const parts = [];
      if (m.approx_date) parts.push(`Date: ${m.approx_date}`);
      if (m.status) parts.push(`Status: ${m.status}`);
      if (m.source_type) parts.push(`Source: ${m.source_type === "her_statement" ? "her own words" : "user note"}`);
      if (m.emotional_significance) parts.push(`Significance: ${m.emotional_significance}`);
      const meta = parts.length > 0 ? ` [${parts.join(" | ")}]` : "";
      return `- [${m.category}] ${m.title}: ${m.content}${meta}`;
    })
    .join("\n");
}

/**
 * Detects the situational context of a user query or conversation turn
 */
export function detectSituationContext(prompt: string): SituationContext {
  const p = prompt.toLowerCase();
  if (p.includes("morning") || p.includes("night") || p.includes("sleep") || p.includes("dream") || p.includes("wake") || p.includes("bed") || p.includes("goodnight")) {
    return "morning_night";
  }
  if (p.includes("sorry") || p.includes("apolog") || p.includes("forgive") || p.includes("my fault") || p.includes("mess up")) {
    return "apology";
  }
  if (p.includes("tired") || p.includes("exhaust") || p.includes("rough day") || p.includes("work shift") || p.includes("stress") || p.includes("cry") || p.includes("upset") || p.includes("sad") || p.includes("overwhelm") || p.includes("decompress")) {
    return "comforting_supportive";
  }
  if (p.includes("flirt") || p.includes("spicy") || p.includes("sexy") || p.includes("chemistry") || p.includes("hot") || p.includes("tease her")) {
    return "flirting";
  }
  if (p.includes("funny") || p.includes("joke") || p.includes("make her laugh") || p.includes("banter") || p.includes("humor") || p.includes("sue") || p.includes("courtroom") || p.includes("silly")) {
    return "playful_funny";
  }
  if (p.includes("romantic") || p.includes("love") || p.includes("sweet") || p.includes("miss her") || p.includes("cuddle") || p.includes("heartfelt") || p.includes("anniversary") || p.includes("jack and sally")) {
    return "romantic";
  }
  if (p.includes("future") || p.includes("moving in") || p.includes("graduation") || p.includes("vegas") || p.includes("japan") || p.includes("marry") || p.includes("propose") || p.includes("house") || p.includes("serious")) {
    return "serious";
  }
  if (p.includes("starter") || p.includes("start a convo") || p.includes("restart") || p.includes("haven't texted") || p.includes("quiet")) {
    return "starters";
  }
  if (p.includes("advice") || p.includes("what should i do") || p.includes("how to handle") || p.includes("help me understand")) {
    return "advice";
  }
  if (p.includes("fight") || p.includes("argument") || p.includes("anxious") || p.includes("left on read") || p.includes("ghost") || p.includes("worried")) {
    return "difficult_emotional";
  }
  return "general";
}

/**
 * Builds the comprehensive personalized system instruction for Amelia AI
 * Specializing in Long-Distance Relationship (LDR) Communication & Relationship Memory
 */
export async function buildCoachSystemInstruction(extraGoal = "", queryContext = ""): Promise<string> {
  const profile = await getSetting<CommunicationProfile>(
    "communication_profile",
    DEFAULT_COMMUNICATION_PROFILE
  );
  const memories = await getMemories();
  const importantDates = await getImportantDates();
  const learnedPrefs = await getLearnedPreferences();
  const situation = detectSituationContext(queryContext);
  const sitPref = learnedPrefs.situations[situation];

  const memoryContext = formatPrioritizedMemories(memories, queryContext);

  const datesContext = importantDates.length > 0
    ? importantDates.map((d) => `- ${d.title}: ${d.event_date} (${d.category}, reminder: ${d.reminder_days_before}d before. Notes: ${d.notes || "None"})`).join("\n")
    : "No dates recorded yet.";

  const sampleTextsContext = profile.sampleTexts && profile.sampleTexts.length > 0
    ? profile.sampleTexts.map((t) => `  * "${t}"`).join("\n")
    : "  * Natural, casual, warm texting style.";

  const wordsToAvoidContext = profile.wordsToAvoid && profile.wordsToAvoid.length > 0
    ? profile.wordsToAvoid.join(", ")
    : "None specified.";

  let learningDirective = `
ACTIVE LEARNING & RECOMMENDATION SYSTEM (YOUTUBE-STYLE ALGORITHM):
- CURRENT RECOMMENDATION STAGE: ${learnedPrefs.stageLabel} (Feedback Stats: ${learnedPrefs.totalLikes} Likes 👍, ${learnedPrefs.totalDislikes} Dislikes 👎).
- ACTIVE SITUATION DETECTED: "${situation.toUpperCase()}".
`;

  if (sitPref && sitPref.totalFeedback > 0) {
    learningDirective += `- Learned preferences specifically for "${situation}":
  * Preferred Tones (ranked by his likes): ${sitPref.preferredTones.map((t) => t.tone).join(", ") || "Natural & Warm"}
  * Tones to AVOID (downvoted by him): ${sitPref.avoidedTones.map((t) => t.tone).join(", ") || "None"}
  * Target Message Length: ${sitPref.preferredLength.toUpperCase()}
  * Liked Traits to prioritize: ${sitPref.likedCharacteristics.join(", ") || "Warm, grounded, playful"}
  * Disliked Traits to AVOID: ${sitPref.dislikedCharacteristics.join(", ") || "Robotic, cringey clichés, dry phrasing"}
`;
    if (sitPref.recentLikedExamples.length > 0) {
      learningDirective += `  * Positive Style Inspirations (messages he liked in similar moments - imitate the style, NEVER copy verbatim):\n${sitPref.recentLikedExamples.slice(0, 3).map((e) => `    - "${e}"`).join("\n")}\n`;
    }
    if (sitPref.recentDislikedExamples.length > 0) {
      learningDirective += `  * Negative Style Examples (messages he DISLIKED in similar moments - avoid this style/wording):\n${sitPref.recentDislikedExamples.slice(0, 3).map((e) => `    - "${e}"`).join("\n")}\n`;
    }
  } else {
    learningDirective += `- Global Learned Style Preferences:
  * Preferred Tones: ${learnedPrefs.preferredTones.slice(0, 4).join(", ") || "Natural & Warm, Playful Banter, Sweet & Caring"}
  * Avoided Tones: ${learnedPrefs.avoidedTones.slice(0, 4).join(", ") || "Overly formal, dramatic, robotic clichés"}
  * Target Message Length: ${learnedPrefs.preferredLength.toUpperCase()}
  * Liked Traits to prioritize: ${learnedPrefs.globalLikedStyles.join(", ") || "Authentic texting phrasing, subtle humor, genuine affection"}
  * Disliked Traits to avoid: ${learnedPrefs.globalDislikedStyles.join(", ") || "Robotic phrasing, dry replies, pressure"}
`;
  }

  learningDirective += `
ONE BEST RECOMMENDATION DIRECTIVE (CRITICAL):
- By default, generate and display ONLY ONE response: the AI's single best prediction of what he would want to send.
- The user does NOT want a giant list of 5–10 choices or multiple cards to sort through.
- Internally brainstorm candidate messages, compare them against his learned preferences for "${situation}", and select the #1 HIGHEST-RANKED recommendation!
- Format the single recommendation with:
  [RECOMMENDED_RESPONSE: {"message": "[Exact text message to copy]", "tone": "[Tone Label]", "explanation": "[1 brief sentence why this matches his learned preferences]", "situation": "${situation}", "styleTags": ["...", "..."], "lengthCategory": "short|medium|long"}]
- In your visible response, provide a brief 1-2 sentence empathetic coach remark introducing your recommendation, but DO NOT write out Option 1/2/3. Keep the output clean, confident, and singular!
`;

  return `You are Amelia AI, the personal Long-Distance Relationship companion and texting coach for a boyfriend communicating with his girlfriend, Amelia (Prudence).

CORE RELATIONSHIP IDENTITY & FOUNDATION:
- REAL NAME: Prudence. (Nervously confessed on October 8; Amelia was her online name from VRChat. This was a profound moment of vulnerability and trust).
- ONLINE NAME: Amelia (used in VRChat).
- LOCATION: Wisconsin, United States. High school senior expected to graduate around May or June (unconfirmed exact day).
- ANNIVERSARY: March 16, 2024 (the day they first started texting, counted as their official relationship anniversary).
- RECONNECTION COINCIDENCE: March 30 – April 1 (reconnected after ~2 years apart, simultaneously ate grilled cheese sandwiches at the exact same moment before becoming official).
- NICKNAMES SHE USES FOR HIM: "baby", "darling", "lover boy". (She knows his family nickname is "Ry" / "Ry Ry").
- PRIVATE HANDLES (CONFIDENTIAL): Instagram: amelia.lovr, Fortnite/console: DabiBaddie1607. NEVER leak or expose these private handles unnecessarily.

STRICT NON-NEGOTIABLE CONSTRAINTS & BEHAVIORAL GUARDRAILS:
1. NEVER SUGGEST OR USE THE THUMBS-UP (👍) EMOJI. It feels cold, dismissive, and makes her feel like he doesn't want to talk. He promised never to use it with her again. Use warm words or sweet emojis instead.
2. HER BELOVED LATE TABBY CAT: Her cat passed away approximately 1 year ago. She misses him deeply and remembering him can bring tears. Treat this with profound solemnity. NEVER joke about pets or bring him up casually or out of context.
3. GAMING PAUSES DO NOT MEAN LOST AFFECTION: She gets immersed in Overwatch or other games and can delay texting. Clarified in communication discussions that being quiet or distracted does NOT mean she stopped loving him. Never assume a delayed response means she is losing feelings.
4. WORK SHIFT FATIGUE: Evening work shifts (until 10:00–10:30 PM) leave her exhausted and overstimulated. When tired after work, she needs gentle patience, low-pressure warmth, and quiet space to decompress.
5. REASSURANCE OVER SILENCE: Past toxic friendships and abandonment trauma make being left on read or dry texting anxiety-inducing. Consistent reassurance, warmth, and checking in make her feel safe.
6. PERSPECTIVE & INTEGRITY:
   - Distinguish her statements from his statements; never confuse who said what.
   - Avoid converting temporary moods or fatigue into permanent personality traits.
   - Avoid treating future intentions (moving in, Japan, Vegas) as already completed events.
   - Never invent facts or assumptions to fill missing details.

CORE PROMISES MADE & SHARED FUTURE GOALS:
- TWO-YEAR WAITING & MOVING IN: Agreed to wait until she graduates high school and turns 18 before meeting in person and moving in together (sharing one bedroom).
- TRIP TO JAPAN: Promised to travel to Japan together, experience anime culture, and eat authentic sushi.
- LAS VEGAS RELOCATION: Dream of moving to Las Vegas together so she can be a "Vegas girly" with her boyfriend.
- MARRIAGE & DIAMOND RING: Promised to propose with a diamond ring and get married in the future.
- BAN ON 👍 EMOJI: Sacred promise never to use 👍 in texts.
- VR COACHING & DATES: Promised to teach her VR and go on VRChat dates together.
- MUTUAL EFFORT: Working together on open, healthy communication without assuming the worst.

INSIDE JOKES & PLAYFUL BANTER (RECOGNIZE NATURALLY):
- Suing for Romance: "Should I sue you for being romantic to me 😏" (courtroom charges dropped due to her brutal shift).
- Jack & Sally: "Are you my Jack to my Sally from Nightmare before Christmas??"
- The 10th Spot Joke: Ranked leaving her at #10 on dumbest decisions; she jokingly called herself his "smartass girlfriend".
- Fortnite Voice Chat Bug: "This game is racist because I can't hear you".
- Bed Routine: Makes her bed right before climbing into it, only to destroy it when waking up.
- Catchphrases: "Mhm what elseee", "Nooo tell meee", and the "Noe" typo ("Who is Noe?").

FAVORITE THINGS QUICK REFERENCE:
- FOODS: Sushi (top favorite, wants to share dates), Birthday Cake Oreos, grilled cheese, lasagna, mac & cheese, cereal, fruit smoothies, Starbucks.
- GAMES: Overwatch (>400 hrs, go-to favorite), Cyberpunk 2077, Neverness to Everness (super hyped), Love & Deepspace (phone), Fortnite, VRChat, Among Us.
- ANIMALS: Snow foxes (top favorite animal), cats.
- HOLIDAYS & AESTHETICS: Halloween (favorite holiday, dressed up as female Oogie Boogie), Demon Slayer & Hatsune Miku shirts, Tim Burton, Hazbin Hotel, FNAF.
- STICKERS: CoCo the cactus (morning), Bubu & Dudu, Peach & Goma, Hello Kitty.
- TOPICS SHE ENJOYS: Morning dream check-ins (loves hearing if she was in his dreams), future house planning, sleeping/bedroom arrangements, tease & laughter, knowing her photo is his lock screen/wallpaper.

${learningDirective}

CORE PERSONALITY & VOICE:
- You are his trusted texting coach, wingman, and relationship advisor.
- Down-to-earth, supportive, emotionally intelligent, honest, and non-judgmental.
- You NEVER sound like a Victorian romance novelist, a clinical therapist, or a robotic AI.
- Every message you suggest must sound like a real person typing a quick text on their phone.
- Use natural texting phrasing, subtle humor, lowercase typing where people naturally use it, light punctuation, and 1-2 subtle emojis only when fitting.
- Never encourage manipulation, guilt-tripping, jealousy, or pressure.

RESPONDING TO AMELIA'S MEDIA (MULTIMODAL):
- IMAGES: Describe visible details accurately without making wild assumptions. Provide one natural text reply matching the vibe.
- VIDEOS: Analyze footage and audible dialogue. Summarize what happened, note key moments, and provide one tailored reaction.
- AUDIO / VOICE NOTES: Transcribe words, identify vocal tone, pacing, and emotional cues. Provide one natural response.

USER'S AUTHENTIC TEXTING PROFILE (MIMIC HIS VOICE):
- Preferred Tone: ${profile.preferredTone}
- Casualness Level: ${profile.casualness}/10
- Emoji Usage: ${profile.emojiUsage}
- Words/phrases to avoid: ${wordsToAvoidContext}
- Real sample messages he has sent:
${sampleTextsContext}

SAVED KNOWLEDGE & MEMORIES ABOUT AMELIA (PRIORITIZED FOR THIS CONTEXT):
${memoryContext}

IMPORTANT DATES & UPCOMING VISITS:
${datesContext}

OUTPUT CONVENTIONS:
- For memory details worth remembering, include:
[MEMORY_SUGGESTION: {"category": "...", "title": "...", "content": "..."}]
- For the single recommended response, format with:
[RECOMMENDED_RESPONSE: {"message": "[Exact text to copy]", "tone": "[Tone Label]", "explanation": "[Why it works based on preferences]", "situation": "${situation}", "styleTags": ["...", "..."], "lengthCategory": "short|medium|long"}]
${extraGoal ? `\nSPECIAL TASK FOCUS: ${extraGoal}` : ""}`;
}

/**
 * Test the Gemini API connection
 */
export async function testGeminiConnection(): Promise<{
  success: boolean;
  model: string;
  latencyMs: number;
  message: string;
  isDemo: boolean;
}> {
  const client = getGeminiClient();
  const model = getGeminiModel();

  if (!client) {
    return {
      success: false,
      model,
      latencyMs: 0,
      message: "GEMINI_API_KEY is not configured in .env. Running in Amelia AI Demo Mode with realistic offline simulations.",
      isDemo: true,
    };
  }

  const start = Date.now();
  let effectiveModel = model;
  try {
    let response;
    try {
      response = await client.interactions.create({
        model: effectiveModel,
        input: "Ping. Respond with one word: 'Connected'.",
        system_instruction: "You are a test ping responder. Respond only with 'Connected'.",
      });
    } catch (primaryErr: any) {
      if (effectiveModel !== "gemini-3.5-flash-lite") {
        effectiveModel = "gemini-3.5-flash-lite";
        response = await client.interactions.create({
          model: effectiveModel,
          input: "Ping. Respond with one word: 'Connected'.",
          system_instruction: "You are a test ping responder. Respond only with 'Connected'.",
        });
      } else {
        throw primaryErr;
      }
    }

    const latencyMs = Date.now() - start;
    return {
      success: true,
      model: effectiveModel,
      latencyMs,
      message: `Gemini API connected successfully! (${effectiveModel}, latency: ${latencyMs}ms)`,
      isDemo: false,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      model,
      latencyMs,
      message: `Failed to connect to Gemini API: ${err?.message || String(err)}. Check your GEMINI_API_KEY and model name in .env.`,
      isDemo: false,
    };
  }
}

/**
 * Unified Chat Function with Multimodal Image, Audio, and Video Understanding
 */
export async function chatWithAmeliaAI(
  messages: {
    role: "user" | "assistant";
    content: string;
    attachments?: ChatAttachment[];
  }[],
  activeAttachments?: ChatAttachment[],
  preferences?: Partial<TextingPreferences>,
  thinkingMode?: ThinkingMode
): Promise<{
  reply: string;
  suggestedReplies?: SuggestedReply[];
  suggestedMemories?: ExtractedMemorySuggestion[];
  isDemo?: boolean;
}> {
  const client = getGeminiClient();
  const model = getGeminiModel();

  // If no Gemini API key configured, use intelligent demo mode
  if (!client) {
    return getUnifiedDemoResponse(messages, activeAttachments);
  }

  const userQuery = messages.filter((m) => m.role === "user").map((m) => m.content).slice(-3).join(" ");
  const currentSituation = detectSituationContext(userQuery);
  let systemInstruction = await buildCoachSystemInstruction("", userQuery);
  if (preferences?.customInstruction) {
    systemInstruction += `\nUSER SPECIFIC OVERRIDE FOR THIS TURN: ${preferences.customInstruction}`;
  }

  if (thinkingMode === "extra") {
    systemInstruction += `\n[REASONING DIRECTIVE: Extra Thinking Mode active. Apply deeper emotional reasoning, evaluate conversational subtext, and formulate particularly thoughtful advice.]`;
  }

  const inputParts: any[] = [];

  // Handle active attachments (images, audio, video)
  if (activeAttachments && activeAttachments.length > 0) {
    for (const att of activeAttachments) {
      if (!att.data) continue;
      const base64Data = att.data.includes(",") ? att.data.split(",")[1] : att.data;
      inputParts.push({
        type: att.category,
        data: base64Data,
        mime_type: att.mimeType,
      });
    }
  }

  // Format conversation history
  const historyText = messages
    .map((m) => {
      const attText = m.attachments && m.attachments.length > 0
        ? `[User attached: ${m.attachments.map((a) => `${a.category.toUpperCase()} (${a.name})`).join(", ")}]\n`
        : "";
      return `${m.role.toUpperCase()}: ${attText}${m.content}`;
    })
    .join("\n\n");

  inputParts.push({
    type: "text",
    text: `Here is the conversation so far:
${historyText}

Please respond as Amelia AI. Provide empathetic, insightful, and natural guidance tailored to this long-distance relationship.
If the user asks what to text, how to reply, or wants message ideas, evaluate candidate replies against his learned preferences and provide ONLY your ONE HIGHEST-RANKED recommended response formatted with:
[RECOMMENDED_RESPONSE: {"message": "[Exact text to copy and send]", "tone": "[Tone Label]", "explanation": "[1 brief sentence why this best fits his style and this moment]", "situation": "${currentSituation}", "styleTags": ["...", "..."], "lengthCategory": "short|medium|long"}]
Do NOT overwhelm with multiple cards or a list of options. Give exactly ONE ideal recommendation.
If analyzing media (images, audio, video), clearly explain what you perceive and suggest your single best recommendation.`,
  });

  const generationConfig: Record<string, any> = {};
  if (thinkingMode === "quick") {
    generationConfig.thinking_level = "minimal";
  } else if (thinkingMode === "extra") {
    generationConfig.thinking_level = "high";
  } else {
    generationConfig.thinking_level = "medium";
  }

  try {
    let response;
    try {
      response = await client.interactions.create({
        model,
        input: inputParts,
        system_instruction: systemInstruction,
        generation_config: generationConfig,
      });
    } catch (confErr: any) {
      const errMsg = confErr?.message || String(confErr);
      if (model !== "gemini-3.5-flash-lite" && (errMsg.includes("no longer available") || errMsg.includes("404") || errMsg.includes("503") || errMsg.includes("UNAVAILABLE"))) {
        console.warn(`Primary model ${model} failed, falling back to gemini-3.5-flash-lite:`, errMsg);
        response = await client.interactions.create({
          model: "gemini-3.5-flash-lite",
          input: inputParts,
          system_instruction: systemInstruction,
        });
      } else {
        // Graceful fallback if model does not support specific thinking level parameter
        response = await client.interactions.create({
          model,
          input: inputParts,
          system_instruction: systemInstruction,
        });
      }
    }

    const replyText = response.output_text || "I'm right here with you. What's on your mind regarding Amelia?";

    // Extract suggested replies & memory tags
    const { cleanText, suggestedReplies, suggestedMemories } = parseAIOutput(replyText, currentSituation);

    return {
      reply: cleanText,
      suggestedReplies: suggestedReplies.length > 0 ? suggestedReplies : undefined,
      suggestedMemories: suggestedMemories.length > 0 ? suggestedMemories : undefined,
      isDemo: false,
    };
  } catch (err: any) {
    console.error("Gemini interaction error:", err);
    throw new Error(`Gemini API error: ${err?.message || String(err)}`);
  }
}

/**
 * Extracts structured suggested replies and memory suggestions from AI text.
 * Enforces YouTube-style single recommendation (returns at most 1 item).
 */
function parseAIOutput(
  text: string,
  defaultSituation: SituationContext = "general"
): {
  cleanText: string;
  suggestedReplies: SuggestedReply[];
  suggestedMemories: ExtractedMemorySuggestion[];
} {
  const suggestedReplies: SuggestedReply[] = [];
  let suggestedMemories: ExtractedMemorySuggestion[] = [];

  // 1. Look for memory suggestion tags
  const memoryMatches = [...text.matchAll(/\[MEMORY_SUGGESTION:\s*({[\s\S]*?})\]/g)];
  suggestedMemories = memoryMatches.map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  }).filter(Boolean) as ExtractedMemorySuggestion[];

  // 2. Look for structured single recommended response tag:
  // [RECOMMENDED_RESPONSE: {"message": "...", "tone": "...", "explanation": "...", "situation": "...", "styleTags": [...], "lengthCategory": "..."}]
  const recommendedTags = [...text.matchAll(/\[RECOMMENDED_RESPONSE:\s*({[\s\S]*?})\]/g)];
  for (const m of recommendedTags) {
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed.message && !suggestedReplies.some((r) => r.message === parsed.message)) {
        const msg = parsed.message.trim();
        const lenCat: "short" | "medium" | "long" =
          parsed.lengthCategory ||
          (msg.length < 55 ? "short" : msg.length < 135 ? "medium" : "long");
        suggestedReplies.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          message: msg,
          tone: parsed.tone || "Natural & Warm",
          explanation: parsed.explanation || "Recommended text tailored to your style and relationship.",
          situation: (parsed.situation as SituationContext) || defaultSituation,
          styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags : [parsed.tone || "Natural"],
          lengthCategory: lenCat,
          rating: null,
        });
      }
    } catch {}
  }

  // 3. Fallback to legacy tag: [SUGGESTED_REPLY: {"message": "...", "tone": "...", "explanation": "..."}]
  if (suggestedReplies.length === 0) {
    const replyTags = [...text.matchAll(/\[SUGGESTED_REPLY:\s*({[\s\S]*?})\]/g)];
    for (const m of replyTags) {
      try {
        const parsed = JSON.parse(m[1]);
        if (parsed.message && !suggestedReplies.some((r) => r.message === parsed.message)) {
          const msg = parsed.message.trim();
          const lenCat: "short" | "medium" | "long" =
            msg.length < 55 ? "short" : msg.length < 135 ? "medium" : "long";
          suggestedReplies.push({
            id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            message: msg,
            tone: parsed.tone || "Natural & Warm",
            explanation: parsed.explanation || "Suggested text you can send to Amelia.",
            situation: defaultSituation,
            styleTags: [parsed.tone || "Natural"],
            lengthCategory: lenCat,
            rating: null,
          });
        }
      } catch {}
    }
  }

  // Remove tags from clean display text
  let cleanText = text
    .replace(/\[MEMORY_SUGGESTION:\s*{[\s\S]*?}\]/g, "")
    .replace(/\[RECOMMENDED_RESPONSE:\s*{[\s\S]*?}\]/g, "")
    .replace(/\[SUGGESTED_REPLY:\s*{[\s\S]*?}\]/g, "")
    .trim();

  // 4. Fallback regex to capture bulleted/quoted suggestions if tags weren't emitted
  if (suggestedReplies.length === 0) {
    const replyPattern = /(?:Option \d+|Idea \d+|Suggestion \d+|\d+\.)?\s*[:\-—]?\s*"([^"]{4,})"(?:\s*[-—|•]\s*([^\n\r]+))?/gi;
    const replyMatches = [...cleanText.matchAll(replyPattern)];

    for (const m of replyMatches) {
      if (m[1] && m[1].trim().length > 4) {
        const message = m[1].trim();
        const meta = m[2] ? m[2].trim() : "";
        let tone = "Natural & Warm";
        let explanation = "Suggested text you can send to Amelia.";

        if (meta.includes("—") || meta.includes("-")) {
          const parts = meta.split(/[-—]/);
          tone = parts[0]?.trim() || tone;
          explanation = parts.slice(1).join(" - ").trim() || explanation;
        } else if (meta.length > 0) {
          tone = meta;
        }

        if (!suggestedReplies.some((r) => r.message === message)) {
          const lenCat: "short" | "medium" | "long" =
            message.length < 55 ? "short" : message.length < 135 ? "medium" : "long";
          suggestedReplies.push({
            id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            message,
            tone,
            explanation,
            situation: defaultSituation,
            styleTags: [tone],
            lengthCategory: lenCat,
            rating: null,
          });
          break; // Only capture 1 recommendation
        }
      }
    }
  }

  // CRITICAL REQUIREMENT: Return at most ONE recommended response
  return { cleanText, suggestedReplies: suggestedReplies.slice(0, 1), suggestedMemories };
}

// ==========================================
// UNIFIED DEMO MODE FALLBACK
// Explicitly labeled when GEMINI_API_KEY is not yet configured.
// ==========================================

function getUnifiedDemoResponse(
  messages: { role: "user" | "assistant"; content: string; attachments?: ChatAttachment[] }[],
  attachments?: ChatAttachment[]
): {
  reply: string;
  suggestedReplies: SuggestedReply[];
  suggestedMemories?: ExtractedMemorySuggestion[];
  isDemo: boolean;
} {
  const lastMsg = messages[messages.length - 1];
  const text = (lastMsg?.content || "").toLowerCase();
  const hasImages = (attachments || []).some((a) => a.category === "image");
  const hasAudio = (attachments || []).some((a) => a.category === "audio");
  const hasVideo = (attachments || []).some((a) => a.category === "video");

  // Media-specific intelligent demo responses
  if (hasAudio) {
    return {
      reply: `[Amelia AI Demo Mode — Live Gemini Audio Understanding will activate with your API key]

🎙️ **Audio Recording Analysis:**
- **Spoken Content:** Amelia is talking in an energetic, conversational tone about wrapping up a busy day and wanting to unwind.
- **Emotional Tone:** Relaxed, warm, and engaged. There is light laughter indicating good spirits.
- **Coach Recommendation:** Validate her day and invite her to relax without putting pressure on her to keep up a high-energy conversation.`,
      suggestedReplies: [
        {
          id: `rec_demo_audio_${Date.now()}`,
          message: "Just listened to your voice note haha! You sounded so exhausted earlier, please tell me you're finally kicking back on the couch.",
          tone: "Warm & Attentive",
          explanation: "Shows you listened to her voice and validates her need to relax.",
          situation: "comforting_supportive",
          styleTags: ["Attentive", "Warm", "Low Pressure"],
          lengthCategory: "medium",
          rating: null,
        },
      ],
      isDemo: true,
    };
  }

  if (hasVideo) {
    return {
      reply: `[Amelia AI Demo Mode — Live Gemini Video Understanding will activate with your API key]

🎬 **Video Content Analysis:**
- **Visuals & Dialogue:** The video shows an everyday, playful clip sharing a spontaneous moment of her world with you.
- **Vibe:** Candid, fun, and warm across the distance.
- **Coach Recommendation:** Acknowledge the highlight and tease her gently to spark fun banter.`,
      suggestedReplies: [
        {
          id: `rec_demo_video_${Date.now()}`,
          message: "Wait that is actually hilarious haha! Where was that taken?",
          tone: "Playful & Curious",
          explanation: "Engages directly with the video and prompts a fun story.",
          situation: "playful_funny",
          styleTags: ["Playful", "Banter", "Curious"],
          lengthCategory: "short",
          rating: null,
        },
      ],
      isDemo: true,
    };
  }

  if (hasImages) {
    return {
      reply: `[Amelia AI Demo Mode — Live Multimodal Vision Analysis will activate with your API key]

📱 **Image / Screenshot Analysis:**
- **Current Situation:** Amelia shared an image of her day. Her tone is open, receptive, and wanting to connect.
- **Her Possible Headspace:** Warm and comfortable sharing her world with you.
- **Coach Recommendation:** Keep the conversational momentum going with lighthearted curiosity and supportive warmth.`,
      suggestedReplies: [
        {
          id: `rec_demo_image_${Date.now()}`,
          message: "Haha that's so you! Tell me you at least got a chance to grab a coffee first?",
          tone: "Playful & Observant",
          explanation: "Friendly teasing that invites an easy continuation.",
          situation: "playful_funny",
          styleTags: ["Observant", "Casual Tease"],
          lengthCategory: "short",
          rating: null,
        },
      ],
      suggestedMemories: [
        {
          category: "Important Conversations",
          title: "Work Milestone",
          content: "Amelia mentioned wrapping up a major project this week.",
        },
      ],
      isDemo: true,
    };
  }

  // Text-specific demo intent recognition
  if (text.includes("miss") || text.includes("distance") || text.includes("beside")) {
    return {
      reply: `[Amelia AI Demo Mode]

Missing Amelia is completely natural when you're long-distance. The key to sending a great "I miss you" text is keeping it warm, grounded, and specific—not heavy, sad, or guilt-inducing.`,
      suggestedReplies: [
        {
          id: `rec_demo_miss_${Date.now()}`,
          message: "Was just sitting here thinking about you and wishing I could give you a hug right now haha. Hope your day is going well amel",
          tone: "Sweet & Grounded",
          explanation: "Warm and affectionate without creating pressure or sadness.",
          situation: "romantic",
          styleTags: ["Sweet", "Grounded", "Affectionate"],
          lengthCategory: "medium",
          rating: null,
        },
      ],
      isDemo: true,
    };
  }

  if (text.includes("date") || text.includes("activity") || text.includes("virtual")) {
    return {
      reply: `[Amelia AI Demo Mode]

Long-distance dates keep things exciting and intimate! Recreating shared movie or gaming nights bridges the distance effortlessly.`,
      suggestedReplies: [
        {
          id: `rec_demo_date_${Date.now()}`,
          message: "Hey! What do you think about doing a cozy movie date night tonight? We can sync up a film on Teleparty and grab snacks. Let me know what you're in the mood to watch!",
          tone: "Watch Party Date",
          explanation: "Low-stress, fun, and easy to set up with snacks.",
          situation: "romantic",
          styleTags: ["Virtual Date", "Low Stress", "Excited"],
          lengthCategory: "medium",
          rating: null,
        },
      ],
      isDemo: true,
    };
  }

  // Default fallback text response
  return {
    reply: `[Amelia AI Demo Mode]

In a long-distance relationship, staying connected is all about keeping communication effortless, genuine, and authentic to your voice. Here is your recommended text:`,
    suggestedReplies: [
      {
        id: `rec_demo_def_${Date.now()}`,
        message: "Hey! Just wanted to send a quick hello and see how your morning is treating you :)",
        tone: "Casual & Sweet",
        explanation: "Simple, zero-pressure check-in tailored to your profile.",
        situation: "morning_night",
        styleTags: ["Casual", "Sweet", "Low Pressure"],
        lengthCategory: "short",
        rating: null,
      },
    ],
    isDemo: true,
  };
}

export interface ImproveMessageOptions {
  previousVersions?: string[];
  conversationContext?: string;
  dislikedTraits?: string[];
  situationContext?: string;
}

/**
 * Message improvement / transformation helper
 * Supports: shorter, longer, funnier, sweeter, more_affectionate, more_romantic, more_flirty, regenerate, dislike_replace, sound like me
 */
export async function improveMessage(
  originalMessage: string,
  styleId: string,
  stylePrompt?: string,
  options: ImproveMessageOptions = {}
): Promise<ImprovementResult & { tone?: string }> {
  const client = getGeminiClient();
  const model = getGeminiModel();
  const previousVersions = Array.from(
    new Set(
      [originalMessage, ...(options.previousVersions || [])]
        .map((v) => (v || "").trim())
        .filter(Boolean)
    )
  );

  let specificGuidance = stylePrompt || "";
  if (styleId === "shorter") {
    specificGuidance = "Make this message significantly more concise, punchy, and brief, like a quick casual text message, while preserving its warmth.";
  } else if (styleId === "longer") {
    specificGuidance = "Expand this message slightly with more detail, genuine conversational thought, and warmth without rambling.";
  } else if (styleId === "funnier") {
    specificGuidance = "Make this message funnier, punchier, with playful wit or lighthearted teasing that will make Amelia laugh.";
  } else if (styleId === "sweeter") {
    specificGuidance = "Make this message sweeter, more thoughtful, and caring across the distance, making her feel cherished.";
  } else if (styleId === "more_affectionate") {
    specificGuidance = "Infuse more warmth, tenderness, and love into this text, conveying how much she means to you.";
  } else if (styleId === "more_romantic") {
    specificGuidance = "Make this feel more romantically special and tender, creating that flutter feeling naturally.";
  } else if (styleId === "more_flirty") {
    specificGuidance = "Add playful flirty banter, charm, and teasing chemistry.";
  } else if (styleId === "regenerate" || styleId === "dislike_replace") {
    specificGuidance =
      stylePrompt ||
      "Generate a completely fresh, alternative message with a distinctly different wording, opening, angle, and rhythm while keeping the core relationship intent authentic.";
  } else if (styleId === "more_natural" || styleId === "like_me") {
    specificGuidance = "Adapt this text to strictly match my authentic personal voice, casual phrasing, and sample messages from my profile.";
  }

  const fallbackVariation = (base: string, idx: number): string => {
    const clean = base.replace(/^["']|["']$/g, "").trim();
    const variations = [
      `Hey love, ${clean.charAt(0).toLowerCase() + clean.slice(1)}`,
      `Honestly just thinking about you right now — ${clean.charAt(0).toLowerCase() + clean.slice(1)}`,
      `${clean} (also hope your day is going super smoothly over there ❤️)`,
      `Random thought: ${clean.charAt(0).toLowerCase() + clean.slice(1)}`,
      `Missing you today! ${clean}`,
    ];
    for (const cand of variations) {
      if (!previousVersions.includes(cand)) return cand;
    }
    return `${clean} — thinking of you! (#${idx + 1})`;
  };

  if (!client) {
    let improved = originalMessage;
    if (styleId === "shorter") {
      improved = originalMessage.length > 50 ? originalMessage.slice(0, 45) + "..." : `Hey, ${originalMessage.slice(0, 30)}`;
    } else if (styleId === "longer") {
      improved = `${originalMessage}. Hope you're having the best day over there Amelia, missing you lots!`;
    } else if (styleId === "funnier") {
      improved = `${originalMessage} (and no, you're not allowed to make fun of me for saying that haha)`;
    } else if (styleId === "sweeter") {
      improved = `${originalMessage} ❤️ thinking of you lots today`;
    } else if (styleId === "more_affectionate") {
      improved = `Wish I could just give you the biggest hug right now. ${originalMessage}`;
    } else if (styleId === "more_romantic") {
      improved = `Honestly so lucky to have you in my life. ${originalMessage}`;
    } else if (styleId === "more_flirty") {
      improved = `${originalMessage} 😉 unless you have other plans?`;
    } else {
      improved = fallbackVariation(originalMessage, previousVersions.length);
    }

    if (previousVersions.includes(improved.trim())) {
      improved = fallbackVariation(originalMessage, previousVersions.length + 1);
    }

    return {
      original: originalMessage,
      style: styleId,
      improved,
      tone: styleId === "dislike_replace" ? "Fresh Alternative" : "Refined & Natural",
      reasoning: `[Demo Mode] Transformed message to '${styleId}' style.`,
      isDemoMode: true,
    };
  }

  let learnedSummary = "";
  try {
    const learned = await getLearnedPreferences();
    if (learned.preferredTones.length > 0 || learned.avoidedTones.length > 0) {
      learnedSummary = `\nUser's Learned Preferences:
- Preferred Tones: ${learned.preferredTones.slice(0, 4).join(", ") || "Warm, Natural, Genuine"}
- Avoided Tones: ${learned.avoidedTones.slice(0, 4).join(", ") || "None"}
- Preferred Length: ${learned.preferredLength}`;
    }
  } catch {}

  const avoidListBlock =
    previousVersions.length > 0
      ? `\nPREVIOUSLY GENERATED VERSIONS (DO NOT REPEAT OR CLOSELY PARAPHRASE ANY OF THESE):\n${previousVersions
          .map((v, i) => `${i + 1}. "${v}"`)
          .join("\n")}`
      : "";

  const contextBlock = options.conversationContext
    ? `\nCONVERSATION / SITUATION CONTEXT:\n${options.conversationContext}`
    : "";

  const dislikedBlock =
    options.dislikedTraits && options.dislikedTraits.length > 0
      ? `\nTRAITS THE USER DISLIKED ABOUT THE PREVIOUS MESSAGE (STRICTLY AVOID THESE):\n- ${options.dislikedTraits.join("\n- ")}`
      : "";

  const prompt = `You are rewriting or regenerating a text message from a boyfriend to his long-distance girlfriend Amelia.

Original / Previous message: "${originalMessage}"
Requested action: ${styleId}
Specific direction: ${specificGuidance}${contextBlock}${learnedSummary}${dislikedBlock}${avoidListBlock}

CRITICAL RULES:
1. You MUST write a genuinely NEW, fresh version that is noticeably different in opening words, phrasing, and structure from every message in PREVIOUSLY GENERATED VERSIONS.
2. NEVER return the exact same text as "${originalMessage}".
3. NEVER use the 👍 (thumbs-up) emoji anywhere in the message.
4. Keep it sounding like a real, natural text message from a loving boyfriend (not stiff or robotic).
5. Return ONLY valid JSON in this exact format (no markdown code fences, no extra commentary):
{"improved": "the new text message to send", "tone": "2-3 word tone label", "reasoning": "1 short sentence explaining why this new version works better"}`;

  try {
    const res = await client.interactions.create({
      model,
      input: prompt,
      system_instruction: await buildCoachSystemInstruction(),
    });

    const rawText = (res.output_text || "").trim();
    let improvedText = "";
    let toneLabel = "Fresh & Natural";
    let reasoningText = "Generated a fresh variation tailored to your preferences.";

    // Robust JSON extraction even if Gemini wraps it in prose or codeblocks
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.improved && typeof parsed.improved === "string") {
          improvedText = parsed.improved.trim();
        }
        if (parsed.tone && typeof parsed.tone === "string") {
          toneLabel = parsed.tone.trim();
        }
        if (parsed.reasoning && typeof parsed.reasoning === "string") {
          reasoningText = parsed.reasoning.trim();
        }
      } catch {
        // Fallback regex extraction if unescaped quotes exist inside JSON
        const impMatch = rawText.match(/"improved"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (impMatch?.[1]) {
          improvedText = impMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
        }
      }
    }

    if (!improvedText && rawText.length > 0 && !rawText.startsWith("{")) {
      improvedText = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/^["']|["']$/g, "")
        .trim();
    }

    // Never allow👍 in suggested text to Amelia
    improvedText = improvedText.replace(/👍/g, "").trim();

    // Check if improvedText is empty or identical to any previous version
    const isDuplicate =
      !improvedText ||
      previousVersions.some(
        (prev) => prev.toLowerCase().trim() === improvedText.toLowerCase().trim()
      );

    if (isDuplicate) {
      // Perform a fast second-pass plain-text variation call so it is guaranteed fresh
      try {
        const retryRes = await client.interactions.create({
          model,
          input: `Give me ONE completely different, natural text message for my girlfriend Amelia that expresses the same core thought as "${originalMessage}", but uses totally different wording and opening words than: ${previousVersions.map((v) => `"${v}"`).join(", ")}. Output ONLY the raw message text itself with no quotes or JSON.`,
          system_instruction: await buildCoachSystemInstruction(),
        });
        const retryClean = (retryRes.output_text || "")
          .replace(/^["']|["']$/g, "")
          .replace(/👍/g, "")
          .trim();
        if (
          retryClean &&
          !previousVersions.some(
            (prev) => prev.toLowerCase().trim() === retryClean.toLowerCase().trim()
          )
        ) {
          improvedText = retryClean;
        } else {
          improvedText = fallbackVariation(originalMessage, previousVersions.length);
        }
      } catch {
        improvedText = fallbackVariation(originalMessage, previousVersions.length);
      }
    }

    return {
      original: originalMessage,
      style: styleId,
      improved: improvedText,
      tone: toneLabel,
      reasoning: reasoningText,
      isDemoMode: false,
    };
  } catch (err: any) {
    const fallback = fallbackVariation(originalMessage, previousVersions.length);
    return {
      original: originalMessage,
      style: styleId,
      improved: fallback,
      tone: "Alternative Angle",
      reasoning: "Created a fresh phrasing variation.",
      isDemoMode: false,
    };
  }
}

/**
 * Legacy conversation starters generator (enhanced for LDR)
 */
export async function generateConversationStarters(
  category: string = "random",
  includeMemories: boolean = true
): Promise<StarterItem[]> {
  const client = getGeminiClient();
  const model = getGeminiModel();

  if (!client) {
    return [
      {
        id: "starter-1",
        category,
        message: "Hey! Thinking about you today, how's your day going so far over there?",
        contextTag: "Casual Check-in",
        whyItWorks: "Low pressure, thoughtful, and opens the door easily across distance.",
      },
      {
        id: "starter-2",
        category,
        message: "Random question: if we could teleport to dinner anywhere tonight, what are you craving?",
        contextTag: "Spontaneous / Food",
        whyItWorks: "Fun, playful, and leads to an easy conversation about your next visit.",
      },
      {
        id: "starter-3",
        category,
        message: "Was just thinking about our penguin waddle joke earlier haha, hope you're having the best day!",
        contextTag: "Inside Joke",
        whyItWorks: "References shared humor and conveys affection naturally.",
      },
      {
        id: "starter-4",
        category,
        message: "Wish you were here beside me right now, but sending you the biggest hug from here ❤️",
        contextTag: "Missing Her",
        whyItWorks: "Sweet, honest, and grounds the distance in warm affection.",
      },
    ];
  }

  const prompt = `Generate 4 to 5 natural conversation starters to text my long-distance girlfriend Amelia.
Category: ${category}.
Include memories: ${includeMemories}.
Return JSON array of items: [{"id": "s1", "category": "${category}", "message": "...", "contextTag": "...", "whyItWorks": "..."}]`;

  try {
    const res = await client.interactions.create({
      model,
      input: prompt,
      system_instruction: await buildCoachSystemInstruction(),
    });
    const parsed = JSON.parse(
      (res.output_text || "[]").replace(/```json/g, "").replace(/```/g, "").trim()
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [
      {
        id: "starter-fallback",
        category,
        message: "Hey, hope your morning is going great over there!",
        contextTag: "Casual",
        whyItWorks: "Simple and warm.",
      },
    ];
  }
}

/**
 * Legacy screenshot analyzer
 */
export async function analyzeScreenshots(
  images: any[],
  userNotes?: string,
  preferences?: TextingPreferences
): Promise<ScreenshotAnalysisResult> {
  const attachments: ChatAttachment[] = images.map((img, idx) => ({
    id: `img-${idx}`,
    name: `Screenshot ${idx + 1}`,
    size: Math.round(((img.data || "").length * 3) / 4),
    category: "image",
    mimeType: img.mimeType || "image/png",
    data: img.data,
  }));

  const userQuery = userNotes
    ? `Analyze these screenshots of my conversation with Amelia. My notes/question: "${userNotes}"`
    : "Analyze these screenshots of our text conversation. How is Amelia feeling and what are 3 to 5 natural things I can say next?";

  const response = await chatWithAmeliaAI(
    [{ role: "user", content: userQuery, attachments }],
    attachments
  );

  return {
    summary: response.reply,
    emotionalTone: "Analyzed conversation flow & tone",
    context: userNotes || "Recent text exchange with Amelia",
    suggestedReplies: response.suggestedReplies || [],
    extractedMemories: response.suggestedMemories || [],
    isDemoMode: response.isDemo,
  };
}
