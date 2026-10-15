package nuri.migration.verify;

import nuri.migration.postgres.TargetConstraintSnapshot;
import nuri.migration.postgres.TargetConstraintSnapshot.Constraint;
import nuri.migration.postgres.TargetConstraintSnapshot.TableConstraints;
import nuri.migration.postgres.TargetConstraintSnapshot.UniqueIndex;
import nuri.migration.verify.ConstraintProof.ForeignKeyProof;
import nuri.migration.verify.ConstraintProof.ProofResult;
import nuri.migration.verify.ConstraintProof.UniqueProof;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * [ADR-0029 L4 D2] 물리 FK·유일 인덱스의 집행 증명. {@code tgenabled IN ('O','A')} 만 증명이다 — {@code 'R'} 은 origin
 * 세션에서 발화하지 않는다.
 */
@DisplayName("물리 제약 증명")
class ConstraintProofTest {

    private static final Set<String> MAPPED = Set.of("public.tb_child");

    static TargetConstraintSnapshot snapshot(List<String> triggerStates, boolean validated, boolean indexValid,
                                             boolean indexReady) {
        Constraint pk = new Constraint("pk_tb_child", "p", List.of("child_id"), null, null, null, true, null);
        Constraint fk = new Constraint("fk_child_parent", "f", List.of("parent_id"), "public", "tb_parent",
                List.of("parent_id"), validated, triggerStates);
        Constraint check = new Constraint("ck_child_yn", "c", List.of(), null, null, null, true, null);
        return new TargetConstraintSnapshot(1, List.of(new TableConstraints("public", "tb_child",
                List.of(pk, fk, check),
                List.of(new UniqueIndex("pk_tb_child", List.of("child_id"), indexValid, indexReady)))));
    }

    static TargetConstraintSnapshot enforced() {
        return snapshot(List.of("O", "O"), true, true, true);
    }

    private static ForeignKeyProof onlyForeignKey(ProofResult result) {
        assertThat(result.foreignKeys()).hasSize(1);
        return result.foreignKeys().getFirst();
    }

    @Test
    @DisplayName("시작·끝 모두 검증된 FK 이고 RI 트리거가 O·A 이며 쓰기 세션이 origin 이면 증명한다")
    void provenForeignKey() {
        ProofResult result = ConstraintProof.prove(enforced(), snapshot(List.of("A", "O"), true, true, true),
                true, MAPPED);

        ForeignKeyProof proof = onlyForeignKey(result);
        assertThat(proof.proven()).isTrue();
        assertThat(proof.reason()).isNull();
        assertThat(proof.reference()).isEqualTo(new DeclaredReference("public.tb_child", List.of("parent_id"),
                "public.tb_parent", List.of("parent_id"), DeclaredReference.Origin.PHYSICAL));
        assertThat(result.read()).isTrue();
        assertThat(result.uniqueIndexes()).containsExactly(
                new UniqueProof("public.tb_child", "pk_tb_child", ReconciliationVerdict.PASS, null));
    }

    @Test
    @DisplayName("replica 전용(R)·꺼진(D) 트리거는 증명이 아니다")
    void replicaOrDisabledTriggersAreNotProof() {
        assertThat(onlyForeignKey(ConstraintProof.prove(enforced(), snapshot(List.of("R", "R"), true, true, true),
                true, MAPPED)).reason()).isEqualTo("TRIGGER_NOT_ENABLED");
        assertThat(onlyForeignKey(ConstraintProof.prove(snapshot(List.of("O", "D"), true, true, true), enforced(),
                true, MAPPED)).reason()).isEqualTo("TRIGGER_NOT_ENABLED");
        assertThat(onlyForeignKey(ConstraintProof.prove(snapshot(List.of(), true, true, true), enforced(),
                true, MAPPED)).proven()).as("트리거를 읽지 못한 FK").isFalse();
    }

    @Test
    @DisplayName("쓰기 세션의 복제 역할을 확인하지 못했거나 origin 이 아니면 증명하지 않는다")
    void replicationRoleIsRequired() {
        assertThat(onlyForeignKey(ConstraintProof.prove(enforced(), enforced(), false, MAPPED)).reason())
                .isEqualTo("REPLICATION_ROLE_UNPROVEN");
        assertThat(onlyForeignKey(ConstraintProof.prove(enforced(), enforced(), null, MAPPED)).proven()).isFalse();
    }

