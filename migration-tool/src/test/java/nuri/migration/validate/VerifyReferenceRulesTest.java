package nuri.migration.validate;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.VerifyDeclaration;
import nuri.migration.model.MappingSpec.VerifyReference;
import nuri.migration.postgres.TargetConstraintSnapshot;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.postgres.TargetSchemaFingerprint.ColumnMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.PrimaryKeyColumn;
import nuri.migration.postgres.TargetSchemaFingerprint.PrimaryKeyMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Types;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** [ADR-0029 L4 D2] 대사 선언(verify)의 정적·live 규칙과 P3. */
class VerifyReferenceRulesTest {

    private static final MappingSpec.Isolate ISOLATE = new MappingSpec.Isolate("U4", 3L, List.of("INVALID_DATE"));
    private static final String REQUIRED = "legacy.parent: isolate 가 있고 키를 그대로 쓰는 표는 이 표를 가리키는"
            + " verify.references 나 verify.referencedBy: none 과 사유가 필요합니다 — 격리한 행을 가리키는 자식을"
            + " 찾게 합니다(VERIFY_REFERENCES_REQUIRED)";

    @Test
    @DisplayName("부모가 매핑 대상인 참조 선언은 통과한다")
    void aReferenceToAMappedParentPasses() {
        assertThat(VerifyReferenceRules.violations(spec(parent(null, null), child(declaration(reference())))))
                .isEmpty();
    }

    @Test
    @DisplayName("참조 항목은 columns·parent·parentColumns 를 같은 수의 식별자로 둔다")
    void malformedReferencesAreRejectedByIndex() {
        String invalid = "legacy.child: verify.references[0] 는 columns·parent·parentColumns 를 같은 수의 식별자로"
                + " 둡니다(VERIFY_REFERENCE_INVALID)";
        for (VerifyReference malformed : Arrays.asList(
                null,
                new VerifyReference(List.of(), "public.tb_parent", List.of()),
                new VerifyReference(List.of("parent_id"), "public.tb_parent", List.of("parent_id", "x")),
                new VerifyReference(List.of("parent id"), "public.tb_parent", List.of("parent_id")),
                new VerifyReference(List.of("parent_id"), "public.tb parent", List.of("parent_id")),
                new VerifyReference(List.of("parent_id", "PARENT_ID"), "public.tb_parent",
                        List.of("parent_id", "parent_id")))) {
            assertThat(VerifyReferenceRules.violations(spec(parent(null, null),
                    child(new VerifyDeclaration(Arrays.asList(malformed), null, null)))))
                    .as(String.valueOf(malformed)).containsExactly(invalid);
        }
    }

    @Test
    @DisplayName("부모는 이 mapping 이 적재하는 대상 표여야 한다")
    void theParentMustBeAMappedTarget() {
        VerifyReference elsewhere = new VerifyReference(List.of("parent_id"), "public.tb_other", List.of("parent_id"));
        assertThat(VerifyReferenceRules.violations(spec(parent(null, null), child(declaration(elsewhere)))))
                .containsExactly("legacy.child: verify.references[0] 의 부모(public.tb_other)는 이 mapping 이 적재하는"
                        + " 대상 표여야 합니다 — 매핑하지 않은 부모는 승인 fingerprint 밖입니다"
                        + "(VERIFY_REFERENCE_PARENT_NOT_MAPPED)");
    }

    @Test
    @DisplayName("referencedBy 는 none 만 받고 사유가 함께 있어야 하며, 다른 매핑이 이 표를 가리키면 안 된다")
    void referencedByAcceptsOnlyNoneWithAReason() {
        String invalid = "legacy.parent: verify.referencedBy 는 none 만 받고 사유(reason)가 함께 있어야 합니다"
                + "(VERIFY_REFERENCED_BY_INVALID)";
        assertThat(VerifyReferenceRules.violations(spec(parent("all", "확인"), child(null)))).containsExactly(invalid);
        assertThat(VerifyReferenceRules.violations(spec(parent("none", " "), child(null)))).containsExactly(invalid);
        assertThat(VerifyReferenceRules.violations(spec(parent(null, "확인"), child(null)))).containsExactly(invalid);
        assertThat(VerifyReferenceRules.violations(spec(parent("none", "업무 확인"), child(null)))).isEmpty();
        assertThat(VerifyReferenceRules.violations(spec(parent("none", "업무 확인"), child(declaration(reference())))))
                .containsExactly("legacy.parent: verify.referencedBy 가 none 인데 legacy.child 의 verify.references 가"
                        + " 이 표를 가리킵니다(VERIFY_REFERENCED_BY_INVALID)");
    }

