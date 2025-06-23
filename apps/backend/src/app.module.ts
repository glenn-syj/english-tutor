import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProfileModule } from './profile/profile.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [ProfileModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
