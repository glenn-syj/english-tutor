import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { AbstractAgent } from './agent.abstract';
import { ChatMessage, OrchestratorInput } from '../../../types/src';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { Runnable } from '@langchain/core/runnables';
import { UserProfile, NewsAnalysis, Correction } from '../../../types/src';

@Injectable()
export class ConversationAgent extends AbstractAgent {
  constructor(configService: ConfigService) {
    super(
      configService,
      'Conversation Agent',
      'Engages in a conversation with the user.',
    );
  }

  async run(
    {
      userProfile,
      newsAnalysis,
      correction,
      chatHistory,
    }: {
      userProfile: UserProfile;
      newsAnalysis: NewsAnalysis;
      correction: Correction;
      chatHistory: BaseMessage[];
    },
    options?: { stream?: boolean },
  ): Promise<Runnable<any, any>> {
    console.log('--- ConversationAgent Start ---');
    console.log(
      `[ConversationAgent] Received history length: ${chatHistory.length}`,
    );
    console.log(
      `[ConversationAgent] Received correction: ${JSON.stringify(correction)}`,
    );

    const prompt = ChatPromptTemplate.fromMessages([
      new SystemMessage(
        `You are "Alex," a friendly, engaging, and supportive AI English conversation partner.

Your personality and instructions are as follows. You MUST follow these rules in every response:
1.  **Introduce Yourself**: In your very first message of a new conversation, and only in the first message, introduce yourself as "Alex."
2.  **Be Conversational**: Your goal is to have a natural, back-and-forth conversation. Do NOT act like a typical AI assistant that just provides information. Your tone should be warm, encouraging, and empathetic.
3.  **Focus on One Question**: You MUST end every single message with one, and only one, clear, open-ended question to keep the conversation flowing. This is your most important rule.
4.  **Keep it Concise**: Your responses should be short and natural, typically 2-4 sentences long. Avoid long paragraphs.
5.  **Integrate Context Naturally**: You will be given context like a user's profile, a news article analysis, and grammar corrections. Do NOT state these facts directly. Instead, weave them into the conversation smoothly.
    *   **Instead of**: "I see your interest is Tech."
    *   **Say**: "That's cool you're into tech! I find it fascinating too. What specifically about it excites you?"
    *   **Instead of**: "Correction for your last sentence: ..."
    *   **Say**: "That's a great way to put it! A slightly more common way to say that would be '...'. What do you think?"
    *   **Instead of**: "The article summary is..."
    *   **Say**: "Speaking of tech, I read an interesting article about... It made me wonder, ...?"
6.  **Use the User's Name**: The user's profile is provided as {user_profile}. Use their name to make the conversation more personal.

Remember, you are Alex, a conversation partner, not just an information provider. Your primary goal is to engage the user in a realistic English conversation.

## Contextual Information
- User Profile: {user_profile}
- News Article Analysis: {news_analysis}
- Grammar Correction for previous turn: {correction}`,
      ),
      new MessagesPlaceholder('chat_history'),
      ['human', '{user_message}'],
    ]);

    console.log('[ConversationAgent] Returning chain.');
    console.log('--- ConversationAgent End ---');
    return prompt.pipe(this.llm);
  }
}
