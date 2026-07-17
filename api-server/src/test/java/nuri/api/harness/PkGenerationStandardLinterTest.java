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
            "AddressBook", "AddressBookUser", "AdministCode", "Authority", "Banner", "Blog", "Board",
            "BoardMaster", "BoardMasterOption", "CnsltManage", "CommonCodeCategory", "CommonCodeGroup",
            "Community", "DeptJob", "DeptJobBox", "DeptManage", "Diary", "DtaUseStats", "EventInfo", "Faq",
            "FileMaster", "GroupManage", "Hpcm", "IndividualPage", "InformalSanction", "InstitutionCode",
            "InternetSvcGuidance", "LoginLog", "LoginPolicy", "MainImage", "MemoReport", "MemoTodo", "Menu",
            "MyPageContent", "Note", "NoteRecptn", "NoteTrnsmit", "Notification", "OnlineManual",
            "OnlinePollArticle", "OnlinePollManage", "OnlinePollResult", "OrganizationManage", "Popup",
            "PrivacyLog", "Program", "RefreshToken", "ReprtStats", "RewardManage", "RoleInfo", "Schedule",
            "Scrap", "SentMail", "SiteMap", "Sms", "SurveyArticle", "SurveyInfo", "SurveyQuestion",
            "SurveyRespondent", "SurveyResult", "SurveyTemplate", "SysLog", "SystemPolicy", "Template",
            "User", "UserAbsence", "UserAuthority", "WebLog", "WorkReport"
    ));

    @Test
    @DisplayName("🔗 신규 엔티티 PK 는 @GeneratedValue(JPA 관리 생성) 사용 — 수동 PK 드리프트 차단 (§2.A D1(B))")
    void auditNewEntitiesUseGeneratedPk() {
        List<String> manualPkEntities = new ArrayList<>();
        int totalEntities = 0;

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        for (var bd : scanner.findCandidateComponents(ENTITY_SCAN_BASE)) {
            String className = bd.getBeanClassName();
            try {
                Class<?> clazz = Class.forName(className);
                totalEntities++;
                if (isManualSinglePk(clazz)) {
                    manualPkEntities.add(clazz.getSimpleName());
                }
            } catch (ClassNotFoundException | NoClassDefFoundError ex) {
                log.warn("[PkGenLinter] 엔티티 로드 실패(스캔 제외): {} ({})", className, ex.getMessage());
            }
        }

        // 게이트 무결성(false-green 방지): 스캔이 조용히 0건이면 vacuous 통과가 되므로 차단
        if (totalEntities < 20) {
            fail("게이트 무결성 파손: @Entity 스캔 건수(" + totalEntities + ")가 예상 하한 미만 — 스캔/클래스패스 파손 의심.");
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
