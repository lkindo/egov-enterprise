package nuri.migration.verify;

import nuri.migration.postgres.TargetSchemaFingerprint.ColumnMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.PrimaryKeyColumn;
import nuri.migration.postgres.TargetSchemaFingerprint.PrimaryKeyMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.ConstraintProof.ForeignKeyProof;
import nuri.migration.verify.ConstraintProof.ProofResult;
import nuri.migration.verify.DeclaredReference.Origin;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import nuri.migration.verify.ReconciliationRun.MappingTally;
import nuri.migration.verify.ReferenceChecks.CandidateTask;
import nuri.migration.verify.ReferenceChecks.Candidates;
import nuri.migration.verify.ReferenceChecks.Method;
import nuri.migration.verify.ReferenceChecks.ReferenceTask;
import nuri.migration.verify.ReferenceChecks.ReferenceVerdict;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static nuri.migration.verify.ReconciliationRunTest.name;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L4 D2] 고아 참조 대사 — 증명한 물리 FK 는 질의 없이, 나머지는 대상 DB 안 {@code NOT EXISTS} 로 센다. 격리 키 후보는
 * 건수만 남기고 판정에 쓰지 않는다.
 */
@DisplayName("고아 참조 대사")
class ReferenceChecksTest {

    private static final DeclaredReference PHYSICAL = new DeclaredReference("public.tb_child", List.of("parent_id"),
            "public.tb_parent", List.of("parent_id"), Origin.PHYSICAL);

    private static ProofResult proof(boolean proven) {
        return new ProofResult(true, List.of(new ForeignKeyProof(PHYSICAL, "fk_child_parent", proven,
                proven ? null : "TRIGGER_NOT_ENABLED")), List.of());
    }

    @Test
    @DisplayName("증명한 물리 FK 는 PROVEN 이고, 같은 참조의 선언은 따로 세지 않는다")
    void provenForeignKeyCoversTheSameDeclaration() {
        DeclaredReference declared = new DeclaredReference("PUBLIC.TB_CHILD", List.of("PARENT_ID"),
                "public.tb_parent", List.of("parent_id"), Origin.DECLARED);

        List<ReferenceTask> tasks = ReferenceChecks.tasks(List.of(declared), proof(true));

        assertThat(tasks).singleElement().satisfies(task -> {
            assertThat(task.method()).isEqualTo(Method.PROVEN);
            assertThat(task.reference().origin()).isEqualTo(Origin.PHYSICAL);
        });
        assertThat(ReferenceChecks.proven(tasks.getFirst()).status()).isEqualTo(ReconciliationVerdict.PASS);
    }

    @Test
    @DisplayName("증명하지 못한 물리 FK 와 다른 부모·컬럼의 선언은 DB 안에서 센다")
    void unprovenAndDifferentReferencesAreScanned() {
        DeclaredReference otherParent = new DeclaredReference("public.tb_child", List.of("parent_id"),
                "public.tb_archive", List.of("parent_id"), Origin.DECLARED);
        DeclaredReference fkRef = new DeclaredReference("public.tb_child", List.of("owner_id"),
                "public.tb_user", List.of("user_id"), Origin.FKREF);
        DeclaredReference duplicate = new DeclaredReference("public.tb_child", List.of("owner_id"),
                "public.tb_user", List.of("user_id"), Origin.DECLARED);

        List<ReferenceTask> tasks = ReferenceChecks.tasks(List.of(otherParent, fkRef, duplicate), proof(false));

        assertThat(tasks).extracting(ReferenceTask::method).containsOnly(Method.SCANNED);
        assertThat(tasks).extracting(task -> task.reference().parent())
                .containsExactly("public.tb_parent", "public.tb_archive", "public.tb_user");
        assertThat(tasks.getFirst().reason()).isEqualTo("TRIGGER_NOT_ENABLED");
        assertThat(ReferenceChecks.tasks(List.of(fkRef), proof(true))).extracting(ReferenceTask::method)
                .containsExactly(Method.PROVEN, Method.SCANNED);
    }

