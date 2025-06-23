# AI Agent 개발 작업 목록

이 문서는 AI 영어 회화 에이전트 프로젝트 개발을 위한 작업 순서와 내용을 정의합니다.

---

### Phase 1: 프로젝트 기반 설정 (Foundation)

- [x] **1. PNPM 모노레포 환경 설정**: `pnpm init`, `pnpm-workspace.yaml` 설정, `apps` 및 `packages` 디렉토리 구조 생성
- [x] **2. 공유 타입 패키지 생성**: `apps/types`에 `api.md` 기반의 `ChatMessage`, `UserProfile` 등 공용 타입 인터페이스 정의

---

### Phase 2: 백엔드 개발 (Backend First)

- [x] **3. Nest.js 백엔드 프로젝트 초기화**: `apps/backend`에 Nest.js 프로젝트를 생성하고, `apps/types` 공유 패키지 연동
- [x] **4. Mock API 엔드포인트 구현**: `api.md` 명세에 따라 `/api/profile`, `/api/chat` 컨트롤러 및 라우팅 설정 (초기에는 Mock 데이터 반환)
- [x] **5. 로컬 스토리지 서비스 구현**: `user_profile.json` 파일을 읽고 쓰는 `StorageService`를 구현하고 Profile API에 연동
- [ ] **6. 개별 AI 에이전트 서비스 구현**: LangChain.js와 Gemini API를 사용하여 `NewsAgent`, `CorrectionAgent`, `ConversationAgent` 등 `agent_network.md`에 명시된 각 에이전트 로직을 서비스로 구현
- [ ] **7. 오케스트레이터 서비스 구현**: 개별 에이전트 서비스를 순서대로 호출하고, 최종 결과를 스트리밍으로 반환하는 `OrchestratorService`를 구현하여 `/api/chat` API에 연결

---

### Phase 3: 프론트엔드 개발 (Frontend)

- [ ] **8. Next.js 프론트엔드 프로젝트 초기화**: `apps/frontend`에 Next.js(App Router) 프로젝트를 생성하고, `packages/types` 공유 패키지 연동
- [ ] **9. 채팅 UI 컴포넌트 구현**: 대화 기록, 메시지 입력창, 전송 버튼 등 기본적인 채팅 UI를 정적 컴포넌트로 구현 (e.g., Tailwind CSS 사용)
- [ ] **10. API 연동 및 스트리밍 처리**: 백엔드 `/api/chat` API와 연동하고, Server-Sent Events(SSE)로 수신되는 응답을 실시간으로 화면에 렌더링
- [ ] **11. 음성 입출력 기능 구현**: Web Speech API를 사용하여 음성-텍스트 변환(STT) 및 텍스트-음성 변환(TTS) 기능 구현

---

### Phase 4: 최종 작업 (Finalization)

- [ ] **12. 환경 설정 및 에러 처리**: Gemini API 키 등을 위한 `.env` 파일 설정, 전체적인 API 요청 및 응답에 대한 에러 처리 로직 보강
