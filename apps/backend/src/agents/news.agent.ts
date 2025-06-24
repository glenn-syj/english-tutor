import { Injectable } from '@nestjs/common';
import { AbstractAgent } from './agent.abstract';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { NewsArticle } from '../../../types/src';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NewsAgent extends AbstractAgent {
  private searchTool: TavilySearchResults;

  constructor(configService: ConfigService) {
    super(
      configService,
      'News Reporter',
      'Fetches the latest news articles based on user interests.',
    );
    const tavilyApiKey = this.configService.get<string>('TAVILY_API_KEY');
    if (!tavilyApiKey) {
      throw new Error(
        'TAVILY_API_KEY is not set in the environment variables.',
      );
    }
    this.searchTool = new TavilySearchResults({
      apiKey: tavilyApiKey,
    });
  }

  async run(interests: string[]): Promise<NewsArticle> {
    console.log(`--- NewsAgent Start ---`);
    console.log(`[NewsAgent] Received interests: ${interests.join(', ')}`);

    const query = `Find a recent, interesting news article about one of the following topics: ${interests.join(
      ', ',
    )}. The article should be suitable for an intermediate English learner.`;

    const searchResultsString = await this.searchTool.invoke(query);

    let searchResults = [];
    try {
      if (searchResultsString && searchResultsString.length > 0) {
        searchResults = JSON.parse(searchResultsString);
      }
    } catch (error) {
      console.error('Failed to parse Tavily search results:', error);
      // Fallback to empty results if parsing fails
      searchResults = [];
    }

    if (searchResults.length === 0) {
      // Return a default article or throw an error
      const article: NewsArticle = {
        title: 'No Article Found',
        source: 'N/A',
        url: '',
        fullText:
          "Sorry, I couldn't find a suitable news article about your interests. Let's try another topic.",
      };

      console.log(`[NewsAgent] Returning article: "${article.title}"`);
      console.log(`--- NewsAgent End ---`);
      return article;
    }

    const firstResult = searchResults[0];

    const article: NewsArticle = {
      title: firstResult.title,
      source: firstResult.source || 'Unknown',
      url: firstResult.url,
      fullText: firstResult.content,
    };

    console.log(`[NewsAgent] Returning article: "${article.title}"`);
    console.log(`--- NewsAgent End ---`);
    return article;
  }
}
