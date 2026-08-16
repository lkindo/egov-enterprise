# 01-product — 제품 기획

이 폴더는 [GEMINI.md](../../GEMINI.md) §6 문서 분류 규칙이 규정하는 **기획 문서**의 자리다.

---

## ⚠ 현행 제품 정의 SSOT 는 아직 없다

정직하게 기록한다: **이 폴더에는 현행 제품 정의 문서가 없다.**

| 사실 | 근거 |
|---|---|
| `01-product/` 폴더 자체가 2026-08-16 까지 존재하지 않았다 | `GEMINI.md:104` 가 5개 분류를 규정하나, 저장소 전체에서 `01-product` 문자열을 참조하는 곳은 그 한 줄뿐이었다(전량 스캔 확인) |
| 제품 요구사항 성격 문서는 **`archived/` 에만** 있다 | [PRD.MD](../archived/PRD.MD)(최종 업데이트 2026-03-12) · [TRD.MD](../archived/TRD.MD) — 마지막 커밋 `3ba3337fc`(2026-05-01) |
| 그 아카이브 문서는 현행이 아니다 | PRD 는 "Next.js 15" 를 전제하나 현재는 **16.2.12** 다. "진행률 100% 완료" 서술도 이후 8개월간의 변경(BIGINT PK 현대화 웨이브 35건, 재사용 Base 재구축 등)을 반영하지 않는다 |

**따라서**: 현재 제품이 무엇인지 알아야 한다면 `archived/PRD.MD` 를 **이력으로만** 참고하고, 실제 구현 상태는 아래 현행 문서에서 판단한다.

| 알고 싶은 것 | 현행 근거 |
|---|---|
| 이 프레임워크로 무엇을 할 수 있나 / 어떻게 시작하나 | [getting-started.md](../03-guides/getting-started.md) |
| 어디까지 구현됐나 | [README.md](../../README.md) 구현 현황(Phase) 표 |
| 코어/앱 제품 경계는 어떻게 나뉘나 | [ADR-0001](../02-architecture/decisions/ADR-0001-core-app-product-boundary.md) |
| 재사용성·확장성 수준은 | [framework-reusability-assessment.md](../02-architecture/framework-reusability-assessment.md) |
| 아직 결정되지 않은 제품 사안은 | [pending-decisions.md](../04-operations/pending-decisions.md) · [a-group-decision-recommendations.md](../02-architecture/a-group-decision-recommendations.md) |

---

## 왜 비워 두고 이 파일만 두었나

없는 것을 있는 것처럼 만들지 않기 위해서다. 이 폴더를 그럴듯한 PRD 로 채우려면 제품 의도를 **추정**해야 하는데, 추정으로 쓴 기획서는 코드보다 오래 남아 이후 판단의 근거로 인용된다 — `archived/PRD.MD` 가 "100% 완료" 라고 적힌 채 5개월 방치되어 실제로 그런 일이 일어났다.

빈 폴더에 규칙만 있는 상태(종전)와, **왜 비어 있는지와 대신 볼 곳이 적힌 상태**(현재)는 다르다. 후자는 다음 사람이 잘못된 문서를 근거로 삼는 것을 막는다.

## 제품 정의를 쓰게 된다면

- 파일명은 `kebab-case.md`(예: `product-definition.md`, `roadmap-2026h2.md`)
- 작성 후 **[docs/README.md](../README.md) 인덱스에 한 줄 추가**한다 — 인덱스에 없는 문서는 발견되지 않는다
- 문서 하단에 `Last Updated` 와 **변경 사유**를 남긴다(이 저장소의 문서 관행)
- `archived/PRD.MD` 를 되살리지 말고 **새로 쓴다**. 낡은 문서의 수치를 부분 갱신하면 어디까지가 현행인지 구분되지 않는다

---
*Last Updated: 2026-08-16 (신설 — GEMINI.md §6 이 규정하나 물리적으로 부재하던 폴더를 만들고, 현행 제품 정의 SSOT 가 없다는 사실과 대체 참조처를 명시.)*
