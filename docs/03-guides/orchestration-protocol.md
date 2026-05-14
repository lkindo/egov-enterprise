# Strict Orchestration Protocol (SOP)

## 1. 개요 (Overview)
본 프로토콜은 메인 에이전트와 서브에이전트 간의 협업을 위한 **정형화된 공정(Standard Pipeline)**이다. 작업의 복잡도와 위험도에 따라 등급을 분류하고, 등급별로 최적화된 경로를 통해 무결성과 속도를 동시에 확보한다.

---

## 2. 태스크 등급 분류 (Task Grading)

에이전트는 모든 요청 수신 시 가장 먼저 아래 기준에 따라 등급을 판정한다.

| 등급 | 정의 | 적용 경로 | 필수 게이트 |
|:---:|:---|:---:|:---|
| **L0** | 단순 오타, 스타일(CSS) 수정, 주석 추가 등 저위험 작업 | **Fast-Track** | Audit, Verification |
| **L1** | 단일 파일 로직 수정, 신규 컴포넌트 작성, 버그 수정 | **Standard** | Dispatch, Audit, Verification |
| **L2** | DB 스키마 변경, 다중 모듈 연동, 보안 관련 핵심 로직 | **Strict-SOP** | 전 단계 (Full Pipeline) |

---

## 3. 오케스트레이션 파이프라인 (The Pipeline)

### [Stage 1] Dispatch: 등급 판정 및 Spec 발행
- **Action**: 에이전트가 등급(L0~L2)을 제안하고 **Task Specification**을 작성하여 사용자 승인을 받는다.
- **Fast-Track (L0)**: 승인 절차 없이 즉시 구현 단계로 진입 가능.

### [Stage 2] Execution: 자율 구현
- **Mode A (CLI Engine)**: 신속한 UI 구현 및 단순 로직 시 활용.
- **Mode B (Subagent)**: 깊은 추론, 정밀 디버깅, 다중 파일 참조 시 활용.

### [Stage 3] Audit: 기술 헌법 합치성 검사
- **Action**: 3대 기술 헌법(DB, Backend, Frontend) 준수 여부를 전수 조사한다.
- **L0/L1**: 주요 체크리스트 기반 약식 검사 가능.
- **L2**: 헌법 전문 대조 및 상세 Audit 리포트 발행 필수.

### [Stage 4] Verification: 증거 기반 최종 승인
- **Action**: **No Proof, No Completion** 원칙에 따라 구동 증거를 제시한다.
- **증거 유형**: 터미널 로그, API 응답(JSON), 브라우저 스크린샷 등.

---

## 4. 표준 위임 명세서 (Standard Task Specification)

모든 작업 시작 시 아래 형식을 출력하여 현재 상태를 동기화한다.

```text
### [SOP] TASK PROPOSAL (Grade: L0/L1/L2) ###
1. TARGET: {기능 경로}
2. SCOPE: {작업 범위 요약}
3. PROPOSED MODE: [Direct / Mode A: CLI / Mode B: Subagent]
4. CONSTITUTION: [관련 헌법 명시]
##############################################
-> (L1/L2인 경우) 위 제안대로 진행할까요?
```

---

## 5. 운영 원칙 (Operating Principles)
- **무결성 우선**: 속도보다 중요한 것은 헌법 준수와 작동 증거이다.
- **유연한 적용**: L0 작업은 절차를 간소화하여 사용자의 흐름을 방해하지 않는다.
- **중단 및 보고**: 파이프라인 중 예상치 못한 에러 발생 시 즉시 중단하고 사용자에게 복구 방안을 묻는다.

---
*Last Updated: 2026-05-14 (Updated via Antigravity)*
*Governed by: Enterprise Governance Constitution*

