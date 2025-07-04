import { Injectable, Logger } from '@nestjs/common';
import {
  AnalysisAgent,
  ConversationAgent,
  CorrectionAgent,
  NewsAgent,
} from '../agents';
import { ProfileService } from '../profile/profile.service';
import {
  ChatMessage,
  NewsAnalysis,
  Correction,
  UserProfile,
  RelevantContext,
} from '../../../types/src';
import { Readable } from 'stream';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { VectorStoreService } from '../storage/vector-store.service';

const ARTICLE_SYSTEM_MESSAGE_PREFIX = 'SYSTEM_ARTICLE:';

const convertToLangChainMessages = (messages: ChatMessage[]): BaseMessage[] => {
  return messages
    .filter((message) => message.sender !== 'system') // Filter out internal system messages
    .map((message) => {
      if (message.sender === 'user') {
        return new HumanMessage(message.text);
      } else {
        // Assumes 'assistant'
        return new AIMessage(message.text);
      }
    });
};

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly newsAgent: NewsAgent,
    private readonly analysisAgent: AnalysisAgent,
    private readonly correctionAgent: CorrectionAgent,
    private readonly conversationAgent: ConversationAgent,
    private readonly profileService: ProfileService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async process(history: ChatMessage[], message: string): Promise<Readable> {
    const stream = await this.streamProcessor(history, message);
    return Readable.from(stream);
  }

  private async *streamProcessor(
    history: ChatMessage[],
    message: string,
  ): AsyncGenerator<string, void, unknown> {
    this.logger.log('--- Orchestrator Start ---');
    this.logger.log(`Received message: "${message}"`);
    this.logger.log(`Received history length: ${history.length}`);

    // 1. Start independent tasks in parallel
    const userProfilePromise = this.profileService.getProfile();

    // To call _handleArticle, we need the user profile first.
    // So, we await it here.
    const userProfile = await userProfilePromise;

    // 2. Handle article context using the user profile
    const { newsAnalysis, newArticleSystemMessage } = await this._handleArticle(
      history,
      message,
      userProfile,
    );

    // 2.1. Retrieve relevant context using vector store
    const relevantContext = await this.vectorStoreService.searchRelevantContext(
      message,
      userProfile.id, // Assuming userProfile has an ID
    );

    const newChatMessage: ChatMessage = {
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    };
    const fullHistory: ChatMessage[] = newArticleSystemMessage
      ? [...history, newArticleSystemMessage, newChatMessage]
      : [...history, newChatMessage];

    // 3. Generate and yield from the response stream
    yield* this._generateResponseStream({
      newArticleSystemMessage,
      message,
      fullHistory,
      userProfile,
      newsAnalysis,
      relevantContext,
    });

    this.logger.log('--- Orchestrator End ---');
  }

  private async *_generateResponseStream({
    newArticleSystemMessage,
    message,
    fullHistory,
    userProfile,
    newsAnalysis,
    relevantContext,
  }: {
    newArticleSystemMessage: ChatMessage | null;
    message: string;
    fullHistory: ChatMessage[];
    userProfile: UserProfile;
    newsAnalysis: NewsAnalysis | null;
    relevantContext: RelevantContext;
  }): AsyncGenerator<string, void, unknown> {
    // Yield system article if it's new
    if (newArticleSystemMessage) {
      const systemMessagePayload = {
        type: 'system-article',
        payload: newArticleSystemMessage,
      };
      yield JSON.stringify(systemMessagePayload) + '\n';
      this.logger.log('Yielding new article system message to stream.');
    }

    // Run correction and conversation
    const [correction, conversationStream] =
      await this.runCorrectionAndConversation(
        message,
        fullHistory,
        userProfile,
        newsAnalysis,
        relevantContext,
      );

    // Yield correction
    if (correction) {
      const correctionPayload = { type: 'correction', payload: correction };
      yield JSON.stringify(correctionPayload) + '\n';
      this.logger.log('Yielding correction message to stream.');
    }

    // Yield conversation chunks
    for await (const chunk of conversationStream) {
      const chunkPayload = { type: 'chunk', payload: chunk };
      yield JSON.stringify(chunkPayload) + '\n';
    }

    // Yield end of stream
    yield JSON.stringify({ type: 'end' }) + '\n';
  }

  private async _handleArticle(
    history: ChatMessage[],
    message: string,
    userProfile: UserProfile,
  ): Promise<{
    newsAnalysis: NewsAnalysis | null;
    newArticleSystemMessage: ChatMessage | null;
  }> {
    const articleSystemMessage = history.find((msg) =>
      msg.text.startsWith(ARTICLE_SYSTEM_MESSAGE_PREFIX),
    );

    if (articleSystemMessage) {
      this.logger.log('Existing article found in history.');
      const articleJson = articleSystemMessage.text.substring(
        ARTICLE_SYSTEM_MESSAGE_PREFIX.length,
      );
      const newsAnalysis: NewsAnalysis = JSON.parse(articleJson);
      return { newsAnalysis, newArticleSystemMessage: null };
    }

    try {
      this.logger.log(
        'No article in history. Fetching new one based on the user message.',
      );
      const newsArticle = await this.newsAgent.run(message);
      const newsAnalysis = await this.analysisAgent.run({
        article: newsArticle,
        userProfile: userProfile,
      });

      const newArticleSystemMessage: ChatMessage = {
        sender: 'system',
        text: `${ARTICLE_SYSTEM_MESSAGE_PREFIX}${JSON.stringify(newsAnalysis)}`,
        timestamp: new Date().toISOString(),
      };
      return { newsAnalysis, newArticleSystemMessage };
    } catch (error) {
      this.logger.error(
        'Failed to fetch or analyze news article.',
        error.stack,
      );
      return { newsAnalysis: null, newArticleSystemMessage: null };
    }
  }

  private async runCorrectionAndConversation(
    message: string,
    history: ChatMessage[],
    userProfile: UserProfile,
    newsAnalysis: NewsAnalysis | null,
    relevantContext: RelevantContext,
  ): Promise<[Correction | null, AsyncIterable<string>]> {
    // 1. Run correction first and wait for the result.
    const correction = await this.correctionAgent.run({
      message,
      correctionFeedback: relevantContext.correctionFeedback
        .map((fb) => `Original: ${fb.document}`)
        .join('\n'),
    });

    // 2. Decide which message to use for the conversation context.
    // Use the corrected message if available, otherwise use the original.
    const messageForConversation =
      correction.has_suggestion && correction.corrected
        ? correction.corrected
        : message;

    // 3. Run conversation agent with the chosen message.
    const langChainHistory = convertToLangChainMessages(history);

    const context = {
      user_name: userProfile.name,
      user_profile: JSON.stringify(userProfile),
      user_interests: userProfile.interests.join(', '),
      news_analysis: newsAnalysis
        ? JSON.stringify(newsAnalysis)
        : 'No news article is being discussed in this conversation.',
      chat_history: langChainHistory,
      user_message: messageForConversation,
      relevant_context: JSON.stringify(relevantContext), // Add relevant context
    };

    const response = await this.conversationAgent.run(context);

    // Convert the response into an async iterable of chunks
    const conversationStream = (async function* () {
      yield response;
    })();

    return [correction.has_suggestion ? correction : null, conversationStream];
  }
}
