import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Collection, ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';
import {
  ConversationMetadata,
  LearningMaterialMetadata,
  NewsArticleMetadata,
  CorrectionFeedbackMetadata,
} from '../../../types/src/chroma.index';
import { ChatMessage } from '../../../types/src';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private chromaClient: ChromaClient;
  private collections: {
    conversations?: Collection;
    learning_materials?: Collection;
    news_articles?: Collection;
    correction_feedback?: Collection;
  } = {};

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
      this.collections.conversations =
        await this.chromaClient.getOrCreateCollection({
          name: 'conversations',
          metadata: { description: 'User conversation history' },
        });
      this.logger.log(`ChromaDB 'conversations' collection ensured.`);

      this.collections.learning_materials =
        await this.chromaClient.getOrCreateCollection({
          name: 'learning_materials',
          metadata: { description: 'English learning materials' },
        });
      this.logger.log(`ChromaDB 'learning_materials' collection ensured.`);

      this.collections.news_articles =
        await this.chromaClient.getOrCreateCollection({
          name: 'news_articles',
          metadata: { description: 'News articles for analysis' },
        });
      this.logger.log(`ChromaDB 'news_articles' collection ensured.`);

      this.collections.correction_feedback =
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

  async addConversationHistory(
    userId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    if (!this.collections.conversations) {
      throw new Error('Conversations collection not initialized.');
    }
    const documents = messages.map((m) => m.text);
    const metadatas: ConversationMetadata[] = messages.map((m) => ({
      userId: userId,
      timestamp: m.timestamp,
      sender: m.sender,
    }));
    const ids = messages.map((m) => `${userId}-${m.timestamp}`);

    await this.collections.conversations.add({ ids, documents, metadatas });
    this.logger.log(
      `Added ${messages.length} conversation messages for user ${userId}.`,
    );
  }

  async addLearningMaterial(
    id: string,
    content: string,
    metadata: LearningMaterialMetadata,
  ): Promise<void> {
    if (!this.collections.learning_materials) {
      throw new Error('Learning materials collection not initialized.');
    }
    await this.collections.learning_materials.add({
      ids: [id],
      documents: [content],
      metadatas: [metadata],
    });
    this.logger.log(`Added learning material with id: ${id}.`);
  }

  async addNewsArticle(
    id: string,
    fullText: string,
    metadata: NewsArticleMetadata,
  ): Promise<void> {
    if (!this.collections.news_articles) {
      throw new Error('News articles collection not initialized.');
    }
    await this.collections.news_articles.add({
      ids: [id],
      documents: [fullText],
      metadatas: [metadata],
    });
    this.logger.log(`Added news article with id: ${id}.`);
  }

  async addCorrectionFeedback(
    id: string,
    originalText: string,
    correctedText: string,
    metadata: CorrectionFeedbackMetadata,
  ): Promise<void> {
    if (!this.collections.correction_feedback) {
      throw new Error('Correction feedback collection not initialized.');
    }
    await this.collections.correction_feedback.add({
      ids: [id],
      documents: [`Original: ${originalText}\nCorrected: ${correctedText}`],
      metadatas: [metadata],
    });
    this.logger.log(`Added correction feedback with id: ${id}.`);
  }
}
