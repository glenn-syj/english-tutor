import { Injectable } from '@nestjs/common';
import {
  AnalysisAgent,
  ConversationAgent,
  CorrectionAgent,
  NewsAgent,
} from '../agents';
import { ProfileService } from '../profile/profile.service';
import { ChatMessage, NewsAnalysis } from '../../../types/src';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Runnable } from '@langchain/core/runnables';
import { Readable } from 'stream';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';

const ARTICLE_SYSTEM_MESSAGE_PREFIX = 'SYSTEM_ARTICLE:';
const ARTICLE_STREAM_PREFIX = 'SYSTEM_MESSAGE::';
const CORRECTION_STREAM_PREFIX = 'CORRECTION_MESSAGE::';

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
  constructor(
    private readonly newsAgent: NewsAgent,
    private readonly analysisAgent: AnalysisAgent,
    private readonly correctionAgent: CorrectionAgent,
    private readonly conversationAgent: ConversationAgent,
    private readonly profileService: ProfileService,
  ) {}

  process(history: ChatMessage[], message: string): Readable {
    const stream = this.streamProcessor(history, message);
    return Readable.from(stream);
  }

  private async *streamProcessor(
    history: ChatMessage[],
    message: string,
  ): AsyncGenerator<string, void, unknown> {
    console.log('--- Orchestrator Start ---');
    console.log(`[Orchestrator] Received message: "${message}"`);
    console.log(`[Orchestrator] Received history length: ${history.length}`);

    const userProfile = await this.profileService.getProfile();

    let newsAnalysis: NewsAnalysis;
    let newArticleSystemMessage: ChatMessage | null = null;

    const articleSystemMessage = history.find((msg) =>
      msg.text.startsWith(ARTICLE_SYSTEM_MESSAGE_PREFIX),
    );

    let fullHistory: ChatMessage[] = [...history];
    const newChatMessage: ChatMessage = {
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    };

    if (articleSystemMessage) {
      console.log('[Orchestrator] Existing article found in history.');
      const articleJson = articleSystemMessage.text.substring(
        ARTICLE_SYSTEM_MESSAGE_PREFIX.length,
      );
      newsAnalysis = JSON.parse(articleJson);
      fullHistory.push(newChatMessage);
    } else {
      console.log('[Orchestrator] No article in history. Fetching new one.');
      const newsArticle = await this.newsAgent.run(userProfile.interests);
      newsAnalysis = await this.analysisAgent.run(newsArticle);

      newArticleSystemMessage = {
        sender: 'system',
        text: `${ARTICLE_SYSTEM_MESSAGE_PREFIX}${JSON.stringify(newsAnalysis)}`,
        timestamp: new Date().toISOString(),
      };
      fullHistory.push(newArticleSystemMessage, newChatMessage);
    }

    if (newArticleSystemMessage) {
      const systemMessagePayload = `${ARTICLE_STREAM_PREFIX}${JSON.stringify(
        newArticleSystemMessage,
      )}\n`;
      console.log(
        '[Orchestrator] Prepending new article system message to stream.',
      );
      yield systemMessagePayload;
    }

    const correction = await this.correctionAgent.run(message);
    if (correction.has_errors) {
      const correctionPayload = `${CORRECTION_STREAM_PREFIX}${JSON.stringify(
        correction,
      )}\n`;
      console.log('[Orchestrator] Prepending correction message to stream.');
      yield correctionPayload;
    }

    const langChainHistory = convertToLangChainMessages(fullHistory);

    console.log('[Orchestrator] Invoking ConversationAgent...');
    const chain = (await this.conversationAgent.run(
      {
        userProfile,
        newsAnalysis,
        correction,
      },
      {
        stream: true,
      },
    )) as Runnable<any, any>;

    const stream = await chain.pipe(new StringOutputParser()).stream({
      chat_history: langChainHistory,
      user_message: message,
    });

    for await (const chunk of stream) {
      yield chunk;
    }
    console.log('--- Orchestrator End ---');
  }
}
