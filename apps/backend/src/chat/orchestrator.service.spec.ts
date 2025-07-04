import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from './orchestrator.service';
import { NewsAgent } from '../agents/news.agent';
import { AnalysisAgent } from '../agents/analysis.agent';
import { CorrectionAgent } from '../agents/correction.agent';
import { ConversationAgent } from '../agents/conversation.agent';
import { ProfileService } from '../profile/profile.service';
import { Readable } from 'stream';
import { VectorStoreService } from '../storage/vector-store.service';
import { RelevantContext } from '../../../types/src';

// Mock data
const mockUserProfile = {
  name: 'Test User',
  interests: ['testing', 'nestjs'],
  learningLevel: 'advanced',
  recentCorrections: [],
  id: 'test-user-id',
};

const mockNewsArticle = {
  title: 'Test Article',
  source: 'Test Source',
  url: 'http://test.com',
  fullText: 'This is a test article.',
};

const mockNewsAnalysis = {
  summary: 'Test summary',
  vocabulary: [],
  questions: [],
};

const mockCorrection = {
  has_suggestion: true,
  original: 'test message',
  corrected: 'corrected test message',
  explanation: 'it was a test',
  correction_type: 'Grammar' as const,
};

// New mock for RelevantContext
const mockRelevantContext: RelevantContext = {
  conversations: [],
  learningMaterials: [],
  newsArticles: [],
  correctionFeedback: [
    {
      document: 'Original: I went to home. Corrected: I went home.',
      metadata: {
        id: '1',
        originalText: 'I went to home.',
        correctedText: 'I went home.',
      },
    },
  ],
};

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let newsAgent: NewsAgent;
  let analysisAgent: AnalysisAgent;
  let correctionAgent: CorrectionAgent;
  let conversationAgent: ConversationAgent;
  let profileService: ProfileService;
  let vectorStoreService: VectorStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        {
          provide: NewsAgent,
          useValue: { run: jest.fn().mockResolvedValue(mockNewsArticle) },
        },
        {
          provide: AnalysisAgent,
          useValue: { run: jest.fn().mockResolvedValue(mockNewsAnalysis) },
        },
        {
          provide: CorrectionAgent,
          useValue: { run: jest.fn().mockResolvedValue(mockCorrection) },
        },
        {
          provide: ConversationAgent,
          useValue: {
            run: jest.fn().mockResolvedValue('Hello from conversation agent'),
          },
        },
        {
          provide: ProfileService,
          useValue: {
            getProfile: jest.fn().mockResolvedValue(mockUserProfile),
          },
        },
        {
          provide: VectorStoreService,
          useValue: {
            searchRelevantContext: jest
              .fn()
              .mockResolvedValue(mockRelevantContext),
          },
        },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
    newsAgent = module.get<NewsAgent>(NewsAgent);
    analysisAgent = module.get<AnalysisAgent>(AnalysisAgent);
    correctionAgent = module.get<CorrectionAgent>(CorrectionAgent);
    conversationAgent = module.get<ConversationAgent>(ConversationAgent);
    profileService = module.get<ProfileService>(ProfileService);
    vectorStoreService = module.get<VectorStoreService>(VectorStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Helper function to read the entire stream into an array of objects
  const readStream = async (stream: Readable) => {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(JSON.parse(chunk.toString()));
    }
    return chunks;
  };

  describe('process - New Conversation', () => {
    it('should call all agents in order and return a full stream', async () => {
      const history = [];
      const message = 'Tell me about AI.';

      const stream = await service.process(history, message);
      const results = await readStream(stream);

      const expectedCorrectionFeedback = mockRelevantContext.correctionFeedback
        .map((fb) => `Original: ${fb.document}`)
        .join('\n');

      // 1. Verify agent calls
      expect(profileService.getProfile).toHaveBeenCalledTimes(1);
      expect(newsAgent.run).toHaveBeenCalledWith(message);
      expect(analysisAgent.run).toHaveBeenCalledWith({
        article: mockNewsArticle,
        userProfile: mockUserProfile,
      });
      expect(correctionAgent.run).toHaveBeenCalledWith(
        expect.objectContaining({
          message: message,
          correctionFeedback: expectedCorrectionFeedback,
        }),
      );
      expect(conversationAgent.run).toHaveBeenCalled();

      // 2. Verify stream content
      expect(results.find((r) => r.type === 'system-article')).toBeDefined();
      expect(results.find((r) => r.type === 'correction')).toBeDefined();
      expect(results.find((r) => r.type === 'chunk')).toBeDefined();
      expect(results.find((r) => r.type === 'end')).toBeDefined();

      expect(results[0].type).toBe('system-article');
      expect(results[1].type).toBe('correction');
      expect(results[2].type).toBe('chunk');
      expect(results[3].type).toBe('end');
    });
  });

  describe('process - Ongoing Conversation with Article', () => {
    it('should use existing article context and not call News/Analysis agents', async () => {
      const articleJson = JSON.stringify(mockNewsAnalysis);
      const articleSystemMessage = {
        sender: 'system' as const,
        text: `SYSTEM_ARTICLE:${articleJson}`,
        timestamp: new Date().toISOString(),
      };
      const history = [articleSystemMessage];
      const message = 'Interesting, tell me more.';

      const stream = await service.process(history, message);
      await readStream(stream); // Consume the stream to trigger all logic

      const expectedCorrectionFeedback = mockRelevantContext.correctionFeedback
        .map((fb) => `Original: ${fb.document}`)
        .join('\n');

      // Verify that News and Analysis agents were NOT called
      expect(newsAgent.run).not.toHaveBeenCalled();
      expect(analysisAgent.run).not.toHaveBeenCalled();

      // Verify other agents were still called
      expect(profileService.getProfile).toHaveBeenCalledTimes(1);
      expect(correctionAgent.run).toHaveBeenCalledWith(
        expect.objectContaining({
          message: message,
          correctionFeedback: expectedCorrectionFeedback,
        }),
      );
      expect(conversationAgent.run).toHaveBeenCalled();
    });
  });

  describe('process - API Failure Handling', () => {
    it('should continue the conversation even if news agent fails', async () => {
      // Simulate NewsAgent failure
      jest.spyOn(newsAgent, 'run').mockRejectedValue(new Error('API Error'));

      const history = [];
      const message = 'Tell me about space.';

      const stream = await service.process(history, message);
      const results = await readStream(stream);

      const expectedCorrectionFeedback = mockRelevantContext.correctionFeedback
        .map((fb) => `Original: ${fb.document}`)
        .join('\n');

      // Verify that News and Analysis agents were still called
      expect(newsAgent.run).toHaveBeenCalledWith(message);
      // Analysis agent should not be called if news agent fails
      expect(analysisAgent.run).not.toHaveBeenCalled();

      // Verify other agents were still called
      expect(profileService.getProfile).toHaveBeenCalledTimes(1);
      expect(correctionAgent.run).toHaveBeenCalledWith(
        expect.objectContaining({
          message: message,
          correctionFeedback: expectedCorrectionFeedback,
        }),
      );
      expect(conversationAgent.run).toHaveBeenCalled();

      // Verify stream does not contain system-article but still completes
      expect(results.find((r) => r.type === 'system-article')).toBeUndefined();
      expect(results.find((r) => r.type === 'correction')).toBeDefined();
      expect(results.find((r) => r.type === 'chunk')).toBeDefined();
      expect(results.find((r) => r.type === 'end')).toBeDefined();
    });
  });

  describe('process - Relevant Context Integration', () => {
    it('should call VectorStoreService and pass relevant context to agents', async () => {
      const history = [];
      const message = 'How can I improve my English grammar?';
      const userId = mockUserProfile.id;

      const stream = await service.process(history, message);
      await readStream(stream);

      // Verify VectorStoreService was called
      expect(vectorStoreService.searchRelevantContext).toHaveBeenCalledWith(
        message,
        userId,
      );

      // Verify CorrectionAgent received correction feedback from relevant context
      const expectedCorrectionFeedback = mockRelevantContext.correctionFeedback
        .map((fb) => `Original: ${fb.document}`)
        .join('\n');

      expect(correctionAgent.run).toHaveBeenCalledWith(
        expect.objectContaining({
          message: message,
          correctionFeedback: expectedCorrectionFeedback,
        }),
      );

      // Verify ConversationAgent received the relevant context
      expect(conversationAgent.run).toHaveBeenCalledWith(
        expect.objectContaining({
          relevant_context: JSON.stringify(mockRelevantContext),
        }),
      );
    });
  });
});