    @Test
    @DisplayName("끝에서 사라졌거나 정의가 바뀐 FK 는 증명하지 않는다")
    void changedForeignKeys() {
        TargetConstraintSnapshot dropped = new TargetConstraintSnapshot(1, List.of(new TableConstraints("public",
                "tb_child", List.of(), List.of(new UniqueIndex("pk_tb_child", List.of("child_id"), true, true)))));
        TargetConstraintSnapshot retargeted = new TargetConstraintSnapshot(1, List.of(new TableConstraints("public",
                "tb_child", List.of(new Constraint("fk_child_parent", "f", List.of("parent_id"), "public",
                "tb_other", List.of("parent_id"), true, List.of("O", "O"))), List.of())));

        assertThat(onlyForeignKey(ConstraintProof.prove(enforced(), dropped, true, MAPPED)).reason())
                .isEqualTo("CONSTRAINT_CHANGED");
        assertThat(onlyForeignKey(ConstraintProof.prove(dropped, enforced(), true, MAPPED)).reason())
                .isEqualTo("CONSTRAINT_CHANGED");
        assertThat(onlyForeignKey(ConstraintProof.prove(enforced(), retargeted, true, MAPPED)).reason())
                .isEqualTo("CONSTRAINT_CHANGED");
    }

    @Test
    @DisplayName("NOT VALID FK 도 트리거가 이번 쓰기를 검사했으면 증명하고, 기존 행을 검사하지 않았다는 메모를 남긴다")
    void notValidForeignKeyIsProvenWithNote() {
        ForeignKeyProof startNotValid = onlyForeignKey(ConstraintProof.prove(snapshot(List.of("O", "O"), false, true,
                true), enforced(), true, MAPPED));
        ForeignKeyProof endNotValid = onlyForeignKey(ConstraintProof.prove(enforced(), snapshot(List.of("O", "O"),
                false, true, true), true, MAPPED));

        assertThat(startNotValid.proven()).isTrue();
        assertThat(startNotValid.reason()).isEqualTo(ConstraintProof.NOT_VALIDATED);
        assertThat(endNotValid.proven()).isTrue();
        assertThat(endNotValid.reason()).isEqualTo(ConstraintProof.NOT_VALIDATED);
    }

    @Test
    @DisplayName("제약·트리거 행 버전이 시작과 끝에서 다르면 증명하지 않는다 — 적재 중 트리거를 껐다 켠 경우다")
    void catalogRowVersionChangeIsNotProof() {
        TargetConstraintSnapshot start = versioned(List.of("c:100", "t:101", "t:102"));
        TargetConstraintSnapshot toggled = versioned(List.of("c:100", "t:205", "t:206"));

        assertThat(onlyForeignKey(ConstraintProof.prove(start, versioned(List.of("c:100", "t:101", "t:102")), true,
                MAPPED)).proven()).as("행 버전이 같으면 증명이다").isTrue();
        assertThat(onlyForeignKey(ConstraintProof.prove(start, toggled, true, MAPPED)).reason())
                .isEqualTo(ConstraintProof.CATALOG_ROW_CHANGED);
        assertThat(onlyForeignKey(ConstraintProof.prove(start, enforced(), true, MAPPED)).reason())
                .as("한쪽만 행 버전을 읽었으면 같다고 볼 수 없다").isEqualTo(ConstraintProof.CATALOG_ROW_CHANGED);
    }

    @Test
    @DisplayName("이번 실행 전에 같은 run 이 쓴 행이 있는 자식 표의 FK 는 증명하지 않는다 — 재개한 run 이다")
    void priorExecutionRowsAreNotProof() {
        ProofResult resumed = ConstraintProof.prove(enforced(), enforced(), null, true, MAPPED,
                Set.of("PUBLIC.TB_CHILD"));
        ProofResult otherTable = ConstraintProof.prove(enforced(), enforced(), null, true, MAPPED,
                Set.of("public.tb_parent"));

        assertThat(onlyForeignKey(resumed).reason()).isEqualTo(ConstraintProof.PRIOR_EXECUTION_ROWS);
        assertThat(onlyForeignKey(resumed).proven()).isFalse();
        assertThat(onlyForeignKey(otherTable).proven()).as("다른 표의 재개 행은 이 FK 와 무관하다").isTrue();
    }