    @Test
    @DisplayName("P3 — 격리하는 보존 키 표는 참조 선언이나 '참조 없음' 확인과 사유가 필요하다")
    void anIsolatingPreservedKeyTableNeedsAReferenceOrAConfirmation() {
        assertThat(VerifyReferenceRules.violations(spec(isolating(null), child(null))))
                .as("선언이 없으면 거부").containsExactly(REQUIRED);
        assertThat(VerifyReferenceRules.violations(spec(isolating(null), child(declaration(reference())))))
                .as("다른 매핑의 참조 선언으로 충족").isEmpty();
        assertThat(VerifyReferenceRules.violations(spec(isolating(new VerifyDeclaration(List.of(), "none",
                "이 키를 복사하는 표가 없다")), child(null)))).as("'참조 없음' 확인과 사유로 충족").isEmpty();
        assertThat(VerifyReferenceRules.violations(spec(isolating(new VerifyDeclaration(List.of(), "none", null)),
                child(null)))).as("사유 없는 확인은 충족하지 않는다").containsExactly(
                "legacy.parent: verify.referencedBy 는 none 만 받고 사유(reason)가 함께 있어야 합니다"
                        + "(VERIFY_REFERENCED_BY_INVALID)", REQUIRED);
    }

    @Test
    @DisplayName("P3 — 키를 다시 만드는 표(idStrategy·remap)는 대상이 아니다")
    void tablesThatRegenerateKeysAreNotSubjectToP3() {
        TableMapping minted = new TableMapping("legacy.parent", "public.tb_parent", null, "PARENT_ID", List.of(), null,
                List.of(new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null, List.of(),
                        ISOLATE)), new IdStrategy("parent_id", "P_", "PARENT_ID"), null, List.of(), null, List.of(),
                null);
        TableMapping remapped = new TableMapping("legacy.parent", "public.tb_parent", null, "PARENT_ID", List.of(), null,
                List.of(new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null, List.of(),
                        ISOLATE)), null, new MappingSpec.IdentityStrategy(TargetIdentityPolicy.REMAP,
                List.of(new MappingSpec.IdentityComponentSpec("PARENT_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(new MappingSpec.IdentityComponentSpec("parent_id", IdentityValueType.SIGNED_INTEGER))),
                List.of(), null, List.of(), null);
        TableMapping preserved = new TableMapping("legacy.parent", "public.tb_parent", null, "PARENT_ID", List.of(),
                null, List.of(new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null, List.of(),
                ISOLATE)), null, new MappingSpec.IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                List.of(new MappingSpec.IdentityComponentSpec("PARENT_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(new MappingSpec.IdentityComponentSpec("parent_id", IdentityValueType.SIGNED_INTEGER))),
                List.of(), null, List.of(), null);

        assertThat(VerifyReferenceRules.violations(spec(minted, child(null)))).isEmpty();
        assertThat(VerifyReferenceRules.violations(spec(remapped, child(null)))).isEmpty();
        assertThat(VerifyReferenceRules.violations(spec(preserved, child(null))))
                .as("preserve identity 는 키를 그대로 쓴다").containsExactly(REQUIRED);
        assertThat(VerifyReferenceRules.preservesKey(minted)).isFalse();
        assertThat(VerifyReferenceRules.preservesKey(preserved)).isTrue();
    }

    @Test
    @DisplayName("live — 자식·부모 컬럼이 대상에 있고 짝의 타입 계열이 같아야 한다")
    void liveColumnsMustExistAndShareATypeFamily() {
        MappingSpec spec = spec(parent(null, null), child(declaration(reference())));
        assertThat(VerifyReferenceRules.liveViolations(spec, fingerprint(Types.BIGINT, "int8", 0, Types.INTEGER,
                "int4", 0))).as("정수 계열(int4↔int8)").isEmpty();
        assertThat(VerifyReferenceRules.liveViolations(spec, fingerprint(Types.NUMERIC, "numeric", 0, Types.BIGINT,
                "int8", 0))).as("소수 자리 없는 수는 정수 계열").isEmpty();
        assertThat(VerifyReferenceRules.liveViolations(spec, fingerprint(Types.VARCHAR, "varchar", 0, Types.CHAR,
                "bpchar", 0))).as("문자 계열").isEmpty();
        assertThat(VerifyReferenceRules.liveViolations(spec, fingerprint(Types.VARCHAR, "varchar", 0, Types.BIGINT,
                "int8", 0))).containsExactly("legacy.child: verify.references[0] 의 parent_id → tb_parent.parent_id 은"
                + " 타입 계열이 다릅니다(VERIFY_REFERENCE_TYPE_MISMATCH)");
        assertThat(VerifyReferenceRules.liveViolations(spec, fingerprint(Types.NUMERIC, "numeric", 2, Types.BIGINT,
                "int8", 0))).as("소수 자리 있는 수는 정수가 아니다").hasSize(1);
        assertThat(VerifyReferenceRules.liveViolations(spec, fingerprint(Types.OTHER, "uuid", 0, Types.OTHER,
                "uuid", 0))).as("그 밖은 같은 타입끼리").isEmpty();

        MappingSpec missing = spec(parent(null, null), child(declaration(new VerifyReference(List.of("absent_id"),
                "public.tb_parent", List.of("parent_id")))));
        assertThat(VerifyReferenceRules.liveViolations(missing, fingerprint(Types.BIGINT, "int8", 0, Types.BIGINT,
                "int8", 0))).containsExactly("legacy.child: verify.references[0] 의 컬럼(tb_child.absent_id)이 대상에"
                + " 없습니다(VERIFY_REFERENCE_COLUMN_MISSING)");
        assertThat(VerifyReferenceRules.liveViolations(spec, new TargetSchemaFingerprint(1, "PostgreSQL", "17", "d",
                List.of()))).as("결속하지 않은 fingerprint 는 보지 않는다").isEmpty();
    }

    @Test
    @DisplayName("live — 매핑 대상의 유일 인덱스가 이미 집행되지 않으면 쓰기 전에 멈춘다")
    void anUnenforcedUniqueIndexStopsBeforeWriting() {
        MappingSpec spec = spec(parent(null, null), child(declaration(reference())));
        TargetSchemaFingerprint base = fingerprint(Types.BIGINT, "int8", 0, Types.BIGINT, "int8", 0);

        assertThat(VerifyReferenceRules.liveViolations(spec, withIndexes(base, true, true))).isEmpty();
        assertThat(VerifyReferenceRules.liveViolations(spec, withIndexes(base, false, true))).containsExactly(
                "public.tb_child: 유일 인덱스 uq_tb_child_code 이 집행되지 않습니다(indisvalid·indisready) — 행을 쓰기 전에"
                        + " 멈춥니다(UNIQUE_INDEX_NOT_ENFORCED)");
        assertThat(VerifyReferenceRules.liveViolations(spec, withIndexes(base, true, false))).hasSize(1);
        assertThat(VerifyReferenceRules.liveViolations(spec(parent(null, null)), withIndexes(base, false, false)))
                .as("매핑하지 않은 표의 인덱스는 보지 않는다").isEmpty();
        assertThat(VerifyReferenceRules.liveViolations(spec(child(declaration(reference())),
                child(declaration(reference()))), withIndexes(base, false, true)))
                .as("같은 대상을 나눈 매핑도 한 번만 알린다").hasSize(1);
    }

    private static TargetSchemaFingerprint withIndexes(TargetSchemaFingerprint base, boolean valid, boolean ready) {
        TargetConstraintSnapshot constraints = new TargetConstraintSnapshot(1, List.of(
                new TargetConstraintSnapshot.TableConstraints("public", "tb_child", List.of(),
                        List.of(new TargetConstraintSnapshot.UniqueIndex("uq_tb_child_code", List.of("code"), valid,
                                ready)))));
        return new TargetSchemaFingerprint(base.schemaVersion(), base.databaseProduct(), base.databaseVersion(),
                base.digest(), base.tables(), base.standard(), constraints);
    }

    @Test
    @DisplayName("mapping 검증의 live 표준 대조가 참조 컬럼 규칙을 함께 돌려준다")
    void theTargetStandardValidationCarriesTheLiveReferenceRules() {
        MappingSpec missing = spec(parent(null, null), child(declaration(new VerifyReference(List.of("absent_id"),
                "public.tb_parent", List.of("parent_id")))));

        ValidationResult result = new MappingValidator(new nuri.migration.transform.TransformerRegistry(),
                "db_columns.json").validateTargetStandard(missing, fingerprint(Types.BIGINT, "int8", 0, Types.BIGINT,
                "int8", 0), null);

        assertThat(result.errors()).contains("legacy.child: verify.references[0] 의 컬럼(tb_child.absent_id)이 대상에"
                + " 없습니다(VERIFY_REFERENCE_COLUMN_MISSING)");
    }

    @Test
    @DisplayName("내용 없는 verify 는 선언 없음으로 읽는다")
    void anEmptyDeclarationIsNoDeclaration() {
        assertThat(child(new VerifyDeclaration(null, null, null)).verify()).isNull();
    }

    private static MappingSpec spec(TableMapping... tables) {
        return new MappingSpec(null, null, List.of(tables), Map.of());
    }

    private static TableMapping parent(String referencedBy, String reason) {
        VerifyDeclaration verify = referencedBy == null && reason == null ? null
                : new VerifyDeclaration(List.of(), referencedBy, reason);
        return new TableMapping("legacy.parent", "public.tb_parent", null, "PARENT_ID", List.of(), "parent_id",
                List.of(new ColumnMapping("PARENT_ID", "parent_id", null, null, null, null, null)), null, null,
                List.of(), null, List.of(), verify);
    }

    private static TableMapping isolating(VerifyDeclaration verify) {
        return new TableMapping("legacy.parent", "public.tb_parent", null, "PARENT_ID", List.of(), "parent_id",
                List.of(new ColumnMapping("PARENT_ID", "parent_id", null, null, null, null, null),
                        new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null, List.of(),
                                ISOLATE)), null, null, List.of(), null, List.of(), verify);
    }

    private static TableMapping child(VerifyDeclaration verify) {
        return new TableMapping("legacy.child", "public.tb_child", null, "CHILD_ID", List.of(), "child_id",
                List.of(new ColumnMapping("CHILD_ID", "child_id", null, null, null, null, null),
                        new ColumnMapping("PARENT_ID", "parent_id", null, null, null, null, null)),
                null, null, List.of(), null, List.of(), verify);
    }

    private static VerifyDeclaration declaration(VerifyReference reference) {
        return new VerifyDeclaration(List.of(reference), null, null);
    }

    private static VerifyReference reference() {
        return new VerifyReference(List.of("parent_id"), "public.tb_parent", List.of("parent_id"));
    }

    private static TargetSchemaFingerprint fingerprint(int childType, String childNative, int childDigits,
                                                       int parentType, String parentNative, int parentDigits) {
        return new TargetSchemaFingerprint(1, "PostgreSQL", "17", "d", List.of(
                table("tb_parent", "parent_id", column("parent_id", parentType, parentNative, parentDigits, 1)),
                table("tb_child", "child_id", column("child_id", Types.BIGINT, "int8", 0, 1),
                        column("parent_id", childType, childNative, childDigits, 2))));
    }

    private static TableMetadata table(String name, String key, ColumnMetadata... columns) {
        return new TableMetadata(null, "public", name, "TABLE", List.of(columns),
                new PrimaryKeyMetadata(name + "_pk", List.of(new PrimaryKeyColumn((short) 1, key))));
    }

    private static ColumnMetadata column(String name, int type, String nativeType, int digits, int ordinal) {
        return new ColumnMetadata(name, type, nativeType, 20, digits, 1, null, ordinal, false, false);
    }
}
