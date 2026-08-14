package nuri.api.harness;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 신규 엔티티 PK 생성 표준 린터 — §2.A(레거시 현대화) D1(B) 규약 게이트.
 *
 * <p>[근거] BE 재측정(§2.A)이 지목한 "PK 채번 6+1전략 파편화"(EgovIdGnr/SEQUENCE/IDENTITY/UUID/
 * native nextval/MAX+1/앱UUID-절단). 기존 데이터는 동결(전략 교체는 [위험-DB설계결정] D1),
 * <b>신규 엔티티는 서비스레이어 수동 PK 채번(egov IdGnr·IdGenerationUtil·nextval 등)이 아니라
 * JPA 관리 생성({@code @GeneratedValue})을 쓰도록</b> 강제해 현대화 방향으로의 드리프트만 막는다.
 *
 * <p>판정: {@code @Entity} 의 단일 {@code @Id} 필드에 {@code @GeneratedValue} 가 없으면 '수동 PK'.
 * 복합키({@code @EmbeddedId}·복수 {@code @Id})는 매핑/조인 테이블의 정당한 패턴이라 면제.
 * 기존 수동 PK 엔티티는 {@link #GRANDFATHERED} 베이스라인으로 동결(DomainIsolationTest 관행) →
 * <b>목록에 없는 신규 수동 PK 엔티티만 위반</b>. 신규 엔티티는 {@code @GeneratedValue} 를 쓰거나,
 * 불가피한 레거시 정합이면 사유와 함께 이 목록에 추가한다.
 *
 * <p><b>[2026-07-26 보강] 동결은 양방향이다.</b> 목록의 엔티티가 <i>수동 PK 를 벗어나는 것</i> 역시
 * 승인 없는 D1 전략 변경이므로 차단한다(69개 엔티티 UUID 일괄 부착 사고의 재발 방지 — 종전 단방향
 * 게이트는 이를 통과시켰다). 베이스라인 자체의 무단 편집은 {@code HarnessBaselineIntegrityTest}
 * (매니페스트 해시 대조)가 별도로 감시한다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(엔티티는 클래스패스 스캔·리플렉션).
 */
class PkGenerationStandardLinterTest {

    private static final Logger log = LoggerFactory.getLogger(PkGenerationStandardLinterTest.class);
    private static final String ENTITY_SCAN_BASE = "nuri.business";

    /**
     * [동결 베이스라인] 기존 수동 PK 엔티티(서비스레이어 채번: egov IdGnr / IdGenerationUtil / nextval /
     * MAX+1 / 수동 할당). 데이터가 영속돼 전략 교체가 D1(위험) 이므로 동결한다. <b>신규 추가 금지</b> —
     * 신규 엔티티는 @GeneratedValue 사용. (엔티티 단순명 기준)
     */
    private static final Set<String> GRANDFATHERED = new TreeSet<>(Arrays.asList(
            // [동결 2026-07-17] 린터 최초 실행 census — 현재 수동 PK 엔티티 69종(≈93%). 코드베이스 규범이
            // String PK + 서비스레이어 채번(egov IdGnr/IdGenerationUtil/nextval)이라 대부분이 여기 해당.
            // 데이터 영속으로 전략 교체는 D1(위험-DB설계결정). 신규 엔티티는 이 목록에 추가하지 말고 @GeneratedValue 사용.
            // [2026-08-13 제거] AddressBook · AddressBookUser — 사용자가 승인한 BIGINT 자동 내부키
            //   설계결정에 따라 V2_49에서 문자열 기술키를 identity 일련번호로 백필·전환했다.
            //   실측: tb_adbk_manage/tb_adbk_info 각 1행, 외부 inbound FK 0, 자식 고아 0.
            //   JPA·Repository·Service·API·FE 소비자를 Long/_sn 계약으로 함께 이관했으므로
            //   더 이상 동결 수동 PK가 아니며 목록에서 정당하게 제거한다.
            // [2026-08-13 제거] Hpcm — V2_50에서 hlp_id 문자열 기술키를 hlp_sn BIGINT IDENTITY로
            //   전환했다. 실측: tb_hlp_info 0행, inbound FK 0. 구형 행 주입 회귀 테스트로 데이터 보존,
            //   PK·identity·sq_hlp_sn·신규 자동 채번을 검증하고 JPA/API/FE 계약을 Long/_sn으로 이관했다.
            // [2026-08-13 제거] InternetSvcGuidance — V2_51에서 itnt_svc_id 문자열 기술키를
            //   itnt_srvc_sn BIGINT IDENTITY로 전환했다. 실측: tb_intrn_svc 0행, inbound FK 0.
            //   기존 행 보존·PK·identity·sq_itnt_srvc_sn·자동 채번 회귀 테스트와 API Long 계약을 검증했다.
            // [2026-08-13 제거] OnlineManual — V2_52에서 onln_mnl_id 문자열 기술키를
            //   onln_mnl_sn BIGINT IDENTITY로 전환했다. 실측: tb_onln_mnl_info 1행, inbound FK 0.
            //   기존 행·별도 UNIQUE 제약·API/FE/E2E 소비자를 함께 이관하고 자동 채번 회귀 테스트로 검증했다.
            // [2026-08-13 제거] Popup — V2_53에서 popup_id 문자열 기술키를 popup_sn BIGINT
            //   IDENTITY로 전환했다. 실측: tb_popup_info 0행, inbound FK 0. 관리자·사용자 API와
            //   FE 관리/대시보드/localStorage/E2E 소비자를 숫자 일련번호 계약으로 함께 이관했다.
            // [2026-08-13 제거] MyPageContent — V2_54에서 cntnts_id 문자열 기술키를 conts_sn
            //   BIGINT IDENTITY로 전환했다. 실측: tb_indv_pg_conts 0행, inbound FK 0. 구형 행의
            //   URL·사용여부·설명을 보존하고 API/FE 계약과 기존 cntntsUseAt 드리프트를 함께 정정했다.
            // [2026-08-13 제거] DeptJobBox — V2_55에서 dept_task_box_id 문자열 기술키를
            //   dept_task_box_sn BIGINT IDENTITY로 전환하고, tb_dept_task_info 자식 FK도 숫자로
            //   백필·재결속했다. 실측: 부모·자식 각 0행, 고아 0. 구형 부모/자식 주입 회귀로 검증했다.
            // [2026-08-13 제거] Banner — V2_56에서 bnr_id 문자열 기술키를 bnr_sn BIGINT
            //   IDENTITY로 전환했다. 실측: tb_bnr_info 0행, inbound FK 0. 관리자·공개 UI와
            //   서버 액션·E2E 정리 소비자를 숫자 일련번호 계약으로 함께 이관했다.
            // [2026-08-13 제거] DeptJob — V2_57에서 dept_task_id 문자열 기술키를
            //   dept_task_sn BIGINT IDENTITY로 전환했다. 실측: tb_dept_task_info 0행,
            //   inbound FK 0. outbound FK 3건과 업무 CRUD·화면·E2E 계약을 함께 검증했다.
            // [2026-08-13 제거] Diary — V2_58에서 diary_id 문자열 기술키를 diary_sn BIGINT
            //   IDENTITY로 전환했다. 실측: tb_diary_info 0행, inbound FK 0, 첨부 outbound FK 1건.
            //   구형 행 보존과 AttachmentSource가 사용하는 테이블 계약을 PostgreSQL 회귀로 검증했다.
            // [2026-08-14 제거] DtaUseStats — V2_59에서 dta_use_stats_id 문자열 기술키를
            //   dta_use_stats_sn BIGINT IDENTITY로 전환했다. 실측: tb_dta_use_stats 0행,
            //   inbound FK 0, 첨부 outbound FK 1건. 구형 행 보존과 통계 집계 쿼리 계약을 검증했다.
            // [2026-08-14 제거] MemoReport — V2_60에서 rpt_id 문자열 기술키를 memo_rpt_sn
            //   BIGINT IDENTITY로 전환했다. 실측: tb_memo_rpt_info 0행, inbound FK 0,
            //   첨부 outbound FK 1건. CRUD API·프론트 계약도 숫자 일련번호로 함께 이관했다.
            // [2026-08-14 제거] RewardManage — V2_61에서 rwrd_id 문자열 기술키를 rwrd_sn
            //   BIGINT IDENTITY로 전환했다. 실측: tb_rward_manage 0행, inbound FK 0,
            //   첨부 outbound FK 1건. 프론트 Date.now() 수동 키 생성도 함께 제거했다.
            // [2026-08-14 제거] Schedule — V2_62에서 schdl_id 문자열 기술키를 schdl_sn
            //   BIGINT IDENTITY로 전환하고 tb_diary_info의 논리 참조도 숫자로 백필했다.
            //   실측: 부모·자식 0행, 미해결 참조 0, 일정의 첨부 outbound FK 1건.
            // [2026-08-14 제거] Scrap — V2_63에서 scrap_id 문자열 기술키를 scrap_sn
            //   BIGINT IDENTITY로 전환했다. 실측: tb_bbs_scrap 0행, inbound FK 0,
            //   게시물 outbound FK 1건. CRUD·소유권·프론트 라우팅 계약을 함께 이관했다.
            // [2026-08-14 제거] SentMail — V2_64에서 msg_id 문자열 기술키를 eml_dsptch_sn
            //   BIGINT IDENTITY로 전환했다. 실측: tb_email_dsptch_manage 2행, inbound FK 0,
            //   첨부파일 outbound FK 1건·고아 0. 비동기 상태 갱신과 API/FE 계약도 함께 이관했다.
            // [2026-08-14 제거] WorkReport — V2_65에서 rpt_id 문자열 기술키를 rptp_sn
            //   BIGINT IDENTITY로 전환했다. 실측: tb_rpt_info 0행, inbound FK 0,
            //   첨부파일 outbound FK 1건·고아 0. CRUD API·프론트·E2E 계약도 함께 이관했다.
            // [2026-08-14 제거] Note · NoteTrnsmit · NoteRecptn — V2_66에서 쪽지 본문·발송·수신의
            //   문자열 기술 PK와 내부 FK 체인을 3개 BIGINT IDENTITY 일련번호로 함께 전환했다.
            //   실측: 세 테이블 모두 0행, 관계 고아 0, 본문의 첨부 outbound FK 1건·고아 0.
            //   구형 관계 주입 회귀와 JPA·API·프론트 숫자 계약으로 폐포 전체를 검증했다.
            // [2026-08-14 제거] OnlinePollManage · OnlinePollArticle · OnlinePollResult — V2_67에서
            //   여론조사·항목·결과의 문자열 기술 PK와 내부 FK 체인을 3개 BIGINT IDENTITY
            //   일련번호로 함께 전환했다. 실측: 세 테이블 모두 0행, 관계 고아·NULL·부모 불일치 0.
            //   사용자별 투표 UNIQUE와 구형 관계 주입 회귀, JPA·API·프론트 숫자 계약을 검증했다.
            // [2026-08-14 제거] SurveyTemplate · SurveyInfo · SurveyQuestion · SurveyArticle · SurveyResult
            //   — V2_68에서 설문 템플릿·설문·문항·항목·응답의 문자열 기술 PK와 12개 관계를
            //   5개 BIGINT IDENTITY 일련번호로 전환했다. 여섯 테이블 모두 실측 0행이며,
            //   구형 전체 그래프 주입 회귀와 JPA·API·프론트 숫자 계약을 검증했다.
            // [2026-08-14 제거] SurveyRespondent — 자동 PK 전환 대상이 아니라 물리 DB의
            //   (srvy_tmplt_sn, srvy_sn, srvy_rspdnt_id) 복합 PK를 @IdClass로 정확히 매핑했다.
            //   문자열 응답자 ID는 유지하며, 복합키는 이 단일 수동 PK 베이스라인의 대상이 아니다.
            // [2026-08-14 제거] Board — V2_69에서 게시물 pst_id 문자열 기술 PK와 댓글·스크랩·
            //   만족도·통계·답글 참조 폐포를 pst_sn BIGINT IDENTITY로 전환했다. 게시판 업무키
            //   BoardMaster.bbsId는 수동 식별자로 보존하고, 루트 글의 up_pst_id='0'은 NULL로 정규화했다.
            // [2026-08-14 제거] Blog — V2_70에서 blog_id 문자열 기술 PK와 멤버십 복합키/FK,
            //   게시물·게시판 논리 참조를 blog_sn BIGINT로 백필했다. 실측: 관련 4개 테이블 모두
            //   블로그 참조 0행·고아 0. 구형 전체 그래프 주입과 JPA·API·프론트 숫자 계약을 검증했다.
            // [2026-08-14 제거] Community — V2_71에서 cmnty_id 문자열 기술 PK와 멤버십 복합키/FK,
            //   게시판 논리 참조를 cmnty_sn BIGINT로 백필했다. 실측: 관련 3개 테이블 모두
            //   커뮤니티 참조 0행·고아 0. 구형 전체 그래프 주입과 JPA·API·프론트 숫자 계약을 검증했다.
            // [2026-08-14 제거] FileMaster — V2_72에서 atch_file_id 문자열 기술 PK와 상세·업무 참조
            //   폐포를 atch_file_sn BIGINT로 백필했다. 실측: 마스터/상세 4/4행, 업무 참조·고아 0.
            //   JPA·API·프론트 숫자 계약과 DB identity 자동 생성을 검증하고 수동 파일 ID 채번을 제거했다.
            // [2026-08-14 제거] LoginLog — V2_73에서 log_id 문자열 기술 PK를 lgn_sn BIGINT
            //   IDENTITY로 전환했다. 실측: tb_login_log 0행, inbound/outbound FK 0.
            //   비동기 기록·관리 API·프론트 계약을 숫자 일련번호로 이관하고 수동 ID 생성을 제거했다.
            // [2026-08-14 제거] SysLog — V2_74에서 요청 상관관계 dmnd_id는 UNIQUE 업무키로
            //   보존하고 sys_log_sn BIGINT IDENTITY를 내부 PK로 도입했다. 실측 12행은 모두 데모
            //   시드이며 inbound/outbound FK 0. 관리·감사 API와 프론트 행 식별자를 함께 이관했다.
            // [2026-08-14 제거] WebLog — V2_75에서 AuditEvent와 무관한 WLOG_ 잘린 UUID 수동
            //   기술키를 제거하고 web_log_sn BIGINT IDENTITY로 전환했다. 실측 4,003행 전체가
            //   WLOG_ 생성값이고 inbound/outbound FK 0. 비동기 적재·조회·프론트 계약을 함께 이관했다.
            "AdministCode", "Authority",
            "BoardMaster", "BoardMasterOption", "CommonCodeCategory", "CommonCodeGroup",
            "DeptManage", "EventInfo",
            // [2026-08-05 제거] "Faq" — 엔티티가 삭제됐다(PK 전략 변경이 아니다).
            //   FAQ 는 게시판(tb_bbs_item, bbs_id='BBSMSTR_AAAAAAAAAAAA')으로 통합돼 운영 중이고
            //   전용 도메인은 死자산이었다. 라이브 실측: tb_faq_info 0행 / 게시판 FAQ 281행,
            //   FE 의 /api/v1/faqs 호출 0건. V2_40 으로 테이블·RBAC 프로그램과 함께 제거했다.
            //   ⚠ 이 제거는 '완화' 가 아니다 — 목록이 지키던 대상 자체가 사라졌다.
            //   게이트가 red 로 알려서 목록을 줄이게 만들었고, 그것이 이 게이트의 설계 의도다.
            // [2026-08-06 제거] "IndividualPage" · "MemoTodo" — 엔티티가 삭제됐다(PK 전략 변경이 아니다).
            //   두 도메인은 서비스가 완성돼 있었으나 컨트롤러가 없어 도달 불가였고 FE 라우트·서비스도 0건이었다.
            //   라이브 실측: tb_indv_pg 0행 / tb_memo_todo_info 0행 — 이 목록의 전제인 "데이터 영속" 이
            //   성립하지 않는다. 서비스·리포지토리·DTO·테스트까지 닫힌 폐포로 함께 제거했다.
            //   ⚠ 물리 테이블은 건드리지 않았다 — 테이블 삭제는 스키마 변경이라 별도 승인이 필요하다.
            //     현재 상태는 "엔티티 없는 빈 테이블 2개" 이며 그 처분은 미결로 남는다.
            //   ⚠ 이 제거는 '완화' 가 아니다 — 목록이 지키던 대상 자체가 사라졌다(위 Faq 선례와 동일).
            "GroupManage", "InformalSanction", "InstitutionCode",
            "LoginPolicy", "Menu", "Notification", "OrganizationManage",
            "PrivacyLog", "Program", "RefreshToken", "ReprtStats", "RoleInfo",
            "SiteMap", "Sms", "SystemPolicy", "Template",
            "User", "UserAbsence", "UserAuthority"
    ));

    @Test
    @DisplayName("🔗 신규 엔티티 PK 는 @GeneratedValue(JPA 관리 생성) 사용 — 수동 PK 드리프트 차단 (§2.A D1(B))")
    void auditNewEntitiesUseGeneratedPk() {
        List<String> manualPkEntities = new ArrayList<>();
        Set<String> allEntityNames = new TreeSet<>();
        Set<String> loadFailures = new TreeSet<>();
        int totalEntities = 0;

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        for (var bd : scanner.findCandidateComponents(ENTITY_SCAN_BASE)) {
            String className = bd.getBeanClassName();
            try {
                Class<?> clazz = Class.forName(className);
                totalEntities++;
                allEntityNames.add(clazz.getSimpleName());
                if (isManualSinglePk(clazz)) {
                    manualPkEntities.add(clazz.getSimpleName());
                }
            } catch (ClassNotFoundException | NoClassDefFoundError ex) {
                loadFailures.add(simpleNameOf(className));
                log.warn("[PkGenLinter] 엔티티 로드 실패(스캔 제외): {} ({})", className, ex.getMessage());
            }
        }

        // 게이트 무결성(false-green 방지): 스캔이 조용히 0건이면 vacuous 통과가 되므로 차단
        if (totalEntities < 20) {
            fail("게이트 무결성 파손: @Entity 스캔 건수(" + totalEntities + ")가 예상 하한 미만 — 스캔/클래스패스 파손 의심.");
        }

        // ── [동결 무결성 — 양방향 검사] ──────────────────────────────────────────────
        // 종전 게이트는 "베이스라인에 없는 수동 PK" 한 방향만 봤다. 그래서 2026-07-26 사고
        // (69개 엔티티에 @GeneratedValue(UUID) 일괄 부착 → 물리 varchar(7~20) 초과·자연키 오염)는
        // 대상 엔티티가 '수동 PK 아님' 으로 바뀌며 조용히 통과했다. 동결의 의미는
        // "이 엔티티들의 PK 전략은 D1(위험-DB설계결정) 승인 없이 바뀌지 않는다" 이므로 반대 방향도 검사한다.
        //   (a) 여전히 존재하지만 더 이상 수동 PK 가 아님 → PK 전략 무단 전환(복합키 전환 포함)
        //   (b) 스캔에 아예 없음 → 삭제/개명으로 베이스라인이 stale
        // 이 검사가 있으면 "GRANDFATHERED 를 비워 통과시키기" 도 성립하지 않는다(비우면 (a)/(b) 대신
        // 아래 violations 로 69건이 전부 터진다). 수량 하한 가드는 항목 교체(swap)로 우회되고
        // 정당한 부채 상환까지 막으므로 채택하지 않는다.
        List<String> strategyChanged = GRANDFATHERED.stream()
                .filter(allEntityNames::contains)
                .filter(name -> !manualPkEntities.contains(name))
                .sorted()
                .collect(Collectors.toList());
        List<String> vanished = GRANDFATHERED.stream()
                .filter(name -> !allEntityNames.contains(name))
                .filter(name -> !loadFailures.contains(name)) // 로드 실패는 별도 경고로 처리(오탐 방지)
                .sorted()
                .collect(Collectors.toList());

        if (!strategyChanged.isEmpty() || !vanished.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🧊 [PK GEN LINTER] 동결 베이스라인 드리프트 — 승인 없는 PK 전략 변경이 차단되었습니다!\n");
            sb.append("========================================================================\n");
            for (String v : strategyChanged) {
                sb.append("❌ ").append(v)
                        .append(" — 동결 엔티티인데 더 이상 '수동 단일 PK' 가 아님(@GeneratedValue 부착/복합키 전환 추정)\n");
            }
            for (String v : vanished) {
                sb.append("⚠️ ").append(v).append(" — 동결 목록에 있으나 @Entity 스캔에 없음(삭제·개명 → 베이스라인 stale)\n");
            }
            sb.append("\n💡 이 목록의 엔티티는 데이터가 영속돼 전략 교체가 [위험-DB설계결정] D1 입니다.\n");
            sb.append("   전환이 정당하다면 ① 물리 스키마 실측(db-bridge: information_schema 컬럼 타입/길이)으로\n");
            sb.append("   수용 가능함을 증명하고 ② 사용자 승인을 받은 뒤 ③ 이 베이스라인에서 제거하십시오.\n");
            sb.append("   (H2 create-drop 테스트 프로파일은 물리 varchar 길이 초과를 원리적으로 검출하지 못합니다.)\n");
            fail(sb.toString());
        }

        List<String> violations = manualPkEntities.stream()
                .filter(name -> !GRANDFATHERED.contains(name))
                .sorted()
                .collect(Collectors.toList());

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [PK GEN LINTER] 신규 수동 PK 엔티티 감지 — @GeneratedValue 를 쓰거나 사유와 함께 동결하십시오!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append(" — @Id 에 @GeneratedValue 부재(서비스레이어 수동 채번 추정)\n");
            }
            sb.append("\n💡 §2.A D1(B): 신규 엔티티는 JPA 관리 생성(@GeneratedValue: SEQUENCE/IDENTITY/UUID)을 사용합니다.\n");
            sb.append("   불가피한 레거시 정합이면 PkGenerationStandardLinterTest.GRANDFATHERED 에 사유와 함께 추가하십시오.\n");
            sb.append("   (현재 수동 PK 엔티티 전체 목록: ").append(manualPkEntities.stream().sorted().collect(Collectors.toList())).append(")\n");
            fail(sb.toString());
        } else {
            log.info("✅ 신규 수동 PK 엔티티 없음(스캔 {}건, 동결 {}건). PK 생성 표준 준수.",
                    totalEntities, GRANDFATHERED.size());
        }
    }

    private static String simpleNameOf(String fqcn) {
        int idx = fqcn.lastIndexOf('.');
        return idx >= 0 ? fqcn.substring(idx + 1) : fqcn;
    }

    /** 단일 @Id 필드에 @GeneratedValue 가 없으면 수동 PK. 복합키(@EmbeddedId·복수 @Id)는 면제. */
    private static boolean isManualSinglePk(Class<?> clazz) {
        List<Field> idFields = new ArrayList<>();
        boolean hasEmbeddedId = false;
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                if (f.isAnnotationPresent(Id.class)) {
                    idFields.add(f);
                }
                if (f.isAnnotationPresent(EmbeddedId.class)) {
                    hasEmbeddedId = true;
                }
            }
        }
        if (hasEmbeddedId || idFields.size() != 1) {
            return false; // 복합키/키없음 — 면제
        }
        return !idFields.get(0).isAnnotationPresent(GeneratedValue.class);
    }
}
