import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AbstractAgent } from './agent.abstract';
import { ChatMessage } from '../../../types/src';

@Injectable()
export class ConversationAgent extends AbstractAgent {
  constructor(configService: ConfigService) {
    super(
      configService,
      'English Conversation Partner',
      'You are a friendly and helpful English conversation partner. Your goal is to have a natural conversation with the user to help them practice their English skills.',
    );
  }

  async run(history: ChatMessage[]): Promise<any> {
    const messages = history.map((msg) => {
      if (msg.sender === 'user') {
        return new HumanMessage(msg.text);
      } else {
        return new SystemMessage(msg.text);
      }
    });

    const stream = await this.llm.stream(messages);
    return stream;
  }
}
