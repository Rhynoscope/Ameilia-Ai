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
  | "Core Profile & Basics"
  | "Interests"
  | "Hobbies"
  | "Favorite Things"
  | "Favorite Games"
  | "Favorite Animals"
  | "Favorite Foods & Drinks"
  | "Dislikes & Pet Peeves"
  | "Personal Boundaries"
  | "Inside Jokes & Playful Banter"
  | "Important Conversations"
  | "Things She Told Me"
  | "Family & Friends"
  | "Work & School"
  | "Daily Habits"
  | "Promises Made"
  | "Future Plans & Goals"
  | "Topics She Enjoys"
  | "Special Memories"
  | "Relationship Milestones"
  | "Communication Preferences"
  // Legacy aliases for backward compatibility
  | "Dislikes"
  | "Important Dates"
  | "Favorite Foods"
  | "Inside Jokes";

export type MemoryStatus = "confirmed" | "preference" | "promise" | "goal" | "uncertain";
export type MemorySourceType = "her_statement" | "user_supplied";

export interface MemoryItem {
  id: number;
  category: MemoryCategory;
  title: string;
  content: string;
  emotional_significance?: string;
  approx_date?: string;
  status?: MemoryStatus;
  source_type?: MemorySourceType;
  related_keys?: string;
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

export type SituationContext =
  | "romantic"
  | "morning_night"
  | "playful_funny"
  | "serious"
  | "apology"
  | "comforting_supportive"
  | "flirting"
  | "starters"
  | "advice"
  | "difficult_emotional"
  | "general";

export interface SuggestedReply {
  id?: string;
  message: string;
  tone: string;
  explanation: string;
  situation?: SituationContext;
  styleTags?: string[];
  lengthCategory?: "short" | "medium" | "long";
  rating?: "like" | "dislike" | null;
}

export interface ResponseFeedback {
  id: number;
  conversation_id?: string;
  suggestion_text: string;
  rating: "like" | "dislike";
  situation_context: SituationContext;
  tone?: string;
  style_tags?: string[];
  length_category?: "short" | "medium" | "long";
  reasoning?: string;
  created_at: string;
  updated_at: string;
}

export interface SituationPreference {
  situation: SituationContext;
  totalFeedback: number;
  likes: number;
  dislikes: number;
  preferredTones: { tone: string; score: number }[];
  avoidedTones: { tone: string; score: number }[];
  preferredLength: "short" | "medium" | "long";
  likedCharacteristics: string[];
  dislikedCharacteristics: string[];
  recentLikedExamples: string[];
  recentDislikedExamples: string[];
}

export interface LearnedPreferencesState {
  stage: 1 | 2 | 3 | 4; // 1 = Beginning, 2 = Recognizing patterns, 3 = Personalized recommendations, 4 = Best match
  stageLabel: string;
  totalLikes: number;
  totalDislikes: number;
  globalLikedStyles: string[];
  globalDislikedStyles: string[];
  preferredTones: string[];
  avoidedTones: string[];
  preferredLength: "short" | "medium" | "long";
  situations: Record<string, SituationPreference>;
  recentFeedbacks: ResponseFeedback[];
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
