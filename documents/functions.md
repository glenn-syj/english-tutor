# AI 영어 회화 서비스 기능 명세서

## 1. 개요

**AI 에이전트 협력 모델**에 기반한 개인 맞춤형 영어 회화 서비스. `OrchestratorService`의 지휘 아래, 여러 전문 에이전트(`NewsAgent`, `AnalysisAgent`, `CorrectionAgent`, `ConversationAgent`)가 협력하여 지능적이고 개인화된 학습 경험을 제공한다.

이 시스템은 **프론트엔드(Next.js)**와 **백엔드(Nest.js)**가 분리된 아키텍처를 채택한다. **LangChain.js**는 백엔드에서 에이전트 네트워크를 구현하는 데 사용된다.

---

## 2. 시스템 아키텍처 및 흐름

### 2.1. 에이전트 기반 아키텍처

- **프론트엔드 (UI Layer)**: **Next.js** 기반. 사용자와의 상호작용(음성 입/출력, 대화 내용 표시)만을 담당하는 순수 클라이언트.
- **백엔드 (Agent Host Layer)**: **Nest.js** 기반의 독립 서버. 프론트엔드의 REST API 요청을 처리하는 유일한 관문이며, `OrchestratorService` 실행, 스토리지 연결 관리 등 모든 핵심 비즈니스 로직을 담당한다.
- **AI 코어 (Agent Network)**: 백엔드 내에서 실행되는 실제 지능 담당 에이전트들. 각자 전문화된 작업을 수행하고 `OrchestratorService`의 지시에 따라 상호작용한다.
- **공통 타입 패키지**: 프론트엔드와 백엔드가 **모노레포(pnpm workspace)** 내의 공유 패키지(`apps/types`)를 통해 TypeScript `interface`와 `type`을 공유하여, API 통신 간의 데이터 구조를 일관되고 안전하게 유지한다.

### 2.2. 핵심 동작 흐름

1.  **요청 수신**: 사용자 음성이 텍스트로 변환되어 프론트엔드에서 백엔드 API (`/chat`)로 전송된다.
2.  **오케스트레이터 실행**: API 컨트롤러가 `OrchestratorService`를 실행하며, 사용자의 메시지와 대화 기록을 전달한다.
3.  **정보 수집 및 분석 (Orchestration)**:
    - `OrchestratorService`는 `ProfileService`를 호출해 사용자 프로필을 가져온다.
    - (필요시) `NewsAgent`와 `AnalysisAgent`를 호출해 대화 주제를 준비한다.
    - `CorrectionAgent`를 호출해 사용자 발화의 문법을 분석한다.
4.  **응답 생성 (Orchestration)**:
    - `OrchestratorService`는 수집된 모든 정보(사용자 프로필, 뉴스 분석, 문법 교정)를 `ConversationAgent`를 실행할 컨텍스트로 사용한다.
    - `ConversationAgent`는 이 정보를 종합하여 최종 사용자 응답(e.g., 'Alex'의 대답)을 생성한다.
5.  **응답 스트리밍**: 생성된 응답은 스트리밍 형태로 API를 통해 프론트엔드로 전달되고, 즉시 텍스트로 렌더링되거나 음성으로 출력된다.
6.  **프로필 관리**: 사용자 프로필은 `ProfileService`를 통해 관리되며, 프론트엔드의 프로필 설정 화면을 통해 `POST /profile` 요청으로 업데이트될 수 있다.

---

## 3. 프론트엔드 (Next.js - Client Components)

- 사용자와의 직접적인 상호작용에만 집중하며, 내부 로직은 최소화한다.
- **주요 기능**:
  - **음성 입/출력**: `useSpeech` 커스텀 훅에서 Web Speech API를 사용하여 실시간 음성-텍스트 변환(STT) 및 텍스트-음성 변환(TTS)을 처리한다.
  - **대화 표시**: 사용자와 AI의 대화를 채팅 형태로 화면에 표시한다. AI 응답은 스트리밍으로 수신하여 점진적으로 렌더링한다.
  - **상태 시각화**: 마이크 상태(듣는 중, 말하는 중) 등 시스템의 현재 상태를 시각적으로 보여준다.

---

## 4. 백엔드 (Nest.js Application)

- 에이전트 네트워크를 호스팅하고, 스토리지 연결을 관리하며, 모든 비즈니스 로직을 실행하는 독립적인 서버 애플리케이션.
- **장점**:
  - **안정적인 데이터 관리**: 서버가 상시 실행되므로, `StorageService`를 통해 데이터 접근을 중앙에서 관리한다.
  - **명확한 책임 분리**: 프론트엔드와 백엔드의 역할이 명확히 분리되어 유지보수성과 확장성이 향상된다.
  - **모듈 기반 아키텍처**: Nest.js의 모듈 시스템을 통해 에이전트, 서비스, 컨트롤러 등 각 기능 단위를 체계적으로 구성한다.

