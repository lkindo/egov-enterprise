# 문서 관리 정책 (Documentation Policy)

> 본 문서는 `GEMINI.md` 섹션 11에서 분리됨.

모든 새로운 문서는 다음의 구조와 규칙을 엄격히 준수하여 생성한다.

## 저장 위치

| 경로 | 용도 |
|------|------|
| `docs/01-product/` | 제품 정의, 비즈니스 로직, 기획서 (PRD 등) |
| `docs/02-architecture/` | 아키텍처 설계, 테크 스택, 설계서 (TRD, LLD) |
| `docs/03-guides/` | 개발 가이드, 워크플로우, 테스트 지침 |
| `docs/04-operations/` | 운영 매뉴얼, 성능 최적화, 배포 가이드 |
| `docs/archived/` | 구버전 문서 보관 |

## 규칙

- **파일명 규칙**: 반드시 `kebab-case.md` 형식을 사용한다. (예: `new-feature-guide.md`)
- **인덱스 업데이트**: 새로운 영구 문서를 생성한 후에는 반드시 `conductor/index.md`의 지식 베이스(Knowledge Base) 섹션에 해당 링크를 추가하여 탐색 가능하게 만든다.
