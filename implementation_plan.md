# 표준 용어 기반 강제 매핑 정규화 및 정합성 확보 계획

본 계획은 DB와 UI 간에 서로 다른 명칭을 강제로 매핑하고 있던 항목들을 `meta_standard_words`, `meta_standard_terms` 에 기반한 '단일 표준 용어'로 통합하는 작업입니다.

## User Review Required

> [!WARNING]
> 이 작업은 API 명세(DTO) 및 DB 스키마를 모두 변경하는 대규모(L2) 리팩토링입니다. DB 컬럼명 변경이 포함되므로 데이터베이스 수정이 발생합니다.
> **Zero-Downtime Migration** 원칙(Expand and Contract)을 준수하여 적용할지, 로컬 환경이므로 직접(Direct) 컬럼을 Alter 할지 결정이 필요합니다. (아래 계획은 로컬 개발환경 기준으로 직접 Alter 하는 방식을 제안합니다. 실 서비스 환경인 경우 무중단 마이그레이션 V2 스크립트로 작성해 드립니다.)

## 표준화 분석 및 결정 (Standardization Mapping)

DB 표준 단어(`meta_standard_words`) 및 표준 용어(`meta_standard_terms`) 테이블을 교차 검증하여, 강제 매핑 양측(Entity vs DTO) 중 어느 쪽이 표준인지 혹은 제3의 표준이 존재하는지 분석했습니다.

| 도메인 | Entity 필드명 (기존 DB) | DTO 필드명 (기존 UI) | 확정된 DB 표준 용어 (신규) | 근거 (`meta_standard`) |
| :--- | :--- | :--- | :--- | :--- |
| **User** | `pswd_cnsr` | `pswdCrans` | **`pswd_crans`** (비밀번호정답) | PSWD(비밀번호) + CRANS(정답) 조합 |
| **User** | `ognz_id` | `orgnztId` | **`ognz_id`** (조직아이디) | OGNZ(조직) + ID(아이디) 조합 |
| **User** | `base_addr` | `homeAddr` | **`home_addr`** (자택주소) | `meta_standard_terms` 에 공식 등록됨 |
| **User** | `dtl_addr` | `daddr` | **`daddr`** (상세주소) | `meta_standard_terms` 에 공식 등록됨 |
| **User** | `crtfc_dn_value` | `subDn` | **`cert_dn_vl`** (인증고유명값) | CERT(인증) + DN(고유명) + VL(값) 조합 |
| **Board** | `created_date` | `frstRegisterPnttm` | **`frst_reg_dt`** (최초등록일시) | `meta_standard_terms` 에 공식 등록됨 |
| **Board** | `frst_register_nm` | `userNm` | **`frst_rgtr_nm`** (최초등록자명) | `meta_standard_terms` 에 공식 등록됨 |
| **Board** | `reply_lc` | `ansLvl` | **`ans_lv`** (답변레벨) | `meta_standard_terms` 에 공식 등록됨 |

---

## Proposed Changes

### 1. Database (Schema Migration)
로컬 데이터베이스에 접속하여 기존 테이블의 컬럼명을 표준명으로 1:1 변경합니다. (`ALTER TABLE ... RENAME COLUMN ...`)
- [MODIFY] `tb_user` 테이블 컬럼명 변경
- [MODIFY] `tb_board` (및 관련 게시판 마스터) 테이블 컬럼명 변경

### 2. Backend (Entity, DTO, Mapper)
엔티티의 `@Column`과 변수명, DTO 변수명을 모두 위 '확정된 표준 용어'의 카멜 케이스로 변경합니다.
- [MODIFY] `User.java`, `UserDto.java`, `UserMapper.java` (@Mapping 강제 룰 제거)
- [MODIFY] `Board.java`, `BoardDto.java`, `BoardMapper.java` (@Mapping 강제 룰 제거)
- [MODIFY] 기타 해당 변수를 참조하는 Board/User Controller 및 Service

### 3. Frontend (UI & Types)
프론트엔드 코드 내 강제로 맵핑하던 로직(`item.frstRegisterPnttmStr || item.date`)을 걷어내고, 생성된 API 타입에 맞춰 단일화된 필드를 렌더링합니다.
- [MODIFY] `package.json` 의 `npm run codegen:ts` 를 실행하여 `generated-api.d.ts` 최신화
- [MODIFY] 화면 컴포넌트 내 참조값(`pswdCrans`, `frstRegisterPnttm`, `homeAddr` 등)을 `pswdCrans`, `frstRegDt`, `homeAddr` 등 새 표준 명칭으로 치환

## Verification Plan

### Automated Tests
- `make coverage` 커맨드를 실행하여 백엔드 컴파일 및 유닛 테스트(Coverage)가 깨지지 않는지 검증합니다.
- 프론트엔드 `npm run codegen:ts` 가 성공하고 타입 에러가 없는지 `tsc --noEmit` 등으로 검증합니다.

### Manual Verification
- DB Bridge (`check-db-standard.js`) 스크립트를 재실행하여 위반 사항이 0건으로 유지되는지 검증합니다.
