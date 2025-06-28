import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export abstract class AbstractAgent {
  protected llm: ChatGoogleGenerativeAI;
  protected name: string;
  protected description: string;
  protected readonly logger = new Logger(AbstractAgent.name);

  constructor(
    protected readonly configService: ConfigService,
    name: string,
    description: string,
    llmSettings?: {
      temperature?: number;
      topK?: number;
      topP?: number;
      model?: string;
    },
  ) {
    this.name = name;
    this.description = description;
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
      model: 'gemini-2.0-flash',
      temperature: 0.2,
      topK: 32,
      topP: 0.25,
      ...llmSettings,
    });
  }

  abstract run(context: any): Promise<any>;

  async execute(context: any): Promise<any> {
    const startTime = Date.now();
    this.logger.log(`[${this.name}] Executing...`);

    try {
      const result = await this.run(context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.logger.log(`[${this.name}] Execution finished in ${duration}ms.`);
      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.logger.error(
        `[${this.name}] Execution failed after ${duration}ms. Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
