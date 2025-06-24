import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractAgent } from './agent.abstract';
import { ChatMessage, Correction } from '../../../types/src';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';

const correctionSchema = z.object({
  has_errors: z
    .boolean()
    .describe('Set to true if there are errors, false otherwise.'),
  original: z.string().describe('The original user message.'),
  corrected: z
    .string()
    .describe(
      'The corrected version of the message. If no errors, this should be the same as the original text.',
    ),
  explanation: z
    .string()
    .describe(
      'A brief explanation of the corrections. If there are no errors, provide a short, encouraging feedback message here.',
    ),
});

@Injectable()
export class CorrectionAgent extends AbstractAgent {
  private parser;

  constructor(configService: ConfigService) {
    super(
      configService,
      'Correction Agent',
      "Corrects the user's English sentences and provides feedback.",
    );
    this.parser = StructuredOutputParser.fromZodSchema(correctionSchema);
  }

  async run(history: ChatMessage[]): Promise<Correction> {
    const lastUserMessage = history
      .filter((msg) => msg.sender === 'user')
      .pop();
    if (!lastUserMessage) {
      return {
        has_errors: false,
        feedback: 'No user message found to correct.',
      };
    }

    const prompt = PromptTemplate.fromTemplate(
      `You are an English teacher. Analyze the user's message for errors.
User's message: "{user_message}"
Based on your analysis, provide a corrected version and an explanation.
If there are no errors, provide positive feedback in the explanation field.
Your output must be a JSON object that strictly follows these instructions, do not add any text before or after the JSON object: {format_instructions}`,
    );

    const chain = prompt.pipe(this.llm).pipe(this.parser);
    const result = (await chain.invoke({
      user_message: lastUserMessage.text,
      format_instructions: this.parser.getFormatInstructions(),
    })) as z.infer<typeof correctionSchema>;

    if (result.has_errors) {
      return {
        has_errors: true,
        original: result.original,
        corrected: result.corrected,
        explanation: result.explanation,
      };
    } else {
      return {
        has_errors: false,
        feedback: result.explanation,
      };
    }
  }
}
