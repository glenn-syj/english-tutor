# API 명세서

이 문서는 AI 영어 회화 서비스의 프론트엔드와 백엔드 간의 통신을 위한 API를 정의합니다.

## 1. 기본 원칙

- **Base URL**: NestJS 백엔드 서버의 기본 URL (예: `http://localhost:3000`)
- **데이터 형식**: 모든 요청과 응답의 본문(body)은 `JSON` 형식을 사용합니다.
- **인증**: 초기 버전에서는 별도의 인증을 요구하지 않습니다.

---

## 2. API 엔드포인트

### 2.1. 사용자 프로필 (User Profile)

사용자 정보 및 학습 기록을 관리합니다.

#### **`GET /profile`**

- **설명**: 현재 사용자의 프로필 정보를 조회합니다. 앱 시작 시 프로필 존재 여부를 확인하는 데 사용됩니다.
- **요청**: 없음
- **응답**:
  - **성공 (200 OK)**: `UserProfile` 객체를 반환합니다. 로컬에 프로필이 없으면 기본값으로 생성된 객체가 반환됩니다.
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

---

#### **`POST /profile`**

- **설명**: 사용자 프로필을 생성하거나 업데이트합니다.
- **요청 본문**: (`Omit<UserProfile, 'recentCorrections'>`)
  ```json
  {
    "name": "Alex",
    "interests": ["Tech", "Travel"],
    "learningLevel": "Intermediate"
  }
  ```
- **응답**:
  - **성공 (200 OK)**: 생성 또는 수정된 `UserProfile` 객체를 반환합니다.

---

### 2.2. 대화 (Chat)

AI 에이전트와 실시간 대화를 수행합니다.

#### **`POST /chat`**

- **설명**: 사용자의 메시지를 서버로 보내고, AI의 응답을 스트리밍으로 수신합니다. 시스템의 핵심 기능입니다.
- **요청 본문**:
  ```json
  {
    "history": [
      {
        "sender": "user",
        "text": "Hi there!",
        "timestamp": "2023-10-27T09:59:00Z"
      },
      {
        "sender": "assistant",
        "text": "Hello! How can I help you today?",
        "timestamp": "2023-10-27T10:00:00Z"
      }
    ],
    "message": "Can you tell me about the latest tech news?"
  }
  ```
- **응답**:

  - **성공 (200 OK)**:

    - **`Content-Type: text/plain; charset=utf-8`**
    - AI가 생성하는 응답이 텍스트 스트림으로 전송됩니다. 스트림은 여러 종류의 데이터를 포함할 수 있습니다.
    - **1. 시스템 메시지 (System Message)**: 새로운 뉴스 기사가 제공될 때 스트림의 시작 부분에 추가됩니다. `SYSTEM_MESSAGE::` 접두사로 시작하며, `ChatMessage` 객체를 JSON 문자열로 포함합니다.
      ```
      SYSTEM_MESSAGE::{"sender":"system","text":"SYSTEM_ARTICLE:{\"summary\":\"...\",\"vocabulary\":[...],\"questions\":[...]}","timestamp":"..."}\n
      ```
    - **2. 교정 메시지 (Correction Message)**: 사용자의 입력에 문법적 오류가 있을 경우 전송됩니다. `CORRECTION_MESSAGE::` 접두사로 시작하며, `Correction` 객체를 JSON 문자열로 포함합니다.
      ```
      CORRECTION_MESSAGE::{"has_errors":true,"original":"...","corrected":"...","explanation":"..."}\n
      ```
    - **3. AI 응답 토큰 (Assistant Response)**: 위 접두사가 없는 모든 데이터는 AI 어시스턴트 응답의 텍스트 조각(token)입니다. 클라이언트는 이 조각들을 순서대로 조합하여 전체 응답을 구성합니다.
      ```
      Hello
      ! I
      can
      certainly
      help...
      ```

  - **실패 (500 등)**: 표준 에러 응답 객체를 반환합니다.

---

## 3. 에러 핸들링 (Error Handling)

NestJS 기본 에러 핸들러가 표준화된 에러 객체를 `JSON` 형식으로 반환합니다.

```json
{
  "statusCode": 500,
  "message": "Internal Server Error"
}
```

---

## 4. 공유 데이터 타입 (`apps/types`)

프론트엔드와 백엔드 간의 데이터 일관성을 위해 모노레포의 공유 패키지에서 아래와 같은 핵심 타입을 정의하고 사용합니다.

```typescript
// apps/types/src/index.ts

export interface ChatMessage {
  sender: "user" | "assistant" | "system";
  timestamp: string;
  text: string;
  correction?: Correction;
  isError?: boolean;
}

export interface CorrectionWithErrors {
  has_errors: true;
  original: string;
  corrected: string;
  explanation: string;
}

export interface CorrectionNoErrors {
  has_errors: false;
  feedback: string;
}

export type Correction = CorrectionWithErrors | CorrectionNoErrors;

export interface UserProfile {
  name: string;
  interests: string[];
  learningLevel: string;
  recentCorrections: CorrectionWithErrors[];
}
```
