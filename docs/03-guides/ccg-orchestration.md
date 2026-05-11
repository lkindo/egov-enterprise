# CCG Orchestration (Claude + Claude + Gemini)

> 본 문서는 `GEMINI.md` 섹션 9에서 분리됨.

본 프로젝트는 **@nst173/superpowers-ccg**를 기반으로 한 오케스트레이션을 **기본 실행 프로세스**로 채택한다.
- **Claude (Antigravity)**: 오케스트레이터로서 전체 설계를 담당하며, **백엔드/시스템/인프라** 구현을 직접 수행한다.
- **Gemini (via MCP)**: **프론트엔드/UI/UX/스타일** 구현 전문가로 활용하며, `gemini` CLI를 통해 위임한다.

## 강제 사항 (위임 및 자동화)

- **자동 승인(YOLO)**: 프론트엔드 작업 위임 시 반드시 `gemini -y --skip-trust -p` 옵션을 사용하여 사용자 승인 대기 없이 자율적으로 작업을 완수한다.
- **위임 워크플로우**: 모든 위임 작업은 `[구현] -> [빌드/린트 검증] -> [테스트 실행] -> [결과 보고]`의 풀 사이클을 포함해야 한다.
- **Routing**: 모든 기능 구현 작업은 `.agent/skills/superpowers-ccg`의 워크플로우(CP0~CP4)를 따라 모델별 작업을 라우팅한다.
- **교차 검증**: 풀스택 작업 시 Claude와 Gemini의 **CROSS_VALIDATION**을 수행하여 아키텍처의 일관성을 확보한다.

## Gemini 위임 골든 프롬프트 템플릿

```text
[Task]: {요구사항}
[Context]: {관련 파일 및 API 명세}
[Protocol]: 1. 모든 수정 사항은 전체 파일 코드로 응답할 것. 2. 수정 후 반드시 빌드/린트 검증을 수행할 것.
[Final Check]: 모든 테스트가 PASS되면 "SUCCESS" 문구와 함께 요약을 보고하고 종료해.
```
