import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private chromaClient: ChromaClient;

  constructor(private readonly configService: ConfigService) {
    // ChromaClient 초기화 (로컬 경로 또는 환경 변수 사용)
    const chromaPath =
      this.configService.get<string>('CHROMA_DB_PATH') || './chroma_data';
    this.chromaClient = new ChromaClient({
      path: chromaPath,
    });
    this.logger.log(`ChromaDB initialized with path: ${chromaPath}`);
  }

  async onModuleInit() {
    // 모듈 초기화 시 필요한 컬렉션 생성 등 추가 설정
  }

  public getClient(): ChromaClient {
    return this.chromaClient;
  }
}
