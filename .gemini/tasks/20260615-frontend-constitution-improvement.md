# 2026-06-15 프론트엔드 UX 헌법 2차 개정 (보안 및 에러 UI)

## 1. 개요
프론트엔드 헌법 제4조(상태 관리) 및 제12조(에러 복원력)에 내포된 URL 쿼리 스트링 맹목적 사용에 따른 보안/통신 취약점 유발 문제와, 잘게 쪼개진 Error Boundary로 인한 UI 파편화(Spaghetti UI) 문제를 해결하기 위해 헌법 조항을 개정하였습니다.

## 2. 체크리스트 (Ralph Loop)
- [x] **Think** — 요구사항(보안/파편화 방지) 분석 및 헌법 1, 2차 문제점 조망
- [x] **Plan** — 제4조(상태 관리 다원화 격리), 제12조(거시적 Error Boundary 통합) 개선안 수립 및 제안
- [x] **Implement** — `frontend-ux-constitution.md` 제4조, 제12조 원문 개정 완료
- [x] **Test** — `npx tsc --noEmit` 실행하여 프론트엔드 타입 정적 무결성 훼손 없는 것 검증 (성공)
- [x] **Summarize** — 작업 결과 요약 및 사용자 보고

## 3. 세부 변경 사항
1. **URL 보안 격리 (제4조 개정)**: 
   - 페이지네이션 등 단순 공유 목적만 제한적으로 URL 쿼리 스트링 허용
   - 대용량, 민감 정보 필터는 HTTP 414 에러 방지를 위해 SessionStorage, Context, Zustand로 격리 규정 신설
   - 방대한 복합 검색 API는 백엔드의 POST 방식으로 전환 권장
2. **Error Boundary 통합 (제12조 개정)**:
   - 소형 위젯 단위의 무분별하고 파편화된 Error Boundary 강제 조항 폐지
   - 연관된 데이터가 묶이는 도메인(Domain) 단위로 거시적 에러 격리 및 글로벌 일괄 재시도(Global Retry) 원버튼 방식 명시
   - 붉은 경고창 대신 시각적 레이아웃을 유지하는 차분한 무채색의 Empty State 디자인을 Fallback UI 표준으로 규정
