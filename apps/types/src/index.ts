export interface ChatMessage {
  sender: "user" | "ai";
  timestamp: string;
  text: string;
  isError?: boolean;
}

export interface CorrectionWithErrors {
  has_errors: true;
  original: string;
  corrected: string;
  explanation: string;
}

export interface CorrectionNoErrors {
  has_errors: false;
  feedback: string;
}

export type Correction = CorrectionWithErrors | CorrectionNoErrors;

export interface UserProfile {
  userName: string;
  interests: string[];
  learningLevel: string;
  recentCorrections: CorrectionWithErrors[];
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

export interface OrchestratorInput {
  userProfile: UserProfile;
  newsAnalysis: NewsAnalysis;
  correction: Correction;
  chatHistory: ChatMessage[];
}
