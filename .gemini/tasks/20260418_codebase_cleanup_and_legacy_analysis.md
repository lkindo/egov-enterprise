# 20260418_codebase_cleanup_and_legacy_analysis

## 1. 개요
- **목표**: 모듈별 정밀 분석을 통해 불필요한/Legacy 소스 식별 및 한글 인코딩 문제 수정.
- **범위**: `api-server`, `business-suite`, `foundation`, `frontend`, `legacy` 등 전체 소스.
- **주요 점검 항목**:
    - `@deprecated` 어노테이션 클래스/메서드.
    - 미사용 Import 및 클래스.
    - 구버전자정부 표준프레임워크(eGovFrame) 잔재.
    - 한글 깨짐 현상 (EUC-KR vs UTF-8).
    - `legacy` 폴더 내 실제 사용 여부.

## 2. 체크리스트
- [x] **Think** — 요구사항 분석 및 모듈별 역할 파악
- [x] **Plan** — 점검 시나리오 수립 (Grep 패턴 등)
- [x] **Implement** — 인코딩 수정 및 분석 데이터 수집
- [x] **Test** — 수정 후 빌드 안정성 확인 (인코딩 수정본 확인 완료)
- [x] **Summarize** — 결과 보고서(Report) 생성

## 3. 진행 상황
### 2026-04-18 21:35
- 작업 시작. 루트 디렉터리 구조 파악 완료.
- `legacy` 폴더 존재 확인.
- 한글 깨짐 모니터링 및 자동 수정 루틴 준비.

### 2026-04-18 21:40
- `foundation` 모듈 내 3개 유틸리티(`EgovDateUtil`, `EgovStringUtil`, `EgovWebUtil`)의 미사용 확인.
- `nuri` 패키지 내 여러 파일에서 깨진 한글(MojiBake) 발견 및 복구 완료.
- `analysis_report.md` 작성 및 작업 종료.
