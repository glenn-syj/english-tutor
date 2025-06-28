import { Injectable } from '@nestjs/common';
import { AbstractGeneralAgent } from './agent.general.abstract';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { NewsArticle } from '../../../types/src';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NewsAgent extends AbstractGeneralAgent {
  private searchTool: TavilySearchResults;

  constructor(configService: ConfigService) {
    super(
      configService,
      'News Reporter',
      'Fetches the latest news articles based on user interests.',
    );
    this.searchTool = new TavilySearchResults({
      apiKey: this.configService.get<string>('TAVILY_API_KEY'),
      maxResults: 1,
    });
  }

  async run(message: string): Promise<NewsArticle> {
    const query = `${message}`;

    this.logger.log(`Performing search with query: "${query}"`);
    const searchResultString = await this.searchTool.invoke(query);

    if (!searchResultString) {
      // Return a default article or throw an error
      return {
        title: 'No Article Found',
        source: 'N/A',
        url: '',
        fullText:
          "Sorry, I couldn't find a suitable news article about your interests. Let's try another topic.",
      };
    }

    // The result is a stringified JSON array, so we need to parse it.
    const searchResults = JSON.parse(searchResultString);

    if (searchResults.length === 0) {
      return {
        title: 'No Article Found',
        source: 'N/A',
        url: '',
        fullText:
          "Sorry, I couldn't find a suitable news article about your interests. Let's try another topic.",
      };
    }

    const firstResult = searchResults[0];

    return {
      title: firstResult.title,
      source: firstResult.source || 'Unknown',
      url: firstResult.url,
      fullText: firstResult.content,
    };
  }
}
