import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: 'http://localhost:3001', // Next.js 개발 서버 주소
    // ... existing code ...
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
