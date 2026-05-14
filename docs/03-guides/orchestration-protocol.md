# Strict Orchestration Protocol (SOP)

## 1. 개요 (Overview)
본 프로토콜은 메인 에이전트와 서브에이전트(또는 외부 엔진) 간의 협업을 위한 **정형화된 공정(Standard Pipeline)**이다. 모든 복잡한 태스크는 아래의 **4단계 파이프라인**을 예외 없이 통과해야 하며, 각 단계의 통과 조건(Gate) 충족 여부에 따라 작업의 무결성을 담보한다.

---

## 2. 4단계 오케스트레이션 파이프라인 (The 4-Stage Pipeline)

### [Stage 1] Dispatch: 작업 설계 및 Spec 발행
- **Action**: 메인 에이전트가 요구사항을 분석하고 **Task Specification**을 작성.
- **Decision Gate**: 에이전트는 태스크의 복잡도를 판단하여 다음 두 가지 실행 방식 중 최적안을 추천하고 **사용자의 최종 승인**을 받는다.
    - **Mode A (CLI Engine)**: 신속한 UI 구현 및 단순 컴포넌트 작성 시 추천.
    - **Mode B (Depth Subagent)**: 복잡한 로직, 다중 파일 참조, 정밀 디버깅 필요 시 추천.

### [Stage 2] Execution: 선택된 모드에 따른 자율 구현
- **Option A (External CLI Engine)**:
    - 외부 엔진(Gemini CLI 등)을 통해 자율적으로 작업을 완수.
    - 메인 에이전트는 백그라운드에서 진행 상태를 모니터링.
- **Option B (Implementation Subagent)**:
    - 전용 서브에이전트에게 컨텍스트를 전달하고 깊은 추론 기반 작업 수행.
- **Gate**: 선택된 모드에서 빌드 및 린트 성공 리포트가 생성되었는가?

### [Stage 3] Audit: 기술 헌법 합치성 검사
- **Action**: 메인 에이전트가 결과물(Diff)을 분석하여 **3대 기술 헌법** 준수 여부 전수 조사.
- **Checkpoint**: 하드코딩 유무, API 표준 준수, 서버 컴포넌트 우선 원칙 등.
- **Gate**: 모든 헌법 체크리스트가 Pass 되었는가?

### [Stage 4] Verification: 증거 기반 최종 승인
- **Action**: 메인 에이전트가 실제 구동 결과(증거)를 확인하고 작업을 종료.
- **Gate**: **No Proof, No Completion** 원칙에 따른 객관적 증거(스크린샷, 로그 등)가 제출되었는가?

---

## 3. 표준 위임 명세서 (Standard Task Specification)

모든 위임 시작 전 사용자가 확인하게 될 명세 형식이다.

```text
### [SOP] TASK PROPOSAL ###
1. TARGET: {기능 경로}
2. SCOPE: {작업 범위 요약}
3. PROPOSED MODE: [Mode A: CLI] OR [Mode B: Subagent]
4. CONSTITUTION: [관련 헌법 명시]
############################
-> 위 제안대로 진행할까요?
```

---

## 4. 운영 원칙 (Operating Principles)
- **사용자 제어 우선**: 실행 방식(Mode)에 대한 사용자의 선택권을 보장한다.
- **무결성 보장**: 어떤 실행 도구를 사용하더라도 최종 검수(Audit)와 증빙(Verification)은 메인 에이전트가 책임진다.
- **예외 보고**: 파이프라인 진행 중 난항이 발생할 경우 즉시 중단하고 사용자에게 상황을 보고한다.

---
*Last Updated: 2026-05-14*
*Governed by: Enterprise Governance Constitution*