### 4.1. 대화 처리 API (`/chat`)

- **역할**: 시스템의 메인 대화 엔드포인트.
- **책임**:
  - 프론트엔드로부터 `POST` 요청으로 사용자 메시지와 대화 기록을 받는다.
  - `OrchestratorService`를 초기화하고 실행한다.
  - 오케스트레이터가 반환한 최종 응답을 `Readable` 스트림을 통해 프론트엔드로 스트리밍한다.

---

## 5. AI 에이전트 프레임워크 및 기술 스택

본 시스템은 다음 기술 조합을 사용한다.

- **AI 에이전트 프레임워크**: **LangChain.js**

  - **이유**: LLM, 외부 도구(API), 프롬프트 템플릿 등을 '체인(Chain)'으로 연결하고, 에이전트의 실행 로직을 구조화하는 데 강력한 기능을 제공하여 `OrchestratorService`의 복잡한 로직을 간결하게 구현한다.

- **LLM**: **Google Gemini API** (`gemini-1.5-flash` 모델)

  - **이유**: 강력한 성능과 함께 구조화된 데이터(JSON) 출력을 안정적으로 지원하여 에이전트의 신뢰성을 높인다.

- **스토리지 (사용자 프로필)**:

  - **구성**: **`apps/backend/src/data/user_profile.json`** 파일을 `StorageService`를 통해 관리. 로컬 환경에서 단일 사용자로 실행되므로, 이 방법이 가장 간단하고 충분하다.
  - **심화 기능 (선택 사항)**: 보다 정교한 기억 기능을 원할 경우, **로컬 벡터 스토어(e.g., ChromaDB, LanceDB)**를 도입할 수 있다.

- **실행 환경**: **프론트엔드(Next.js)와 백엔드(Nest.js) 분리 실행**
  - 두 애플리케이션은 pnpm 워크스페이스의 각기 다른 터미널에서 `pnpm dev` 명령어로 실행된다.
  - **장점**: 이 구조는 향후 데이터베이스 도입 및 기능 확장에 유연하게 대처할 수 있는 확장성 높은 아키텍처이다.

---

## 6. 추가 고려사항

### 6.1. 에러 처리 및 복구 전략

- **API 호출 실패**: `NewsAgent`의 외부 API 호출이 실패할 경우, 사용자에게 안내할 대체 메시지를 반환한다.
- **에이전트 오류**: `AnalysisAgent`와 같이 JSON 출력이 필수적인 에이전트의 경우, `OutputFixingParser`와 `try...catch`를 이용한 다중 안전장치를 두어 시스템 안정성을 확보한다.

### 6.2. 환경 설정 관리

- **API 키 관리**: Gemini API 키, Tavily API 키 등은 소스 코드에 직접 하드코딩하지 않는다.
- **적용 방식**: Nest.js 프로젝트의 `.env` 파일을 사용하여 환경 변수를 주입하고, `ConfigService`를 통해 안전하게 사용한다.

### 6.3. 주요 데이터 스키마 정의 (예시)

- **일관성 확보**: 모노레포 내의 공통 타입 패키지(`apps/types`)에 API 요청/응답 등의 타입을 정의하여 프론트엔드와 백엔드 간의 일관성을 강제한다.
- **`user_profile.json` 예시 (`apps/backend/src/data/user_profile.json`)**:
  ```json
  {
    "name": "Alex",
    "interests": ["Tech", "Travel"],
    "learningLevel": "Intermediate",
    "recentCorrections": [
      {
        "has_errors": true,
        "original": "I am go to school.",
        "corrected": "I am going to school.",
        "explanation": "The verb 'go' should be in the present participle form 'going' after 'am'."
      }
    ]
  }
  ```

### 6.4. 최초 사용자 온보딩

- **프로필 생성**: 애플리케이션 최초 실행 시, `StorageService`가 `user_profile.json` 파일의 존재 여부를 확인한다.
- **초기화**: 파일이 없다면, 기본값으로 채워진 초기 프로필을 생성한다. 사용자는 UI를 통해 프로필을 수정할 수 있다.

### 6.5. 모노레포 아키텍처

- **구조**: 단일 Git 저장소 내에 `apps/frontend`, `apps/backend`, `apps/types` 와 같은 디렉토리 구조를 사용한다. 공유 타입 패키지는 npm에 올리지 않고 pnpm 워크스페이스를 통해 내부적으로만 이용된다.
- **도구**: `pnpm`을 사용하여 모노레포를 효율적으로 관리한다.
- **장점**: 코드 재사용성 극대화, 일관된 개발 환경, 프론트-백엔드 간 타입 안전성 확보 등의 이점을 가진다.
