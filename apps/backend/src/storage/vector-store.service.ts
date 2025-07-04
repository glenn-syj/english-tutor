import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Collection, ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
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
  private embeddings: GoogleGenerativeAIEmbeddings;
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

    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
      model: 'embedding-001', // 또는 적절한 임베딩 모델
    });
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

    await this.collections.conversations.add({
      ids,
      documents,
      metadatas,
      embeddings: await this.embeddings.embedDocuments(documents), // 임베딩 추가
    });
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
      embeddings: await this.embeddings.embedDocuments([content]), // 임베딩 추가
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
      embeddings: await this.embeddings.embedDocuments([fullText]), // 임베딩 추가
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
    const documentContent = `Original: ${originalText}\nCorrected: ${correctedText}`; // 문서 내용
    await this.collections.correction_feedback.add({
      ids: [id],
      documents: [documentContent],
      metadatas: [metadata],
      embeddings: await this.embeddings.embedDocuments([documentContent]), // 임베딩 추가
    });
    this.logger.log(`Added correction feedback with id: ${id}.`);
  }

  async searchRelevantContext(
    query: string,
    userId?: string,
  ): Promise<{
    conversations: { document: string; metadata: ConversationMetadata }[];
    learningMaterials: {
      document: string;
      metadata: LearningMaterialMetadata;
    }[];
    newsArticles: { document: string; metadata: NewsArticleMetadata }[];
    correctionFeedback: {
      document: string;
      metadata: CorrectionFeedbackMetadata;
    }[];
  }> {
    const queryEmbedding = await this.embeddings.embedQuery(query);

    const results: {
      conversations: { document: string; metadata: ConversationMetadata }[];
      learningMaterials: {
        document: string;
        metadata: LearningMaterialMetadata;
      }[];
      newsArticles: { document: string; metadata: NewsArticleMetadata }[];
      correctionFeedback: {
        document: string;
        metadata: CorrectionFeedbackMetadata;
      }[];
    } = {
      conversations: [],
      learningMaterials: [],
      newsArticles: [],
      correctionFeedback: [],
    };

    // 20.1. 관련 컨텍스트 검색 로직
    // 대화 이력 검색 (사용자 ID 필터링)
    if (this.collections.conversations && userId) {
      const conversationResults = await this.collections.conversations.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 3,
        where: { userId },
      });
      results.conversations = conversationResults.documents[0].map(
        (doc, index) => ({
          document: doc,
          metadata: conversationResults.metadatas[0][
            index
          ] as ConversationMetadata,
        }),
      );
    }

    // 학습 자료 검색
    if (this.collections.learning_materials) {
      const materialResults = await this.collections.learning_materials.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 2,
      });
      results.learningMaterials = materialResults.documents[0].map(
        (doc, index) => ({
          document: doc,
          metadata: materialResults.metadatas[0][
            index
          ] as LearningMaterialMetadata,
        }),
      );
    }

    // 뉴스 기사 검색
    if (this.collections.news_articles) {
      const newsResults = await this.collections.news_articles.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 1,
      });
      results.newsArticles = newsResults.documents[0].map((doc, index) => ({
        document: doc,
        metadata: newsResults.metadatas[0][index] as NewsArticleMetadata,
      }));
    }

    // 교정 피드백 검색 (사용자 ID 필터링)
    if (this.collections.correction_feedback && userId) {
      const correctionResults =
        await this.collections.correction_feedback.query({
          queryEmbeddings: [queryEmbedding],
          nResults: 2,
          where: { userId },
        });
      results.correctionFeedback = correctionResults.documents[0].map(
        (doc, index) => ({
          document: doc,
          metadata: correctionResults.metadatas[0][
            index
          ] as CorrectionFeedbackMetadata,
        }),
      );
    }

    return results;
  }
}
