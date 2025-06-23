export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Correction {
  original: string;
  corrected: string;
  timestamp: string;
}

export interface UserProfile {
  userName: string;
  interests: string[];
  learningLevel: "Beginner" | "Intermediate" | "Advanced";
  recentCorrections: Correction[];
}
