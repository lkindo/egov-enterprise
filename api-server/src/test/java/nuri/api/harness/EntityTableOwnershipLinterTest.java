package nuri.api.harness;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import nuri.foundation.domain.common.BaseEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.hibernate.annotations.Immutable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.CrudRepository;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 하나의 물리 테이블을 여러 쓰기 엔티티가 조용히 소유하거나 감사 컬럼 매핑을 빠뜨리는 회귀를 막는다.
 *
 * <p>테이블명만 allowlist 하면 같은 이름의 제3 엔티티가 추가돼도 통과하므로, 의도된 공유 매핑은
 * 테이블별 <b>정확한 FQCN 집합</b>으로 고정한다. 예외가 사라지거나 구성원이 달라져도 실패한다(H2).
 * 감사 컬럼은 Entity 상속 구조와 Flyway 델타 재생 결과를 양방향으로 대조한다.</p>
 */
@Tag("governance-harness")
class EntityTableOwnershipLinterTest {

    private static final Logger log = LoggerFactory.getLogger(EntityTableOwnershipLinterTest.class);
    private static final String ENTITY_SCAN_BASE = "nuri";
    private static final int EXPECTED_ENTITY_COUNT = 79;
    private static final int EXPECTED_PHYSICAL_TABLE_COUNT = 78;

    private static final Set<String> AUDIT_COLUMNS = Set.of(
            "frst_rgtr_id", "crt_dt", "last_mdfr_id", "mdfcn_dt");

    /** 물리 감사 4컬럼은 있었지만 BaseEntity 상속이 빠졌던 쓰기 모델과 해당 저장소. */
    private static final Map<String, String> CORRECTED_AUDIT_WRITE_ENTITIES = Map.of(
            "nuri.business.domain.board.BoardUse",
                    "nuri.business.domain.board.BoardUseRepository",
            "nuri.business.domain.auth.RefreshToken",
                    "nuri.business.domain.auth.RefreshTokenRepository",
            "nuri.business.domain.sms.SmsRecptn",
                    "nuri.business.domain.sms.SmsRecptnRepository");

    /**
     * 현재 소스에 근거가 명시된 공유 매핑만 허용한다.
     *
     * <ul>
     *   <li>조직: V2_16과 OrganizationManage의 주석이 DeptManage와의 이중 매핑 계약을 명시한다.</li>
     * </ul>
     */
    private static final Map<String, SharedOwnership> INTENTIONAL_SHARED_TABLES = Map.of(
            "tb_ognz_info", new SharedOwnership(
                    "nuri.business.domain.user.entity.DeptManage",
                    "nuri.business.domain.user.repository.DeptManageRepository",
                    "nuri.business.domain.organization.OrganizationManage",
                    "nuri.business.domain.organization.OrganizationManageRepository",
                    Set.of("up_ognz_id", "sort_ordr")));

    @Test
    @DisplayName("79 Entity → 78 물리 테이블: 공유 테이블은 exact FQCN + 단일 쓰기 소유자다")
    void entityTableOwnershipIsUniqueExceptForExactDocumentedPairs() {
        EntityInventory inventory = scanEntities();

        assertThat(inventory.entitiesByName())
                .as("Entity 스캔 모집단이 바뀌었습니다. 신규/삭제가 의도됐다면 물리 테이블 소유권을 재판정하십시오.")
                .hasSize(EXPECTED_ENTITY_COUNT);
        assertThat(inventory.entitiesByTable())
                .as("79 Entity의 distinct @Table 모집단")
                .hasSize(EXPECTED_PHYSICAL_TABLE_COUNT);

        List<String> violations = new ArrayList<>(duplicateOwnershipViolations(
                inventory.entitiesByTable(), expectedSharedMembers()));
        violations.addAll(sharedOwnershipViolations(inventory));

        assertThat(violations)
                .as("의도하지 않은 duplicate @Table 매핑 또는 낡은 예외가 있습니다.%n%s",
                        String.join(System.lineSeparator(), violations))
                .isEmpty();

        log.info("Entity 테이블 소유권 OK — Entity {}종 / distinct table {}종 / read-only 공유 {}종",
                inventory.entitiesByName().size(), inventory.entitiesByTable().size(),
                INTENTIONAL_SHARED_TABLES.size());
    }

