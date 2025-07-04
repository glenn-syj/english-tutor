import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractLlmAgent } from './agent.llm.abstract';
import { Correction } from '../../../types/src';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
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

type CorrectionAgentContext = {
  message: string;
  correctionFeedback?: string;
};
type CorrectionAgentCallOutput = {
  llmResponse: string;
  originalMessage: string;
};

@Injectable()
export class CorrectionAgent extends AbstractLlmAgent<
  CorrectionAgentContext,
  CorrectionAgentCallOutput,
  Correction
> {
  private parser = StructuredOutputParser.fromZodSchema(correctionSchema);

  constructor(configService: ConfigService) {
    super(
      configService,
      'Correction Agent',
      'Corrects grammar and suggests improvements for user messages.',
      {
        temperature: 0.1, // 문법 교정은 매우 결정적이어야 함
        topP: 0.1,
        topK: 10,
      },
    );
  }

  protected async prepareChain(context: CorrectionAgentContext): Promise<any> {
    const { message } = context;
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are an expert English language examiner, specializing in speaking tests like IELTS or OPIC. Your goal is to provide feedback that helps the user achieve a higher score.

${context.correctionFeedback ? `Consider the user's past correction feedback for personalized advice: ${context.correctionFeedback}\n` : ''}
Analyze the user's message based on key scoring criteria:
- **Grammatical Range and Accuracy**: Are there errors? Is there a variety of complex structures?
- **Lexical Resource (Vocabulary)**: Is the vocabulary precise and sophisticated? Are idiomatic expressions used correctly?
- **Coherence**: Do the ideas link together logically? Are cohesive devices (e.g., 'however', 'therefore', 'in addition') used effectively?
- **Clarity**: Is the message easy to understand? Could it be more direct or better structured?

User's message: "{message}"

Based on this, provide structured feedback.
- If the sentence is already "proficient" (grammatically perfect, good vocabulary, well-structured), set "is_proficient" to true and provide encouraging feedback in the "explanation" field, highlighting what they did well.
- If there's any room for improvement, suggest a better version in "corrected".
- Classify your main suggestion using the "correction_type". Your feedback MUST be targeted and educational.
- Your "explanation" is the most important part. Explain *why* your suggestion improves the answer from a test-scorer's perspective. For example, "Using 'whereas' here demonstrates your ability to use complex sentences, which is a high-level skill."
- If applicable, provide a few "alternatives" to show other high-scoring ways to express the idea.

Your response MUST be a single, valid, and complete JSON object that strictly follows the format instructions below. Do not add any text or formatting like markdown code blocks before or after the JSON object.
{format_instructions}`,
      ],
      ['human', '{message}'],
    ]);

    return {
      prompt,
      context: {
        message: message,
        format_instructions: this.parser.getFormatInstructions(),
        ...(context.correctionFeedback && {
          correctionFeedback: context.correctionFeedback,
        }),
      },
      originalMessage: message,
    };
  }

  protected async callLLM(
    preparedData: any,
  ): Promise<CorrectionAgentCallOutput> {
    const chain = preparedData.prompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());
    const llmResponse = await chain.invoke(preparedData.context);
    return { llmResponse, originalMessage: preparedData.originalMessage };
  }

  protected async processResponse(
    result: CorrectionAgentCallOutput,
  ): Promise<Correction> {
    const { llmResponse, originalMessage } = result;
    this.logger.log(`Received raw response from LLM.`);
    try {
      // Clean the output from markdown code blocks and parse
      const cleanedOutput = llmResponse.replace(/```json\n|```/g, '').trim();
      const parsed = await this.parser.parse(cleanedOutput);

      if (parsed.is_proficient || parsed.correction_type === 'Proficient') {
        this.logger.log('No errors found, message is proficient.');
        return {
          has_suggestion: false,
          feedback: parsed.explanation,
        };
      } else {
        this.logger.log(
          `Found improvement of type: ${parsed.correction_type}.`,
        );
        return {
          has_suggestion: true,
          original: parsed.original || originalMessage,
          corrected: parsed.corrected,
          explanation: parsed.explanation,
          correction_type: parsed.correction_type as
            | 'Grammar'
            | 'Vocabulary'
            | 'Clarity'
            | 'Cohesion',
          alternatives: parsed.alternatives,
        };
      }
    } catch (e) {
      this.logger.error(
        `[${this.name}] Parsing failed. Returning fallback.`,
        e.stack,
      );
      // NOTE: A more robust implementation could use an OutputFixingParser here
      // or re-invoke the call. For now, we return a failure state.
      return {
        has_suggestion: true,
        original: originalMessage,
        corrected: "Sorry, I couldn't process the response.",
        explanation:
          'There was an issue parsing the feedback from the AI. This is a system error.',
        correction_type: 'Clarity',
      };
    }
  }
}
