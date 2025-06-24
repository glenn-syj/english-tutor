import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { StorageModule } from '../storage/storage.module';
import { ProfileService } from './profile.service';

@Module({
  imports: [StorageModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
