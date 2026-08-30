package nuri.migration.plan;

import nuri.migration.artifact.MappingSpecDigester;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.CatalogSnapshot.DatabaseInfo;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.discovery.VisibilityFinding;
import nuri.migration.discovery.VisibilityStatus;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("객체 disposition 마이그레이션 plan")
class MigrationPlannerTest {

    private static final String TARGET_SCHEMA_DIGEST = "a".repeat(64);

    @Test
    @DisplayName("MappingSpec에 명시된 테이블 데이터만 자동 적재로 연결한다")
    void linksOnlyMappedTableDataToAutomaticLoad() {
        CatalogObject table = object(ObjectKind.TABLE, "legacy", "legacy_user");
        CatalogObject routine = object(ObjectKind.ROUTINE, "legacy", "encrypt_rrno");
        CatalogObject grant = object(ObjectKind.GRANT, "legacy", "grant_legacy_user");
        CatalogSnapshot snapshot = snapshot(List.of(table, routine, grant), List.of());
        MappingSpec mapping = mapping("legacy.legacy_user", "tb_user_info");

        Map<String, DispositionDecision> reviewed = Map.of(
                routine.stableId(), new DispositionDecision(
                        ObjectDisposition.REIMPLEMENT_IN_APP, null, true, "암호화 정책은 애플리케이션에서 재구현"),
                grant.stableId(), new DispositionDecision(
                        ObjectDisposition.EXPORT_ONLY, null, true, "권한 정의는 감사 자료로만 보존"));

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot, mapping, reviewed, TARGET_SCHEMA_DIGEST);

