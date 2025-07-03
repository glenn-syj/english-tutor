# Progress - 0.0.0-c (Issue #3)

## AI 에이전트 아키텍처 고도화 작업 목록

---

### Milestone: LangGraph 도입을 통한 에이전트 오케스트레이션 고도화

**개요:**
현재 `OrchestratorService`에서 수동으로 관리하고 있는 AI 에이전트(`CorrectionAgent`, `AnalysisAgent`, `ConversationAgent`) 간의 상호작용 및 워크플로우를 LangGraph 프레임워크를 도입하여 고도화하고자 합니다. 이를 통해 더욱 유연하고 확장 가능한 에이전트 오케스트레이션 시스템을 구축하고, 복잡한 대화 흐름 및 장기 컨텍스트 관리를 위한 기반을 마련합니다.

**문제점 (Motivation):**

- 현재 `OrchestratorService`의 에이전트 호출 및 데이터 전달 로직이 명시적인 코드 형태로 구현되어 있어, 새로운 에이전트 추가 또는 복잡한 조건부/반복 흐름 구현 시 유지보수 및 확장이 어려울 수 있습니다.
- 에이전트 간의 상태 관리 및 데이터 공유가 명확하게 구조화되어 있지 않아, 향후 장기 컨텍스트(벡터 DB 연동)와 같은 기능을 통합할 때 복잡도가 증가할 수 있습니다.

**목표 (Goals):**

1.  `OrchestratorService`의 핵심 로직을 LangGraph 기반으로 재구성하여 에이전트 워크플로우를 그래프 형태로 정의합니다.
2.  각 AI 에이전트(`CorrectionAgent`, `AnalysisAgent`, `ConversationAgent`)를 LangGraph의 노드(Node)로 통합합니다.
3.  에이전트 간의 데이터 흐름 및 조건부 전환을 LangGraph의 엣지(Edge)와 상태(State) 관리를 통해 명확하게 구현합니다.
4.  향후 벡터 데이터베이스를 활용한 장기 컨텍스트 관리를 위한 아키텍처적 기반을 마련합니다.

**핵심 과제 (Key Tasks):**

1.  **시스템 설계 및 구현**: LangGraph 기반의 오케스트레이션 시스템 설계 및 구현
2.  **에이전트 노드 통합**: 기존 에이전트의 LangGraph 노드 통합
3.  **워크플로우 흐름 제어**: 워크플로우의 상태 관리 및 흐름 제어 구현

---

### Phase 1: LangGraph 도입 및 기본 워크플로우 구성

이 단계의 목표는 LangGraph를 프로젝트에 통합하고, 기존 `OrchestratorService`의 기본적인 에이전트 오케스트레이션 로직을 LangGraph 기반으로 전환하는 것입니다.

- [ ] **1. LangGraph 환경 설정 및 의존성 관리**

  - [x] **1.1. LangGraph 라이브러리 설치** (`package.json`에 dependencies 추가)
  - [x] **1.2. 프로젝트 내 LangGraph 관련 초기 설정**

- [ ] **2. OrchestratorService 리팩토링 및 LangGraph 통합**

  - [ ] **2.1. `OrchestratorService` 내부에 LangGraph `Graph` 또는 `StatefulGraph` 정의**
  - [ ] **2.2. 기존 각 에이전트(`CorrectionAgent`, `AnalysisAgent`, `ConversationAgent`)의 기능을 LangGraph 노드(callable function)로 래핑**
  - [ ] **2.3. 에이전트 간 공유될 상태(예: 사용자 메시지, 교정 결과, 분석 결과 등) 정의 및 관리**

- [ ] **3. 에이전트 간 흐름 제어 구현**

  - [ ] **3.1. 에이전트 간의 순서 및 조건부 로직을 엣지(edge)로 정의** (예: 교정 결과에 따른 분기)
  - [ ] **3.2. LangGraph 워크플로우 테스트 및 기존 기능과의 호환성 검증**

- [ ] **4. (선택 사항) LangGraph 워크플로우 시각화**
  - [ ] **4.1. LangGraph의 시각화 도구를 활용하여 워크플로우 문서화 또는 디버깅 활용**

### 기대 효과 (Expected Outcomes)

- 에이전트 오케스트레이션 로직의 명확성과 모듈성 향상
- 복잡한 대화 흐름(예: 반복, 재시도, 병렬 처리) 구현 용이성 증대
- 시스템의 확장성 및 유지보수성 개선
- 벡터 DB 연동을 통한 장기 컨텍스트 기반의 개인화된 학습 경험 제공을 위한 견고한 기반 마련

### 참고 자료 (References)

- LangGraph 공식 문서: [https://langchain-ai.github.io/langgraph/](https://langchain-ai.github.io/langgraph/)
- (필요시) 현재 `OrchestratorService` 코드 레퍼런스
