import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractAgent } from './agent.abstract';
import { Correction } from '../../../types/src';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';

// New, more detailed schema for comprehensive feedback
const correctionSchema = z.object({
  is_perfect: z
    .boolean()
    .describe(
      'Set to true ONLY if the sentence is grammatically perfect AND sounds completely natural. Otherwise, set to false.',
    ),
  correction_type: z
    .enum(['Grammar', 'Nuance', 'Style', 'Clarity', 'Perfect'])
    .describe(
      "The main category of the suggestion. If 'is_perfect' is true, this MUST be 'Perfect'. Otherwise, it must be one of the other four types.",
    ),
  original: z.string().describe('The original user message.'),
  corrected: z
    .string()
    .describe(
      'The improved version of the message. If the sentence is perfect, this should be the same as the original text.',
    ),
  explanation: z
    .string()
    .describe(
      'A detailed but easy-to-understand explanation of WHY the change improves the sentence. Focus on nuance or style if the grammar was correct.',
    ),
  alternatives: z
    .array(z.string())
    .optional()
    .describe(
      'A few other natural ways to phrase the same idea, if applicable.',
    ),
});

@Injectable()
export class CorrectionAgent extends AbstractAgent {
  private parser = StructuredOutputParser.fromZodSchema(correctionSchema);

  constructor(configService: ConfigService) {
    super(
      configService,
      'Correction Agent',
      "Analyzes the user's last message for grammatical errors, nuance, and style.",
    );
  }

  async run(userMessage: string): Promise<Correction> {
    console.log('--- CorrectionAgent Start ---');
    console.log(`[CorrectionAgent] Received message: "${userMessage}"`);

    const prompt = PromptTemplate.fromTemplate(
      `You are an expert English language coach. Your primary goal is to help the user sound more like a natural, fluent native speaker.

Analyze the user's message not just for grammatical errors, but for these deeper aspects:
- **Nuance & Precision**: Is the word choice the best one? Does it convey the intended emotion and meaning accurately?
- **Clarity & Flow**: Is the sentence structure clear and easy to follow? Could it be more concise or elegant?
- **Style & Naturalness**: Does it sound like something a native speaker would actually say in a casual conversation? Is it idiomatic?

User's message: "{user_message}"

Based on your comprehensive analysis, provide structured feedback.
- If the sentence is already perfect (grammatically correct AND sounds natural), set "is_perfect" to true and write an encouraging, specific feedback in the "explanation" field.
- If there's any room for improvement (even if it's a minor stylistic choice), suggest a better version in "corrected".
- Classify your main suggestion using the "correction_type".
- Your "explanation" is the most important part. Explain *why* your suggestion is better. If the original was grammatically correct, focus on explaining the subtle differences in nuance, style, or clarity.
- If applicable, provide a few "alternatives" to show other natural ways to express the same idea.

Your output MUST be a JSON object that strictly follows this format:
{format_instructions}`,
    );

    const chain = prompt.pipe(this.llm).pipe(this.parser);
    const result = await chain.invoke({
      user_message: userMessage,
      format_instructions: this.parser.getFormatInstructions(),
    });

    if (result.is_perfect || result.correction_type === 'Perfect') {
      console.log('[CorrectionAgent] No errors found.');
      console.log('--- CorrectionAgent End ---');
      return {
        has_suggestion: false,
        feedback: result.explanation,
      };
    } else {
      console.log(
        `[CorrectionAgent] Found improvement of type: ${result.correction_type}.`,
      );
      console.log('--- CorrectionAgent End ---');

      return {
        has_suggestion: true,
        original: result.original,
        corrected: result.corrected,
        explanation: result.explanation,
        correction_type: result.correction_type as
          | 'Grammar'
          | 'Nuance'
          | 'Style'
          | 'Clarity',
        alternatives: result.alternatives,
      };
    }
  }
}
