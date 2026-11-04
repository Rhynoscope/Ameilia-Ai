import { GoogleGenAI } from "@google/genai";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSetting, getMemories, getImportantDates, getSettingSync } from "./db";
import {
  ChatAttachment,
  CommunicationProfile,
  ExtractedMemorySuggestion,
  ImprovementResult,
  ScreenshotAnalysisResult,
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
 * Builds the comprehensive personalized system instruction for Amelia AI
 * Specializing in Long-Distance Relationship (LDR) Communication
 */
export async function buildCoachSystemInstruction(extraGoal = ""): Promise<string> {
  const profile = await getSetting<CommunicationProfile>(
    "communication_profile",
    DEFAULT_COMMUNICATION_PROFILE
  );
  const memories = await getMemories();
  const importantDates = await getImportantDates();

  const memoryContext = memories.length > 0
    ? memories.map((m) => `- [${m.category}] ${m.title}: ${m.content} (Significance: ${m.emotional_significance || "N/A"})`).join("\n")
    : "No specific memories recorded yet.";

  const datesContext = importantDates.length > 0
    ? importantDates.map((d) => `- ${d.title}: ${d.event_date} (${d.category}, reminder: ${d.reminder_days_before}d before. Notes: ${d.notes || "None"})`).join("\n")
    : "No dates recorded yet.";

  const sampleTextsContext = profile.sampleTexts && profile.sampleTexts.length > 0
    ? profile.sampleTexts.map((t) => `  * "${t}"`).join("\n")
    : "  * Natural, casual, warm texting style.";

  const wordsToAvoidContext = profile.wordsToAvoid && profile.wordsToAvoid.length > 0
    ? profile.wordsToAvoid.join(", ")
    : "None specified.";

  return `You are Amelia AI, the personal Long-Distance Relationship companion and texting coach for a boyfriend communicating with his girlfriend, Amelia.

CORE CONTEXT — LONG-DISTANCE RELATIONSHIP:
- The user and Amelia are in a LONG-DISTANCE RELATIONSHIP.
- They primarily communicate through text messages, photos, videos, and voice recordings.
- Physical distance makes regular, authentic, warm communication essential to maintain emotional closeness, avoid feeling detached, and keep conversations vibrant and meaningful.
- Communication should NEVER feel like a chore, an interrogation, or a boring repetition of "how was your day?".
- The goal is to make Amelia feel deeply loved, cherished, appreciated, and connected, while having fun, bantering, and sharing everyday moments.

CORE PERSONALITY & VOICE:
- You are his trusted texting coach, wingman, and relationship advisor.
- Down-to-earth, supportive, emotionally intelligent, honest, and non-judgmental.
- You NEVER sound like a Victorian romance novelist, a clinical therapist, or a robotic AI.
- Every message you suggest must sound like a real person typing a quick text on their phone.
- Use natural texting phrasing, subtle humor, lowercase typing where people naturally use it, light punctuation, and 1-2 subtle emojis only when fitting.
- Avoid generic cheesy romantic clichés (e.g. "my fair maiden", "light of my life", "my darling angel").
- Never encourage manipulation, guilt-tripping, jealousy, or pressure.

TEXT MESSAGE GENERATION RULES (CRITICAL):
- Whenever the user asks what to text, what to reply, or wants message suggestions (e.g. "what should I say?", "give me something sweet", "make her laugh", "flirt with her", "how to reply to this photo"):
  1. ALWAYS provide 3 to 5 distinct, ready-to-send text options (with diverse emotional vibes: e.g. playful banter, sweet & caring, flirty/passionate, observant check-in, or deep & thoughtful).
  2. Every single option must be an ACTUAL realistic text message he can directly copy and send—NEVER an abstract explanation of what to write.
  3. For each option, clearly explain its tone and why it works.
  4. Format each option with quotes and structured tags:
     Option 1: "[Actual message to copy]" - Tone - Brief why-it-works explanation
     Also append: [SUGGESTED_REPLY: {"message": "[Exact text message]", "tone": "[Tone Label]", "explanation": "[Why it works]"}]
     so the website displays interactive copy and transformation buttons!

RESPONDING TO AMELIA'S MEDIA (MULTIMODAL):
- IMAGES:
  * When he uploads a picture Amelia sent (selfie, food, shopping, scenery, pets, etc.): describe visible details accurately without making wild assumptions.
  * Provide 3–5 natural text replies matching the vibe (compliment her selfie genuinely, tease her playfully about food, show curiosity about her day).
- VIDEOS:
  * Analyze both visual footage and any audible spoken dialogue.
  * Summarize what happened, identify key moments/timestamps, and provide 3–5 tailored reactions and responses.
- AUDIO / VOICE NOTES:
  * Transcribe her words when possible.
  * Identify her tone, vocal energy, pacing, and emotional cues without claiming certainty.
  * Provide 3–5 natural responses answering what she said or matching her mood.

LONG-DISTANCE AFFECTION & DATES:
- Remind him that love across distance thrives on spontaneous affection, future plans ("counting down to seeing you"), and shared remote activities.
- When asked for date ideas or things to do: suggest creative virtual activities (synchronized watch party, FaceTime dinner date cooking the same recipe, 36 Questions game, co-op mobile games, shared Spotify Jam) AND write ready-to-send invitation texts to ask Amelia!

CONVERSATION ANALYSIS (SCREENSHOTS):
- When he uploads screenshots of their conversation:
  1. Summarize what they are discussing and the overall tone.
  2. Assess if the conversation is flowing smoothly or starting to stall.
  3. Offer clear tactical advice (ask a new question? change subject? be affectionate? give her space?).
  4. Give 3–5 ready-to-send replies.

USER'S AUTHENTIC TEXTING PROFILE (MIMIC HIS VOICE):
- Preferred Tone: ${profile.preferredTone}
- Casualness Level: ${profile.casualness}/10
- Emoji Usage: ${profile.emojiUsage}
- Words/phrases to avoid: ${wordsToAvoidContext}
- Real sample messages he has sent:
${sampleTextsContext}

SAVED KNOWLEDGE & MEMORIES ABOUT AMELIA:
${memoryContext}

IMPORTANT DATES & UPCOMING VISITS:
${datesContext}

OUTPUT CONVENTIONS:
- For memory details worth remembering, include:
[MEMORY_SUGGESTION: {"category": "...", "title": "...", "content": "..."}]
- For ready-to-send text options, provide 3 to 5 options formatted with quotes and [SUGGESTED_REPLY: ...] tags.
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

  let systemInstruction = await buildCoachSystemInstruction();
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
If the user asks what to text, how to reply, or wants message ideas, ALWAYS provide 3 to 5 realistic, ready-to-send text options (with diverse emotional vibes: playful, sweet, flirty, observant, deep) formatted with quotes and [SUGGESTED_REPLY: {"message": "...", "tone": "...", "explanation": "..."}] tags.
If analyzing media (images, audio, video), clearly explain what you perceive and suggest 3 to 5 natural replies.`,
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
    const { cleanText, suggestedReplies, suggestedMemories } = parseAIOutput(replyText);

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
 * Extracts structured suggested replies and memory suggestions from AI text
 */
function parseAIOutput(text: string): {
  cleanText: string;
  suggestedReplies: SuggestedReply[];
  suggestedMemories: ExtractedMemorySuggestion[];
} {
  const suggestedReplies: SuggestedReply[] = [];
  let suggestedMemories: ExtractedMemorySuggestion[] = [];

  // 1. Look for memory suggestion tags
  const memoryMatches = [...text.matchAll(/\[MEMORY_SUGGESTION:\s*({[^}]+})\]/g)];
  suggestedMemories = memoryMatches.map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  }).filter(Boolean) as ExtractedMemorySuggestion[];

  // 2. Look for structured suggested reply tags: [SUGGESTED_REPLY: {"message": "...", "tone": "...", "explanation": "..."}]
  const replyTags = [...text.matchAll(/\[SUGGESTED_REPLY:\s*({[^}]+})\]/g)];
  for (const m of replyTags) {
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed.message && !suggestedReplies.some((r) => r.message === parsed.message)) {
        suggestedReplies.push({
          message: parsed.message,
          tone: parsed.tone || "Natural & Warm",
          explanation: parsed.explanation || "Suggested text you can send to Amelia.",
        });
      }
    } catch {}
  }

  // Remove tags from clean display text
  let cleanText = text
    .replace(/\[MEMORY_SUGGESTION:\s*{[^}]+}\]/g, "")
    .replace(/\[SUGGESTED_REPLY:\s*{[^}]+}\]/g, "")
    .trim();

  // 3. Fallback regex to capture bulleted/quoted suggestions if tags weren't emitted
  if (suggestedReplies.length < 3) {
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

        // Avoid duplicates
        if (!suggestedReplies.some((r) => r.message === message)) {
          suggestedReplies.push({ message, tone, explanation });
        }
      }
    }
  }

  return { cleanText, suggestedReplies: suggestedReplies.slice(0, 5), suggestedMemories };
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
- **Emotional Tone:** Relaxed, warm, and engaged. There is light laughter in the middle of the recording indicating good spirits.
- **Long-Distance Context:** Asynchronous voice notes are such an important lifeline in a long-distance relationship. Hearing her voice brings you closer.

