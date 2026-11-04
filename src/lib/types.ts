export type TextingStyle =
  | "funny"
  | "smart"
  | "flirty"
  | "lustful"
  | "passionate"
  | "affectionate"
  | "romantic"
  | "casual"
  | "reassuring"
  | "apologetic"
  | "spontaneous"
  | "deep";

export interface TextingStyleOption {
  id: TextingStyle;
  label: string;
  emoji: string;
  description: string;
  tag: string;
}

export type MessageLength = "short" | "medium" | "long";
export type EmotionalIntensity = "subtle" | "moderate" | "strong";
export type NaturalnessLevel = "very_casual" | "balanced" | "expressive";

export interface TextingPreferences {
  styles: TextingStyle[];
  length: MessageLength;
  intensity: EmotionalIntensity;
  naturalness: NaturalnessLevel;
  customInstruction?: string;
}

export interface CommunicationProfile {
  name: string;
  sampleTexts: string[];
  preferredTone: string;
  wordsToAvoid: string[];
  phrasesUserLikes: string[];
  casualness: number; // 1-10
  emojiUsage: "rare" | "moderate" | "frequent";
}

export type MemoryCategory =
  | "Interests"
  | "Hobbies"
  | "Favorite Things"
  | "Dislikes"
  | "Important Dates"
  | "Favorite Foods"
  | "Inside Jokes"
  | "Important Conversations"
  | "Things She Told Me"
  | "Promises Made"
  | "Topics She Enjoys"
  | "Special Memories";

export interface MemoryItem {
  id: number;
  category: MemoryCategory;
  title: string;
  content: string;
  emotional_significance?: string;
  source: "manual" | "ai_extracted";
  created_at: string;
  updated_at: string;
}

export type DateCategory =
  | "birthday"
  | "anniversary"
  | "special_occasion"
  | "next_visit"
  | "plan"
  | "personal";

export interface ImportantDate {
  id: number;
  title: string;
  event_date: string; // YYYY-MM-DD
  category: DateCategory;
  reminder_days_before: number;
  notes?: string;
  is_recurring_yearly: boolean;
  created_at: string;
}

export interface ReminderSettings {
  enabled: boolean;
  minPerDay: number;
  maxPerDay: number;
  startTime: string; // "09:00"
  endTime: string; // "22:00"
  quietHoursStart: string; // "23:00"
  quietHoursEnd: string; // "08:00"
  randomized: boolean;
  snoozeDurationMinutes: number; // 15, 30, 60
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  customPrompts: string[];
}

export interface ReminderLogItem {
  id: number;
  scheduled_time: string;
  prompt_message: string;
  status: "pending" | "completed" | "snoozed" | "missed";
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface SuggestedReply {
  message: string;
  tone: string;
  explanation: string;
}

export interface ExtractedMemorySuggestion {
  category: MemoryCategory;
  title: string;
  content: string;
}

export type MediaCategory = "image" | "audio" | "video";

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  category: MediaCategory;
  mimeType: string;
  data: string; // Base64 data URL
  fileUri?: string; // Gemini Files API URI if large
  storageKey?: string; // Cloudflare R2 object key
  storageUrl?: string; // Cloudflare R2 secure endpoint /api/media/[key]
}

export type ThinkingMode = "quick" | "normal" | "extra";

export interface ChatMessage {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  thinking_mode?: ThinkingMode;
  attachments?: ChatAttachment[];
  suggested_replies?: SuggestedReply[];
  suggested_memories?: ExtractedMemorySuggestion[];
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  archived?: boolean;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ImprovementResult {
  original: string;
  style: string;
  improved: string;
  reasoning: string;
  isDemoMode?: boolean;
}

export interface ScreenshotAnalysisResult {
  summary: string;
  emotionalTone: string;
  context: string;
  suggestedReplies: SuggestedReply[];
  extractedMemories: ExtractedMemorySuggestion[];
  isDemoMode?: boolean;
}

export interface StarterItem {
  id: string;
  category: string;
  message: string;
  contextTag: string;
  whyItWorks: string;
}

export interface WeeklyReflection {
  id: number;
  week_start: string;
  reflection_text: string;
  rating: number;
  created_at: string;
}

export type LdrDateCategory =
  | "watch_party"
  | "games"
  | "virtual_dinner"
  | "deep_talks"
  | "music_jam"
  | "quizzes_challenges";

export interface VirtualDateIdea {
  id: string;
  title: string;
  category: LdrDateCategory;
  categoryLabel: string;
  emoji: string;
  description: string;
  durationMinutes: string;
  invitationMessage: string;
  prepTip: string;
}
