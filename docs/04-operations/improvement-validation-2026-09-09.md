# 개선 우선순위 검증과 운영 적용 경계

검증일: 2026-09-09. 작업 기준 커밋: `c29dfe93c`(블로그 도메인 제거).

## 기능·동시성·프라이버시

| 우선순위 | 변경 | 검증 |
|---|---|---|
| 1 설문 목록 | 10건 단위 페이지 이동, 크기 변경, 조회 오류와 빈 결과 구분·재시도, 선택 필드 null/누락 정규화 | 페이지/오류·미입력 응답·최초 503 승격의 이전 구현 red, 수정 후 목록·서비스 경계 테스트 17개 통과 |
| 2 설문 제출 | 설문 부모 행의 비관적 쓰기 잠금으로 동일 설문 제출 직렬화 | PostgreSQL에서 서로 다른 답안을 동시에 제출해 1건만 수락, 롤백 후 재시도와 다른 응답자 허용 |
| 3 게시글 초안 | 현재 문서의 메모리만 사용, 과거 영속 초안 제거, 로그아웃 시 무효화, 제출 후 재저장 방지 | 관련 44개 테스트, 영속 쓰기를 다시 넣은 의도적 위반 red, frontend 타입 검사·production build |
| 4 메일·SMS | 발송 재시도와 결과 기록/커밋 재시도 분리 | 실제 Spring 프록시에서 기록 커밋 2회 실패에도 외부 발송 1회, 기록 실패 소진·최종 발송 실패 검증 |
| 5 결재 코드 | 본인·신청 상태 확인 후 수정에도 활성 COM075 검증 | 미등록/빈/null 코드 거절과 원래 내용 보존, 정상 수정·상태/인가 가드 검사 |

메일·SMS의 발송 결과는 `mail.dispatch.total`/`sms.dispatch.total`에 기록한다. 기록 재시도까지
소진되면 `mail.dispatch.recording.failures`/`sms.dispatch.recording.failures`와 식별자·결과 코드만
포함한 오류 로그를 남긴다. 기록 장애가 발송 실패로 바뀌거나 재발송을 유도하지 않는다. 이 경우 DB의
기존 P 상태는 결과 미확정이므로 제공자 기록과 대조해야 한다. 제공자의 응답 유실이나 프로세스 강제
종료까지 포함한 exactly-once 발송을 주장하지 않는다.

## 6 이관·복구·운영 증거

