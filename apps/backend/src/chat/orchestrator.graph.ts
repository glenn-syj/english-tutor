import {
  ChatMessage,
  NewsAnalysis,
  Correction,
  UserProfile,
} from '../../../types/src';
import { Readable } from 'stream';

export interface OrchestratorGraphState {
  chatHistory: ChatMessage[]; // original history from process method
  currentMessage: string; // original message from process method
  userProfile?: UserProfile; // fetched by profileService
  newsAnalysis?: NewsAnalysis | null; // result from news and analysis agents
  systemArticleMessage?: ChatMessage | null; // new system message if article found/fetched
  correctionResult?: Correction | null; // result from correction agent
  conversationResponseStream?: Readable | null; // stream from conversation agent
}
