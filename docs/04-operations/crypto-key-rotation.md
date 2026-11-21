# 암호화·서명 키 로테이션 런북

§1~§6은 애플리케이션의 `ALGORITHM_KEY`로 암호화하는 `tb_user_info.user_enrrno` 레거시 ARIA 경로에 적용하고, §7은 `tb_user_info.user_enrrno`의 RRNO v2(`AES-256-GCM`) 키링에, §8은 JWT ES256 비대칭 키링(ADR-0060) 회전과 2차 배포 전환에 적용한다.
TLS 인증서, SSH 키, provider credential 폐기는 각 provider 런북과 [.agent/memory/known-gaps.md](../../.agent/memory/known-gaps.md)에서 관리한다.

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
WHERE user_enrrno IS NOT NULL AND btrim(user_enrrno) <> '';
```

행 수와 확인 시각만 운영 기록에 남기고 user_enrrno 값이나 암호문을 일반 로그·문서에 복사하지 않는다.

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
- `WHERE <pk>=? AND user_enrrno=?` 같은 compare-and-set으로 동시 변경을 감지한다.
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

## 7. RRNO v2 키링(`AES-256-GCM`) 로테이션과 데이터 이관(`rrno-aes-gcm-v2`)

온라인 애플리케이션의 `RrnoKeyring`과 `RrnoEncryptionConverter`는 레거시 ARIA(`ALGORITHM_KEY`)에 더해 다중 키 `AES-256-GCM` 봉투(`v2:<keyId>:<nonce>:<ciphertext>`)를 지원한다.

### 7.1 온라인 2단계 롤링 회전(`RRNO_ACTIVE_KEY_ID` · `RRNO_KEYS_JSON`)

- `RRNO_ACTIVE_KEY_ID`: `[A-Za-z0-9_-]{1,32}` 형식의 활성 암호화 키 식별자
- `RRNO_KEYS_JSON`: 최대 16개 키를 담은 JSON 객체(값은 32바이트 AES 키의 44자 표준 Base64)
- 둘 중 하나만 설정하거나 `RRNO_ACTIVE_KEY_ID`가 `RRNO_KEYS_JSON`에 없으면 기동 시 즉시 실패한다(fail-closed).
- 운영 배포(`scripts/deploy.sh`)는 2026-11-17 부터 두 값을 **필수**로 요구한다 — 비어 있으면 이미지 pull 전에 멈춘다. 키링이 없으면 앱은 새 값을 종전 ARIA 유틸(IV·무결성 없음, 같은 값은 같은 암호문)로 암호화하기 때문이다. 키를 처음 켜도 기존 ARIA 암호문은 그대로 읽히고 새로 쓰는 값부터 v2 봉투가 된다. 키는 §2 와 같이 `openssl rand -base64 32` 로 만들고 MFA 키와 같은 수준으로 백업한다(잃으면 v2 값을 읽지 못한다).
- `scripts/deploy.sh`는 이미지 pull 전에 `jq`로 쌍 일치·keyId(`[A-Za-z0-9_-]{1,32}`, 최대 16개)·44자 표준 Base64·활성 키 포함 여부를 사전 검증한다(값 원문은 출력하지 않는다). 개발·격리 스모크는 이 스크립트를 쓰지 않아 키링 없이 ARIA 로 동작한다.

1. **키 추가 배포**: 기존 `RRNO_ACTIVE_KEY_ID=<old>`를 유지한 채 `RRNO_KEYS_JSON`에 `<new>` 키를 먼저 추가해 모든 인스턴스가 새 키를 복호화할 수 있게 배포한다.
2. **활성 키 전환**: 모든 인스턴스 반영을 확인한 뒤 `RRNO_ACTIVE_KEY_ID=<new>`로 전환해 신규 저장·수정을 새 키로 암호화한다. 기존 `<old>` 키는 `RRNO_KEYS_JSON`에 남겨 둔다.
3. **재암호화 및 구 키 제거**: DB에서 `v2:<old>:` 접두 행을 모두 `<new>`로 재암호화해 잔여 건수가 0임을 확인한 뒤에만 `RRNO_KEYS_JSON`에서 `<old>` 키를 제거한다.

### 7.2 데이터 이관(`migration-tool` `rrno-aes-gcm-v2` · `tools/migration-workspace`)

- 매핑의 `tb_user_info.user_enrrno`는 `encrypt: aria-egov-v1`(`MIGRATION_ALGORITHM_KEY`) 또는 `encrypt: rrno-aes-gcm-v2`(`MIGRATION_RRNO_ACTIVE_KEY_ID`, `MIGRATION_RRNO_KEYS_JSON`)를 선언할 수 있다.
- `ColumnProtector.forRun`은 `rrno-aes-gcm-v2` 대상 컬럼이 있으면 실행 시작 전 두 환경 변수를 검증하고, 행 적재 전 `v2:` 정식 봉투 형식과 복호화 왕복을 확인한다(실패 시 키 원문 없이 중단).
- v2 암호문은 암호화마다 nonce 가 달라, 재개·검증 체크섬은 암호문 대신 활성 키에서 끌어낸 HMAC 키로 만든 평문 지문을 쓴다(`ProtectedRowChecksum`, 2026-11-21 — 종전에는 같은 run 의 재개·재실행이 커밋된 행마다 checksum 불일치로 멈췄다). 지문에는 그 암호문의 키 ID 가 실리므로 **한 run 을 재개하는 동안 `MIGRATION_RRNO_ACTIVE_KEY_ID` 를 바꾸지 않는다** — 바꾸면 재개가 checksum 불일치로 멈추고(닫힌 쪽), 대상 값이 같은 평문의 다른 키 암호문으로 바뀌어도 검증이 PASS 하지 않는다. load 의 검증도 같은 키링이 있어야 PASS 를 낸다(키링이 없으면 run 유무와 무관하게 FAIL). 이 변경 전에 v2 행을 커밋한 run 은 체크포인트가 암호문 기준이라 종전처럼 재개할 수 없다 — 새 run 으로 다시 적재한다.
- `tools/migration-workspace`는 보호 키를 디스크(`workspace.json`)나 AI 문맥에 남기지 않고 세션 메모리(`/api/protection`)에만 보관하며 `dry-run`·`commit` 대상 적재 실행 환경에만 주입한다.

## 완료 체크리스트

- [ ] 실행 직전 대상 행 수 확인
- [ ] 새 키를 secret manager에 저장하고 원문 비노출 확인
- [ ] 백업 복구 가능성 확인
- [ ] 대상이 있으면 dry-run 100% 성공과 일회성 도구 acceptance contract 충족
- [ ] 새 키 단독 전체 복호화 및 대표 읽기·쓰기 성공
- [ ] old key 제거 후 재검증
- [ ] 임시 자산·구 키의 승인된 폐기 확인

## 8. JWT 비대칭 서명 키링(ES256, ADR-0060) 로테이션과 2차 배포 전환

백엔드(`JwtTokenProvider`)만 ES256(P-256) 개인키 키링으로 새 액세스·리프레시 토큰을 서명하고, Next 프록시(`frontend/src/proxy.ts`)는 공개키(SPKI)만 보유해 검증한다.

### 8.1 계약과 운영 강제

- 백엔드 전용(개인키): `JWT_SIGNING_ACTIVE_KID`(`^[A-Za-z0-9._-]{1,64}$`), `JWT_SIGNING_KEYS_JSON`(`{"<kid>":"<PKCS#8 DER Base64>"}`, 최대 16개)
- Next 전용(공개키): `JWT_VERIFY_KEYS_JSON`(`{"<kid>":"<SPKI DER Base64>"}`, 최대 16개) — `JWT_SIGNING_*`는 Next 컨테이너·자식 프로세스에 전달하지 않는다.
- 운영(`prod` 오버레이·`scripts/deploy.sh`)은 두 키링과 `ALLOW_DEV_JWT_VERIFY_KEYS=false`를 강제하고, `deploy.sh`는 이미지 pull 전에 개인키 DER에서 유도한 SPKI 공개키와 `JWT_VERIFY_KEYS_JSON`의 일치·비개발 키 여부를 `openssl pkey`와 `jq`로 검증한다.
- 양쪽 기동·검증 로그는 `spki sha256[:8]` 공개키 요약 해시(백엔드 `verifyKeyFingerprints`, Next `spkiSha8`)만 출력해 키 원문 노출 없이 설정 일치를 대조할 수 있다.

### 8.2 무중단 키쌍 로테이션(3단계 롤링)

```bash
# 새 P-256 개인키(PKCS#8 DER Base64)와 공개키(SPKI DER Base64) 생성 예시
# OpenSSL 3.x는 genpkey -outform DER가 SEC1 ECPrivateKey를 낼 수 있으므로 pkcs8 -topk8로 명시 변환한다.
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out jwt-next.pem
openssl pkcs8 -topk8 -nocrypt -in jwt-next.pem -outform DER -out jwt-next.pkcs8.der
openssl pkey -in jwt-next.pem -pubout -outform DER -out jwt-next.spki.der
base64 -w0 jwt-next.pkcs8.der; echo
base64 -w0 jwt-next.spki.der; echo
rm -f jwt-next.pem jwt-next.pkcs8.der jwt-next.spki.der
```

1. **공개키 선배포**: 기존 `<old-kid>`를 유지한 채 백엔드 `JWT_SIGNING_KEYS_JSON`과 Next `JWT_VERIFY_KEYS_JSON`에 `<new-kid>` 공개키/개인키를 추가하고, 먼저 Next(또는 양쪽)에 `<new-kid>` 공개키가 반영됐는지 로그의 `verifyKeyFingerprints`·`spkiSha8`(`spki sha256[:8]`) 값으로 확인한다.
2. **활성 키 전환**: `JWT_SIGNING_ACTIVE_KID=<new-kid>`로 백엔드를 재배포해 신규 발급 토큰을 `<new-kid>`로 서명한다. `<old-kid>`는 두 키링에 남겨 기존 토큰을 계속 검증한다.
3. **구 키 제거**: 최대 리프레시 토큰 수명(기본 7일)이 지난 뒤 두 쪽 키링에서 `<old-kid>`를 제거하고 재배포한다.

### 8.3 2차 배포 전환(HMAC 수용 종료)

1. 1차 배포 완료 후 리프레시 토큰 최대 수명(기본 7일) 이상 경과한 시점에 전환 창을 잡는다.
2. 백엔드·Next 모두 `JWT_ACCEPT_LEGACY_HMAC=false`로 배포해 `HS256/384/512` 수용을 끄고, ES256 단독 검증 상태로 로그인·재발급·화면 이동을 확인한다.
3. 이상이 없으면 2차 배포 후속 정리에서 `docker-compose.prod.yml`·`application-prod.yml`·`scripts/deploy.sh`·`frontend/src/proxy.ts`·`JwtTokenProvider`의 `JWT_SECRET` 필수 전달 및 HMAC 레거시 경로를 제거한다.
