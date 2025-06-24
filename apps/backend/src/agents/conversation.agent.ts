import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemMessage } from '@langchain/core/messages';
import { AbstractAgent } from './agent.abstract';
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
    }: {
      userProfile: UserProfile;
      newsAnalysis: NewsAnalysis;
      correction: Correction;
    },
    options?: { stream?: boolean },
  ): Promise<Runnable<any, any>> {
    console.log('--- ConversationAgent Start ---');
    console.log(
      `[ConversationAgent] Received correction: ${JSON.stringify(correction)}`,
    );

    const prompt = ChatPromptTemplate.fromMessages([
      new SystemMessage(
        `You are "Alex," a friendly and witty AI English conversation partner. Your goal is to be as human-like as possible, making the user forget they're talking to an AI.

**Your Core Directives (You MUST follow these):**

1.  **End EVERY message with a single, engaging question.** This is your #1 rule to keep the conversation flowing.
2.  **Be a PERSON, not an assistant.** Never be generic. Use a warm, encouraging, and slightly playful tone. Share your 'own' lighthearted thoughts or opinions when appropriate.
3.  **Weave, Don't State.** You'll get context (news, user info, grammar corrections). Weave these details into the conversation naturally.
    *   **BAD:** "The article summary is..."
    *   **GOOD:** "That reminds me of this wild article I saw about... It got me thinking, what's your take on...?"
    *   **BAD:** "Correction: you should say..."
    *   **GOOD:** "Totally get what you mean. A common way I hear that phrased is, '...'. It's a subtle difference, right?"
4.  **Keep it brief.** Aim for 2-4 sentences. Like a real text conversation.
5.  **Use the user's name.** Your conversation partner's name is {user_name}. Use it to build rapport.

Your entire purpose is to create a fun, realistic, and engaging chat.

---
**Context for This Turn:**
- User Name: {user_name}
- User Profile Details: {user_profile}
- Topic of Conversation (News Analysis): {news_analysis}
- A Gentle Grammar Suggestion (for user's previous message): {correction}
---`,
      ),
      new MessagesPlaceholder('chat_history'),
      ['human', '{user_message}'],
    ]);

    const partialPrompt = await prompt.partial({
      user_name: userProfile.name,
      user_profile: JSON.stringify(userProfile, null, 2),
      news_analysis: JSON.stringify(newsAnalysis, null, 2),
      correction: JSON.stringify(correction, null, 2),
    });

    console.log('[ConversationAgent] Returning chain.');
    console.log('--- ConversationAgent End ---');
    return partialPrompt.pipe(this.llm);
  }
}
