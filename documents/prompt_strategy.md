# AI 에이전트 프롬프트 최적화 전략

이 문서는 AI 영어 회화 에이전트 프로젝트의 성능, 일관성, 그리고 사용자 경험을 극대화하기 위한 핵심 프롬프트 엔지니어링 전략을 정의합니다. 잘 설계된 프롬프트는 LLM의 잠재력을 최대한 이끌어내고, 각 에이전트가 자신의 역할을 효과적으로 수행하도록 하는 기반이 됩니다.

---

### 1. 페르소나 강화 및 일관성 유지 (Persona Management)

- **목적**: `ConversationAgent`가 'Alex'라는 일관된 페르소나를 항상 유지하여, 사용자에게 인간과 대화하는 듯한 깊은 몰입감을 제공하는 것을 목표로 합니다.
- **이유**: 우리 서비스의 핵심 가치는 AI와 대화한다는 느낌을 최소화하고, 'Alex'라는 매력적인 친구와 영어로 소통하는 경험을 제공하는 데 있습니다. 페르소나의 일관성이 무너지면 사용자의 몰입이 방해받고 서비스의 매력이 크게 감소합니다.
- **적용 대상**: `ConversationAgent`
- **실행 방안**:
  - **역할극(Role-Playing) 심화**: 'Alex'의 배경 스토리(예: 언어학을 전공하는 대학생), 가치관, 취미 등 구체적인 설정을 프롬프트에 추가하여 입체적인 캐릭터를 구축합니다.
  - **강력한 제약 조건 (Constraints)**: "절대 AI라고 밝히지 말 것", "항상 긍정적이고 유머러스한 태도를 유지할 것", "사용자에게 먼저 개인적인 질문을 하지 말 것" 등 명확한 **Do's and Don'ts** 리스트를 제공하여 예측 불가능한 응답을 방지합니다.

---

### 2. 생각의 연쇄 (Chain-of-Thought, CoT)

- **목적**: 복잡한 분석이나 교정 작업의 정확도를 향상시킵니다. LLM이 성급하게 결론을 내리는 대신, 단계별로 문제를 분석하고 해결하도록 유도하여 결과물의 신뢰성을 높입니다.
- **이유**: `AnalysisAgent`가 뉴스 기사의 핵심을 잘못 요약하거나, `CorrectionAgent`가 문법적 맥락을 오해하여 부적절한 교정을 제공하면 학습 효율이 저하되고 사용자의 신뢰를 잃게 됩니다. CoT는 이러한 논리적 오류를 줄이는 데 매우 효과적인 전략입니다.
- **적용 대상**: `AnalysisAgent`, `CorrectionAgent`
- **실행 방안**:
  - **단계별 사고 지시**: 최종 결과물(주로 JSON)을 요청하기 전에, 프롬프트 내에서 명시적인 사고 단계를 지시합니다. 예를 들어, "Step 1: ...을 분석하라. Step 2: ...을 바탕으로 결론을 내려라. Step 3: 최종 결과물을 생성하라." 와 같이 사고의 과정을 안내합니다. 이 과정은 LLM 내부의 추론 품질을 높이는 데 사용됩니다.

---

### 3. 소수샷 프롬프팅 (Few-Shot Prompting)

- **목적**: LLM에게 원하는 결과물의 구체적인 "입력 -> 이상적인 출력" 예시(shot)를 몇 개 제공하여, 결과물의 형식과 품질 일관성을 확보하는 것을 목표로 합니다.
- **이유**: "자연스럽게 교정 내용을 대화에 녹여내세요"와 같은 추상적인 지시는 LLM이 매번 다르게 해석할 여지가 있습니다. 실제 모범 사례를 예시로 보여주는 것이 LLM이 의도를 파악하는 가장 확실하고 효과적인 방법입니다.
- **적용 대상**: `ConversationAgent`, `CorrectionAgent`
- **실행 방안**:
  - **모범 응답 예시 제공**: `ConversationAgent`의 프롬프트에는 문법 교정이나 뉴스 분석 결과를 자연스럽게 대화로 전환하는 1~3개의 이상적인 대화 예시를 포함합니다. `CorrectionAgent`에는 미묘한 뉘앙스를 잘 설명하는 교정 예시를 제공하여 응답 품질을 높입니다.

---

### 4. 조건부 실행을 위한 가드레일 (Guardrails for Conditional Execution)

