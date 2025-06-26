import { Body, Controller, Post, Res } from '@nestjs/common';
import { ChatMessage } from '../../../types/src';
import { OrchestratorService } from './orchestrator.service';
import { Response } from 'express';

interface ChatRequestBody {
  history: ChatMessage[];
  message: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post()
  async handleChat(@Body() body: ChatRequestBody, @Res() response: Response) {
    try {
      const stream = await this.orchestratorService.process(
        body.history,
        body.message,
      );

      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.setHeader('Transfer-Encoding', 'chunked');

      stream.pipe(response);
    } catch (error) {
      console.error('Error in handleChat:', error);
      if (!response.headersSent) {
        response
          .status(500)
          .json({ message: 'An error occurred during processing' });
      }
    }
  }
}
