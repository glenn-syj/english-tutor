# AI 영어 회화 서비스 워크플로우

## 1. 사용자 상호작용 흐름

### 1.1. 기본 대화 흐름

```mermaid
stateDiagram-v2
    [*] --> 대기
    대기 --> 음성입력: 마이크 활성화
    음성입력 --> 텍스트변환: STT
    텍스트변환 --> 서버전송: API 요청
    서버전송 --> 응답수신: 스트리밍
    응답수신 --> 음성출력: TTS
    음성출력 --> 대기
```

### 1.2. 에이전트 협업 프로세스

```mermaid
graph TD
    subgraph "오케스트레이션"
        O[오케스트레이터]
        O -->|1. 기억 조회| M[기억 에이전트]
        O -->|2. 뉴스 요청| N[뉴스 에이전트]
        O -->|3. 분석 요청| A[분석 에이전트]
        O -->|4. 교정 요청| C[교정 에이전트]
        O -->|5. 대화 생성| V[대화 에이전트]
    end

    M -->|프로필 반환| O
    N -->|뉴스 데이터| O
    A -->|분석 결과| O
    C -->|교정 사항| O
    V -->|최종 응답| O
```

## 2. 주요 프로세스 상세

### 2.1. 최초 실행 및 프로필 생성

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as Storage

    F->>S: 프로필 존재 확인
    alt 프로필 없음
        F->>U: 초기 정보 요청
        U->>F: 기본 정보 입력
        F->>B: 프로필 생성 요청
        B->>S: 프로필 저장
    else 프로필 존재
        S-->>F: 프로필 로드
    end
    F->>U: 메인 화면 표시
```

### 2.2. 문법 교정 및 피드백

```mermaid
sequenceDiagram
    participant U as User
    participant C as 교정 에이전트
    participant M as 기억 에이전트

    U->>C: 영어 발화
    C->>C: 문법 분석
    alt 오류 발견
        C->>U: 교정 제안
        C->>M: 교정 이력 저장
    else 정확한 표현
        C->>U: 긍정적 피드백
    end
```

## 3. 에러 처리 워크플로우

### 3.1. API 오류 복구

```mermaid
stateDiagram-v2
    [*] --> 정상
    정상 --> 오류: API 호출 실패
    오류 --> 재시도: 1차 시도
    재시도 --> 정상: 성공
    재시도 --> 대체로직: 실패
    대체로직 --> 사용자안내
    사용자안내 --> [*]
```

### 3.2. 음성 인식 오류 처리

```mermaid
graph TD
    Start[음성 입력 시작] --> Check{음성 인식 상태}
    Check -->|성공| Process[텍스트 처리]
    Check -->|실패| Retry[재시도 요청]
    Check -->|잡음| Filter[노이즈 필터링]
    Retry --> Check
    Filter --> Check
    Process --> End[처리 완료]
```

## 4. 데이터 동기화 프로세스

### 4.1. 로컬 스토리지 관리

```mermaid
sequenceDiagram
    participant A as 애플리케이션
    participant M as 메모리 캐시
    participant F as 파일 시스템

    A->>M: 데이터 요청
    alt 캐시 히트
        M-->>A: 캐시된 데이터 반환
    else 캐시 미스
        M->>F: 파일 읽기
        F-->>M: 데이터 로드
        M-->>A: 데이터 반환
    end
    A->>M: 데이터 수정
    M->>F: 변경사항 저장
```

## 5. 개발 워크플로우

### 5.1. 모노레포 개발 프로세스

```mermaid
graph LR
    subgraph "개발 프로세스"
        Dev[로컬 개발] -->|타입 체크| Build[빌드]
        Build -->|테스트| Test[테스트]
        Test -->|성공| Deploy[배포]
    end

    subgraph "환경 설정"
        Config[환경변수] --> Dev
        Types[공유 타입] --> Dev
    end
```

### 5.2. 테스트 프로세스

- 단위 테스트: 각 에이전트의 독립적 기능
- 통합 테스트: 에이전트 간 협업
- E2E 테스트: 전체 사용자 시나리오
