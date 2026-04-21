# Task: 프로젝트 전용 룰셋(`GEMINI.md`) 설정 및 최적화

- **날짜**: 2026-04-18
- **상태**: 완료 (Completed)
- **에이전트**: Antigravity

## 요구사항
- 글로벌 룰셋(`user_global`)을 참조하여 프로젝트(`egov-enterprise`) 전용 룰셋(`GEMINI.md`) 생성.
- 프로젝트 정밀 분석을 통한 구조적 한계와 규칙들을 도출하여 고도화.

## 작업 내용
1. **분석**:
   - `build.gradle`, `package.json`, `next.config.ts`, `Makefile` 내부의 세부 옵션들 검토.
   - 프론트엔드의 `Storybook`, `Lighthouse`, 번들 사이즈 분석 옵션 식별.
   - 백엔드의 중앙 예외 처리 메커니즘(`GlobalExceptionHandler`) 식별.
2. **구현 (GEMINI.md 고도화)**:
   - **아키텍처 및 예외처리**: `GlobalExceptionHandler`와 프론트엔드의 `ApiResponse` 래처를 연동한 설계 의도 명문화.
   - **UI 및 성능 환경**: UI 개발 시 `Storybook` 활용 권장 문구 추가, 성능 평가 시 `Lighthouse` 및 `bundle analyzer`(`ANALYZE=true`) 안내.
   - **타임존**: 글로벌하게 `TZ=Asia/Seoul`를 따르도록 환경 규약 추가.
   - 명령어 단락에 `make coverage`, `npm run storybook` 등 프로젝트 씬에 특화된 유용한 명령 구문 추가.
3. **최종 최적화 (Advanced Optimization)**:
   - **상태 관리 분할**: Server State(Query), UI State(Context), URL State(SearchParam)의 경계를 명확히 분리.
   - **도메인 무결성**: Entity의 컨트롤러 노출 금지 및 DTO 매핑 규칙 상술.
   - **성능 가속**: 무거운 UI(`Topology`, `Map`)의 `next/dynamic` 활용 지침 및 Image 최적화 추가.
   - **에이전트 가이드**: 401 권한 싱크, Codegen 갱신 등 잦은 실수에 대한 트러블슈팅 매트릭스 삽입.

## 체크리스트
- [x] **Think** — 요구사항 분석 및 기존 코드 영향 파악
- [x] **Plan** — 추가적인 디테일 탐색 및 문서 고도화 방안 수립
- [x] **Implement** — `GEMINI.md` 최종본 검토 및 작성, Storybook/Timezone 등 세분화
- [x] **Test** — 적용 내용 프로젝트 현실과 일치 여부 검증
- [x] **Summarize** — 작업 종료 및 리뷰

## 다음 단계
- [ ] 본 규칙에 의거하여 프론트/백엔드 실제 기능개발 검토 및 수행