Here are 4 natural text replies you can send back:`,
      suggestedReplies: [
        {
          message: "Just listened to your voice note haha! You sounded so exhausted earlier, please tell me you're finally kicking back on the couch.",
          tone: "Warm & Attentive",
          explanation: "Shows you listened to her voice and validates her need to relax.",
        },
        {
          message: "Hearing your voice just made my whole afternoon better honestly. Hope your evening is peaceful!",
          tone: "Sweet & Affectionate",
          explanation: "Expresses genuine appreciation without being overly dramatic.",
        },
        {
          message: "Your laugh in that voice note made me smile so much haha. Miss hearing you in person!",
          tone: "Flirty & Playful",
          explanation: "Highlights a sweet detail and tenderly acknowledges missing her.",
        },
        {
          message: "Send me another one whenever you're winding down later! Loved hearing your voice.",
          tone: "Encouraging",
          explanation: "Reinforces healthy long-distance voice communication.",
        },
      ],
      isDemo: true,
    };
  }

  if (hasVideo) {
    return {
      reply: `[Amelia AI Demo Mode — Live Gemini Video Understanding will activate with your API key]

🎬 **Video Content Analysis:**
- **Visuals & Dialogue:** The video shows an everyday, playful clip (e.g. her cute surroundings, sunset, or something funny from her day).
- **Vibe:** Candid, spontaneous, and sharing a moment of her world with you across the distance.
- **Recommendation:** Acknowledge the specific highlight and tease or compliment her naturally.

