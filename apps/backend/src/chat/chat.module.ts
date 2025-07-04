import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { OrchestratorService } from './orchestrator.service';
import { AgentsModule } from '../agents/agents.module';
import { ProfileModule } from '../profile/profile.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AgentsModule, ProfileModule, StorageModule],
  controllers: [ChatController],
  providers: [OrchestratorService],
})
export class ChatModule {}