- 이관 target에 접속 위치·연결 위치·클러스터·DB identity·허용 스키마를 결속했다.
- 실행마다 STARTED/PASS/FAILED JSON을 보존한다. [재개·전체 롤백 런북](migration-recovery-runbook.md)을 따른다.
- PostgreSQL 501행 부분 커밋·재개·중복 방지·변조 탐지와 별도 서버에 전체 스키마/첨부/키 복원을 검증했다.
- [복원 측정](backup-and-restore-runbook.md#격리-복원-자동-검증)은 운영 RTO/RPO 승인이나 운영 백업 실재 증거를 대체하지 않는다.

## 최종 자동 검증 범위

| 실행 | 결과 |
|---|---|
| `:business-app:test` | 753개 중 752 통과, 기존 제외 1, 실패 0 |
| `:migration-tool:test` | 409개 중 407 통과, 기존 제외 2, 실패 0 |
| `:api-server:schemaValidationTest` | PostgreSQL 통합 검증 51개 통과 |
| `:api-server:harnessTest` | 74개 통과 |
| 백엔드 `compileJava compileTestJava` | 통과 |
| 프런트 영향 테스트 | 설문·초안·인증·게시글 60개, 최종 설문 경계 17개, 표·목록 레이아웃 36개 통과(실행 간 중복 포함) |
| 프런트 정적 검증 | TypeScript 및 E2E TypeScript 통과, 관련 ESLint 오류 0; 기존 React 경고 3개 유지 |
| 프런트 `pnpm -C frontend build` | production 빌드 통과 |
| 초안 Playwright E2E | 인증 준비 2개와 복구 시나리오 1개 통과, 전역 테스트 데이터 정리 성공 |
| 공용 메모리·거버넌스·UI 계약 | 통합 124개 통과 후, 보강한 최종 UI 계약 72개 별도 통과 |

설문 동시 제출, 발송/기록 경계, 결재 코드, 미입력 설문, 초안 영속 저장은 이전 구현 또는 의도적
위반에서 실패한 뒤 수정본에서 통과했다. 신설 DB 게이트를 레지스트리에서 누락시키면 검증이 실패하며,
초안 검사 도구도 v2·legacy 영속 키를 주입하면 위반으로 판정한다. 동결 manifest는 실제 추가한 두
스키마 검증 클래스와 변경된 게이트 레지스트리 해시만 갱신했다. 제외·예외를 늘리지 않았다.

푸시 전 전체 운영 계약에서 설문 서비스 호출 위치 5개의 오래된 행 번호와 신규 query 파일로 인한
URL census 소스 파일 수 차이를 발견해 생성기를 다시 실행했다. API 소비·URL 상태 항목과 승인
클래스는 동일하며, URL 원장의 파일 수(522→523)와 그에 결속된 해시만 함께 갱신했다.
Governance Atlas도 스키마 검증 45개, 이관 테스트 소스 84개·`@Test` 409건, SQL waiver
198건/45파일이라는 현재 소스 집계와 이관 구현·운영 한계를 반영했다. 기존 문서 계약 10개가 통과했다.

실행 로그와 XML/브라우저 증거는 로컬 ignored `build/priority-six-*`, 각 모듈의 `build/test-results/`,
`build/reports/priority-6/`에 있다. 로컬 실행은 required CI, 운영 배포 또는 수동 접근성 합격을 대신하지 않는다.

## 실제 화면 관측

격리 PostgreSQL·실제 API·Next production 빌드·Chromium에서 설문/게시글 작성 화면을
320·768·1280px × light/dark로 각각 관측했다. 합성 설문 21건은 선택 설명 필드를 비운 실제 DB 행이다.
12개 조합 모두 axe의 WCAG 2/2.1/2.2 A·AA 대상 자동 위반, 문서 가로 넘침, 예상 밖 pageerror가 0건이었다.
설문은 10 + 10 + 1건 페이지 이동, 강제 503의 오류 표시, 같은 화면의 재시도 후 실제 API 복구까지 확인했다.
이 조회는 오류·재시도를 직접 처리하므로 최초 5xx도 전역 오류 화면에 승격하지 않는다.

| 화면 | 최초 표시 LCP 범위 | 관측 CLS 최댓값 |
|---|---:|---:|
| 설문 | 644–2,800ms | 0.000056 |
| 게시글 작성 | 888–1,256ms | 0.212562 |

설문은 수정 전 768px에서 CLS 0.211086을 관측했다. 총 건수의 한 줄 높이를 확보하고 로딩 행을
요청 페이지 크기에 맞춘 후 해당 이동이 사라졌다. 게시글 작성 1280px/light에서 간헐 이동 1회가
관측됐고, 같은 조건의 추가 3회는 모두 0이었다. 이 건의 원인은 확정하지 않았으며 해소로 판정하지 않는다.

각 조합은 로컬 단일 관측으로 CPU/네트워크 throttling, 다회 p75, 실사용 INP 또는 수동 스크린리더
검사가 아니다. 최초 차가운 기동의 설문 LCP 2.8초도 그대로 기록했다. `ui-probe.json`의
`authoritativeBaseline:false`를 유지하며, 기존 승인 이미지·전체 시나리오·수동 검토가 필요한
[UI 기준선 절차](ui-ux-baseline-protocol.md)의 공식 결과로 승격하지 않았다.

## 병합 전 의존성 보안 검증

PR [#603](https://github.com/lkindo/egov-enterprise/pull/603)의 최초 CI는 의존성 감사에서
critical 2건과 high 5건을 차단했다. 기존 감사 정책을 유지하고 다음 취약 버전만 갱신했다.

| 의존성 | lockfile 변경 | 공식 수정 근거 |
|---|---|---|
| Next.js / eslint-config-next | 16.2.12 → 16.3.4 | [Windows RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [AVIF RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [16.3.4 후속 수정](https://github.com/vercel/next.js/releases/tag/v16.3.4) |
| Tiptap 패키지군 | 3.29.2 → 3.31.3 | [Markdown ReDoS](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-j95f-988m-3j2f), [속성 병합](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-cp6q-959q-f8rh) |
| sharp | 0.35.0 → 0.35.4 | [libheif 보안 수정](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) |
| js-yaml | 3.x → 3.15.2, 4.3.1 → 4.3.2 | [빈 merge source CPU 제한](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh) |

js-yaml override는 각 메이저의 취약 범위에만 적용하여 Redocly의 v4 API 호환성을 유지한다.
갱신 후 CI와 같은 `node ../scripts/frontend-audit-policy.mjs`가 통과했다. 남은 8건은
low/moderate 권고이며 차단 대상 critical/high는 0건이다. 이는 검증 시점의 결과이며 이후 새 공지는
계속 같은 감사로 판정한다. 인증·프록시·CSP 영향 테스트 30개와 Next.js 16.3.4 production 빌드가
통과했다. Next.js가 생성한 `next-env.d.ts`의 root params 타입 참조도 함께 반영했다.

새 ESLint의 내부 URL 문서 이동 경고 4곳은 인증 상태 초기화·오류 복구를 위한 전체 문서 이동을
유지하고 계속 보고한다. 예외·허용치 추가 없이 E2E 네 곳의 미사용 catch binding을 제거했다.
기존 catch 처리·재시도·단언은 변경하지 않았다.

후속 CI에서는 프런트 2,606개와 mutation 10개 영역이 통과했으나 보안 관리 E2E가 이전 화면 제목을
찾아 실패했다. 실패 DOM·스크린샷·trace에서 현재 `권한(보안) 정책 관리` 제목과 정상 인증 응답을
확인한 뒤 POM을 정확한 level 1 제목으로 맞췄다. 격리 PostgreSQL과 실제 JVM·Next.js에서 로그인
준비 2개 및 권한·그룹·롤 생성 1개가 통과했고, 생성 데이터의 전역 정리도 완료됐다.

## OCI 표준 길이 정합성 적용 검토안

이 절은 최초 검토 당시의 30건과 OCI 2.88 상태를 보존한 기록이다. 이후 사용자 승인으로 24개와 보류 6개를 적용했으며, 2026-09-09 13:33 KST 기준 OCI 2.96·동일 길이 감사 불일치 0건이다. 최신 적용·검증·복구 근거는 [표준 길이 정합 런북](standard-length-alignment-runbook.md#adr-0014-후속-6개-적용-결과)을 따른다.

`.env`의 OCI 접속으로 read-only DB bridge를 사용했다. 정확한 표준 용어 약어가 일치하는
`public.tb_*`의 VARCHAR 길이만 비교했으며, 이름 미매칭·다른 타입까지 포괄하는 전수 정합률은 아니다.
다음 명령은 운영 데이터를 바꾸지 않고 기계판독 가능한 결과를 새 파일에 남긴다.

```powershell
node scripts/db-standard-reconciliation.mjs --env .env --output build/reports/db-standard-audit.json
```

현재 30건은 확장 후보 22건, 축소/계약 검토 7건, 암호화 저장 표현 검토 1건이다.
아래 목록은 승인 예외나 허용 baseline이 아니다. 불일치를 계속 보고하며 메타 원천을 물리 길이에
맞춰 임의 수정하지 않는다. 이번 작업으로 운영 DDL/DML을 실행하지 않았다.

| 테이블.컬럼 | 물리 길이 | 표준 길이 | 적용 전 필요한 조치 |
|---|---:|---:|---|
| `tb_adbk_manage.adbk_nm` | 100 | 200 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_authrt_info.authrt_nm` | 300 | 100 | 데이터 최대 길이·외부 계약 확인 후 축소 설계 |
| `tb_bbs_item.pst_ttl` | 100 | 256 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_cmnty_info.cmnty_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_email_dsptch_manage.eml_ttl` | 100 | 256 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_event_info.pic_nm` | 300 | 100 | 데이터 최대 길이·외부 계약 확인 후 축소 설계 |
| `tb_extrl_hr_info.ogdp_inst_nm` | 100 | 200 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_file_detail.orgnl_file_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_file_detail.strg_file_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_inst_cd.chg_tm` | 20 | 6 | 데이터 최대 길이·외부 계약 확인 후 축소 설계 |
| `tb_inst_cd.inst_abbr_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_inst_cd_rcptn_log.chg_tm` | 20 | 6 | 데이터 최대 길이·외부 계약 확인 후 축소 설계 |
| `tb_inst_cd_rcptn_log.inst_abbr_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_menu_info.prgrm_file_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_menu_info.rel_img_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_note_info.note_ttl` | 100 | 256 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_ognz_info.ognz_nm` | 100 | 200 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_prgrm_lst.prgrm_file_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_role_info.role_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_role_prgrm_map.prgrm_file_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_rward_manage.rwrd_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_schdl_info.schdl_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_sms_rcptn.rcptn_telno` | 13 | 11 | 데이터 최대 길이·외부 계약 확인 후 축소 설계 |
| `tb_srvy_info.srvy_prps` | 1000 | 4000 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_srvy_info.srvy_ttl` | 100 | 256 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_srvy_tmplt.srvy_tmplt_path_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_stmp_info.mpng_file_nm` | 100 | 300 | Expand/Sync/Redirect/Contract 및 DTO·API·UI 길이 동시 이행 |
| `tb_user_info.daddr` | 300 | 200 | 데이터 최대 길이·외부 계약 확인 후 축소 설계 |
| `tb_user_info.home_addr` | 300 | 200 | 데이터 최대 길이·외부 계약 확인 후 축소 설계 |
| `tb_user_info.rrno` | 256 | 13 | 평문 표준과 암호문 저장 표현 분리 결정; VARCHAR(13) 축소 금지 |

주소·전화번호·기관 연계 시각·암호문은 값 절단이나 일괄 치환으로 해소하지 않는다. 특히 `rrno`는
애플리케이션의 ARIA 암호문 저장이므로 평문 13자 도메인을 물리 저장 길이에 그대로 적용할 수 없다.
DB 헌법 제2·5·7·9조에 따라 원천 표준 결정과 정확한 운영 대상·전환 영향 승인 후 별도 이행해야 한다.
운영 변경 승인 경계의 원본은 [AGENTS.md](../../AGENTS.md#공통-작업-원칙)다.

블로그 V2_89/V2_90은 로컬 마이그레이션과 격리 PostgreSQL에서 검증됐으며 OCI는 기존 2.88 상태다.
운영 반영과 새 이미지 배포 여부는 로컬 코드/테스트 완료와 분리해 확인해야 한다.
