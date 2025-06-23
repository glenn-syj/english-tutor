import { Injectable } from '@nestjs/common';
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from '@langchain/google-genai';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';

import { Agent } from './agent.abstract';
import { Correction, CorrectionNoErrors } from '../../../types/src';

const PROMPT_TEMPLATE = `You are a meticulous English grammar and style checker. Your task is to analyze the user's sentence for any grammatical errors, awkward phrasing, or opportunities for improvement.
- If the sentence is perfect, return a JSON object like this: {{"has_errors": false, "feedback": "Great job, that sentence is perfect!"}}.
- If there are errors, return a JSON object with this exact structure: {{"has_errors": true, "original": "...", "corrected": "...", "explanation": "..."}}.
Do not add any text before or after the JSON object.

User's sentence:
{user_sentence}`;

const schemaWithErrors = z.object({
  has_errors: z.literal(true),
  original: z.string().describe("The user's original sentence."),
  corrected: z.string().describe('The corrected version of the sentence.'),
  explanation: z.string().describe('A brief explanation of the correction.'),
});

const schemaNoErrors = z.object({
  has_errors: z.literal(false),
  feedback: z
    .string()
    .describe('A brief feedback message for the perfect sentence.'),
});

const parser = StructuredOutputParser.fromZodSchema(
  z.union([schemaWithErrors, schemaNoErrors]),
);

@Injectable()
export class CorrectionAgent extends Agent<string, Correction> {
  private readonly llm: ChatGoogleGenerativeAI;
  private readonly prompt: PromptTemplate;

  constructor() {
    super();
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      temperature: 0,
    });
    this.prompt = ChatPromptTemplate.fromTemplate(PROMPT_TEMPLATE);
  }

  async execute(user_sentence: string): Promise<Correction> {
    const chain = this.prompt.pipe(this.llm).pipe(parser);
    const result = await chain.invoke({
      user_sentence,
    });
    return result;
  }
}