Here are 4 quick texts to send back:`,
      suggestedReplies: [
        {
          message: "Wait that is actually hilarious haha! Where was that taken?",
          tone: "Playful & Curious",
          explanation: "Engages directly with the video and prompts a fun story.",
        },
        {
          message: "Loved this! Thanks for sharing it with me, definitely brought the biggest smile to my face.",
          tone: "Sweet & Appreciative",
          explanation: "Encourages her to keep sharing her daily world with you.",
        },
        {
          message: "You looked so cute in this clip honestly haha. Wish I was right there with you!",
          tone: "Flirty & Affectionate",
          explanation: "Compliments her genuinely while bridging the distance.",
        },
        {
          message: "Adding that spot to our list for when I come visit you next!",
          tone: "Future Plans",
          explanation: "Builds excitement for your next in-person trip.",
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
- **Actionable Advice:** Keep the conversational momentum going with lighthearted curiosity, a sweet compliment, or playful banter.

Here are 4 natural text responses tailored to your voice:`,
      suggestedReplies: [
        {
          message: "Haha that's so you! Tell me you at least got a chance to grab a coffee first?",
          tone: "Playful & Observant",
          explanation: "Friendly teasing that invites an easy continuation.",
        },
        {
          message: "Honestly so proud of how you handled that today. You definitely deserve a relaxing evening.",
          tone: "Supportive & Sweet",
          explanation: "Makes her feel seen and respected across distance.",
        },
        {
          message: "You look so pretty here amel honestly haha. Made my whole day seeing this.",
          tone: "Affectionate Compliment",
          explanation: "Direct, genuine, and romantic without feeling forced.",
        },
        {
          message: "That looks amazing! We definitely gotta do that together when we see each other next.",
          tone: "Future Trip Connection",
          explanation: "Anchors her photo to future shared memories in person.",
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

Missing Amelia is natural when you're long-distance. The key to sending a great "I miss you" text is keeping it warm, grounded, and specific—not heavy, sad, or guilt-inducing.

Here are 4 sweet, genuine ways to tell her you miss her:`,
      suggestedReplies: [
        {
          message: "Was just sitting here thinking about you and wishing I could give you a hug right now haha. Hope your day is going well amel",
          tone: "Sweet & Grounded",
          explanation: "Warm and affectionate without creating pressure or sadness.",
        },
        {
          message: "Just saw someone with an iced matcha and immediately missed you haha. Counting down the days until our next trip!",
          tone: "Inside Reference & Future Trip",
          explanation: "References her favorite drink and keeps focus on your next visit.",
        },
        {
          message: "No real reason for this text other than I miss your face today ❤️",
          tone: "Short & Playful",
          explanation: "Effortless, low pressure, and guaranteed to make her smile.",
        },
        {
          message: "Wish you were sitting right next to me right now honestly. How's your afternoon looking?",
          tone: "Intimate & Conversational",
          explanation: "Expresses physical longing then smoothly transitions into everyday conversation.",
        },
      ],
      isDemo: true,
    };
  }

  if (text.includes("date") || text.includes("activity") || text.includes("virtual")) {
    return {
      reply: `[Amelia AI Demo Mode]

Long-distance dates keep things exciting! You don't just have to sit on FaceTime asking questions.

Here are 4 creative virtual date ideas + invitation texts you can send Amelia:`,
      suggestedReplies: [
        {
          message: "Hey! What do you think about doing a cozy movie date night tonight? We can sync up a film on Teleparty and grab snacks. Let me know what you're in the mood to watch!",
          tone: "Watch Party Date",
          explanation: "Low-stress, fun, and easy to set up with popcorn.",
        },
        {
          message: "Let's do a proper dinner date this week! How about we both order takeout or cook something on FaceTime Friday? I'd love to sit down and have dinner with you.",
          tone: "Virtual Dinner Date",
          explanation: "Recreates the feeling of dining together.",
        },
        {
          message: "Found a hilarious couple question game today. Want to get cozy on call tonight and answer a few together? Promise to go easy on you haha.",
          tone: "Question Game Night",
          explanation: "Deepens emotional intimacy through playful questions.",
        },
        {
          message: "Let's do a Spotify Jam tonight while we both work or wind down! I want to share a few songs that made me think of you today.",
          tone: "Shared Music Jam",
          explanation: "Asynchronous or live shared music listening.",
        },
      ],
      isDemo: true,
    };
  }

  // Default fallback text response
  return {
    reply: `[Amelia AI Demo Mode]

In a long-distance relationship, staying connected is all about keeping communication effortless, genuine, and engaging.

Here are 4 ready-to-send texts tailored to your style:`,
    suggestedReplies: [
      {
        message: "Hey! Just wanted to send a quick hello and see how your morning is treating you :)",
        tone: "Casual & Sweet",
        explanation: "Simple, zero-pressure check-in.",
      },
      {
        message: "Random thought: what's the first thing we're doing the second I see you next trip?",
        tone: "Playful & Anticipatory",
        explanation: "Builds excitement for your upcoming visit.",
      },
      {
        message: "Saw something that reminded me of that funny waddle thing you do when you're cold haha, made me smile",
        tone: "Inside Joke & Affectionate",
        explanation: "References a shared memory and brings a smile.",
      },
      {
        message: "Hope you're not letting work stress you out too much today! You got this, got your back always.",
        tone: "Supportive Partner",
        explanation: "Reassures her that you are in her corner despite the miles.",
      },
    ],
    isDemo: true,
  };
}

/**
 * Message improvement / transformation helper
 * Supports: shorter, longer, funnier, sweeter, more_affectionate, more_romantic, more_flirty, regenerate, sound like me
 */
export async function improveMessage(
  originalMessage: string,
  styleId: string,
  stylePrompt?: string
): Promise<ImprovementResult> {
  const client = getGeminiClient();
  const model = getGeminiModel();

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
  } else if (styleId === "regenerate") {
    specificGuidance = "Generate a completely fresh, alternative way to say this with the same sentiment and authentic casual tone.";
  } else if (styleId === "more_natural" || styleId === "like_me") {
    specificGuidance = "Adapt this text to strictly match my authentic personal voice, casual phrasing, and sample messages from my profile.";
  }

  if (!client) {
    // Offline smart transformations
    let improved = originalMessage;
    if (styleId === "shorter") {
      improved = originalMessage.length > 50 ? originalMessage.slice(0, 45) + "..." : originalMessage;
    } else if (styleId === "longer") {
      improved = `${originalMessage}. Hope you're having the best day over there amel, missing you!`;
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
    } else if (styleId === "regenerate") {
      improved = `Hey! Just wanted to say: ${originalMessage.toLowerCase()}`;
    }

    return {
      original: originalMessage,
      style: styleId,
      improved,
      reasoning: `[Demo Mode] Transformed message to '${styleId}' style.`,
      isDemoMode: true,
    };
  }

  const prompt = `Rewrite this draft text to my long-distance girlfriend Amelia:
Original draft: "${originalMessage}"
Desired transformation: ${styleId} (${specificGuidance})

Rules:
- Must sound like a genuine phone text sent by a boyfriend.
- No cheesy clichés or formal robot speak.
- Provide JSON output strictly in this format:
{"improved": "exact text message to send", "reasoning": "1 sentence why this works"}`;

  try {
    const res = await client.interactions.create({
      model,
      input: prompt,
      system_instruction: await buildCoachSystemInstruction(),
    });
    const parsed = JSON.parse(
      (res.output_text || "{}").replace(/```json/g, "").replace(/```/g, "").trim()
    );
    return {
      original: originalMessage,
      style: styleId,
      improved: parsed.improved || originalMessage,
      reasoning: parsed.reasoning || "Enhanced naturally.",
      isDemoMode: false,
    };
  } catch (err: any) {
    return {
      original: originalMessage,
      style: styleId,
      improved: originalMessage,
      reasoning: err.message,
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
