# 로그 보존기간 및 개인정보 파기 정책 (Log Retention & Privacy)

> 제정: 2026-07-17 (A그룹 log-privacy 이행) · 근거: [a-group-decision-recommendations.md](../02-architecture/a-group-decision-recommendations.md) §3-5
> 관련: [user-reference-key-policy.md](../02-architecture/user-reference-key-policy.md) 파생규칙 3

## 1. 원칙

- **접속기록(access log)** 은 개인정보 보호법상 **삭제 자유보다 보존 의무가 우선**한다 —
  「개인정보의 안전성 확보조치 기준」 제8조(접속기록의 보관·점검): **최소 1년**, 고유식별정보를 처리하거나
  정보주체 5만 명 이상을 처리하는 경우 **2년**. 위·변조 방지 의무도 있으므로 **런타임 삭제 API 를 두지 않고**
  보존기간 만료 시에만 배치([`LogRetentionScheduler`](../../business-app/src/main/java/nuri/business/service/log/LogRetentionScheduler.java))로 파기한다.
- **개인 단위 통계(tb_user_log)** 는 접속기록이 아니라 사용통계이며 개인 식별자(esntl_id, FK)에 묶이므로,
  PIPA 제21조 파기 원칙에 따라 **사용자 삭제 시 함께 파기**한다.

## 2. 테이블별 정책

| 테이블 | 성격 | 개인정보 | 처리 | 보존기간(권장) |
|---|---|---|---|---|
| `tb_web_log` | 접속기록(요청 URL·IP) | dmnd_user_id(loginId)·IP | 보존기간 만료 배치 파기 | **1~2년** (인수처 결정) |
| `tb_sys_log` | 시스템 처리 로그 | 처리주체 | 보존기간 만료 배치 파기 | 1~2년 |
| `tb_login_log` | 로그인 이력 | 로그인 주체 | 보존기간 만료 배치 파기 | 1~2년 (기록경로 복원 시, 아래 §4) |
| `tb_user_log` | 개인 사용통계 | dmnd_user_id(**esntl_id, FK**) | **사용자 삭제 시 즉시 파기** + 잔여 백스톱 배치 | 13개월(백스톱) |
| `tb_privacy_log` | 개인정보 조회 로그 | dmnd_user_id·IP·조회정보 | (현재 0행·기록경로 死) — 인수처 활성화 시 접속기록으로 편입 | 1~2년 |
| `tb_inst_cd_rcptn_log` | 기관코드 수신 로그 | 없음(개인정보 무관) | 보존 대상 아님 | — |

## 3. 배치 동작 (LogRetentionScheduler)

- **기본 비활성**: `nuri.log.retention.enabled=false`. 인수처가 보존기간 수치를 확정한 뒤 켠다.
- 설정: `nuri.log.retention.{web,sys,login,user}-months`, `nuri.log.retention.cron`(기본 `0 0 4 * * *`, Asia/Seoul).
- **전량파기 방지 하한 가드**: 보존월이 **법정 최저(12개월) 미만**이면 해당 테이블 삭제를 **건너뛴다**(WARN 로그).
  `enabled=true` 인데 월수 미설정(0)/음수로 cutoff 가 '오늘'이 되어 접속기록 전량이 파기되는 사고를 코드가 차단한다.
- **삭제 술어**: `occr_ymd < cutoff`(web/user) 및 `crt_dt < cutoffTs`(login — sargable 정정 완료). `tb_web_log`
  에 `ix_tb_web_log_occr_ymd`(V2_20) 보강.

### 알려진 편차·한계 (인수인계)
- **web_log 행위자 표기 편차**: `OperationalAuditInterceptor.resolveUserId` 의 fallback(`authentication.getName()`)
  은 principal 이 CustomUserDetails 가 아닌 컨텍스트에서 **esntlId** 를 기록할 수 있다(현 데이터는 loginId).
- **멀티 인스턴스**: 스케줄러 중복 실행 시 DELETE 는 멱등이라 정합 무해하나 ShedLock 미도입 — 스케일아웃 시 도입.
- **대량화**: 현 2만행 수준은 단발 DELETE 무해. **연 수백만 행 도달 시 `occr_ymd` 월 파티셔닝 전환**을 임계로 한다.

## 4. 사용자 삭제 시 처리 매트릭스

| 데이터 | 처리 |
|---|---|
| tb_user_log(개인 사용통계) | **파기** — `UserService.cleanupDependentsAndDelete` 가 `deleteByDmndUserIdIn` 로 정리(FK 잠복결함 해소) |
| tb_web_log·tb_sys_log·tb_login_log | **보존** — 접속기록 보존의무. 만료 시 배치 파기(가명화하지 않음) |
| 감사컬럼(frst_rgtr_id/last_mdfr_id)의 loginId 스냅샷 | **보존** — 행위자 표기(키 규약 ②, 의도된 설계) |

## 5. 제품 결정 대기 (인수처 확정 필요)

- **보존기간 수치**: 접속기록 1년 vs 2년(고유식별정보/5만명↑ 프로파일에 따름). user_log 백스톱은 더 짧게(예: 13개월) 가능.
- **법적 트랙**: 보존의무 원형보존(본 정책) vs 사용자 삭제 시 가명화 추가(얹으면 전 감사컬럼 일관성 범위도 결정).
- **tb_login_log 기록경로 복원**: 로그인 성공/실패 이력을 살릴지(AuthServiceImpl 에서 EgovLogService.logLogin 연결)
  vs 死코드(0행·호출자 0) 제거. 어느 쪽도 데이터 파손 없음.
