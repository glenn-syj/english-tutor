import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractAgent } from './agent.abstract';
import { Correction } from '../../../types/src';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { Runnable } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

// New, more detailed schema for comprehensive feedback
const correctionSchema = z.object({
  is_proficient: z
    .boolean()
    .describe(
      'Set to true ONLY if the sentence is grammatically flawless, uses precise vocabulary, and is well-structured for a speaking test like IELTS/OPIC. Otherwise, set to false.',
    ),
  correction_type: z
    .enum(['Grammar', 'Vocabulary', 'Clarity', 'Cohesion', 'Proficient'])
    .describe(
      "The main category of the suggestion. If 'is_proficient' is true, this MUST be 'Proficient'. Otherwise, it must be one of the other four types.",
    ),
  original: z.string().describe('The original user message.'),
  corrected: z
    .string()
    .describe(
      'The improved version of the message. If the sentence is already proficient, this should be the same as the original text.',
    ),
  explanation: z
    .string()
    .describe(
      'A detailed, educational explanation of WHY the change would lead to a higher score in a speaking test. Reference specific concepts like lexical resource, coherence, or grammatical range.',
    ),
  alternatives: z
    .array(z.string())
    .optional()
    .describe(
      'A few other ways to phrase the same idea, showcasing different structures or advanced vocabulary.',
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
      `You are an expert English language examiner, specializing in speaking tests like IELTS and OPIC. Your goal is to provide feedback that helps the user achieve a higher score.

Analyze the user's message based on key scoring criteria:
- **Grammatical Range and Accuracy**: Are there errors? Is there a variety of complex structures?
- **Lexical Resource (Vocabulary)**: Is the vocabulary precise and sophisticated? Are idiomatic expressions used correctly?
- **Coherence**: Do the ideas link together logically? Are cohesive devices (e.g., 'however', 'therefore', 'in addition') used effectively?
- **Clarity**: Is the message easy to understand? Could it be more direct or better structured?

User's message: "{user_message}"

Based on this, provide structured feedback.
- If the sentence is already "proficient" (grammatically perfect, good vocabulary, well-structured), set "is_proficient" to true and provide encouraging feedback in the "explanation" field, highlighting what they did well.
- If there's any room for improvement, suggest a better version in "corrected".
- Classify your main suggestion using the "correction_type". Your feedback MUST be targeted and educational.
- Your "explanation" is the most important part. Explain *why* your suggestion improves the answer from a test-scorer's perspective. For example, "Using 'whereas' here demonstrates your ability to use complex sentences, which is a high-level skill."
- If applicable, provide a few "alternatives" to show other high-scoring ways to express the idea.

Your response MUST be a single, valid, and complete JSON object that strictly follows the format instructions below. Do not add any text or formatting like markdown code blocks before or after the JSON object.
{format_instructions}`,
    );

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const llmOutput = await chain.invoke({
      user_message: userMessage,
      format_instructions: this.parser.getFormatInstructions(),
    });

    try {
      // Clean the output from markdown code blocks
      const cleanedOutput = llmOutput.replace(/```json\n|```/g, '').trim();
      const result = await this.parser.parse(cleanedOutput);
      return this.formatResult(result);
    } catch (e) {
      console.error('[CorrectionAgent] Initial parsing failed. Retrying...', e);
      // Re-invoke the chain with a retry mechanism built-in
      const retryChain = prompt.pipe(this.llm).pipe(this.parser).withRetry({
        stopAfterAttempt: 2,
      });

      const result = await retryChain.invoke({
        user_message: userMessage,
        format_instructions: this.parser.getFormatInstructions(),
      });
      return this.formatResult(result);
    }
  }

  private formatResult(result: z.infer<typeof correctionSchema>): Correction {
    if (result.is_proficient || result.correction_type === 'Proficient') {
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
          | 'Vocabulary'
          | 'Clarity'
          | 'Cohesion',
        alternatives: result.alternatives,
      };
    }
  }
}