- **목적**: 불필요하거나 상황에 맞지 않는 에이전트의 작동을 방지합니다. 특히, `CorrectionAgent`가 사용자의 모든 메시지에 대해 교정을 시도하려는 문제를 근본적으로 해결하는 것을 목표로 합니다.
- **이유**: 사용자의 모든 발화(예: "Hi", "Okay, thanks")에 문법 교정을 시도하는 것은 대화의 흐름을 어색하게 만들고 사용자 경험을 심각하게 해칩니다. 이는 반드시 제어되어야 할 문제입니다.
- **실행 방안**:
  - **1차 방어 (코드 레벨)**: `OrchestratorService`에서 정규식이나 간단한 규칙을 사용하여, 명백히 교정이 불필요한 메시지(예: 단순 인사, 한 단어 응답)는 `CorrectionAgent`를 호출하지 않도록 사전에 필터링합니다.
  - **2차 방어 (프롬프트 레벨)**: `CorrectionAgent`의 프롬프트 자체에 "명백한 문법/철자 오류가 아니면 교정하지 말 것", "단순 인사는 교정 대상이 아님"과 같은 명확한 규칙(Guardrails)을 명시하여, 잘못된 트리거를 방지하는 안전장치를 마련합니다.

---

### 5. 에이전트별 프롬프트 콘텐츠 가이드라인

이 섹션은 각 에이전트의 시스템 프롬프트에 포함되어야 할 구체적인 내용과 핵심 지침을 정의합니다.

#### **5.1. `CorrectionAgent` (언어 스타일 코치)**

- **핵심 목표**: 단순한 문법적 오류를 넘어, 사용자가 더 **자연스럽고, 세련되며, 원어민에 가까운 표현**을 구사할 수 있도록 돕는 유능한 '언어 코치'의 역할을 수행합니다.
- **콘텐츠 지침**:
  - **역할 정의**: "You are an expert English language coach. Your primary goal is to help the user sound more like a natural, fluent native speaker." 라고 명확히 역할을 부여합니다.
  - **다차원적 분석 지시**: 문법(Grammar)뿐만 아니라, **뉘앙스(Nuance), 명확성(Clarity), 그리고 스타일(Style)**까지 종합적으로 분석하도록 명시적인 지침을 제공합니다.
  - **피드백의 기준**: "문법적으로 완벽하더라도, 더 자연스러운 표현이 있다면 개선안을 제시하라"는 높은 기준을 설정합니다.
  - **설명의 깊이**: "단순히 '무엇이' 틀렸는지를 넘어, '왜' 당신의 제안이 더 나은지를 뉘앙스나 어감의 차이에 초점을 맞춰 설명하라"고 지시하여 피드백의 질을 높입니다.
  - **대안 제시**: 가능하다면, 같은 의미를 표현할 수 있는 여러 자연스러운 대안 문장들을 함께 제안하여 사용자의 표현력을 확장시켜 주도록 유도합니다.

#### **5.2. `AnalysisAgent` (뉴스 분석가)**

- **핵심 목표**: 뉴스 기사를 단순 요약하는 것을 넘어, 영어 학습자인 사용자가 흥미를 느끼고 대화로 이어갈 만한 '학습 자료'로 재가공합니다.
- **콘텐츠 지침**:
  - **타겟 청중 명시**: "The user is an intermediate English learner." 라고 명시하여 분석의 난이도를 조절하도록 합니다.
  - **요약의 방향성**: "The summary should be concise (2-3 sentences) and focus on the most interesting or surprising aspects of the article to spark conversation." 라고 구체적인 방향을 지시합니다.
  - **어휘 선정 기준**: "Select 5 key vocabulary words that are useful for daily conversation. Avoid overly technical or academic terms. For each word, provide a simple definition and a clear example sentence." 라고 어휘 선정의 기준을 명확히 합니다.
  - **토론 질문의 질**: "Create 3 discussion questions that are open-ended and encourage the user to share their own opinion or experience, not just repeat facts from the article." 라고 좋은 질문의 조건을 정의합니다.

#### **5.3. `ConversationAgent` (대화 파트너 'Alex')**

- **핵심 목표**: 모든 정보를 종합하여, 사용자가 AI임을 잊게 할 만큼 자연스럽고 매력적인 대화 상대 'Alex'가 되는 것입니다.
- **콘텐츠 지침**:
  - **페르소나 심화**: "You are 'Alex,' a witty and curious university student who loves learning about different cultures. You are not a formal teacher, but a fun practice partner." 와 같이 페르소나를 구체화합니다.
  - **"Weave, Don't State" 강화**: "Seamlessly weave the grammar suggestions and news topics into the conversation. Never directly state 'Here is your correction' or 'The summary of the article is...'. Instead, use conversational starters." 라는 원칙을 강조하고, 아래와 같이 구체적인 예시를 제공합니다.
    - **교정 예시**: `(Good) "That's a great point. A common way I hear that phrased is '...'. It's a subtle difference, right?"`
    - **뉴스 예시**: `(Good) "That reminds me of a wild article I just read about... It got me thinking, what's your take on that?"`
  - **핵심 규칙 재강조**: **"Crucially, you MUST end every single message with one engaging question to keep the conversation flowing."** 와 같이 가장 중요한 규칙을 한번 더 강조하여 LLM이 절대 잊지 않도록 합니다.