    private static TargetConstraintSnapshot versioned(List<String> versions) {
        Constraint fk = new Constraint("fk_child_parent", "f", List.of("parent_id"), "public", "tb_parent",
                List.of("parent_id"), true, List.of("O", "O"), versions);
        return new TargetConstraintSnapshot(1, List.of(new TableConstraints("public", "tb_child", List.of(fk),
                List.of(new UniqueIndex("pk_tb_child", List.of("child_id"), true, true)))));
    }

    @Test
    @DisplayName("유효하지 않거나 준비되지 않았거나 사라진 유일 인덱스는 CONSTRAINT_NOT_ENFORCED 다")
    void uniqueIndexes() {
        TargetConstraintSnapshot noIndex = new TargetConstraintSnapshot(1, List.of(new TableConstraints("public",
                "tb_child", List.of(), List.of())));

        assertThat(ConstraintProof.prove(enforced(), snapshot(List.of("O", "O"), true, false, true), true, MAPPED)
                .uniqueIndexes().getFirst().reason()).isEqualTo(ConstraintProof.CONSTRAINT_NOT_ENFORCED);
        assertThat(ConstraintProof.prove(snapshot(List.of("O", "O"), true, true, false), enforced(), true, MAPPED)
                .uniqueIndexes().getFirst().status()).isEqualTo(ReconciliationVerdict.FAIL);
        assertThat(ConstraintProof.prove(enforced(), noIndex, true, MAPPED).uniqueIndexes().getFirst().status())
                .isEqualTo(ReconciliationVerdict.FAIL);
    }

    @Test
    @DisplayName("스냅숏을 읽지 못했으면 FK 는 증명하지 않고 유일 인덱스는 판정하지 않는다")
    void unreadSnapshots() {
        ProofResult result = ConstraintProof.prove(null, enforced(), true, MAPPED);

        assertThat(result.read()).isFalse();
        assertThat(onlyForeignKey(result).reason()).isEqualTo("CONSTRAINTS_UNREAD");
        assertThat(result.uniqueIndexes()).singleElement().satisfies(proof -> {
            assertThat(proof.status()).isEqualTo(ReconciliationVerdict.NOT_COVERED);
            assertThat(proof.reason()).isEqualTo("CONSTRAINTS_UNREAD");
        });
        assertThat(ConstraintProof.prove(null, null, true, MAPPED).foreignKeys()).isEmpty();
    }

    @Test
    @DisplayName("시작은 읽었는데 끝을 읽지 못했으면 유일 인덱스는 SQLSTATE 를 붙인 FAIL 이고 FK 는 고아 대조로 내려간다")
    void unreadEndSnapshotFailsUniqueIndexes() {
        ProofResult result = ConstraintProof.prove(enforced(), null, "CONSTRAINTS_UNREAD(SQLSTATE=42501)", true,
                MAPPED, Set.of());

        assertThat(result.read()).isFalse();
        assertThat(onlyForeignKey(result).proven()).isFalse();
        assertThat(onlyForeignKey(result).reason()).isEqualTo("CONSTRAINTS_UNREAD");
        assertThat(result.uniqueIndexes()).containsExactly(new UniqueProof("public.tb_child", "pk_tb_child",
                ReconciliationVerdict.FAIL, "CONSTRAINTS_UNREAD(SQLSTATE=42501)"));
        assertThat(ConstraintProof.prove(enforced(), null, true, MAPPED).uniqueIndexes().getFirst().reason())
                .as("사유가 없으면 고정 어휘다").isEqualTo("CONSTRAINTS_UNREAD");
    }

    @Test
    @DisplayName("매핑 대상이 아닌 표의 제약은 보지 않는다")
    void onlyMappedTables() {
        assertThat(ConstraintProof.prove(enforced(), enforced(), true, Set.of("public.tb_other")).foreignKeys())
                .isEmpty();
        assertThat(ConstraintProof.prove(enforced(), enforced(), true, Set.of("PUBLIC.TB_CHILD")).foreignKeys())
                .hasSize(1);
        assertThat(ConstraintProof.prove(enforced(), enforced(), true, null).foreignKeys()).hasSize(1);
    }
}
