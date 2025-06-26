import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CorrectionAgent } from './correction.agent';
import { NewsAgent } from './news.agent';
import { AnalysisAgent } from './analysis.agent';
import { ConversationAgent } from './conversation.agent';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [ConfigModule.forRoot(), ProfileModule],
  providers: [CorrectionAgent, NewsAgent, AnalysisAgent, ConversationAgent],
  exports: [CorrectionAgent, NewsAgent, AnalysisAgent, ConversationAgent],
})
export class AgentsModule {}
