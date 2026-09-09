# 로그 보존·파기 운영 정책

이 문서는 저장소가 구현한 보존 기본값과 운영 절차를 설명한다. 최종 법적 분류·보존기간은 인수처의 개인정보
처리 규모, 데이터 성격, 산업별 규정, 내부 관리계획에 따라 개인정보 보호책임자와 법무 담당자가 확정한다.

## 법적 기준과 프로젝트 선택

2026-08-19 확인 기준 [개인정보의 안전성 확보조치 기준 제8조](https://www.law.go.kr/LSW/admRulSideInfoP.do?admRulSeq=2100000281400&chrClsCd=010201&dashNo=&docCls=jo&joBrNo=00&joNo=0008&urlMode=admRulScJoRltInfoR)는
개인정보처리시스템 접속기록을 원칙적으로 1년 이상 보관하도록 하고, 다음 중 하나면 2년 이상을 요구한다.

- 5만명 이상의 정보주체 개인정보를 처리하는 시스템
- 고유식별정보 또는 민감정보를 처리하는 시스템
- 해당 고시가 정한 기간통신사업자

또한 접속기록 점검 절차와 위·변조·도난·분실 방지 조치를 내부 관리계획으로 운영해야 한다. 이 저장소는
고유식별정보인 rrno 처리 가능성을 포함하므로 web/sys/login 로그의 제품 기본값을 **24개월**로 둔다.
이는 모든 인수처에 대한 법률 자문이나 모든 로그가 법정 접속기록이라는 단정을 뜻하지 않는다. 법령·처리 범위가
바뀌면 이 문서와 설정·코드 가드를 함께 재검토한다.

## 현재 구현

| 데이터 | 현재 처리 | 설정·제약 | 운영 확인 사항 |
|---|---|---|---|
| `tb_web_log` | 만료 배치 파기 | `web-months: 24`; 요청 URL·행위자·IP를 포함 | 실제 수집 필드가 법정 접속기록 요건을 충족하는지 확인 |
| `tb_sys_log` | 만료 배치 파기 | `sys-months: 24` | 시스템 처리 로그의 개인정보·감사 범위를 인수처가 분류 |
| `tb_login_log` | 성공 로그인 비동기 기록 + 관리자·통계 조회 + 만료 배치 파기 | `login-months: 24` | 실패·OTP 거부 등 성공 이전 경로는 현재 기록 범위가 아님 |
| `tb_user_log` | 사용자 삭제 시 정리 + 만료 백스톱 | `user-months: 24` | 접속기록이 아닌 개인 사용통계로 취급. 참조 무결성 확인 |
| `tb_privacy_log` | `@PrivacyAccess` 선언 핸들러의 성공 조회를 비동기 기록 + 만료 배치 파기 | `privacy-months: 24` (2026-09-02 편입) | 기록 대상은 애노테이션 census 가 동결한다. 종전에는 기록·파기 경로가 모두 없어 표가 늘 비어 있었다 |
| `tb_inst_cd_rcptn_log` | 이 정책 대상 아님 | 기관코드 수신 로그 | 개인정보가 유입되면 분류를 재검토 |

정본 구현:

- [`LogRetentionScheduler`](../../business-core/src/main/java/nuri/business/service/log/LogRetentionScheduler.java)
- [`AuthServiceImpl`](../../business-core/src/main/java/nuri/business/service/auth/impl/AuthServiceImpl.java)의 성공 로그인 기록과
  [`LogService`](../../business-core/src/main/java/nuri/business/service/log/LogService.java)의 비동기 저장
- [`application.yml`](../../api-server/src/main/resources/application.yml)의 `nuri.log.retention.*`
- 사용자 삭제 경로의 종속 데이터 정리

## scheduler 계약

- base 설정은 `LOG_RETENTION_ENABLED` 기본값을 `true`로 두며 test profile은 비활성화한다.
- 기본 cron은 매일 04:00 Asia/Seoul이고 `nuri.log.retention.cron`으로 바꿀 수 있다.
- web/sys/login/user 각각 24개월 기본값을 사용한다.
- 어느 보존월이든 12 미만이면 해당 삭제를 건너뛰고 WARN을 남긴다. 이 하한은 오설정에 의한 대량 파기를
  줄이는 안전장치이지, 인수처가 12개월만 설정해도 항상 적법하다는 판정기가 아니다.
- 삭제 술어와 index는 현재 repository·Flyway가 정본이다. 문서에 복사한 SQL을 임의 실행하지 않는다.

## 알림 보존 (2026-09-06, DEC-OPS-038)

`tb_user_noti`(앱 내 알림)는 로그가 아니라 사용자 통지이며 법정 보존 의무가 없다. 종전에는 사용자 탈퇴 때만 일괄 정리돼
읽은 알림도 영구 누적됐다(감사 D09-06). 로그와 같은 모양의 파기 경로를 두되 **기본 비활성**이다.

| 데이터 | 현재 처리 | 설정·제약 | 운영 확인 사항 |
|---|---|---|---|
| `tb_user_noti` (`read_yn='Y'`) | 만료 배치 파기(선택) | `nuri.notification.retention.enabled` 기본 `false`, `read-months` 기본 `0` — 1 미만이면 켜져 있어도 삭제하지 않는다 | 보존 개월 수치는 인수처 결정(PD-NOTE-003). 읽지 않은 알림은 대상이 아니다 |

정본 구현: [`NotificationRetentionScheduler`](../../business-app/src/main/java/nuri/business/service/notification/NotificationRetentionScheduler.java),
[`NotificationRepository#deleteReadBefore`](../../business-app/src/main/java/nuri/business/domain/notification/NotificationRepository.java),
[`application.yml`](../../api-server/src/main/resources/application.yml)의 `nuri.notification.retention.*`.
기본 cron 은 매일 04:30 Asia/Seoul(로그 파기 04:00 뒤)이고 `nuri.notification.retention.cron` 으로 바꿀 수 있다.

켜는 방법(2026-09-06 DEC-OPS-045): 운영 배포는 `docker-compose.prod.yml` 이 `NOTIFICATION_RETENTION_ENABLED` 와
`NOTIFICATION_RETENTION_READ_MONTHS` 를 컨테이너에 전달하므로 호스트 환경이나 `.env` 에 둘을 함께 준다.
종전에는 이 전달 경로가 없어 값을 넣어도 컨테이너에 닿지 않았다 — 즉 보존 개월을 정해도 켤 수 없었다.
`read-months` 가 1 미만이면 켜져 있어도 삭제하지 않으므로 두 값을 함께 주어야 실제로 동작한다.

⚠ 규모가 커지면 파기 술어(`read_yn='Y' AND crt_dt < :cutoff`)가 full scan 이 된다 — `tb_user_noti` 에는
현재 `ix_tb_user_noti_rcvr_id` 하나뿐이고 이 술어용 인덱스가 없다. 인덱스 신설은 DB 스키마 변경이라
보존 개월 결정과 함께 판단한다([V2_20](../../api-server/src/main/resources/db/migration/V2_20__add_log_retention_index.sql) 선례).

## 운영 적용·점검

### 보존 결정 전 읽기 전용 실측

[`retention-readiness-census.sql`](../../scripts/sql/retention-readiness-census.sql)은 읽은 알림 6개월 경과,
모든 발신·수신 사본이 삭제된 쪽지, 논리 삭제 게시글·첨부 참조 건수만 반환한다.
알림 6개월은 비교용 권고값이며 운영 파기 설정을 변경하지 않는다. 쪽지는 모든 사본의 삭제 상태를 확인하고,
상태가 null인 사본도 보존한다. 첨부 참조가 있다는 사실만으로 실물 삭제 대상으로 삼지 않는다.
PD-NOTE-001/003·PD-STORAGE-001은 복구 창과 보존 기간을 확정한 후 별도로 활성화한다.

### 로그 날짜 인덱스

[`V2_97`](../../api-server/src/main/resources/db/migration/V2_97__index_log_search_dates.sql)은
로그인 `crt_dt`, 시스템 `ocrn_ymd` 및 기존 검색의 `btrim(ocrn_ymd)`, 개인정보 `inq_dt`에 인덱스 4개를 추가한다.
2026-09-09 OCI에서 기존 날짜 인덱스 부재를 확인했다. 저장 데이터와 인가·보존 기간은 변경하지 않는다.
트랜잭션 안에서 실행하며 잠금 대기는 5초, 문장 실행은 60초로 제한한다. 실패 시 전체 롤백 후 원인을 조사한다.
대규모 복제본에서는 소요 시간과 쓰기 차단 영향을 먼저 측정하고 유지보수 창을 확보한다.
실제 OCI 적용은 대상·영향 승인 후 수행하며, 테스트 통과와 운영 적용을 구분한다.
2026-09-09 사용자 승인 후 OCI 적용을 완료했다. Flyway 2.97 성공과 인덱스 4개의 valid/ready 상태를
독립적인 읽기 전용 조회로 재확인했다. 직전 백업의 암호화·복원 검증을 마쳤고, 복원본과 OCI 각각에서
업무 테이블 81개(이력 제외)의 행 수·전체 행 해시가 적용 전후 같았다.
[`LogSearchIndexMigrationIntegrationTest`](../../api-server/src/test/java/nuri/api/schema/LogSearchIndexMigrationIntegrationTest.java)는
잠금 충돌 시 롤백, 기존 행 수 보존, PostgreSQL 조회 계획의 인덱스 사용을 검사한다.

### 1. 배포 전

1. 각 테이블이 어떤 데이터와 행위자를 기록하는지 표본 값 자체가 아닌 schema·코드로 확인한다.
2. 개인정보 보호책임자가 법적 분류, 24개월 정책, 점검 주기, 접근권한, 위·변조 방지를 승인한다.
3. 현재 데이터의 최고령·대상 건수를 read-only query로 측정한다.
4. 기간 단축 또는 최초 대량 파기가 예상되면 백업·dry-run·복구 계획과 별도 사용자 승인을 확보한다.

예시 census:

```sql
SELECT min(occr_ymd), max(occr_ymd), count(*) FROM tb_web_log;
SELECT min(crt_dt), max(crt_dt), count(*) FROM tb_login_log;
```

실제 컬럼과 timezone을 live schema에서 다시 확인한다.

### 2. 배포 후

- `[log-retention]` 시작·완료·하한 skip 로그를 확인한다.
- 배치 전후 대상 건수가 cutoff와 일치하는지 확인한다.
- scheduler가 여러 인스턴스에서 동시에 실행되는 형상인지 확인한다. DELETE가 멱등이어도 DB 부하는 중복될 수 있다.
- 보존 대상에 대한 관리자 임의 삭제 API를 만들지 않는다.
- 로그 저장소 접근권한, 백업, 위·변조 방지, 점검 결과를 내부 관리계획에 따라 별도 보관한다.

## 변경 안전 절차

보존기간, 대상 테이블, 삭제 술어, schedule을 바꾸면 다음을 한 변경으로 처리한다.

1. 법적·제품 근거와 데이터 census
2. repository·설정·index 변경
3. 하한·cutoff·0건·대량 대상 단위 테스트
4. 실제 PostgreSQL에서 dry-run 또는 격리된 검증
5. rollback과 운영 관측 항목
6. 이 정책과 [pending-decisions.md](pending-decisions.md) 갱신

미결인 원형보존 대 가명화와 외부 로그 수집 스택은 각각 `PD-LOG-001`, `PD-OPS-001`에서 결정한다.
로그인 실패까지 감사 범위에 포함해야 한다면 별도 요구사항과 실패 응답 지연·정보노출·비동기 실패 관측 계약을
정한 뒤 현재 성공 경로를 확장한다.
