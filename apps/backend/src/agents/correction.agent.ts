import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractAgent } from './agent.abstract';
import { ChatMessage } from '../../../types/src';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const correctionSchema = z.object({
  hasError: z
    .boolean()
    .describe('Whether the user`s last message has any grammatical errors.'),
  correctedText: z
    .string()
    .nullable()
    .describe(
      'The corrected version of the user`s message. Null if no errors.',
    ),
  explanation: z
    .string()
    .nullable()
    .describe('A brief explanation of the correction. Null if no errors.'),
});

@Injectable()
export class CorrectionAgent extends AbstractAgent {
  constructor(configService: ConfigService) {
    super(
      configService,
      'English Correction Agent',
      'You are an expert in English grammar and syntax. Your role is to identify and correct any grammatical errors in the user`s most recent message.',
    );
  }

  async run(history: ChatMessage[]): Promise<any> {
    const lastUserMessage = history
      .filter((msg) => msg.sender === 'user')
      .pop();
    if (!lastUserMessage) {
      return { hasError: false, correctedText: null, explanation: null };
    }

    const parser = StructuredOutputParser.fromZodSchema(correctionSchema);

    const prompt = ChatPromptTemplate.fromTemplate(
      `Please analyze the last user message for grammatical errors. Your output must be a single, valid JSON object with the following structure: {format_instructions}\n\n[User Message]\n{user_message}`,
    );

    const chain = prompt.pipe(this.llm).pipe(parser);
    const result = await chain.invoke({
      format_instructions: parser.getFormatInstructions(),
      user_message: lastUserMessage.text,
    });

    return result;
  }
}
