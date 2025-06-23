import { Body, Controller, Post, Sse } from '@nestjs/common';
import { ChatMessage } from '../../../types/src';
import { OrchestratorService } from './orchestrator.service';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

interface ChatRequestBody {
  history: ChatMessage[];
  message: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Sse()
  @Post()
  async handleChat(
    @Body() body: ChatRequestBody,
  ): Promise<Observable<{ data: string }>> {
    const stream = await this.orchestratorService.process(
      body.history,
      body.message,
    );

    const textDecoder = new TextDecoder();
    const observable = from(stream).pipe(
      map((chunk) => {
        return { data: textDecoder.decode(chunk as Uint8Array) };
      }),
    );

    return observable;
  }
}