        assertThat(plan.schemaVersion()).isEqualTo(MigrationPlan.CURRENT_SCHEMA_VERSION);
        assertThat(plan.mappingDigest()).isEqualTo(MappingSpecDigester.sha256(mapping));
        assertThat(plan.coverage()).isEqualTo(new PlanCoverage(3, 0, 0, 1));
        assertThat(plan.objects()).extracting(MigrationObjectPlan::disposition)
                .containsExactlyInAnyOrder(
                        ObjectDisposition.AUTO_DATA_LOAD,
                        ObjectDisposition.REIMPLEMENT_IN_APP,
                        ObjectDisposition.EXPORT_ONLY);
        MigrationObjectPlan tablePlan = plan.objects().stream()
                .filter(objectPlan -> objectPlan.sourceObjectId().equals(table.stableId()))
                .findFirst().orElseThrow();
        assertThat(tablePlan.targetObject()).isEqualTo("tb_user_info");
        assertThat(tablePlan.dataMappingPresent()).isTrue();
        assertThat(tablePlan.reviewed()).isTrue();
        assertThat(plan.executable()).isTrue();
        assertThat(plan.commitReady()).isTrue();
    }

    @Test
    @DisplayName("VIEW 이름이 테이블 매핑과 같아도 자동 데이터 적재 대상으로 승격하지 않는다")
    void neverAutoLoadsNonTableObjects() {
        CatalogObject view = object(ObjectKind.VIEW, "legacy", "legacy_user");

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot(List.of(view), List.of()),
                mapping("legacy.legacy_user", "tb_user_info"),
                Map.of(),
                TARGET_SCHEMA_DIGEST);

        assertThat(plan.objects()).singleElement().satisfies(objectPlan -> {
            assertThat(objectPlan.disposition()).isEqualTo(ObjectDisposition.RECREATE_VIA_FLYWAY);
            assertThat(objectPlan.reviewed()).isFalse();
            assertThat(objectPlan.dataMappingPresent()).isFalse();
        });
        assertThat(plan.coverage().automatic()).isZero();
        assertThat(plan.commitReady()).isFalse();
        assertThat(plan.readiness().blockers()).anySatisfy(blocker ->
                assertThat(blocker).contains("미검토", view.stableId()));
    }

    @Test
    @DisplayName("미매핑 테이블은 UNCLASSIFIED로 남기고 실행을 차단한다")
    void unclassifiedObjectBlocksExecution() {
        CatalogObject unmapped = object(ObjectKind.TABLE, "legacy", "orphan_table");

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot(List.of(unmapped), List.of()),
                new MappingSpec(null, null, List.of(), Map.of()),
                Map.of(),
                TARGET_SCHEMA_DIGEST);

        assertThat(plan.coverage().unclassified()).isOne();
        assertThat(plan.objects()).singleElement().satisfies(objectPlan ->
                assertThat(objectPlan.disposition()).isNull());
        assertThat(plan.executable()).isFalse();
        assertThat(plan.commitReady()).isFalse();
        assertThat(plan.readiness().blockers()).anySatisfy(blocker ->
                assertThat(blocker).contains("미분류", unmapped.stableId()));
    }

    @Test
    @DisplayName("판독 불가 객체와 명시 BLOCKED disposition은 검토 여부와 관계없이 실행을 차단한다")
    void unreadableAndBlockedObjectsFailClosed() {
        CatalogObject trigger = object(ObjectKind.TRIGGER, "legacy", "tr_user_audit");
        VisibilityFinding unreadable = new VisibilityFinding(
                VisibilityStatus.UNREADABLE,
                ObjectKind.ROUTINE,
                "legacy_db",
                "legacy",
                "discover-routine",
                "catalog 권한 부족",
                "42501");
        DispositionDecision blocked = new DispositionDecision(
                ObjectDisposition.BLOCKED, null, true, "벤더 전용 트리거 해석 불가");

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot(List.of(trigger), List.of(unreadable)),
                new MappingSpec(null, null, List.of(), Map.of()),
                Map.of(trigger.stableId(), blocked),
                TARGET_SCHEMA_DIGEST);

        assertThat(plan.coverage().unreadable()).isOne();
        assertThat(plan.commitReady()).isFalse();
        assertThat(plan.readiness().blockers())
                .anySatisfy(blocker -> assertThat(blocker).contains("판독", "1"))
                .anySatisfy(blocker -> assertThat(blocker).contains("BLOCKED", trigger.stableId()));
    }

    @Test
    @DisplayName("보수적 기본 disposition은 분류값이 있어도 검토 전까지 commit-ready가 아니다")
    void conservativeDefaultsRequireExplicitReview() {
        CatalogObject routine = object(ObjectKind.ROUTINE, "legacy", "pkg_user_sync");
        CatalogObject external = object(ObjectKind.EXTERNAL_OBJECT, "legacy", "remote_hr_link");
        CatalogObject grant = object(ObjectKind.GRANT, "legacy", "legacy_role_grant");

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot(List.of(routine, external, grant), List.of()),
                new MappingSpec(null, null, List.of(), Map.of()),
                Map.of(),
                TARGET_SCHEMA_DIGEST);

        assertThat(plan.objects()).extracting(MigrationObjectPlan::disposition)
                .containsExactlyInAnyOrder(
                        ObjectDisposition.REIMPLEMENT_IN_APP,
                        ObjectDisposition.EXTERNALIZE,
                        ObjectDisposition.EXPORT_ONLY);
        assertThat(plan.objects()).allMatch(objectPlan -> !objectPlan.reviewed());
        assertThat(plan.coverage().unclassified()).isZero();
        assertThat(plan.commitReady()).isFalse();
    }

    @Test
    @DisplayName("plan은 입력 컬렉션 변경의 영향을 받지 않고 객체 ID 순으로 정규화된다")
    void planIsImmutableAndDeterministicallyOrdered() {
        CatalogObject z = object(ObjectKind.TABLE, "legacy", "z_table");
        CatalogObject a = object(ObjectKind.TABLE, "legacy", "a_table");
        List<CatalogObject> mutableObjects = new ArrayList<>(List.of(z, a));
        CatalogSnapshot snapshot = snapshot(mutableObjects, List.of());
        Map<String, DispositionDecision> decisions = Map.of(
                z.stableId(), approvedIgnore("미사용 이력"),
                a.stableId(), approvedIgnore("빈 임시 테이블"));

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot,
                new MappingSpec(null, null, List.of(), Map.of()),
                decisions,
                TARGET_SCHEMA_DIGEST);
        mutableObjects.clear();

        assertThat(plan.objects()).extracting(MigrationObjectPlan::sourceObjectId)
                .containsExactlyElementsOf(List.of(a.stableId(), z.stableId()).stream().sorted().toList());
        assertThat(plan.objects()).isUnmodifiable();
        assertThat(plan.readiness().blockers()).isUnmodifiable();
    }

    @Test
    @DisplayName("동일 이름의 table-scoped 객체는 서로 다른 review key와 plan 항목을 갖는다")
    void sameNamedTableScopedObjectsKeepIndependentReviewKeys() {
        CatalogObject first = scopedConstraint("CUSTOMER");
        CatalogObject second = scopedConstraint("ORDER_HEADER");
        Map<String, DispositionDecision> decisions = Map.of(
                first.stableId(), approvedIgnore("target PK로 대체"),
                second.stableId(), approvedIgnore("target PK로 대체"));

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot(List.of(first, second), List.of()),
                new MappingSpec(null, null, List.of(), Map.of()),
                decisions,
                TARGET_SCHEMA_DIGEST);

        assertThat(plan.objects())
                .hasSize(2)
                .extracting(MigrationObjectPlan::sourceObjectId)
                .containsExactlyInAnyOrder(first.stableId(), second.stableId())
                .doesNotHaveDuplicates();
        assertThat(plan.objects()).allMatch(MigrationObjectPlan::reviewed);
    }

    @Test
    @DisplayName("discoveredAt은 source inventory fingerprint와 plan 의미에 포함하지 않는다")
    void excludesSystemClockFromSourceFingerprint() {
        CatalogObject table = object(ObjectKind.TABLE, "legacy", "legacy_user");
        CatalogSnapshot early = snapshotAt(Instant.parse("2024-01-01T00:00:00Z"), List.of(table));
        CatalogSnapshot late = snapshotAt(Instant.parse("2030-01-01T00:00:00Z"), List.of(table));
        MappingSpec mapping = mapping("legacy.legacy_user", "tb_user_info");

        MigrationPlan earlyPlan = new MigrationPlanner().plan(
                early, mapping, Map.of(), TARGET_SCHEMA_DIGEST);
        MigrationPlan latePlan = new MigrationPlanner().plan(
                late, mapping, Map.of(), TARGET_SCHEMA_DIGEST);

        assertThat(earlyPlan.sourceInventoryDigest()).isEqualTo(latePlan.sourceInventoryDigest());
    }

    @Test
    @DisplayName("AUTO_DATA_LOAD는 테이블 매핑 근거가 없으면 validator가 차단한다")
    void validatorRejectsAutomaticLoadWithoutTableMapping() {
        MigrationObjectPlan invalid = new MigrationObjectPlan(
                "VIEW|legacy_db|legacy|vw_user",
                ObjectKind.VIEW,
                "legacy.vw_user",
                ObjectDisposition.AUTO_DATA_LOAD,
                "tb_user_info",
                true,
                true,
                false,
                "잘못된 자동 분류");
        PlanCoverage coverage = new PlanCoverage(1, 0, 0, 1);

        PlanReadiness readiness = new MigrationPlanValidator().validate(List.of(invalid), coverage);

        assertThat(readiness.commitReady()).isFalse();
        assertThat(readiness.blockers()).anySatisfy(blocker ->
                assertThat(blocker).contains("AUTO_DATA_LOAD", "TABLE", "매핑"));
    }

    @Test
    @DisplayName("APPROVED_IGNORE에는 검토 완료와 비어 있지 않은 승인 사유가 모두 필요하다")
    void approvedIgnoreRequiresReviewAndRationale() {
        MigrationObjectPlan invalid = new MigrationObjectPlan(
                "TABLE|legacy_db|legacy|old_log",
                ObjectKind.TABLE,
                "legacy.old_log",
                ObjectDisposition.APPROVED_IGNORE,
                null,
                false,
                false,
                false,
                " ");

        PlanReadiness readiness = new MigrationPlanValidator().validate(
                List.of(invalid), new PlanCoverage(1, 0, 0, 0));

        assertThat(readiness.commitReady()).isFalse();
        assertThat(readiness.blockers())
                .anySatisfy(blocker -> assertThat(blocker).contains("미검토"))
                .anySatisfy(blocker -> assertThat(blocker).contains("승인 사유"));
    }

    @Test
    @DisplayName("MappingSpec 데이터 적재와 non-auto disposition이 충돌하면 매핑을 조용히 무시하지 않는다")
    void explicitNonAutoDispositionCannotSilentlyDiscardDataMapping() {
        CatalogObject table = object(ObjectKind.TABLE, "legacy", "legacy_user");
        DispositionDecision targetOwned = new DispositionDecision(
                ObjectDisposition.TARGET_OWNED, "tb_user_info", true, "타깃이 이미 소유");

        MigrationPlan plan = new MigrationPlanner().plan(
                snapshot(List.of(table), List.of()),
                mapping("legacy.legacy_user", "tb_user_info"),
                Map.of(table.stableId(), targetOwned),
                TARGET_SCHEMA_DIGEST);

        assertThat(plan.commitReady()).isFalse();
        assertThat(plan.readiness().blockers()).anySatisfy(blocker ->
                assertThat(blocker).contains("MappingSpec", "disposition", table.stableId()));
    }

    @Test
    @DisplayName("TARGET_OWNED와 RECREATE_VIA_FLYWAY는 검토할 타깃 객체가 없으면 차단한다")
    void targetStructuralDispositionsRequireTargetObject() {
        MigrationObjectPlan targetOwnedWithoutTarget = new MigrationObjectPlan(
                "COLUMN|legacy_db|legacy|legacy_user.user_name",
                ObjectKind.COLUMN,
                "legacy.legacy_user.user_name",
                ObjectDisposition.TARGET_OWNED,
                null,
                true,
                false,
                false,
                "현재 스키마와 대조 완료");

        PlanReadiness readiness = new MigrationPlanValidator().validate(
                List.of(targetOwnedWithoutTarget), new PlanCoverage(1, 0, 0, 0));

        assertThat(readiness.commitReady()).isFalse();
        assertThat(readiness.blockers()).anySatisfy(blocker ->
                assertThat(blocker).contains("타깃 객체", "TARGET_OWNED"));
    }

    private static DispositionDecision approvedIgnore(String rationale) {
        return new DispositionDecision(ObjectDisposition.APPROVED_IGNORE, null, true, rationale);
    }

    private static MappingSpec mapping(String source, String target) {
        ColumnMapping id = new ColumnMapping("user_id", "user_id", null, "string", null, null, null);
        TableMapping table = new TableMapping(source, target, null, "user_id", "user_id", List.of(id), null);
        return new MappingSpec(null, null, List.of(table), Map.of());
    }

    private static CatalogObject object(ObjectKind kind, String schema, String name) {
        return new CatalogObject(
                kind,
                "legacy_db",
                schema,
                name,
                false,
                null,
                "d".repeat(64),
                List.of(),
                Map.of());
    }

    private static CatalogObject scopedConstraint(String table) {
        return new CatalogObject(
                ObjectKind.PRIMARY_KEY,
                "legacy_db",
                "legacy",
                "PK_SHARED",
                false,
                null,
                null,
                List.of(new CatalogObject.ObjectReference(
                        ObjectKind.TABLE, "legacy_db", "legacy", table)),
                Map.of("parentTable", table, "columns", "ID"));
    }

    private static CatalogSnapshot snapshot(
            List<CatalogObject> objects,
            List<VisibilityFinding> visibilityFindings
    ) {
        return new CatalogSnapshot(
                1,
                Instant.parse("2026-08-30T00:00:00Z"),
                new DatabaseInfo("PostgreSQL", "17", "pgjdbc", "42"),
                new CatalogSnapshot.EnvironmentInfo("legacy_db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(),
                objects,
                visibilityFindings);
    }

    private static CatalogSnapshot snapshotAt(Instant discoveredAt, List<CatalogObject> objects) {
        CatalogSnapshot base = snapshot(objects, List.of());
        return new CatalogSnapshot(
                base.schemaVersion(),
                discoveredAt,
                base.database(),
                base.environment(),
                base.snapshotCapability(),
                base.objects(),
                base.visibilityFindings());
    }
}
