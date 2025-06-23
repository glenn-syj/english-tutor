import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { OrchestratorService } from './orchestrator.service';
import { AgentsModule } from '../agents/agents.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [AgentsModule, ProfileModule],
  controllers: [ChatController],
  providers: [OrchestratorService],
})
export class ChatModule {}
