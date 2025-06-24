import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import {
  OutputFixingParser,
  StructuredOutputParser,
} from 'langchain/output_parsers';
import { AbstractAgent } from './agent.abstract';
import { NewsAnalysis, NewsArticle } from '../../../types/src';
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from '@langchain/google-genai';

// This schema defines the structure of the analysis result.
// It must match the NewsAnalysis type.
const analysisSchema = z.object({
  summary: z.string().describe('A summary of the article.'),
  vocabulary: z
    .array(
      z.object({
        word: z.string().describe('A key vocabulary word from the article.'),
        definition: z.string().describe('The definition of the word.'),
        example: z
          .string()
          .optional()
          .describe('An example sentence using the word.'),
      }),
    )
    .describe('A list of key vocabulary words with their definitions.'),
  questions: z
    .array(z.string())
    .describe(
      'A list of open-ended discussion questions based on the article.',
    ),
});

@Injectable()
export class AnalysisAgent extends AbstractAgent {
  protected embeddings: GoogleGenerativeAIEmbeddings;
  private parser = StructuredOutputParser.fromZodSchema(analysisSchema);
  private outputFixingParser: OutputFixingParser<any>;

  constructor(configService: ConfigService) {
    super(
      configService,
      'News Analyst',
      'Analyzes news articles to provide summaries, vocabulary, and questions.',
    );
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
      model: 'gemini-2.0-flash',
      temperature: 0.7,
    });
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
      model: 'embedding-001',
    });
    this.outputFixingParser = OutputFixingParser.fromLLM(this.llm, this.parser);
  }

  async analyze(article: NewsArticle): Promise<NewsAnalysis> {
    const analysisPrompt = PromptTemplate.fromTemplate(
      `Please analyze the following news article for an English learner.
      Article text: """{fullText}"""
      Based on the article, provide:
      1. A concise summary of the article.
      2. A list of 5-10 key vocabulary words with their definitions.
      3. A list of 3-5 open-ended discussion questions related to the article's topic.
      Format the output as a JSON object with keys "summary", "vocabulary", and "questions".`,
    );

    const analysisChain = analysisPrompt.pipe(this.llm).pipe(this.parser);

    try {
      const result = await analysisChain.invoke({
        fullText: article.fullText,
      });
      return result as NewsAnalysis;
    } catch (error) {
      if (
        error.llmOutput &&
        typeof error.llmOutput === 'string' &&
        error.llmOutput.includes('```json')
      ) {
        console.log('Attempting to fix JSON markdown...');
        const jsonMatch = error.llmOutput.match(/```json\n([\s\S]*)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            return JSON.parse(jsonMatch[1]);
          } catch (parseError) {
            console.error('Failed to parse extracted JSON.', parseError);
            throw error; // Throw original error if parsing still fails
          }
        }
      }
      throw error;
    }
  }

  async run(article: NewsArticle): Promise<NewsAnalysis> {
    console.log('--- AnalysisAgent Start ---');
    console.log(`[AnalysisAgent] Received article: "${article.title}"`);

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are an expert news analyst. Analyze the following article and provide a summary, key vocabulary, and discussion questions suitable for an intermediate English learner.
Your output MUST be a JSON object with "summary", "vocabulary" (an array of objects with "word" and "definition"), and "questions" (an array of strings).
{format_instructions}`,
      ],
      ['human', 'Article:\n{article}'],
    ]);

    const chain = prompt.pipe(this.llm).pipe(this.outputFixingParser);

    try {
      const result = await chain.invoke({
        article: JSON.stringify(article),
        format_instructions: this.parser.getFormatInstructions(),
      });
      console.log(
        `[AnalysisAgent] Successfully analyzed article. Summary: ${result.summary.substring(0, 50)}...`,
      );
      console.log('--- AnalysisAgent End ---');
      return result;
    } catch (e) {
      console.error(
        'AnalysisAgent failed even with OutputFixingParser. Returning fallback.',
        e,
      );
      const fallbackResult: NewsAnalysis = {
        summary:
          "I'm sorry, I had trouble analyzing the article. Let's try talking about something else.",
        vocabulary: [],
        questions: ['Could you please suggest another topic?'],
      };
      console.log('[AnalysisAgent] Returning fallback analysis.');
      console.log('--- AnalysisAgent End ---');
      return fallbackResult;
    }
  }
}
