export interface ConversationMetadata {
  userId: string;
  timestamp: string;
  sender: string; // 'user' or 'assistant'
}

export interface LearningMaterialMetadata {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  tags?: string[];
}

export interface NewsArticleMetadata {
  title: string;
  url: string;
  publishedDate: string;
  source?: string;
}

export interface CorrectionFeedbackMetadata {
  userId: string;
  timestamp: string;
  originalText: string;
  correctedText: string;
  correction_type?: string; // 예: grammar, spelling, vocabulary, style
  explanation?: string;
}