    @Test
    @DisplayName("부정 대조군: 미등록 FQCN duplicate와 allowlist 구성원 증가는 모두 위반이다")
    void duplicateDetectorRejectsUnlistedAndExpandedMappings() {
        Map<String, Set<String>> actual = Map.of(
                "tb_unlisted", Set.of("sample.First", "sample.Second"),
                "tb_allowed", Set.of("sample.AllowedA", "sample.AllowedB", "sample.Unexpected"));
        Map<String, Set<String>> allowed = Map.of(
                "tb_allowed", Set.of("sample.AllowedA", "sample.AllowedB"));

        assertThat(duplicateOwnershipViolations(actual, allowed))
                .anyMatch(v -> v.contains("tb_unlisted") && v.contains("미등록"))
                .anyMatch(v -> v.contains("tb_allowed") && v.contains("FQCN 집합 불일치"));
    }

    @Test
    @DisplayName("부정 대조군: 공유 테이블에 mutable Entity가 둘이면 중복 쓰기 소유권 위반이다")
    void sharedOwnershipDetectorRejectsTwoMutableEntities() {
        assertThat(mutableOwnerViolation(
                "tb_sample", Set.of("sample.WriterA", "sample.WriterB"), Set.of()))
                .contains("mutable Entity 2개");
    }

    @Test
    @DisplayName("감사 컬럼: 79 Entity의 상속/수동 매핑과 Flyway 물리 컬럼이 모두 full-audit다")
    void auditColumnMappingsMatchFlywayPhysicalColumns() throws IOException {
        EntityInventory inventory = scanEntities();
        Map<String, Map<String, String>> schema =
                new EntitySchemaConformanceLinterTest().replayMigrations();

        List<String> violations = new ArrayList<>();
        Map<AuditShape, Integer> census = new EnumMap<>(AuditShape.class);
        for (Map.Entry<String, Class<?>> entry : inventory.entitiesByName().entrySet()) {
            String fqcn = entry.getKey();
            Class<?> entity = entry.getValue();
            String table = tableNameOf(entity);
            Set<String> entityAudit = mappedAuditColumns(entity);
            AuditShape entityShape = AuditShape.of(entityAudit);
            census.merge(entityShape, 1, Integer::sum);

            if (entityShape != AuditShape.FULL) {
                violations.add(fqcn + " → 비표준 감사 형태 " + entityShape + " " + entityAudit
                        + " (현재 Entity/Flyway 모집단에는 감사 4컬럼 예외 없음)");
            }

            Map<String, String> physicalColumns = schema.get(table);
            if (physicalColumns == null) {
                violations.add(fqcn + " → Flyway 재생 결과에 테이블 " + table + " 없음");
                continue;
            }
            Set<String> physicalAudit = new TreeSet<>(physicalColumns.keySet());
            physicalAudit.retainAll(AUDIT_COLUMNS);
            String parityViolation = auditParityViolation(entityAudit, physicalAudit);
            if (parityViolation != null) {
                violations.add(fqcn + " → " + table + " 감사 컬럼 불일치: " + parityViolation);
            }
        }

        assertThat(census.getOrDefault(AuditShape.FULL, 0)).as("full audit Entity census").isEqualTo(79);
        assertThat(census.getOrDefault(AuditShape.TIME_ONLY, 0)).as("time-only Entity는 허용하지 않음").isZero();
        assertThat(census.getOrDefault(AuditShape.NONE, 0)).as("no-audit Entity는 허용하지 않음").isZero();
        assertThat(census.getOrDefault(AuditShape.PARTIAL, 0)).as("partial audit Entity는 허용하지 않음").isZero();
        assertThat(violations)
                .as("Entity ↔ Flyway 감사 컬럼 계약 불일치%n%s",
                        String.join(System.lineSeparator(), violations))
                .isEmpty();

        log.info("감사 컬럼 정합 OK — full {}, time-only {}, none {}, partial {}",
                census.getOrDefault(AuditShape.FULL, 0), census.getOrDefault(AuditShape.TIME_ONLY, 0),
                census.getOrDefault(AuditShape.NONE, 0), census.getOrDefault(AuditShape.PARTIAL, 0));
    }

