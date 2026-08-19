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
| `tb_privacy_log` | scheduler 대상 아님 | 별도 관리 서비스·열람 경로 | 실제 기록·보존·파기 경로가 production 요구를 충족하는지 별도 검증 |
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

## 운영 적용·점검

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
