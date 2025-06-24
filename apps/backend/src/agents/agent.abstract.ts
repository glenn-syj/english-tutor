import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ConfigService } from '@nestjs/config';

export abstract class AbstractAgent {
  protected llm: ChatGoogleGenerativeAI;
  protected name: string;
  protected description: string;

  constructor(
    protected readonly configService: ConfigService,
    name: string,
    description: string,
  ) {
    this.name = name;
    this.description = description;
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
      model: 'gemini-pro',
      temperature: 0.7,
    });
  }

  abstract run(context: any): Promise<any>;
}
