import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatMessage } from '../../../types/src';
import { Readable } from 'stream';

interface ChatRequestBody {
  history: ChatMessage[];
  message: string;
}

@Controller('chat')
export class ChatController {
  @Post()
  async handleChat(
    @Body() body: ChatRequestBody,
    @Res() res: Response,
  ): Promise<void> {
    // Mock streaming response based on api.md
    const mockResponseTokens = [
      'Hello! ',
      'I can ',
      'certainly ',
      'help you ',
      'with that.',
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const stream = new Readable({
      read() {},
    });

    stream.pipe(res);

    for (const token of mockResponseTokens) {
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate chunk delay
      stream.push(`data: ${token}\n\n`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    stream.push(`data: [DONE]\n\n`);
    stream.push(null); // End the stream
  }
}
