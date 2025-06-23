import { Injectable } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Agent } from './agent.abstract';
import { OrchestratorInput } from '../../../types/src';

const PROMPT_TEMPLATE = `You are Alex, a friendly, patient, and encouraging English conversation tutor. Your goal is to help the user practice English by discussing a news article. You will be given a JSON object containing all the information you need.

Your task is to craft a natural, conversational response in English based on ALL the provided data.
- Refer to the news analysis to ask insightful questions.
- If the 'feedback' section contains a correction, weave it into your response naturally. For example, instead of just stating the correction, say something like, "That's a great point. A more natural way to phrase that would be '...' and I think that's true because..."
- Use the 'user_profile' to make the conversation more personal. For instance, if the user struggles with a certain topic, you could offer more help.
- Keep your response concise and focused on keeping the conversation flowing.

Input Data:
{all_context_json}`;

@Injectable()
export class ConversationAgent extends Agent<
  OrchestratorInput,
  ReadableStream<string>
> {
  private readonly llm: ChatGoogleGenerativeAI;
  private readonly prompt: ChatPromptTemplate;

  constructor() {
    super();
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      streaming: true,
    });
    this.prompt = ChatPromptTemplate.fromTemplate(PROMPT_TEMPLATE);
  }

  async execute(input: OrchestratorInput): Promise<ReadableStream<string>> {
    const chain = this.prompt.pipe(this.llm);
    const stream = await chain.stream({
      all_context_json: JSON.stringify(input, null, 2),
    });

    const textEncoder = new TextEncoder();
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(textEncoder.encode(chunk.content as string));
      },
    });

    return stream.pipeThrough(transformStream);
  }
}
