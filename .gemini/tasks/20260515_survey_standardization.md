# 20260515_survey_standardization.md

## 1. Task Objective
- 설문(Survey/Questionnaire) 도메인의 Java 레이어 전수 표준화 (v5 schema compliance)
- `qustnr` -> `srvy` 접두사 전환 및 표준 약어 적용 (`ttl`, `ymd`, `typeCd` 등)

## 2. Target Files
### Survey Info & Template
- `nuri.foundation.domain.system.service.survey.QustnrInfo`
- `nuri.foundation.domain.system.service.survey.QustnrTmplat`
- `nuri.foundation.domain.system.service.survey.QustnrInfoRepository`
- `nuri.foundation.domain.system.service.survey.QustnrTmplatRepository`

### Survey Question & Item
- `nuri.foundation.domain.system.service.survey.QustnrQesitm`
- `nuri.foundation.domain.system.service.survey.QustnrIem`
- `nuri.foundation.domain.system.service.survey.QustnrQesitmRepository`
- `nuri.foundation.domain.system.service.survey.QustnrIemRepository`

### Survey Result & Respond
- `nuri.foundation.domain.system.service.survey.QustnrRespondInfo`
- `nuri.foundation.domain.system.service.survey.QustnrRespondInfoRepository`

## 3. Standardization Rules (v5)
- `qustnr` -> `srvy`
- `sj` -> `ttl`
- `cn` -> `cn`
- `bgnde` -> `bgngYmd`
- `endde` -> `endYmd`
- `se` / `ty` -> `typeCd`
- `sn` -> `sn`
- `qesitm` -> `qitem`
- `iem` -> `item`

## 4. Progress Checklist
- [x] QustnrInfo 엔티티 및 리포지토리 표준화
- [x] QustnrQesitm / QustnrIem 엔티티 표준화
- [x] QustnrRespondInfo / QustnrTmplat 엔티티 표준화
- [x] 관련 DTO 및 서비스 레이어 동기화
- [x] 전체 빌드 검증 및 컴파일 에러 해결

## 5. Verification Log
- 2026-05-15: Task Started.
- 2026-05-15: Survey 도메인 (Info, Template, Question, Item, Respond, OnlinePoll) 전수 표준화 완료.
- 2026-05-15: Gradle 전체 모듈 컴파일 성공 확인.
