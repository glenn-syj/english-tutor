import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export abstract class AbstractLlmAgent {
  protected llm: ChatGoogleGenerativeAI;
  protected name: string;
  protected description: string;
  protected readonly logger = new Logger(AbstractLlmAgent.name);

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

  /**
   * Prepare the input data and chain for the LLM call
   * This method should handle any preprocessing of the input data
   */
  protected abstract prepareChain(context: any): Promise<any>;

  /**
   * Make the actual API call to the LLM
   * This is where the core interaction with the model happens
   */
  protected abstract callLLM(preparedData: any): Promise<any>;

  /**
   * Process the LLM's response
   * This method should handle any postprocessing of the LLM's output
   */
  protected abstract processResponse(llmResponse: any): Promise<any>;

  /**
   * The main run method that orchestrates the entire process
   * This implementation provides detailed timing for each step
   */
  async run(context: any): Promise<any> {
    // Preparation phase
    const prepStartTime = Date.now();
    this.logger.log(`[${this.name}] Preparing chain...`);
    const preparedData = await this.prepareChain(context);
    const prepDuration = Date.now() - prepStartTime;
    this.logger.log(
      `[${this.name}] Chain preparation completed in ${prepDuration}ms`,
    );

    // LLM API call phase
    const apiStartTime = Date.now();
    this.logger.log(`[${this.name}] Calling LLM API...`);
    const llmResponse = await this.callLLM(preparedData);
    const apiDuration = Date.now() - apiStartTime;
    this.logger.log(
      `[${this.name}] LLM API call completed in ${apiDuration}ms`,
    );

    // Response processing phase
    const processStartTime = Date.now();
    this.logger.log(`[${this.name}] Processing response...`);
    const result = await this.processResponse(llmResponse);
    const processDuration = Date.now() - processStartTime;
    this.logger.log(
      `[${this.name}] Response processing completed in ${processDuration}ms`,
    );

    return result;
  }

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
