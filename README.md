# English Agents - AI 영어 회화 서비스

## 소개

English Agents는 AI 기반의 개인화된 영어 회화 학습 서비스입니다. 사용자의 관심사와 학습 수준에 맞춘 최신 뉴스 기사를 바탕으로 자연스러운 영어 대화를 제공하며, 실시간 문법 교정과 어휘 학습을 지원합니다.

## 주요 기능

- 🤖 자연스러운 AI 대화: 'Alex'라는 친근한 AI 페르소나와의 실시간 영어 대화
- 📰 맞춤형 뉴스 기반 학습: 사용자 관심사에 맞는 최신 영어 뉴스 제공
- ✍️ 실시간 문법 교정: 대화 중 자연스러운 영어 교정과 피드백
- 📚 맥락화된 어휘 학습: 뉴스 기사 컨텍스트 속 새로운 단어와 표현 학습
- 👤 개인화된 학습 경험: 사용자의 관심사와 학습 수준에 맞춘 대화

## 기술 스택

- **프론트엔드**: Next.js, TypeScript, TailwindCSS
- **백엔드**: NestJS, TypeScript
- **AI/LLM**: Google Gemini
- **아키텍처**: 모노레포 (pnpm workspace)

## 시작하기

### 사전 요구사항

- Node.js 18 이상
- pnpm 8 이상
- Google Gemini API 키

### 설치 및 실행

1. 저장소 클론

```bash
git clone [repository-url]
cd english_agents
```

2. 의존성 설치

```bash
pnpm install
```

3. 환경 변수 설정

```bash
# apps/backend/.env
GEMINI_API_KEY=your_api_key_here

TAVILIY_API_KEY=your_api_key_here
```

4. 개발 서버 실행

```bash
# 백엔드 서버 실행
pnpm --filter backend dev

# 프론트엔드 서버 실행 (새 터미널에서)
pnpm --filter frontend dev
```

5. 브라우저에서 `http://localhost:3001` 접속

## 프로젝트 구조

```
english_agents/
├── apps/
│   ├── backend/         # NestJS 백엔드 서버
│   ├── frontend/        # Next.js 프론트엔드
│   └── types/          # 공유 TypeScript 타입 정의
├── documents/          # 프로젝트 문서
└── tasks/             # 작업 진행 상황
```

## 주요 컴포넌트

### AI 에이전트 네트워크

- **대화 에이전트 (Alex)**: 사용자와 직접 대화하는 메인 페르소나
- **뉴스 에이전트**: 관심사 기반 뉴스 검색
- **분석 에이전트**: 뉴스 기사 분석 및 학습 자료 생성
- **교정 에이전트**: 실시간 영어 문법 교정
- **오케스트레이터**: 전체 에이전트 네트워크 조율

### 사용자 프로필 관리

- 사용자 이름, 관심사, 학습 수준 설정
- 학습 히스토리 및 교정 기록 관리

## API

자세한 API 명세는 [documents/api.md](documents/api.md)를 참조하세요.

## 라이선스

MIT License
