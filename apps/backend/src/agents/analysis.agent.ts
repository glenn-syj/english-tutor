import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { AbstractAgent } from './agent.abstract';
import { NewsAnalysis, NewsArticle } from '../../../types/src';

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
  constructor(configService: ConfigService) {
    // Call the parent constructor to set up the agent's name, description, and the LLM.
    super(
      configService,
      'News Article Analyst',
      'Analyzes a news article to extract summary, vocabulary, and discussion points for an English conversation practice.',
    );
  }

  // The 'run' method performs the core logic of the agent.
  async run(article: NewsArticle): Promise<NewsAnalysis> {
    const parser = StructuredOutputParser.fromZodSchema(analysisSchema);

    const prompt = ChatPromptTemplate.fromTemplate(
      `You are an expert news analyst. Your task is to analyze the provided news article and extract key information for an English conversation session. Your output MUST be a single, valid JSON object that adheres to the following format instructions. Do not add any text before or after the JSON object.\n{format_instructions}\n\n[ARTICLE]\nTitle: {title}\nContent: {content}`,
    );

    // The chain combines the prompt, the LLM from the base class, and the parser.
    const chain = prompt.pipe(this.llm).pipe(parser);

    const result = await chain.invoke({
      format_instructions: parser.getFormatInstructions(),
      title: article.title,
      content: article.fullText, // Use fullText as defined in the NewsArticle type
    });

    return result as NewsAnalysis;
  }
}
