import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export abstract class AbstractGeneralAgent {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly configService: ConfigService;
  protected readonly name: string;
  protected readonly description: string;

  constructor(configService: ConfigService, name: string, description: string) {
    this.configService = configService;
    this.name = name;
    this.description = description;
    this.logger.log(`Initialized ${this.name}: ${this.description}`);
  }

  /**
   * Get the name of the agent
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the description of the agent
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Abstract method that must be implemented by concrete agents
   * @param input The input data for the agent
   */
  abstract run(input: any): Promise<any>;
}
