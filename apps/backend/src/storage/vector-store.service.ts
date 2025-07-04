import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';
import {
  ConversationMetadata,
  LearningMaterialMetadata,
  NewsArticleMetadata,
  CorrectionFeedbackMetadata,
} from '../../../types/src/chroma.index';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private chromaClient: ChromaClient;

  constructor(private readonly configService: ConfigService) {
    // ChromaClient 초기화 (로컬 경로 또는 환경 변수 사용)
    const chromaPath =
      this.configService.get<string>('CHROMA_DB_PATH') || './chroma_data';
    this.chromaClient = new ChromaClient({
      path: chromaPath,
    });
    this.logger.log(`ChromaDB initialized with path: ${chromaPath}`);
  }

  async onModuleInit() {
    // 모듈 초기화 시 필요한 컬렉션 생성 등 추가 설정
    try {
      await this.chromaClient.getOrCreateCollection({
        name: 'conversations',
        metadata: { description: 'User conversation history' },
      });
      this.logger.log(`ChromaDB 'conversations' collection ensured.`);

      await this.chromaClient.getOrCreateCollection({
        name: 'learning_materials',
        metadata: { description: 'English learning materials' },
      });
      this.logger.log(`ChromaDB 'learning_materials' collection ensured.`);

      await this.chromaClient.getOrCreateCollection({
        name: 'news_articles',
        metadata: { description: 'News articles for analysis' },
      });
      this.logger.log(`ChromaDB 'news_articles' collection ensured.`);

      await this.chromaClient.getOrCreateCollection({
        name: 'correction_feedback',
        metadata: { description: 'User correction feedback and analysis' },
      });
      this.logger.log(`ChromaDB 'correction_feedback' collection ensured.`);
    } catch (error) {
      this.logger.error(
        'Failed to initialize ChromaDB collections:',
        error.stack,
      );
    }
  }

  public getClient(): ChromaClient {
    return this.chromaClient;
  }
}
