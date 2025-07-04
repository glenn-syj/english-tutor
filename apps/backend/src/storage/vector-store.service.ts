import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { connect, Table } from '@lancedb/lancedb';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import * as arrow from 'apache-arrow';
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
  private db: any; // LanceDB database connection
  private embeddings: GoogleGenerativeAIEmbeddings;
  private collections: {
    conversations?: Table;
    learning_materials?: Table;
    news_articles?: Table;
    correction_feedback?: Table;
  } = {};

  constructor(private readonly configService: ConfigService) {
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
      model: 'embedding-001', // 또는 적절한 임베딩 모델
    });
  }

  async onModuleInit() {
    const dbPath =
      this.configService.get<string>('LANCEDB_PATH') || './lancedb_data';
    this.db = await connect(dbPath);
    this.logger.log(`LanceDB initialized with path: ${dbPath}`);

    try {
      // Define schemas for each collection
      const conversationSchema = new arrow.Schema([
        new arrow.Field(
          'vector',
          new arrow.FixedSizeList(
            768,
            new arrow.Field('item', new arrow.Float32(), true),
          ),
          true,
        ),
        new arrow.Field('text', new arrow.Utf8(), true),
        new arrow.Field('userId', new arrow.Utf8(), true),
        new arrow.Field('timestamp', new arrow.Float64(), true),
        new arrow.Field('sender', new arrow.Utf8(), true),
      ]);

      const learningMaterialSchema = new arrow.Schema([
        new arrow.Field(
          'vector',
          new arrow.FixedSizeList(
            768,
            new arrow.Field('item', new arrow.Float32(), true),
          ),
          true,
        ),
        new arrow.Field('text', new arrow.Utf8(), true),
        new arrow.Field('id', new arrow.Utf8(), true),
        new arrow.Field('title', new arrow.Utf8(), true),
        new arrow.Field('source', new arrow.Utf8(), true),
        // Add other metadata fields for LearningMaterialMetadata if any
      ]);

      const newsArticleSchema = new arrow.Schema([
        new arrow.Field(
          'vector',
          new arrow.FixedSizeList(
            768,
            new arrow.Field('item', new arrow.Float32(), true),
          ),
          true,
        ),
        new arrow.Field('text', new arrow.Utf8(), true),
        new arrow.Field('id', new arrow.Utf8(), true),
        new arrow.Field('title', new arrow.Utf8(), true),
        new arrow.Field('url', new arrow.Utf8(), true),
        // Add other metadata fields for NewsArticleMetadata if any
      ]);

      const correctionFeedbackSchema = new arrow.Schema([
        new arrow.Field(
          'vector',
          new arrow.FixedSizeList(
            768,
            new arrow.Field('item', new arrow.Float32(), true),
          ),
          true,
        ),
        new arrow.Field('text', new arrow.Utf8(), true),
        new arrow.Field('id', new arrow.Utf8(), true),
        new arrow.Field('originalText', new arrow.Utf8(), true),
        new arrow.Field('correctedText', new arrow.Utf8(), true),
        // Add other metadata fields for CorrectionFeedbackMetadata if any
      ]);

      this.collections.conversations = await this.db.createTable(
        'conversations',
        [], // Empty initial data
        { schema: conversationSchema, existOk: true },
      );
      this.logger.log(`LanceDB 'conversations' collection ensured.`);

      this.collections.learning_materials = await this.db.createTable(
        'learning_materials',
        [],
        { schema: learningMaterialSchema, existOk: true },
      );
      this.logger.log(`LanceDB 'learning_materials' collection ensured.`);

      this.collections.news_articles = await this.db.createTable(
        'news_articles',
        [],
        { schema: newsArticleSchema, existOk: true },
      );
      this.logger.log(`LanceDB 'news_articles' collection ensured.`);

      this.collections.correction_feedback = await this.db.createTable(
        'correction_feedback',
        [],
        { schema: correctionFeedbackSchema, existOk: true },
      );
      this.logger.log(`LanceDB 'correction_feedback' collection ensured.`);
    } catch (error) {
      this.logger.error(
        'Failed to initialize LanceDB collections:',
        error.stack,
      );
    }
  }

  public getClient(): any {
    return this.db;
  }

  async addConversationHistory(
    userId: string,
    messages: ChatMessage[],
  ): Promise<void> {
    if (!this.collections.conversations) {
      throw new Error('Conversations collection not initialized.');
    }
    const data = await Promise.all(
      messages.map(async (m) => ({
        id: `${userId}-${m.timestamp}`,
        vector: await this.embeddings.embedQuery(m.text),
        text: m.text,
        userId: userId,
        timestamp: m.timestamp,
        sender: m.sender,
      })),
    );
    await this.collections.conversations.add(data);
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
    const vector = await this.embeddings.embedQuery(content);
    const data = [{ id, vector, text: content, ...metadata }];
    await this.collections.learning_materials.add(data);
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
    const vector = await this.embeddings.embedQuery(fullText);
    const data = [{ id, vector, text: fullText, ...metadata }];
    await this.collections.news_articles.add(data);
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
    const documentContent = `Original: ${originalText}\nCorrected: ${correctedText}`;
    const vector = await this.embeddings.embedQuery(documentContent);
    const data = [{ id, vector, text: documentContent, ...metadata }];
    await this.collections.correction_feedback.add(data);
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
    const queryVector = await this.embeddings.embedQuery(query);

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

    // 대화 이력 검색 (사용자 ID 필터링)
    if (this.collections.conversations) {
      const conversationResults = await this.collections.conversations
        .search(queryVector)
        .where(`"userId" = "${userId}" `)
        .limit(3)
        .toArray();
      results.conversations = conversationResults.map((res: any) => ({
        document: res.text,
        metadata: {
          userId: res.userId,
          timestamp: res.timestamp,
          sender: res.sender,
        } as ConversationMetadata,
      }));
    }

    // 학습 자료 검색
    if (this.collections.learning_materials) {
      const materialResults = await this.collections.learning_materials
        .search(queryVector)
        .limit(2)
        .toArray();
      results.learningMaterials = materialResults.map((res: any) => ({
        document: res.text,
        metadata: { ...res } as LearningMaterialMetadata,
      }));
    }

    // 뉴스 기사 검색
    if (this.collections.news_articles) {
      const newsResults = await this.collections.news_articles
        .search(queryVector)
        .limit(1)
        .toArray();
      results.newsArticles = newsResults.map((res: any) => ({
        document: res.text,
        metadata: { ...res } as NewsArticleMetadata,
      }));
    }

    // 교정 피드백 검색 (사용자 ID 필터링)
    if (this.collections.correction_feedback) {
      const correctionResults = await this.collections.correction_feedback
        .search(queryVector)
        .where(`"userId" = "${userId}" `)
        .limit(2)
        .toArray();
      results.correctionFeedback = correctionResults.map((res: any) => ({
        document: res.text,
        metadata: { ...res } as CorrectionFeedbackMetadata,
      }));
    }

    return results;
  }
}
