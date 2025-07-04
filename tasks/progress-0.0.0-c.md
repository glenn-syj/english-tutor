### Phase 6: 장기 컨텍스트 관리 (Long-term Context Management) - Chroma VectorDB 도입

이 단계의 목표는 Chroma VectorDB를 도입하여 AI 에이전트의 장기 컨텍스트 관리 능력을 향상하고, 개인화된 학습 경험을 위한 기반을 마련하는 것입니다.

- [x] **17. Chroma VectorDB 도입 및 설정**

  - [x] **17.1. Chroma VectorDB 라이브러리 설치**: Node.js/TypeScript 환경에 필요한 Chroma 관련 라이브러리 설치 (`chromadb`, `@langchain/community`).
  - [x] **17.2. `VectorStoreService` 모듈 생성**: `apps/backend/src/storage/` 내에 `VectorStoreService` 또는 유사한 이름의 모듈을 생성하여 ChromaClient 초기화 및 관리 로직 구현.
  - [x] **17.3. ChromaDB 데이터 저장 경로 설정**: 로컬 파일 시스템 또는 환경 변수를 통한 원격 ChromaDB 서버 연결 설정.

- [x] **18. 데이터 스키마 설계 및 컬렉션 정의**

  - [x] **18.1. 대화 이력 컬렉션 정의**: 사용자 대화 이력을 저장하기 위한 `conversations` 컬렉션 스키마 설계 (`userId`, `timestamp`, `sender`, `text`, `embedding`).
  - [x] **18.2. 학습 자료 컬렉션 정의**: 영어 학습 자료를 저장하기 위한 `learning_materials` 컬렉션 스키마 설계 (`topic`, `level`, `tags`, `content`, `embedding`).
  - [x] **18.3. 뉴스 기사 컬렉션 정의 (선택 사항)**: 필요시 뉴스 기사를 저장하기 위한 `news_articles` 컬렉션 스키마 설계 (`title`, `url`, `publishedDate`, `summary`, `fullText`, `embedding`).
  - [x] **18.4. 교정 피드백 컬렉션 정의**: 사용자의 교정 피드백 (원문, 교정문, 교정 유형, 설명 등)을 저장하기 위한 `correction_feedback` 컬렉션 스키마 설계 (`userId`, `timestamp`, `originalText`, `correctedText`, `correctionType`, `explanation`, `embedding`).

- [ ] **19. 데이터 삽입/업데이트 기능 구현**

  - [ ] **19.1. 대화 이력 저장 기능**: `OrchestratorService` 또는 `ChatService`에서 대화가 완료될 때마다 대화 이력을 `conversations` 컬렉션에 저장하는 기능 구현.
  - [ ] **19.2. 학습 자료 추가 기능**: 관리자 또는 특정 유틸리티를 통해 새로운 학습 자료를 `learning_materials` 컬렉션에 추가하는 기능 구현.
  - [ ] **19.3. 뉴스 기사 추가 기능 (선택 사항)**: 뉴스 스크래핑 또는 수동으로 뉴스 기사를 `news_articles` 컬렉션에 추가하는 기능 구현.
  - [ ] **19.4. 교정 피드백 저장 기능**: `CorrectionAgent` 또는 관련 서비스에서 교정 작업 완료 후, 교정 피드백(`originalText`, `correctedText`, `correctionType`, `explanation` 등)을 `correction_feedback` 컬렉션에 저장하는 기능 구현.

- [ ] **20. 데이터 검색 기능 구현 및 LLM 통합**

  - [ ] **20.1. 관련 컨텍스트 검색 로직**: `VectorStoreService` 내에 사용자 질의 및 대화 컨텍스트에 기반하여 각 컬렉션에서 관련성 높은 정보를 검색하는 로직 구현.
  - [ ] **20.2. LLM 프롬프트에 컨텍스트 주입**: 검색된 관련 정보를 `OrchestratorService` 또는 `ChatService`의 LLM 프롬프트에 동적으로 주입하여 답변의 품질과 관련성을 높이도록 로직 수정.
  - [ ] **20.3. RAG(Retrieval Augmented Generation) 아키텍처 기반 마련**: LLM 응답 생성 전 관련 정보를 검색하고 이를 참조하도록 하는 RAG 패턴 구현의 기반을 마련.
  - [ ] **20.4. 교정 컨텍스트 활용**: 사용자의 이전 교정 피드백을 `correction_feedback` 컬렉션에서 검색하여 `CorrectionAgent` 또는 `ConversationAgent`의 프롬프트에 주입, 개인화된 교정 및 설명을 생성하도록 활용.

- [ ] **21. 통합 테스트 및 성능 검증**
  - [ ] **21.1. VectorDB 통합 기능 테스트**: 데이터 삽입, 검색, LLM 통합 시나리오에 대한 통합 테스트 케이스 작성 및 실행.
  - [ ] **21.2. 검색 성능 및 응답 품질 검증**: VectorDB 연동 후 LLM 응답의 관련성, 정확도, 응답 시간 등을 측정하고 개선.
