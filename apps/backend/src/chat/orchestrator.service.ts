import { Injectable } from '@nestjs/common';
import {
  AnalysisAgent,
  ConversationAgent,
  CorrectionAgent,
  NewsAgent,
} from '../agents';
import { ProfileService } from '../profile/profile.service';
import { ChatMessage } from '../../../types/src';

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
    const correction = await this.correctionAgent.execute(message);

    // For now, we fetch the same news every time.
    // A more advanced implementation might select news based on profile interests.
    const newsArticle = await this.newsAgent.execute(userProfile.interests[0]);
    const newsAnalysis = await this.analysisAgent.execute(newsArticle);

    // The final agent receives all the context.
    const stream = await this.conversationAgent.execute({
      userProfile,
      newsAnalysis,
      correction,
      chatHistory: history,
    });

    return stream;
  }
}
