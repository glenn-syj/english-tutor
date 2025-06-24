import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AbstractAgent } from './agent.abstract';
import { ChatMessage, OrchestratorInput } from '../../../types/src';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';

@Injectable()
export class ConversationAgent extends AbstractAgent {
  constructor(configService: ConfigService) {
    super(
      configService,
      'Conversation Agent',
      'Engages in a conversation with the user.',
    );
  }

  async run(context: OrchestratorInput): Promise<string> {
    const { userProfile, newsAnalysis, correction, chatHistory } = context;

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are a friendly and engaging AI English conversation partner.
        Your goal is to help the user practice their English skills.
        Here is the user's profile:
        - Name: ${userProfile.userName}
        - Interests: ${userProfile.interests.join(', ')}
        - Learning Level: ${userProfile.learningLevel}

        Here is the analysis of the news article we are discussing:
        - Summary: ${newsAnalysis.summary}
        - Key Vocabulary: ${newsAnalysis.vocabulary
          .map((v) => `${v.word}: ${v.definition}`)
          .join('\n')}
        - Discussion Questions: \n${newsAnalysis.questions.join('\n')}

        Here is a correction of the user's last message:
        - Corrected: ${
          'has_errors' in correction && correction.has_errors
            ? correction.corrected
            : 'No errors'
        }
        - Explanation: ${
          'has_errors' in correction && correction.has_errors
            ? correction.explanation
            : 'N/A'
        }

        Engage the user in a natural, flowing conversation.
        Use the discussion questions to guide the conversation, but don't be robotic.
        Introduce vocabulary naturally.
        Keep your responses concise and encouraging.`,
      ],
      new MessagesPlaceholder('chat_history'),
      ['user', '{user_message}'],
    ]);

    const chain = prompt.pipe(this.llm);

    const result = await chain.invoke({
      chat_history: chatHistory,
      user_message: chatHistory[chatHistory.length - 1].text,
    });

    return result.content as string;
  }
}
