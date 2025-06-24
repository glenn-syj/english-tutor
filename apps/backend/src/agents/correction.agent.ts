import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractAgent } from './agent.abstract';
import { ChatMessage, Correction } from '../../../types/src';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';

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

const convertToLangChainMessages = (messages: ChatMessage[]): BaseMessage[] => {
  return messages
    .filter((message) => message.sender !== 'system') // Filter out internal system messages
    .map((message) => {
      if (message.sender === 'user') {
        return new HumanMessage(message.text);
      } else {
        // Assumes 'assistant'
        return new AIMessage(message.text);
      }
    });
};

@Injectable()
export class CorrectionAgent extends AbstractAgent {
  private parser = StructuredOutputParser.fromZodSchema(correctionSchema);

  constructor(configService: ConfigService) {
    super(
      configService,
      'Correction Agent',
      "Analyzes the user's last message for grammatical errors and provides corrections.",
    );
  }

  async run(userMessage: string): Promise<Correction> {
    console.log('--- CorrectionAgent Start ---');
    console.log(`[CorrectionAgent] Received message: "${userMessage}"`);

    const prompt = PromptTemplate.fromTemplate(
      `You are an English teacher. Analyze the user's message for errors.
User's message: "{user_message}"
Based on your analysis, provide a corrected version and an explanation.
If there are no errors, provide positive feedback in the explanation field.
Your output must be a JSON object that strictly follows this format:
{format_instructions}`,
    );

    const chain = prompt.pipe(this.llm).pipe(this.parser);
    const result = (await chain.invoke({
      user_message: userMessage,
      format_instructions: this.parser.getFormatInstructions(),
    })) as z.infer<typeof correctionSchema>;

    if (result.has_errors) {
      console.log('[CorrectionAgent] Found errors and returning correction.');
      console.log('--- CorrectionAgent End ---');
      return {
        has_errors: true,
        original: result.original,
        corrected: result.corrected,
        explanation: result.explanation,
      };
    } else {
      console.log('[CorrectionAgent] No errors found.');
      console.log('--- CorrectionAgent End ---');
      return {
        has_errors: false,
        feedback: result.explanation,
      };
    }
  }
}
