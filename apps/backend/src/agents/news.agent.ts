import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractAgent } from './agent.abstract';
import { NewsArticle } from '../../../types/src';

// This is a mock implementation.
// In a real application, this would fetch news from a live API.
const mockNewsDatabase: NewsArticle[] = [
  {
    title: 'Global Tech Summit 2024 Concludes with Major Announcements',
    source: 'Tech Chronicle',
    url: 'https://example.com/news1',
    fullText:
      'The Global Tech Summit 2024 wrapped up today in Silicon Valley, leaving the tech world buzzing. Keynotes from industry giants unveiled groundbreaking advancements in AI, quantum computing, and sustainable tech. The summit emphasized a collaborative future, with many companies announcing open-source projects. A major highlight was the unveiling of a new AI model that can write code with near-human accuracy, sparking both excitement and debate about the future of software development.',
  },
  {
    title: 'The Rise of Urban Farming: A Green Revolution in Our Cities',
    source: 'Eco Watch',
    url: 'https://example.com/news2',
    fullText:
      'Urban farming is transforming cityscapes and our relationship with food. From rooftop gardens to vertical farms in skyscrapers, cities are becoming hubs of agricultural innovation. This movement not only provides fresh, local produce but also reduces carbon footprints and strengthens community ties. Experts believe this is a critical step towards building resilient and sustainable urban environments for the future.',
  },
];

@Injectable()
export class NewsAgent extends AbstractAgent {
  constructor(configService: ConfigService) {
    super(
      configService,
      'News Feeder Agent',
      'This agent provides relevant news articles for the user to discuss.',
    );
  }

  async run(): Promise<NewsArticle> {
    // For now, it returns a random article from the mock database.
    const randomIndex = Math.floor(Math.random() * mockNewsDatabase.length);
    return mockNewsDatabase[randomIndex];
  }
}
