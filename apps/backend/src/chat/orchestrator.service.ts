import { Injectable } from '@nestjs/common';
import {
  AnalysisAgent,
  ConversationAgent,
  CorrectionAgent,
  NewsAgent,
} from '../agents';
import { ProfileService } from '../profile/profile.service';
import { ChatMessage } from '../../../types/src';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Runnable } from '@langchain/core/runnables';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly newsAgent: NewsAgent,
    private readonly analysisAgent: AnalysisAgent,
    private readonly correctionAgent: CorrectionAgent,
    private readonly conversationAgent: ConversationAgent,
    private readonly profileService: ProfileService,
  ) {}

  async process(
    history: ChatMessage[],
    message: string,
  ): Promise<ReadableStream<string>> {
    const userProfile = await this.profileService.getProfile();

    // Add the new message to the history for the agents
    const fullHistory: ChatMessage[] = [
      ...history,
      { sender: 'user', text: message, timestamp: new Date().toISOString() },
    ];

    const correction = await this.correctionAgent.run(fullHistory);

    // For now, we fetch the same news every time.
    // A more advanced implementation might select news based on profile interests.
    const newsArticle = await this.newsAgent.run(userProfile.interests);
    const newsAnalysis = await this.analysisAgent.run(newsArticle);

    // The final agent receives all the context.
    const chain = (await this.conversationAgent.run(
      {
        userProfile,
        newsAnalysis,
        correction,
        chatHistory: fullHistory,
      },
      {
        stream: true,
      },
    )) as Runnable<any, any>;

    const stream = await chain.pipe(new StringOutputParser()).stream({
      chat_history: fullHistory,
      user_message: message,
    });

    return stream;
  }
}
