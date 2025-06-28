export interface ChatMessage {
  sender: "user" | "assistant" | "system";
  timestamp: string;
  text: string;
  correction?: Correction;
  isError?: boolean;
}

/**
 * Represents a detailed correction or feedback on a user's message.
 * The feedback can range from grammatical errors to stylistic suggestions.
 */
export interface CorrectionFeedback {
  /** Indicates if there's any suggestion for improvement. `false` if the user's sentence is perfect. */
  has_suggestion: true;
  /** The original message from the user. */
  original: string;
  /** The improved version of the message. */
  corrected: string;
  /** A detailed explanation of why the correction improves the sentence. */
  explanation: string;
  /** The primary category of the feedback. */
  correction_type: "Grammar" | "Vocabulary" | "Clarity" | "Cohesion";
  /** Optional list of other natural ways to phrase the same idea. */
  alternatives?: string[];
}

/**
 * Represents a confirmation that the user's message is perfect with no room for improvement.
 */
export interface NoCorrectionNeeded {
  /** Indicates that the user's sentence is perfect. */
  has_suggestion: false;
  /** An encouraging feedback message for the user. */
  feedback: string;
}

export type Correction = CorrectionFeedback | NoCorrectionNeeded;

export interface UserProfile {
  name: string;
  interests: string[];
  learningLevel: string;
  recentCorrections: CorrectionFeedback[];
}

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  fullText: string;
}

export interface NewsAnalysis {
  summary: string;
  vocabulary: {
    word: string;
    definition: string;
  }[];
  questions: string[];
}
