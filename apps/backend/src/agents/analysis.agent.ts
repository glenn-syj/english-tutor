import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { AbstractAgent } from './agent.abstract';
import { NewsAnalysis, NewsArticle } from '../../../types/src';
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from '@langchain/google-genai';

// This schema defines the structure of the analysis result.
// It must match the NewsAnalysis type.
const analysisSchema = z.object({
  summary: z.string().describe('A brief summary of the news article.'),
  vocabulary: z
    .array(
      z.object({
        word: z.string().describe('A key vocabulary word from the article.'),
        definition: z.string().describe('The definition of the word.'),
        example: z.string().describe('An example sentence using the word.'),
      }),
    )
    .describe('A list of 5-10 key vocabulary words.'),
  questions: z
    .array(z.string())
    .describe('A list of 3-5 open-ended questions to discuss the article.'),
});

@Injectable()
export class AnalysisAgent extends AbstractAgent {
  protected embeddings: GoogleGenerativeAIEmbeddings;
  private parser: StructuredOutputParser<typeof analysisSchema>;

  constructor(configService: ConfigService) {
    super(
      configService,
      'News Article Analyzer',
      'Analyzes a news article to extract summary, vocabulary, and discussion points for an English conversation practice.',
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
    this.parser = StructuredOutputParser.fromZodSchema(analysisSchema);
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

    const result = await analysisChain.invoke({
      fullText: article.fullText,
    });

    return result as NewsAnalysis;
  }

  async run(article: NewsArticle): Promise<NewsAnalysis> {
    return this.analyze(article);
  }
}