    @Test
    @DisplayName("부정 대조군: 물리 감사 컬럼 하나라도 Entity에서 빠지면 parity가 깨진다")
    void auditParityRejectsMissingEntityColumn() {
        assertThat(auditParityViolation(
                Set.of("frst_rgtr_id", "crt_dt", "mdfcn_dt"), AUDIT_COLUMNS))
                .contains("Entity")
                .contains("Flyway");
    }

    @Test
    @DisplayName("감사 상속을 복원한 3종은 BaseEntity + JpaRepository 쓰기 모델로 유지된다")
    void correctedAuditEntitiesRemainWriteModels() throws ClassNotFoundException, IOException {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> entry : CORRECTED_AUDIT_WRITE_ENTITIES.entrySet()) {
            Class<?> entity = Class.forName(entry.getKey());
            Class<?> repository = Class.forName(entry.getValue());
            if (!BaseEntity.class.isAssignableFrom(entity)) {
                violations.add(entry.getKey() + " → BaseEntity 감사 상속 소실");
            }
            if (!JpaRepository.class.isAssignableFrom(repository)) {
                violations.add(entry.getValue() + " → JpaRepository 쓰기 계약 소실");
            }
        }

        PathEvidence evidence = writePathEvidence();
        if (!evidence.authService().contains("refreshTokenRepository.save(")) {
            violations.add("RefreshToken 실제 save/update 경로 소실");
        }
        if (!evidence.smsService().contains("smsRecptnRepository.save(")) {
            violations.add("SmsRecptn 생성 save 경로 소실");
        }
        if (!evidence.smsAsyncProcessor().contains("@Transactional(propagation = Propagation.REQUIRES_NEW)")
                || !evidence.smsAsyncProcessor().contains(".ifPresent(r -> r.updateResult(")) {
            violations.add("SmsRecptn 비동기 결과 갱신의 REQUIRES_NEW + managed dirty-check 경로 소실");
        }

