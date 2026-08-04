package nuri.api.harness;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import nuri.business.service.file.AttachmentSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔒 첨부 참조원 레지스트리 정합 린터 — {@link AttachmentSource} 가 실제 도메인을 따라가는지 고정한다.
 *
 * <p>[왜 필요한가] 첨부 인가는 <b>도달성</b>으로 판정한다 — "이 첨부를 참조하는 업무 행을 읽을 수 있는가".
 * 그 판정의 전제는 {@link AttachmentSource} 가 <b>첨부를 참조하는 모든 도메인을 알고 있다</b>는 것이다.
 * 신규 도메인이 {@code atchFileId} 를 갖는데 레지스트리에 없으면 그 도메인의 첨부는 아무 근거도 만들지
 * 못한다 — 즉 <b>정상 사용자가 자기 첨부에서 403</b> 을 맞는다(fail-closed 라 뚫리지는 않지만 조용히 망가진다).
 * 반대로 레지스트리에만 있고 엔티티가 사라진 항목은 死 SQL 이 되어 판정 비용만 남긴다.
 *
 * <p>[판정 축 2개]
 * <ol>
 *   <li><b>누락</b> — {@code atchFileId} 필드를 가진 {@code @Entity} 의 테이블이 레지스트리에 없으면 위반.</li>
 *   <li><b>유령</b> — 레지스트리에 있는데 대응 엔티티가 없으면 위반.</li>
 * </ol>
 * 두 축 모두 동결 목록·예외 목록을 두지 않는다. 예외가 필요해지는 순간이 곧 판정이 흐려지는 순간이며,
 * 이 레지스트리는 13종 규모라 예외 없이 유지할 수 있다(§0.7-H2).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(클래스패스 스캔 + 리플렉션).
 */
class AttachmentSourceRegistryLinterTest {

    private static final Logger log = LoggerFactory.getLogger(AttachmentSourceRegistryLinterTest.class);

    private static final String ENTITY_SCAN_BASE = "nuri";
    private static final String ATTACHMENT_FIELD = "atchFileId";

    /**
     * 첨부 저장소 자신. 참조원이 아니라 <b>참조 대상</b>이라 레지스트리에 들어가지 않는다.
     * (예외 목록이 아니라 대상 정의다 — 이 둘을 섞으면 예외 목록이 조용히 자란다.)
     */
    private static final Set<String> ATTACHMENT_STORAGE_TABLES =
            new TreeSet<>(Set.of("tb_file_master", "tb_file_detail"));

    @Test
    @DisplayName("🔒 첨부를 참조하는 모든 엔티티가 AttachmentSource 에 등록돼 있다 — 도달성 인가의 전제")
    void auditAttachmentSourceRegistryCoversEveryReferencingEntity() {
        Map<String, String> tableToEntity = scanEntitiesHoldingAttachmentId();

        // 게이트 무결성(false-green 방지): 스캔이 조용히 0 에 수렴하면 vacuous 통과가 된다.
        if (tableToEntity.size() < 10) {
            fail("게이트 무결성 파손: atchFileId 보유 엔티티 스캔 건수(" + tableToEntity.size()
                    + ")가 예상 하한(10) 미만 — 스캔/클래스패스 파손 의심. 실측 기준값은 13종(2026-08-04)이다.");
        }

        Set<String> registered = new TreeSet<>(AttachmentSource.registeredTables());
        List<String> missing = new ArrayList<>();
        tableToEntity.forEach((table, entity) -> {
            if (!registered.contains(table)) {
                missing.add(table + " (" + entity + ")");
            }
        });

        // 유령 판정은 **연결 방식별로** 다르다. 전용 컬럼(atch_file_id)으로 잇는 참조원은 위 스캔에
        // 잡혀야 하고, URL 문자열로 잇는 참조원(POPUP)은 그 스캔 대상이 아니므로 물리 테이블의
        // 실존으로 판정한다. 이 구분이 없으면 URL 연결 참조원을 등록하는 순간 게이트가 거짓 red 가 된다.
        Set<String> allEntityTables = scanAllEntityTables();
        List<String> phantom = new ArrayList<>();
        for (AttachmentSource source : AttachmentSource.values()) {
            String table = source.table();
            boolean present = source.linksByAttachmentIdColumn()
                    ? tableToEntity.containsKey(table)
                    : allEntityTables.contains(table);
            if (!present) {
                phantom.add(table + (source.linksByAttachmentIdColumn() ? "" : " (URL 연결)"));
            }
        }

        if (!missing.isEmpty() || !phantom.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔒 [ATTACHMENT SOURCE REGISTRY] 첨부 참조원 레지스트리가 도메인과 어긋났습니다!\n");
            sb.append("========================================================================\n");
            for (String m : missing) {
                sb.append("❌ [누락] ").append(m)
                        .append(" — atchFileId 를 갖지만 AttachmentSource 에 없음\n");
            }
            for (String p : phantom) {
                sb.append("❌ [유령] ").append(p)
                        .append(" — AttachmentSource 에 있으나 대응 @Entity 없음\n");
            }
            sb.append("\n💡 첨부 인가는 '참조 행을 읽을 수 있는가' 로 판정한다(FileAccessPolicy).\n");
            sb.append("   누락된 도메인의 첨부는 어떤 근거도 만들지 못해 정상 사용자가 403 을 맞는다.\n");
            sb.append("   AttachmentSource 에 추가할 때는 민감도(SHARED/PERSONAL/DERIVED)와\n");
            sb.append("   소유 축(frst_rgtr_id=loginId / user_id 계열=esntlId)을 **실측**한 뒤 정한다.\n");
            fail(sb.toString());
        }

        log.info("✅ 첨부 참조원 레지스트리 정합 — 엔티티 {}종 ↔ 등록 {}종 일치.",
                tableToEntity.size(), registered.size());
    }

