import { Injectable, Logger } from '@nestjs/common';
import {
  AnalysisAgent,
  ConversationAgent,
  CorrectionAgent,
  NewsAgent,
} from '../agents';
import { ProfileService } from '../profile/profile.service';
import { ChatMessage, NewsAnalysis } from '../../../types/src';
import { Readable } from 'stream';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Correction } from '../../../types/src';

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

    const userProfile = await this.profileService.getProfile();

    let newsAnalysis: NewsAnalysis;
    let newArticleSystemMessage: ChatMessage | null = null;

    const articleSystemMessage = history.find((msg) =>
      msg.text.startsWith(ARTICLE_SYSTEM_MESSAGE_PREFIX),
    );

    const fullHistory: ChatMessage[] = [...history];
    const newChatMessage: ChatMessage = {
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    };

    if (articleSystemMessage) {
      this.logger.log('Existing article found in history.');
      const articleJson = articleSystemMessage.text.substring(
        ARTICLE_SYSTEM_MESSAGE_PREFIX.length,
      );
      newsAnalysis = JSON.parse(articleJson);
      fullHistory.push(newChatMessage);
    } else {
      this.logger.log(
        'No article in history. Fetching new one based on the user message.',
      );
      const newsArticle = await this.newsAgent.run(message);
      newsAnalysis = await this.analysisAgent.run(newsArticle);

      newArticleSystemMessage = {
        sender: 'system',
        text: `${ARTICLE_SYSTEM_MESSAGE_PREFIX}${JSON.stringify(newsAnalysis)}`,
        timestamp: new Date().toISOString(),
      };
      fullHistory.push(newArticleSystemMessage, newChatMessage);
    }

    if (newArticleSystemMessage) {
      // Stream Type 1: System Article
      const systemMessagePayload = {
        type: 'system-article',
        payload: newArticleSystemMessage,
      };
      yield JSON.stringify(systemMessagePayload) + '\n';
      this.logger.log('Yielding new article system message to stream.');
    }

    const [correction, conversationStream] =
      await this.runCorrectionAndConversation(
        message,
        fullHistory,
        userProfile,
        newsAnalysis,
      );

    if (correction) {
      // Stream Type 2: Correction
      const correctionPayload = { type: 'correction', payload: correction };
      yield JSON.stringify(correctionPayload) + '\n';
      this.logger.log('Yielding correction message to stream.');
    }

    // Stream Type 3: AI response chunk
    for await (const chunk of conversationStream) {
      const chunkPayload = { type: 'chunk', payload: chunk };
      yield JSON.stringify(chunkPayload) + '\n';
    }

    // Stream Type 4: End of stream
    yield JSON.stringify({ type: 'end' }) + '\n';
    this.logger.log('--- Orchestrator End ---');
  }

  private async runCorrectionAndConversation(
    message: string,
    history: ChatMessage[],
    userProfile: any,
    newsAnalysis: any,
  ): Promise<[Correction | null, AsyncIterable<string>]> {
    // 1. Run correction first and wait for the result.
    const correction = await this.correctionAgent.run({ message });

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
      news_analysis: JSON.stringify(newsAnalysis),
      chat_history: langChainHistory,
      user_message: messageForConversation,
    };

    const response = await this.conversationAgent.execute(context);

    // Convert the response into an async iterable of chunks
    const conversationStream = (async function* () {
      yield response;
    })();

    return [correction.has_suggestion ? correction : null, conversationStream];
  }
}
