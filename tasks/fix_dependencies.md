# Task: 프런트엔드 의존성 누락 해결 (Fix Missing Frontend Dependencies)

## 진행 상태 (Progress)
- [x] 원인 분석: `@dnd-kit/core` 외 dnd-kit 관련 패키지가 `node_modules`에 없음 확인
- [x] 의존성 재설치 (`pnpm install`) - 완료
- [x] 서버 재시작 및 모듈 인식 확인 - 완료

## 상세 로그 (Logs)
- 2026-04-10: `Module not found: Can't resolve '@dnd-kit/core'` 에러 보고됨
- 2026-04-10: `frontend/node_modules/@dnd-kit` 경로 부재 확인
- 2026-04-10: `pnpm install` 성공적 실행 및 모듈 확인 (`True`)
- 2026-04-10: 서버 재시작 완료