    /** 모든 {@code @Entity} 의 물리 테이블명. URL 연결 참조원의 실존 확인에 쓴다. */
    private Set<String> scanAllEntityTables() {
        Set<String> tables = new TreeSet<>();
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        for (var bd : scanner.findCandidateComponents(ENTITY_SCAN_BASE)) {
            try {
                Class<?> clazz = Class.forName(bd.getBeanClassName());
                Table table = AnnotationUtils.findAnnotation(clazz, Table.class);
                if (table != null && !table.name().isBlank()) {
                    tables.add(table.name().toLowerCase());
                }
            } catch (ClassNotFoundException | LinkageError ex) {
                log.warn("[AttachmentRegistryGate] 엔티티 로드 실패(스캔 제외): {} ({})",
                        bd.getBeanClassName(), ex.getMessage());
            }
        }
        return tables;
    }

    /** {@code atchFileId} 필드를 보유한 {@code @Entity} 를 스캔해 (물리 테이블 → 엔티티명) 으로 환원한다. */
    private Map<String, String> scanEntitiesHoldingAttachmentId() {
        Map<String, String> result = new LinkedHashMap<>();

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));

        for (var bd : scanner.findCandidateComponents(ENTITY_SCAN_BASE)) {
            String className = bd.getBeanClassName();
            try {
                Class<?> clazz = Class.forName(className);
                if (!hasAttachmentField(clazz)) {
                    continue;
                }
                Table table = AnnotationUtils.findAnnotation(clazz, Table.class);
                if (table == null || table.name().isBlank()) {
                    fail("@Table(name=...) 이 없는 엔티티가 atchFileId 를 보유합니다: " + className
                            + " — 물리 테이블을 특정할 수 없어 첨부 인가 레지스트리와 대조할 수 없습니다.");
                    continue;
                }
                String tableName = table.name().toLowerCase();
                if (ATTACHMENT_STORAGE_TABLES.contains(tableName)) {
                    continue; // 참조 대상(첨부 저장소) 자신.
                }
                result.put(tableName, clazz.getSimpleName());
            } catch (ClassNotFoundException | LinkageError ex) {
                log.warn("[AttachmentRegistryGate] 엔티티 로드 실패(스캔 제외): {} ({})", className, ex.getMessage());
            }
        }
        return result;
    }

    private boolean hasAttachmentField(Class<?> clazz) {
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field field : c.getDeclaredFields()) {
                if (ATTACHMENT_FIELD.equals(field.getName())) {
                    return true;
                }
            }
        }
        return false;
    }
}
