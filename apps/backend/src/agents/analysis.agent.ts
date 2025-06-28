import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import {
  OutputFixingParser,
  StructuredOutputParser,
} from 'langchain/output_parsers';
import { AbstractLlmAgent } from './agent.llm.abstract';
import { NewsAnalysis, NewsArticle, UserProfile } from '../../../types/src';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { StringOutputParser } from '@langchain/core/output_parsers';

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

type AnalysisAgentContext = {
  article: NewsArticle;
  userProfile: UserProfile;
};

@Injectable()
export class AnalysisAgent extends AbstractLlmAgent<
  AnalysisAgentContext,
  string,
  NewsAnalysis
> {
  protected embeddings: GoogleGenerativeAIEmbeddings;
  private parser = StructuredOutputParser.fromZodSchema(analysisSchema);
  private outputFixingParser: OutputFixingParser<any>;

  constructor(configService: ConfigService) {
    super(
      configService,
      'Analysis Agent',
      'Analyzes news articles and provides structured summaries.',
      {
        temperature: 0.1,
        topP: 0.2,
        topK: 20,
      },
    );
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
      model: 'embedding-001',
    });
    this.outputFixingParser = OutputFixingParser.fromLLM(this.llm, this.parser);
  }

  protected async prepareChain(context: AnalysisAgentContext): Promise<any> {
    const { article, userProfile } = context;

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are a professional language coach who helps users improve their English by analyzing news articles.
The user's English level is {learningLevel}.

Your task is to analyze the provided news article and generate a structured JSON output with the following three sections: "summary", "vocabulary", and "questions".

1.  **Summary**:
    *   Provide a concise and insightful summary of the article's main points and arguments.
    *   Crucially, connect the summary to potential topics for discussion in English proficiency tests like IELTS or OPIC. For example, if the article is about climate change, mention that this is a common topic in the 'Environment' category of these tests.

2.  **Vocabulary**:
    *   Identify and list 5-7 advanced vocabulary words or phrases (C1-C2 level) from the article that are valuable for an advanced learner.
    *   For each item, provide the word/phrase, its precise definition in the article's context, and a clear example sentence.

3.  **Questions**:
    *   Generate 3-5 thought-provoking, open-ended discussion questions related to the article.
    *   These questions should demand critical thinking, logical reasoning, and detailed explanations, pushing the user beyond simple comprehension. They should be similar in style to questions found in the later parts of the IELTS Speaking test or advanced OPIC prompts.

Your output MUST strictly adhere to the JSON format described below.
{format_instructions}`,
      ],
      ['human', '{article}'],
    ]);

    return {
      prompt,
      context: {
        article: JSON.stringify(article),
        learningLevel: userProfile.learningLevel,
        format_instructions: this.parser.getFormatInstructions(),
      },
    };
  }

  protected async callLLM(preparedData: any): Promise<string> {
    const chain = preparedData.prompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());
    return chain.invoke(preparedData.context);
  }

  protected async processResponse(llmResponse: string): Promise<NewsAnalysis> {
    this.logger.log(`Received raw response from LLM.`);
    try {
      const cleanedOutput = llmResponse.replace(/```json\n|```/g, '').trim();
      const parsed = (await this.parser.parse(cleanedOutput)) as NewsAnalysis;
      this.logger.log(
        `Successfully parsed. Summary: ${parsed.summary.substring(0, 50)}...`,
      );
      return parsed;
    } catch (e) {
      this.logger.error(
        `[${this.name}] Parsing failed on the first attempt. Retrying with OutputFixingParser...`,
        e.stack,
      );
      try {
        const fixed = await this.outputFixingParser.parse(llmResponse);
        this.logger.log(`Successfully parsed with OutputFixingParser.`);
        return fixed;
      } catch (finalError) {
        this.logger.error(
          `[${this.name}] OutputFixingParser also failed. Returning fallback analysis.`,
          finalError.stack,
        );
        return {
          summary:
            "I'm sorry, I had trouble analyzing the article. Let's try talking about something else.",
          vocabulary: [],
          questions: ['Could you please suggest another topic?'],
        };
      }
    }
  }
}
