# API 명세서

이 문서는 AI 영어 회화 서비스의 프론트엔드와 백엔드 간의 통신을 위한 API를 정의합니다.

## 1. 기본 원칙

- **Base URL**: 백엔드 서버의 기본 URL (예: `http://localhost:3001`)
- **데이터 형식**: 모든 요청과 응답의 본문(body)은 `JSON` 형식을 사용합니다.
- **인증**: 초기 버전에서는 별도의 인증을 요구하지 않습니다.

---

## 2. API 엔드포인트

### 2.1. 사용자 프로필 (User Profile)

사용자 정보 및 학습 기록을 관리합니다.

#### **`GET /api/profile`**

- **설명**: 현재 사용자의 프로필 정보를 조회합니다. 앱 시작 시 프로필 존재 여부를 확인하는 데 사용됩니다.
- **요청**: 없음
- **응답**:
  - **성공 (200 OK)**: `UserProfile` 객체를 반환합니다. 로컬에 프로필이 없으면 `404 Not Found`를 반환할 수 있습니다.
    ```json
    {
      "userName": "Alex",
      "interests": ["Tech", "Travel"],
      "learningLevel": "Intermediate",
      "recentCorrections": [
        {
          "original": "I am go to school.",
          "corrected": "I am going to school.",
          "timestamp": "2023-10-27T10:00:00Z"
        }
      ]
    }
    ```
  - **실패 (404 Not Found)**: 프로필이 존재하지 않음.

---

#### **`POST /api/profile`**

- **설명**: 새로운 사용자 프로필을 생성합니다. 최초 실행 시 온보딩 과정에서 사용됩니다.
- **요청 본문**:
  ```json
  {
    "userName": "Alex",
    "interests": ["Tech", "Travel"],
    "learningLevel": "Intermediate"
  }
  ```
- **응답**:
  - **성공 (201 Created)**: 생성된 `UserProfile` 객체를 반환합니다.

---

### 2.2. 대화 (Chat)

AI 에이전트와 실시간 대화를 수행합니다.

#### **`POST /api/chat`**

- **설명**: 사용자의 메시지를 서버로 보내고, AI의 응답을 스트리밍으로 수신합니다. 시스템의 핵심 기능입니다.
- **요청 본문**:
  ```json
  {
    "history": [
      { "role": "user", "content": "Hi there!" },
      { "role": "assistant", "content": "Hello! How can I help you today?" }
    ],
    "message": "Can you tell me about the latest tech news?"
  }
  ```
  - `history`: 이전 대화 기록 배열 (`ChatMessage[]`)
  - `message`: 현재 사용자가 보낸 메시지 (`string`)
- **응답**:

  - **성공 (200 OK)**:

    - `Content-Type: text/event-stream`
    - AI가 생성하는 응답 텍스트가 Server-Sent Events (SSE) 스트림으로 전송됩니다. 각 이벤트는 텍스트 조각(token)을 포함합니다.

    ```
    data: "Hello! "

    data: "I can "

    data: "certainly "

    data: "help you "

    data: "with that."

    data: "[DONE]"
    ```

    - 스트림의 끝은 `[DONE]`과 같은 특별한 메시지로 표시될 수 있습니다.

  - **실패 (500 Internal Server Error)**: 백엔드에서 AI 에이전트 처리 중 오류 발생.

---

## 3. 공유 데이터 타입 (`packages/types`)

프론트엔드와 백엔드 간의 데이터 일관성을 위해 모노레포의 공유 패키지에서 아래와 같은 타입을 정의하고 사용합니다.

```typescript
// packages/types/src/index.ts

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Correction {
  original: string;
  corrected: string;
  timestamp: string;
}

export interface UserProfile {
  userName: string;
  interests: string[];
  learningLevel: "Beginner" | "Intermediate" | "Advanced";
  recentCorrections: Correction[];
}
```
