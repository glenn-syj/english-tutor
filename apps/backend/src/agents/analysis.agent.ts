import { Injectable } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { Agent } from './agent.abstract';
import { NewsAnalysis, NewsArticle } from '../../../types/src';

const PROMPT_TEMPLATE = `You are an expert news analyst. Your task is to analyze the provided news article and extract key information for an English conversation session. Your output MUST be a single, valid JSON object with the following structure: {{"summary": "...", "vocabulary": [{{"word": "...", "definition": "..."}}, ...], "questions": ["...", "...", "..."]}}. Do not add any text before or after the JSON object.

Article to analyze:
{article_text}`;

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    summary: z.string().describe('A concise summary of the news article.'),
    vocabulary: z
      .array(
        z.object({
          word: z.string().describe('A key vocabulary word from the article.'),
          definition: z
            .string()
            .describe('A simple, clear definition of the word.'),
        }),
      )
      .min(5)
      .max(5)
      .describe('A list of 5 key vocabulary words.'),
    questions: z
      .array(z.string())
      .min(3)
      .max(3)
      .describe('A list of 3 discussion questions based on the article.'),
  }),
);

@Injectable()
export class AnalysisAgent extends Agent<NewsArticle, NewsAnalysis> {
  private readonly llm: ChatGoogleGenerativeAI;
  private readonly prompt: PromptTemplate;

  constructor() {
    super();
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      temperature: 0.5,
    });
    this.prompt = ChatPromptTemplate.fromTemplate(PROMPT_TEMPLATE);
  }

  async execute(article: NewsArticle): Promise<NewsAnalysis> {
    const chain = this.prompt.pipe(this.llm).pipe(parser);
    return await chain.invoke({
      article_text: article.fullText,
    });
  }
}