    @Test
    @DisplayName("고아 문장은 모든 컬럼이 NULL 이 아닌 자식만 NOT EXISTS 로 센다 — 값을 바인딩하지 않는다")
    void orphanStatement() {
        DeclaredReference composite = new DeclaredReference("public.tb_child", List.of("tenant_id", "parent_id"),
                "public.tb_parent", List.of("tenant_id", "id"), Origin.DECLARED);

        assertThat(ReferenceChecks.orphanSql(composite)).isEqualTo("SELECT count(*) FROM public.tb_child c WHERE "
                + "c.tenant_id IS NOT NULL AND c.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tb_parent p "
                + "WHERE p.tenant_id = c.tenant_id AND p.id = c.parent_id)");
        assertThatThrownBy(() -> ReferenceChecks.orphanSql(new DeclaredReference("public.tb_child",
                List.of("x; DROP"), "public.tb_parent", List.of("id"), Origin.DECLARED)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("고아가 0 이면 PASS, 있으면 FAIL ORPHAN_REFERENCE(건수), 질의 실패는 SQLSTATE 만 남긴다")
    void verdicts() {
        ReferenceTask task = new ReferenceTask(PHYSICAL, Method.SCANNED, null);

        ReferenceVerdict pass = ReferenceChecks.judge(task, 0);
        ReferenceVerdict fail = ReferenceChecks.judge(task, 3);
        ReferenceVerdict failed = ReferenceChecks.failed(task, "42P01");

        assertThat(pass.status()).isEqualTo(ReconciliationVerdict.PASS);
        assertThat(fail.status()).isEqualTo(ReconciliationVerdict.FAIL);
        assertThat(fail.orphans()).isEqualTo(3L);
        assertThat(fail.reason()).isEqualTo(ReferenceChecks.ORPHAN_REFERENCE);
        assertThat(failed.status()).isEqualTo(ReconciliationVerdict.FAIL);
        assertThat(failed.reason()).isEqualTo("REFERENCE_QUERY_FAILED(SQLSTATE=42P01)");
    }

    @Test
    @DisplayName("격리한 보존 키를 이름이 같은 다른 대상 컬럼에서 후보로 센다 — 참조로 덮인 곳·자기 표는 빼고 판정하지 않는다")
    void isolatedKeyCandidates() {
        ReconciliationRun run = runWith(parent(true, List.of("parent_id")));
        MappingTally tally = run.table("legacy.parent");
        tally.isolated(Map.of(), Map.of("parent_id", 11L));
        tally.isolated(Map.of(), Map.of("parent_id", 12L));
        tally.isolated(Map.of(), Map.of("parent_id", 11L));
        DeclaredReference declared = new DeclaredReference("public.tb_declared", List.of("parent_id"),
                "public.tb_parent", List.of("parent_id"), Origin.DECLARED);

        Candidates candidates = ReferenceChecks.candidates(run.plan(), tallies(run, "legacy.parent"),
                List.of(declared));

        assertThat(candidates.unresolved()).isEmpty();
        assertThat(candidates.tasks()).singleElement().satisfies(task -> {
            assertThat(task.child()).isEqualTo("public.tb_copy");
            assertThat(task.column()).isEqualTo("PARENT_ID");
            assertThat(task.keys()).containsExactly(11L, 12L);
            assertThat(task.toString()).doesNotContain("11");
        });
        assertThat(ReferenceChecks.candidateSql(candidates.tasks().getFirst(), 2)).isEqualTo(
                "SELECT count(*) FROM public.tb_copy c WHERE c.PARENT_ID IN (?, ?) AND NOT EXISTS "
                        + "(SELECT 1 FROM public.tb_parent p WHERE p.parent_id = c.PARENT_ID)");
        assertThat(ReferenceChecks.candidateResult(candidates.tasks().getFirst(), 4).rows()).isEqualTo(4L);
        assertThat(ReferenceChecks.candidateFailed(candidates.tasks().getFirst()).reason())
                .isEqualTo(CoverageReason.CANDIDATE_QUERY_FAILED);
    }

    @Test
    @DisplayName("격리가 없거나 키를 다시 만들거나 PK 가 두 컬럼이면 후보가 없고, 키를 모르면 ISOLATED_KEY_UNKNOWN 이다")
    void candidateConditions() {
        ReconciliationRun noIsolation = runWith(parent(true, List.of("parent_id")));
        ReconciliationRun regenerated = runWith(parent(false, List.of("parent_id")));
        regenerated.table("legacy.parent").isolated(Map.of(), Map.of("parent_id", 1L));
        ReconciliationRun composite = runWith(parent(true, List.of("tenant_id", "parent_id")));
        composite.table("legacy.parent").isolated(Map.of(), Map.of("tenant_id", 1L, "parent_id", 1L));
        ReconciliationRun unknownKey = runWith(parent(true, List.of("parent_id")));
        unknownKey.table("legacy.parent").isolated(Map.of(), Map.of());

        assertThat(ReferenceChecks.candidates(noIsolation.plan(), tallies(noIsolation, "legacy.parent"), List.of())
                .tasks()).isEmpty();
        assertThat(ReferenceChecks.candidates(regenerated.plan(), tallies(regenerated, "legacy.parent"), List.of())
                .tasks()).isEmpty();
        assertThat(ReferenceChecks.candidates(composite.plan(), tallies(composite, "legacy.parent"), List.of())
                .tasks()).isEmpty();
        Candidates unknown = ReferenceChecks.candidates(unknownKey.plan(), tallies(unknownKey, "legacy.parent"),
                List.of());
        assertThat(unknown.tasks()).isEmpty();
        assertThat(unknown.unresolved()).singleElement().satisfies(result -> {
            assertThat(result.parent()).isEqualTo("public.tb_parent");
            assertThat(result.reason()).isEqualTo(CoverageReason.ISOLATED_KEY_UNKNOWN);
        });
    }

    @Test
    @DisplayName("후보 키는 500 개씩 나눠 바인딩한다")
    void candidateBatches() {
        List<Object> keys = new ArrayList<>();
        for (long key = 0; key < 1001; key++) {
            keys.add(key);
        }
        CandidateTask task = new CandidateTask("public.tb_parent", "parent_id", "public.tb_copy", "parent_id", keys);

        assertThat(ReferenceChecks.candidateBatches(task)).extracting(List::size).containsExactly(500, 500, 1);
        assertThatThrownBy(() -> ReferenceChecks.candidateSql(task, 501)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ReferenceChecks.candidateSql(task, 0)).isInstanceOf(IllegalArgumentException.class);
    }

    private static MappingPlan parent(boolean preservedKey, List<String> primaryKey) {
        return new MappingPlan("legacy.parent", "legacy.parent", null, null, "public.tb_parent", List.of(name()),
                primaryKey, preservedKey, true, false);
    }

    private static ReconciliationRun runWith(MappingPlan parent) {
        MappingPlan copy = new MappingPlan("legacy.copy", "legacy.copy", null, null, "public.tb_copy",
                List.of(name()), List.of("copy_id"), true, false, false);
        List<TableMetadata> tables = List.of(table("tb_parent", "parent_id"), table("tb_copy", "PARENT_ID"),
                table("tb_declared", "parent_id"), table("tb_unrelated", "other_id"));
        return ReconciliationRun.of(new ReconciliationPlan(true, List.of(parent, copy), List.of(), null, tables,
                List.of()), new ColumnReplay(new TransformerRegistry(), Map.of()), null);
    }

    private static TableMetadata table(String name, String column) {
        return new TableMetadata(null, "public", name, "TABLE",
                List.of(new ColumnMetadata("id", Types.BIGINT, "int8", 19, 0, 0, null, 1, false, false),
                        new ColumnMetadata(column, Types.BIGINT, "int8", 19, 0, 1, null, 2, false, false)),
                new PrimaryKeyMetadata("pk_" + name, List.of(new PrimaryKeyColumn((short) 1, "id"))));
    }

    private static Map<String, MappingTally> tallies(ReconciliationRun run, String... labels) {
        Map<String, MappingTally> tallies = new HashMap<>();
        for (String label : labels) {
            tallies.put(label, run.table(label));
        }
        return tallies;
    }
}