        assertThat(violations)
                .as("물리 감사 컬럼을 매핑한 3종의 실제 쓰기 근거가 바뀌었습니다.%n%s",
                        String.join(System.lineSeparator(), violations))
                .isEmpty();
    }

    private static List<String> duplicateOwnershipViolations(
            Map<String, Set<String>> actualByTable, Map<String, Set<String>> allowedByTable) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, Set<String>> entry : actualByTable.entrySet()) {
            if (entry.getValue().size() < 2) {
                continue;
            }
            Set<String> allowed = allowedByTable.get(entry.getKey());
            if (allowed == null) {
                violations.add(entry.getKey() + " → 미등록 duplicate FQCN " + entry.getValue());
            } else if (!allowed.equals(entry.getValue())) {
                violations.add(entry.getKey() + " → 허용 FQCN 집합 불일치: actual=" + entry.getValue()
                        + ", allowed=" + allowed);
            }
        }
        for (Map.Entry<String, Set<String>> allowed : allowedByTable.entrySet()) {
            Set<String> actual = actualByTable.get(allowed.getKey());
            if (!allowed.getValue().equals(actual)) {
                violations.add(allowed.getKey() + " → 낡거나 변형된 공유 매핑 예외: actual=" + actual
                        + ", allowed=" + allowed.getValue());
            }
        }
        return violations.stream().distinct().sorted().toList();
    }

    private static Map<String, Set<String>> expectedSharedMembers() {
        Map<String, Set<String>> expected = new TreeMap<>();
        INTENTIONAL_SHARED_TABLES.forEach((table, ownership) -> expected.put(table,
                Set.of(ownership.writerEntity(), ownership.readerEntity())));
        return expected;
    }

    private static List<String> sharedOwnershipViolations(EntityInventory inventory) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, SharedOwnership> entry : INTENTIONAL_SHARED_TABLES.entrySet()) {
            String table = entry.getKey();
            SharedOwnership ownership = entry.getValue();
            Class<?> writer = inventory.entitiesByName().get(ownership.writerEntity());
            Class<?> reader = inventory.entitiesByName().get(ownership.readerEntity());
            if (writer == null || reader == null) {
                violations.add(table + " → 공유 소유권 FQCN 로드 실패: writer=" + writer + ", reader=" + reader);
                continue;
            }

            Set<String> immutableEntities = new TreeSet<>();
            for (Class<?> entity : List.of(writer, reader)) {
                if (entity.isAnnotationPresent(Immutable.class)) {
                    immutableEntities.add(entity.getName());
                }
            }
            String mutableViolation = mutableOwnerViolation(
                    table, Set.of(writer.getName(), reader.getName()), immutableEntities);
            if (mutableViolation != null) {
                violations.add(mutableViolation);
            }
            if (writer.isAnnotationPresent(Immutable.class)) {
                violations.add(table + " → writer가 @Immutable입니다: " + writer.getName());
            }
            if (!reader.isAnnotationPresent(Immutable.class)) {
                violations.add(table + " → read model에 @Immutable이 없습니다: " + reader.getName());
            }

            try {
                Class<?> writerRepository = Class.forName(ownership.writerRepository());
                Class<?> readerRepository = Class.forName(ownership.readerRepository());
                if (!JpaRepository.class.isAssignableFrom(writerRepository)) {
                    violations.add(table + " → writer repository가 JpaRepository 쓰기 계약이 아님: "
                            + ownership.writerRepository());
                }
                if (CrudRepository.class.isAssignableFrom(readerRepository)) {
                    violations.add(table + " → read-only repository가 CrudRepository 쓰기 API를 노출: "
                            + ownership.readerRepository());
                }
            } catch (ClassNotFoundException ex) {
                violations.add(table + " → repository FQCN 로드 실패: " + ex.getMessage());
            }

            Map<String, ColumnContract> writerColumns = mappedColumnContracts(writer);
            Map<String, ColumnContract> readerColumns = mappedColumnContracts(reader);
            Set<String> readerOnly = new TreeSet<>(readerColumns.keySet());
            readerOnly.removeAll(writerColumns.keySet());
            Set<String> writerOnly = new TreeSet<>(writerColumns.keySet());
            writerOnly.removeAll(readerColumns.keySet());
            if (!readerOnly.isEmpty()) {
                violations.add(table + " → read model에 writer가 모르는 컬럼 존재: " + readerOnly);
            }
            if (!writerOnly.equals(ownership.writerOnlyColumns())) {
                violations.add(table + " → writer-only 컬럼 차이 변동: actual=" + writerOnly
                        + ", expected=" + ownership.writerOnlyColumns());
            }
            for (String common : readerColumns.keySet()) {
                ColumnContract writerContract = writerColumns.get(common);
                if (writerContract != null && !writerContract.equals(readerColumns.get(common))) {
                    violations.add(table + "." + common + " → 공유 Entity 매핑 계약 불일치: writer="
                            + writerContract + ", reader=" + readerColumns.get(common));
                }
            }
        }
        return violations;
    }

    private static String mutableOwnerViolation(
            String table, Set<String> entities, Set<String> immutableEntities) {
        Set<String> mutable = new TreeSet<>(entities);
        mutable.removeAll(immutableEntities);
        return mutable.size() == 1
                ? null
                : table + " → mutable Entity " + mutable.size() + "개: " + mutable
                        + " (공유 테이블 쓰기 소유자는 정확히 1개여야 함)";
    }

    private static String auditParityViolation(Set<String> entityAudit, Set<String> physicalAudit) {
        return entityAudit.equals(physicalAudit)
                ? null
                : "Entity=" + new TreeSet<>(entityAudit) + ", Flyway=" + new TreeSet<>(physicalAudit);
    }

    private static EntityInventory scanEntities() {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));

        Map<String, Class<?>> entitiesByName = new TreeMap<>();
        Map<String, Set<String>> entitiesByTable = new TreeMap<>();
        List<String> loadFailures = new ArrayList<>();
        scanner.findCandidateComponents(ENTITY_SCAN_BASE).stream()
                .map(candidate -> candidate.getBeanClassName())
                .sorted()
                .forEach(fqcn -> {
                    try {
                        Class<?> entity = Class.forName(fqcn);
                        Table table = entity.getAnnotation(Table.class);
                        if (table == null || table.name().isBlank()) {
                            loadFailures.add(fqcn + " → 명시적 @Table(name) 없음");
                            return;
                        }
                        entitiesByName.put(fqcn, entity);
                        entitiesByTable.computeIfAbsent(tableNameOf(entity), ignored -> new TreeSet<>()).add(fqcn);
                    } catch (ClassNotFoundException | LinkageError ex) {
                        loadFailures.add(fqcn + " → 클래스 로드 실패: " + ex.getClass().getSimpleName());
                    }
                });

        assertThat(loadFailures)
                .as("Entity 스캔을 조용히 생략하면 false-green입니다.%n%s",
                        String.join(System.lineSeparator(), loadFailures))
                .isEmpty();
        return new EntityInventory(entitiesByName, entitiesByTable);
    }

    private static String tableNameOf(Class<?> entity) {
        return entity.getAnnotation(Table.class).name().toLowerCase(Locale.ROOT);
    }

    private static Set<String> mappedAuditColumns(Class<?> entity) {
        Set<String> columns = new TreeSet<>();
        for (Class<?> type = entity; type != null && type != Object.class; type = type.getSuperclass()) {
            for (Field field : type.getDeclaredFields()) {
                if (Modifier.isStatic(field.getModifiers()) || Modifier.isTransient(field.getModifiers())
                        || field.isAnnotationPresent(Transient.class)) {
                    continue;
                }
                Column column = field.getAnnotation(Column.class);
                String name = column != null && !column.name().isBlank()
                        ? column.name().toLowerCase(Locale.ROOT)
                        : camelToSnake(field.getName());
                if (AUDIT_COLUMNS.contains(name)) {
                    columns.add(name);
                }
            }
        }
        return columns;
    }

    private static Map<String, ColumnContract> mappedColumnContracts(Class<?> entity) {
        Map<String, ColumnContract> columns = new TreeMap<>();
        for (Class<?> type = entity; type != null && type != Object.class; type = type.getSuperclass()) {
            for (Field field : type.getDeclaredFields()) {
                if (Modifier.isStatic(field.getModifiers()) || Modifier.isTransient(field.getModifiers())
                        || field.isAnnotationPresent(Transient.class)) {
                    continue;
                }
                Column column = field.getAnnotation(Column.class);
                String name = column != null && !column.name().isBlank()
                        ? column.name().toLowerCase(Locale.ROOT)
                        : camelToSnake(field.getName());
                columns.put(name, new ColumnContract(
                        field.getType().getName(),
                        column == null ? 255 : column.length(),
                        column == null || column.nullable(),
                        column == null || column.insertable(),
                        column == null || column.updatable()));
            }
        }
        return columns;
    }

    private static String camelToSnake(String name) {
        return name.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }

    private static PathEvidence writePathEvidence() throws IOException {
        var root = HarnessSourceIndex.repoRoot();
        return new PathEvidence(
                HarnessSourceIndex.read(root.resolve(
                        "business-core/src/main/java/nuri/business/service/auth/impl/AuthServiceImpl.java")),
                HarnessSourceIndex.read(root.resolve(
                        "business-app/src/main/java/nuri/business/service/sms/SmsService.java")),
                HarnessSourceIndex.read(root.resolve(
                        "business-app/src/main/java/nuri/business/service/sms/SmsAsyncProcessor.java")));
    }

    private enum AuditShape {
        FULL,
        TIME_ONLY,
        NONE,
        PARTIAL;

        static AuditShape of(Set<String> columns) {
            if (columns.equals(AUDIT_COLUMNS)) {
                return FULL;
            }
            if (columns.equals(Set.of("crt_dt", "mdfcn_dt"))) {
                return TIME_ONLY;
            }
            if (columns.isEmpty()) {
                return NONE;
            }
            return PARTIAL;
        }
    }

    private record EntityInventory(
            Map<String, Class<?>> entitiesByName,
            Map<String, Set<String>> entitiesByTable) {
        private EntityInventory {
            entitiesByName = new LinkedHashMap<>(entitiesByName);
            Map<String, Set<String>> copy = new LinkedHashMap<>();
            entitiesByTable.forEach((table, entities) -> copy.put(table, new LinkedHashSet<>(entities)));
            entitiesByTable = copy;
        }
    }

    private record SharedOwnership(
            String writerEntity,
            String writerRepository,
            String readerEntity,
            String readerRepository,
            Set<String> writerOnlyColumns) {
    }

    private record ColumnContract(
            String javaType,
            int length,
            boolean nullable,
            boolean insertable,
            boolean updatable) {
    }

    private record PathEvidence(
            String authService,
            String smsService,
            String smsAsyncProcessor) {
    }
}
