import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { VectorStoreService } from './vector-store.service';

@Module({
  providers: [StorageService, VectorStoreService],
  exports: [StorageService, VectorStoreService],
})
export class StorageModule {}
