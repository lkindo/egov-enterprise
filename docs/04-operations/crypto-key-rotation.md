# ARIA PII 마스터 키 로테이션 런북

이 런북은 애플리케이션의 `ALGORITHM_KEY`로 암호화하는 `tb_user_info.rrno`에만 적용한다.
SSH 키, JWT secret, TLS 인증서, provider credential의 회전 절차가 아니다. 외부 credential 폐기는
각 provider 런북과 [.agent/memory/known-gaps.md](../../.agent/memory/known-gaps.md)에서 관리한다.

## 현재 구현 계약

- production은 [`application-prod.yml`](../../api-server/src/main/resources/application-prod.yml)에서
  `ALGORITHM_KEY`를 무기본값으로 요구한다.
- [`CryptoUtil`](../../foundation/src/main/java/nuri/foundation/core/util/CryptoUtil.java)은 활성 키로 먼저 복호화하고,
  `OLD_ALGORITHM_KEY`가 있을 때만 이전 키로 한 번 폴백한다. 키 원문은 로그에 남기지 않는다.
- [`RrnoEncryptionConverter`](../../business-core/src/main/java/nuri/business/domain/common/RrnoEncryptionConverter.java)는
  암호화·복호화 실패를 fail-closed 처리한다. 명확한 주민등록번호 형식의 과거 평문만 제한적으로 읽는다.
- 운영 compose는 [`docker-compose.prod.yml`](../../docker-compose.prod.yml)에서 활성 키를 필수로 받고,
  이전 키는 회전 창에서만 전달한다.
- 상시 재암호화 runner는 구현돼 있지 않다. 대상 행이 있으면 아래 acceptance contract를 만족하는 일회성
  도구를 먼저 구현·검토·리허설해야 한다.

## 1. 사전 승인과 범위 확인

키 변경은 기존 PII의 복호화 가능성에 영향을 주는 운영 변경이다. 운영자 승인, 유지보수 창, 백업·복구 소유자를
먼저 확정한다. 실행 직전 read-only census로 대상 수를 확인한다.

```sql
SELECT count(*) AS rrno_rows
FROM tb_user_info
WHERE rrno IS NOT NULL AND btrim(rrno) <> '';
```

행 수와 확인 시각만 운영 기록에 남기고 rrno 값이나 암호문을 일반 로그·문서에 복사하지 않는다.

## 2. 새 키 생성·보관

```bash
openssl rand -base64 32
```

- 새 값은 승인된 secret manager에 넣고 source, `.env`, shell history, CI log에 남기지 않는다.
- 현재 활성 키는 회전이 끝날 때까지 복구 가능한 secure location에 유지한다.
- backup의 암호화·접근통제와 복구 시험을 확인한다. 백업만 만들고 복원 가능성을 확인하지 않으면 rollback 증거가 아니다.

## 3. 대상 행이 0일 때

1. 직전 census가 0인지 다시 확인한다.
2. `ALGORITHM_KEY=<new>`, `OLD_ALGORITHM_KEY` 미설정 상태로 배포한다.
3. production 기동, health, PII가 없는 대표 사용자 읽기·쓰기 경로를 확인한다.
4. 약한 키 경고와 복호화 실패가 없는지 확인한다.

0행이라는 과거 측정값을 재사용하지 않는다. 실행 직전 값만 유효하다.

## 4. 대상 행이 있을 때: dual-key 재암호화

새 키만 주입하면 기존 암호문을 읽을 수 없다. 다음 순서를 지키며, 일회성 도구가 준비되지 않았으면 여기서
중단하고 구현·리허설을 별도 변경으로 수행한다.

### 4.1 백업과 dry-run

1. `tb_user_info`와 관련 감사·참조 데이터를 일관된 시점으로 백업한다.
2. 격리된 복제 환경에서 `ALGORITHM_KEY=<new>`, `OLD_ALGORITHM_KEY=<old>`로 기동한다.
3. raw ciphertext를 읽어 모든 대상이 active 또는 old key로 복호화되는지 확인한다.
4. 성공 수, 실패 수, 대상 PK의 비식별 digest만 report에 남긴다. 실패가 하나라도 있으면 쓰기를 시작하지 않는다.

### 4.2 일회성 도구 acceptance contract

- JPA entity를 읽고 같은 평문을 다시 `save`하는 방식에 기대지 않는다. dirty checking이 변경 없음으로 판단해
  UPDATE를 생략할 수 있으므로 raw ciphertext를 명시적으로 교체한다.
- 읽은 암호문을 dual-key로 복호화하고 **활성 키로 다시 암호화**한다.
- `WHERE <pk>=? AND rrno=?` 같은 compare-and-set으로 동시 변경을 감지한다.
- batch별 transaction, 중단·재개 기준, 처리·실패 집계, idempotency, rollback 절차를 제공한다.
- 실패 행을 조용히 skip하고 완료로 표시하지 않는다. 전체 성공 전에는 old key를 제거하지 않는다.
- 테스트용 fixture에서 old-only ciphertext, active ciphertext, 손상값, 과거 평문, 동시 변경을 검증한다.

### 4.3 운영 실행

1. 새 키를 active, 기존 키를 old로 주입해 기동한다. 이 시점부터 신규 쓰기는 새 키를 쓴다.
2. dry-run 결과와 대상 수를 재대조한다.
3. 승인된 일회성 도구로 batch 재암호화하고 매 batch 결과를 집계한다.
4. raw DB 값이 평문 형식을 노출하지 않는지 확인한다.
5. old key를 비운 별도 검증 인스턴스에서 전 대상 복호화가 성공하는지 확인한다.

## 5. 전환 완료

1. `OLD_ALGORITHM_KEY`를 제거하고 새 키만으로 재기동한다.
2. 대표 사용자 읽기·쓰기와 전체 대상 복호화를 다시 검증한다.
3. 복호화 실패·약한 키 경고가 없는지 확인한다.
4. 운영 보존정책에 따라 구 키와 임시 도구·중간 산출물을 폐기한다. 폐기 증거는 secure channel에 남긴다.

## 6. 롤백

- 재암호화 전: 새 배포를 내리고 이전 키로 복귀한다.
- 부분 재암호화 후: dual-key 상태를 유지한 채 실패 원인을 해결하거나, 승인된 백업으로 전체 데이터를 복원하고
  이전 키로 복귀한다.
- old key를 먼저 폐기하거나 서로 다른 시점의 DB와 key를 조합하지 않는다.

## 완료 체크리스트

- [ ] 실행 직전 대상 행 수 확인
- [ ] 새 키를 secret manager에 저장하고 원문 비노출 확인
- [ ] 백업 복구 가능성 확인
- [ ] 대상이 있으면 dry-run 100% 성공과 일회성 도구 acceptance contract 충족
- [ ] 새 키 단독 전체 복호화 및 대표 읽기·쓰기 성공
- [ ] old key 제거 후 재검증
- [ ] 임시 자산·구 키의 승인된 폐기 확인
