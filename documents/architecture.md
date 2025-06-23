# AI 영어 회화 서비스 아키텍처 설계

## 1. 시스템 구조 개요

본 시스템은 프론트엔드(Next.js)와 백엔드(Nest.js)가 분리된 모노레포 구조를 채택하여, 확장성과 유지보수성을 극대화합니다.

### 1.1. 전체 시스템 구조도

```mermaid
graph TB
    subgraph "프론트엔드 (Next.js)"
        UI[UI Components]
        STT[Speech-to-Text]
        TTS[Text-to-Speech]
        State[상태 관리]
    end

    subgraph "백엔드 (Nest.js)"
        API[REST API]
        subgraph "AI 에이전트 네트워크"
            Orchestrator[오케스트레이터]
            News[뉴스 에이전트]
            Analysis[분석 에이전트]
            Correction[교정 에이전트]
            Memory[기억 에이전트]
            Conversation[대화 에이전트]
        end
        DB[(로컬 스토리지)]
    end

    UI --> API
    API --> Orchestrator
    Orchestrator --> News & Analysis & Correction & Memory & Conversation
    Memory --> DB
```

### 1.2. 모노레포 구조

```mermaid
graph LR
    subgraph "Monorepo"
        subgraph "apps"
            FE[frontend]
            BE[backend]
        end
        subgraph "packages"
            Types[types]
            Utils[utils]
        end
    end
    FE --> Types
    BE --> Types
    FE & BE --> Utils
```

## 2. 컴포넌트 상세 설명

### 2.1. 프론트엔드 (Next.js)

- **UI Components**: React 기반의 사용자 인터페이스
  - 대화 히스토리 표시
  - 음성 입력/출력 상태 표시
  - 실시간 피드백 UI
- **Speech Handling**:
  - Web Speech API를 활용한 STT/TTS 처리
  - 음성 스트림 관리

### 2.2. 백엔드 (Nest.js)

```mermaid
graph TB
    subgraph "Nest.js 모듈 구조"
        AppModule --> ChatModule & AgentModule & StorageModule
        ChatModule --> ChatController & ChatService
        AgentModule --> AgentService & OrchestratorService
        StorageModule --> StorageService
    end
```

- **모듈 구성**:
  - `ChatModule`: 대화 처리 및 스트리밍
  - `AgentModule`: AI 에이전트 네트워크 관리
  - `StorageModule`: 로컬 저장소 관리

### 2.3. 공유 타입 시스템

```typescript
// packages/types/src/chat.ts 예시
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface UserProfile {
  userName: string;
  interests: string[];
  learningLevel: "Beginner" | "Intermediate" | "Advanced";
  recentCorrections: CorrectionHistory[];
}
```

## 3. 데이터 흐름

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant A as AI Agents
    participant S as Storage

    U->>F: 음성 입력
    F->>F: STT 변환
    F->>B: POST /chat
    B->>A: 오케스트레이터 실행
    A->>S: 사용자 프로필 조회
    S-->>A: 프로필 데이터
    A->>A: 에이전트 협업
    A-->>B: 응답 생성
    B-->>F: 스트리밍 응답
    F->>F: TTS 변환
    F-->>U: 음성 출력
```

## 4. 확장성 고려사항

### 4.1. 데이터베이스 확장

```mermaid
graph LR
    subgraph "현재"
        LS[(로컬 스토리지)]
    end
    subgraph "확장 가능성"
        RDB[(관계형 DB)]
        Vector[(벡터 DB)]
    end
    LS -.-> RDB & Vector
```

- **초기 단계**: 로컬 JSON 파일 사용
- **확장 단계**:
  - 사용자 데이터: PostgreSQL/MySQL
  - 벡터 저장소: ChromaDB/LanceDB

### 4.2. 보안 고려사항

- 환경 변수 관리
- API 키 보안
- 사용자 데이터 암호화
