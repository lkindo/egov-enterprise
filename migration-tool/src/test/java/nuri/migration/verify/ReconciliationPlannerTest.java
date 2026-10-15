package nuri.migration.verify;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.LookupKey;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.VerifyDeclaration;
import nuri.migration.model.MappingSpec.VerifyReference;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.postgres.TargetSchemaFingerprint.ColumnMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.PrimaryKeyColumn;
import nuri.migration.postgres.TargetSchemaFingerprint.PrimaryKeyMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.ColumnCheck.SourceColumnType;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** [ADR-0029 L4 D2] 승인 입력으로 만드는 대사 계획. */
class ReconciliationPlannerTest {

    private static final TransformerRegistry TRANSFORMERS = new TransformerRegistry();

    @Test
    @DisplayName("같은 소스·where 의 분할 매핑은 집계 묶음 하나를 나눠 쓰고, where 가 다르면 따로다")
    void splitMappingsShareAnAggregateGroupOnlyForTheSameWhere() {
        TableMapping user = table("legacy.user_mst", "public.tb_user", null, "user", "USER_SN");
        TableMapping addr = table("legacy.user_mst", "public.tb_user_addr", null, "addr", "USER_SN");
        TableMapping active = table("legacy.user_mst", "public.tb_user_active", "USE_YN = 'Y'", "active", "USER_SN");

        ReconciliationPlan plan = ReconciliationPlanner.plan(spec(user, addr, active), null, null, List.of(),
                TRANSFORMERS);

        assertThat(plan.active()).isTrue();
        assertThat(plan.mappings()).extracting(MappingPlan::label)
                .containsExactly("legacy.user_mst#user", "legacy.user_mst#addr", "legacy.user_mst#active");
        assertThat(plan.mapping("LEGACY.USER_MST#USER").aggregateGroup())
                .isEqualTo(plan.mapping("legacy.user_mst#addr").aggregateGroup())
                .isNotEqualTo(plan.mapping("legacy.user_mst#active").aggregateGroup());
        assertThat(ReconciliationRun.of(plan, new ColumnReplay(TRANSFORMERS, Map.of()), null).aggregateGroups())
                .as("묶음마다 문장 하나").hasSize(2);
    }

    @Test
    @DisplayName("원천 타입은 inventory, 대상 PK 는 fingerprint 의 키 순서, 키 성격은 매핑 선언에서 온다")
    void sourceTypesPrimaryKeyAndKeyNatureComeFromTheApprovedInputs() {
        TableMapping preserved = new TableMapping("legacy.user_mst", "public.tb_user", null, "USER_SN", List.of(),
                "user_sn", List.of(new ColumnMapping("USER_SN", "user_sn", null, null, null, null, null),
                new ColumnMapping("PAY", "pay_amt", null, null, null, null, null),
                new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null, List.of(),
                        new MappingSpec.Isolate("U4", 3L, List.of("INVALID_DATE")))),
                null, null, List.of(), null, List.of(),
                new VerifyDeclaration(List.of(), "none", "업무 확인"));
        TableMapping minted = new TableMapping("legacy.dept_mst", "public.tb_dept", null, "DEPT_SN", List.of(), null,
                List.of(new ColumnMapping("DEPT_NM", "dept_nm", null, null, null, null, null)),
                new IdStrategy("dept_id", "D_", "DEPT_SN"), null, List.of());
        TableMapping generated = new TableMapping("legacy.log_mst", "public.tb_log", null, "LOG_SN", List.of(), null,
                List.of(new ColumnMapping("MSG", "msg", null, null, null, null, null)), null,
                new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                        List.of(new IdentityComponentSpec("LOG_SN", IdentityValueType.SIGNED_INTEGER)),
                        List.of(new IdentityComponentSpec("log_id", IdentityValueType.SIGNED_INTEGER))),
                List.of());
        CatalogSnapshot inventory = snapshot(
                object("user_mst"), column("user_mst", "USER_SN", Types.BIGINT, "int8", 19, 0, 1),
                column("user_mst", "PAY", Types.NUMERIC, "numeric", 12, 2, 2),
                column("user_mst", "END_YMD", Types.VARCHAR, "varchar", 8, 0, 3));
        TargetSchemaFingerprint target = new TargetSchemaFingerprint(1, "PostgreSQL", "17", "d", List.of(
                new TableMetadata(null, "public", "tb_user", "TABLE", List.of(
                        new ColumnMetadata("user_sn", Types.BIGINT, "int8", 19, 0, 0, null, 1, false, false),
                        new ColumnMetadata("org_sn", Types.BIGINT, "int8", 19, 0, 0, null, 2, false, false)),
                        new PrimaryKeyMetadata("pk_tb_user", List.of(new PrimaryKeyColumn((short) 2, "user_sn"),
                                new PrimaryKeyColumn((short) 1, "org_sn"))))));

        ReconciliationPlan plan = ReconciliationPlanner.plan(spec(preserved, minted, generated), inventory, target,
                List.of(), TRANSFORMERS);

        MappingPlan user = plan.mapping("legacy.user_mst");
        assertThat(user.targetPrimaryKey()).as("키 순서").containsExactly("org_sn", "user_sn");
        assertThat(user.column("pay_amt").sourceType())
                .isEqualTo(new SourceColumnType(Types.NUMERIC, "numeric", 12L, 2));
        assertThat(user.column("end_ymd").sourceType().jdbcType()).isEqualTo(Types.VARCHAR);
        assertThat(user.preservedKey()).isTrue();
        assertThat(user.isolates()).isTrue();
        assertThat(user.generatedIdentity()).isFalse();
        assertThat(plan.mapping("legacy.dept_mst").preservedKey()).isFalse();
        assertThat(plan.mapping("legacy.dept_mst").column("dept_nm").gaps()).as("inventory 에 없는 표")
                .contains(new ColumnCheck.Gap(ReconciliationCheck.NON_NULL, CoverageReason.SOURCE_TYPE_UNKNOWN));
        assertThat(plan.mapping("legacy.log_mst").generatedIdentity()).isTrue();
        assertThat(plan.mappedTables()).hasSize(1);
        assertThat(plan.startConstraints()).as("결속 전 fingerprint 는 제약을 읽지 않았다").isNull();
    }

    @Test
    @DisplayName("at_most_one 조회 컬럼만 대상 NULL 하한을 본다")
    void onlyAtMostOneLookupsGetTheNullFloor() {
        TableMapping orders = new TableMapping("legacy.order_mst", "public.tb_order", null, "ORDER_SN", List.of(),
                "order_sn", List.of(new ColumnMapping("cust.CUST_NM", "cust_nm", null, null, null, null, null),
                new ColumnMapping("dept.DEPT_NM", "dept_nm", null, null, null, null, null)),
                null, null, List.of(), "orders", List.of(
                new Lookup("cust", "legacy.cust_mst", null, new LookupKey("CUST_SN", "CUST_SN"),
                        LookupCardinality.AT_MOST_ONE, 5L),
                new Lookup("dept", "legacy.dept_mst", null, new LookupKey("DEPT_SN", "DEPT_SN"),
                        LookupCardinality.EXACTLY_ONE, null)));

        MappingPlan plan = ReconciliationPlanner.plan(spec(orders), null, null, List.of(), TRANSFORMERS)
                .mapping("legacy.order_mst#orders");

        assertThat(plan.column("cust_nm").lookupAlias()).isEqualTo("cust");
        assertThat(plan.column("dept_nm").lookupAlias()).isNull();
        assertThat(plan.column("cust_nm").gaps())
                .contains(new ColumnCheck.Gap(ReconciliationCheck.NON_NULL, CoverageReason.LOOKUP));
    }

    @Test
    @DisplayName("대사할 참조 — verify.references, fkRef(부모 매핑의 대상 키), foreignKeys(부모 identity), 같은 참조는 하나")
    void declaredReferencesComeFromVerifyFkRefAndForeignKeys() {
        TableMapping org = new TableMapping("legacy.org_mst", "public.tb_org", null, "ORG_SN", List.of(), null,
                List.of(new ColumnMapping("ORG_NM", "org_nm", null, null, null, null, null)),
                new IdStrategy("org_id", "O_", "ORG_SN"), null, List.of());
        TableMapping tenant = new TableMapping("legacy.tenant_mst", "public.tb_tenant", null, "TENANT_SN", List.of(),
                null, List.of(new ColumnMapping("TENANT_NM", "tenant_nm", null, null, null, null, null)), null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(new IdentityComponentSpec("TENANT_SN", IdentityValueType.SIGNED_INTEGER),
                                new IdentityComponentSpec("SITE_SN", IdentityValueType.SIGNED_INTEGER)),
                        List.of(new IdentityComponentSpec("tenant_sn", IdentityValueType.SIGNED_INTEGER),
                                new IdentityComponentSpec("site_sn", IdentityValueType.SIGNED_INTEGER))),
                List.of());
        TableMapping user = new TableMapping("legacy.user_mst", "public.tb_user", null, "USER_SN", List.of(),
                "user_sn", List.of(new ColumnMapping("USER_SN", "user_sn", null, null, null, null, null),
                new ColumnMapping("ORG_SN", "org_id", null, null, null, "legacy.org_mst", null),
                new ColumnMapping("ORG_SN", "home_org_id", null, null, null, null, null)),
                null, null, List.of(new CompositeForeignKey("legacy.tenant_mst",
                        List.of(new IdentityComponentSpec("TENANT_SN", IdentityValueType.SIGNED_INTEGER),
                                new IdentityComponentSpec("SITE_SN", IdentityValueType.SIGNED_INTEGER)),
                        List.of(new IdentityComponentSpec("tenant_sn", IdentityValueType.SIGNED_INTEGER),
                                new IdentityComponentSpec("site_sn", IdentityValueType.SIGNED_INTEGER)))),
                null, List.of(), new VerifyDeclaration(List.of(
                new VerifyReference(List.of("home_org_id"), "public.tb_org", List.of("org_id")),
                new VerifyReference(List.of(" org_id "), "public.tb_org", List.of("org_id"))), null, null));

        List<DeclaredReference> declared = ReconciliationPlanner.declared(spec(org, tenant, user));

        assertThat(declared).containsExactly(
                new DeclaredReference("public.tb_user", List.of("home_org_id"), "public.tb_org", List.of("org_id"),
                        DeclaredReference.Origin.DECLARED),
                new DeclaredReference("public.tb_user", List.of("org_id"), "public.tb_org", List.of("org_id"),
                        DeclaredReference.Origin.DECLARED),
                new DeclaredReference("public.tb_user", List.of("tenant_sn", "site_sn"), "public.tb_tenant",
                        List.of("tenant_sn", "site_sn"), DeclaredReference.Origin.FKREF));
        assertThat(ReconciliationPlanner.plan(spec(org, tenant, user), null, null, List.of(), TRANSFORMERS)
                .references()).isEqualTo(declared);
        assertThat(ReconciliationPlanner.plan(spec(org, tenant, user), null, null, List.of(), TRANSFORMERS)
                .mapping("legacy.user_mst").column("tenant_sn")).as("foreignKeys 구성요소는 매핑 컬럼이 아니다").isNull();
    }

    @Test
    @DisplayName("fkRef 만 있는 참조는 부모 매핑의 대상 키를 부모 컬럼으로 쓴다")
    void fkRefReferencesPointAtTheParentTargetKey() {
        TableMapping org = new TableMapping("legacy.org_mst", "public.tb_org", null, "ORG_SN", List.of(), null,
                List.of(new ColumnMapping("ORG_NM", "org_nm", null, null, null, null, null)),
                new IdStrategy("org_id", "O_", "ORG_SN"), null, List.of());
        TableMapping user = new TableMapping("legacy.user_mst", "public.tb_user", null, "USER_SN", List.of(),
                "user_sn", List.of(new ColumnMapping("ORG_SN", "org_id", null, null, null, "legacy.org_mst", null)),
                null, null, List.of());

        assertThat(ReconciliationPlanner.declared(spec(org, user))).containsExactly(
                new DeclaredReference("public.tb_user", List.of("org_id"), "public.tb_org", List.of("org_id"),
                        DeclaredReference.Origin.FKREF));
        assertThat(ReconciliationPlanner.plan(spec(org, user), null, null, List.of(), TRANSFORMERS)
                .mapping("legacy.user_mst").column("org_id").gaps())
                .contains(new ColumnCheck.Gap(ReconciliationCheck.NON_NULL, CoverageReason.FKREF));
    }

    @Test
    @DisplayName("키 성격 — idStrategy·대상이 만드는 identity 는 보존 키가 아니고, preserve identity 와 키 그대로는 보존 키다")
    void keyNatureFollowsTheIdentityPolicy() {
        IdentityStrategy preserve = new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                List.of(new IdentityComponentSpec("A_SN", IdentityValueType.SIGNED_INTEGER)),
                List.of(new IdentityComponentSpec("a_sn", IdentityValueType.SIGNED_INTEGER)));
        IdentityStrategy generated = new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                List.of(new IdentityComponentSpec("B_SN", IdentityValueType.SIGNED_INTEGER)),
                List.of(new IdentityComponentSpec("b_sn", IdentityValueType.SIGNED_INTEGER)));
        TableMapping kept = new TableMapping("legacy.a_mst", "public.tb_a", null, "A_SN", List.of(), null,
                List.of(new ColumnMapping("A_NM", "a_nm", null, null, null, null, null)), null, preserve, List.of());
        TableMapping minted = new TableMapping("legacy.b_mst", "public.tb_b", null, "B_SN", List.of(), null,
                List.of(new ColumnMapping("B_NM", "b_nm", null, null, null, null, null)), null, generated, List.of());

        ReconciliationPlan plan = ReconciliationPlanner.plan(spec(kept, minted), null, null, List.of(), TRANSFORMERS);

        assertThat(plan.mapping("legacy.a_mst").preservedKey()).isTrue();
        assertThat(plan.mapping("legacy.a_mst").generatedIdentity()).isFalse();
        assertThat(plan.mapping("legacy.a_mst").isolates()).as("isolate 가 없는 매핑").isFalse();
        assertThat(plan.mapping("legacy.b_mst").preservedKey()).isFalse();
        assertThat(plan.mapping("legacy.b_mst").generatedIdentity()).isTrue();
    }

    @Test
    @DisplayName("생성 키·foreignKeys 구성요소는 그 컬럼만 값 검사에서 빠지고 같은 표의 다른 컬럼은 그대로다")
    void generatedAndForeignKeyComponentsAreExcludedColumnByColumn() {
        TableMapping minted = new TableMapping("legacy.dept_mst", "public.tb_dept", null, "DEPT_SN", List.of(), null,
                List.of(new ColumnMapping("DEPT_SN", "dept_id", null, null, null, null, null),
                        new ColumnMapping("DEPT_NM", "dept_nm", null, null, null, null, null)),
                new IdStrategy("dept_id", "D_", "DEPT_SN"), null, List.of());
        TableMapping logs = new TableMapping("legacy.log_mst", "public.tb_log", null, "LOG_SN", List.of(), null,
                List.of(new ColumnMapping("LOG_SN", "log_id", null, null, null, null, null),
                        new ColumnMapping("MSG", "msg", null, null, null, null, null)), null,
                new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                        List.of(new IdentityComponentSpec("LOG_SN", IdentityValueType.SIGNED_INTEGER)),
                        List.of(new IdentityComponentSpec("log_id", IdentityValueType.SIGNED_INTEGER))),
                List.of());
        TableMapping tenant = new TableMapping("legacy.tenant_mst", "public.tb_tenant", null, "TENANT_SN", List.of(),
                null, List.of(new ColumnMapping("TENANT_NM", "tenant_nm", null, null, null, null, null)), null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(new IdentityComponentSpec("TENANT_SN", IdentityValueType.SIGNED_INTEGER)),
                        List.of(new IdentityComponentSpec("tenant_sn", IdentityValueType.SIGNED_INTEGER))),
                List.of());
        TableMapping user = new TableMapping("legacy.user_mst", "public.tb_user", null, "USER_SN", List.of(),
                "user_sn", List.of(new ColumnMapping("TENANT_SN", "tenant_sn", null, null, null, null, null),
                new ColumnMapping("USER_NM", "user_nm", null, null, null, null, null)),
                null, null, List.of(new CompositeForeignKey("legacy.tenant_mst",
                        List.of(new IdentityComponentSpec("TENANT_SN", IdentityValueType.SIGNED_INTEGER)),
                        List.of(new IdentityComponentSpec("tenant_sn", IdentityValueType.SIGNED_INTEGER)))));
        CatalogSnapshot inventory = snapshot(object("dept_mst"), object("log_mst"), object("user_mst"),
                column("dept_mst", "DEPT_SN", Types.BIGINT, "int8", 19, 0, 1),
                column("dept_mst", "DEPT_NM", Types.VARCHAR, "varchar", 20, 0, 2),
                column("log_mst", "LOG_SN", Types.BIGINT, "int8", 19, 0, 1),
                column("log_mst", "MSG", Types.VARCHAR, "varchar", 20, 0, 2),
                column("user_mst", "TENANT_SN", Types.BIGINT, "int8", 19, 0, 1),
                column("user_mst", "USER_NM", Types.VARCHAR, "varchar", 20, 0, 2));

        ReconciliationPlan plan = ReconciliationPlanner.plan(spec(minted, logs, tenant, user), inventory, null,
                List.of(), TRANSFORMERS);

        ColumnCheck.Gap generatedGap = new ColumnCheck.Gap(ReconciliationCheck.NON_NULL, CoverageReason.GENERATED);
        ColumnCheck.Gap foreignKeyGap = new ColumnCheck.Gap(ReconciliationCheck.NON_NULL, CoverageReason.FKREF);
        assertThat(plan.mapping("legacy.dept_mst").column("dept_id").gaps()).contains(generatedGap);
        assertThat(plan.mapping("legacy.dept_mst").column("dept_nm").gaps()).doesNotContain(generatedGap);
        assertThat(plan.mapping("legacy.log_mst").column("log_id").gaps()).contains(generatedGap);
        assertThat(plan.mapping("legacy.log_mst").column("msg").gaps()).doesNotContain(generatedGap);
        assertThat(plan.mapping("legacy.tenant_mst").column("tenant_nm").gaps()).as("preserve 는 생성 키가 아니다")
                .doesNotContain(generatedGap);
        assertThat(plan.mapping("legacy.user_mst").column("tenant_sn").gaps()).contains(foreignKeyGap);
        assertThat(plan.mapping("legacy.user_mst").column("user_nm").gaps()).doesNotContain(foreignKeyGap);
        assertThat(plan.mapping("legacy.user_mst").column("user_nm").nonNull()).isTrue();
    }

    @Test
    @DisplayName("변환기 종류 — 없음·내장은 문자 길이 대사를 미루고, 표준 도메인은 미루지 않으며, 프로젝트 변환기는 NULL 계정을 하지 않는다")
    void transformKindsDecideTheTextAndCustomGaps() {
        TableMapping table = new TableMapping("legacy.item_mst", "public.tb_item", null, "ITEM_SN", List.of(),
                "item_sn", List.of(new ColumnMapping("NONE_TX", "none_tx", null, null, null, null, null),
                new ColumnMapping("TRIM_TX", "trim_tx", "trim", null, null, null, null),
                new ColumnMapping("YMD_TX", "ymd_tx", "ymd8", null, null, null, null),
                new ColumnMapping("CUSTOM_TX", "custom_tx", "project:normalize", null, null, null, null)),
                null, null, List.of());
        CatalogSnapshot inventory = snapshot(object("item_mst"),
                column("item_mst", "NONE_TX", Types.VARCHAR, "varchar", 20, 0, 1),
                column("item_mst", "TRIM_TX", Types.VARCHAR, "varchar", 20, 0, 2),
                column("item_mst", "YMD_TX", Types.VARCHAR, "varchar", 20, 0, 3),
                column("item_mst", "CUSTOM_TX", Types.VARCHAR, "varchar", 20, 0, 4));

        MappingPlan plan = ReconciliationPlanner.plan(spec(table), inventory, null, List.of(), TRANSFORMERS)
                .mapping("legacy.item_mst");

        ColumnCheck.Gap deferred = new ColumnCheck.Gap(ReconciliationCheck.SUM, CoverageReason.TEXT_DEFERRED);
        ColumnCheck.Gap custom = new ColumnCheck.Gap(ReconciliationCheck.NON_NULL, CoverageReason.CUSTOM_TRANSFORM);
        assertThat(plan.column("none_tx").gaps()).contains(deferred).doesNotContain(custom);
        assertThat(plan.column("trim_tx").gaps()).contains(deferred).doesNotContain(custom);
        assertThat(plan.column("ymd_tx").gaps()).doesNotContain(deferred, custom);
        assertThat(plan.column("custom_tx").gaps()).contains(custom).doesNotContain(deferred);
    }

    @Test
    @DisplayName("조회 컬럼의 원천 타입은 조회 표 inventory 에서, codemap 이름·NULL 대체는 매핑 선언에서 온다")
    void lookupTypesAndCodemapFactsComeFromTheirDeclarations() {
        TableMapping orders = new TableMapping("legacy.order_mst", "public.tb_order", null, "ORDER_SN", List.of(),
                "order_sn", List.of(new ColumnMapping("cust.CUST_NM", "cust_nm", null, null, null, null, null),
                new ColumnMapping("STTS", "stts_cd", null, null, "stts", null, null),
                new ColumnMapping("KIND", "kind_cd", null, null, "kind", null, null),
                new ColumnMapping("ETC", "etc_cd", null, null, " ", null, null)),
                null, null, List.of(), "orders", List.of(
                new Lookup("cust", "legacy.cust_mst", null, new LookupKey("CUST_SN", "CUST_SN"),
                        LookupCardinality.AT_MOST_ONE, 5L)));
        Map<String, MappingSpec.CodeMap> codemaps = Map.of(
                "stts", new MappingSpec.CodeMap(Map.of("A", "01"), MappingSpec.UnmappedPolicy.FAIL, "99",
                        MappingSpec.NullPolicy.FALLBACK),
                "kind", MappingSpec.CodeMap.of(Map.of("A", "01")));
        CatalogSnapshot inventory = snapshot(object("order_mst"), object("cust_mst"),
                column("order_mst", "STTS", Types.VARCHAR, "varchar", 2, 0, 1),
                column("cust_mst", "CUST_NM", Types.VARCHAR, "varchar", 40, 0, 1));

        MappingPlan plan = ReconciliationPlanner.plan(new MappingSpec(null, null, List.of(orders), codemaps),
                inventory, null, List.of(), TRANSFORMERS).mapping("legacy.order_mst#orders");

        assertThat(plan.column("cust_nm").sourceType())
                .isEqualTo(new SourceColumnType(Types.VARCHAR, "varchar", 40L, 0));
        assertThat(plan.column("stts_cd").codemap()).isEqualTo("stts");
        assertThat(plan.column("stts_cd").nullFallbackable()).isTrue();
        assertThat(plan.column("kind_cd").codemap()).isEqualTo("kind");
        assertThat(plan.column("kind_cd").nullFallbackable()).isFalse();
        assertThat(plan.column("etc_cd").codemap()).as("빈 codemap 이름은 codemap 이 아니다").isNull();
    }

    @Test
    @DisplayName("schema 없는 대상은 하나뿐일 때만 PK 를 찾고, 공통코드 대사 대상은 그대로 싣는다")
    void schemaLessTargetsAndCodeSets() {
        TableMapping user = new TableMapping("legacy.user_mst", "tb_user", null, "USER_SN", List.of(), "user_sn",
                List.of(new ColumnMapping("USER_SN", "user_sn", null, null, null, null, null)), null, null,
                List.of());
        TableMetadata one = new TableMetadata(null, "public", "tb_user", "TABLE", List.of(
                new ColumnMetadata("user_sn", Types.BIGINT, "int8", 19, 0, 0, null, 1, false, false)),
                new PrimaryKeyMetadata("pk_tb_user", List.of(new PrimaryKeyColumn((short) 1, "user_sn"))));
        TableMetadata other = new TableMetadata(null, "app", "tb_user", "TABLE", one.columns(), one.primaryKey());
        nuri.migration.validate.CodeSetTarget codeSet = nuri.migration.validate.CodeSetTarget.unreconciled(
                "public.tb_user", "kind_cd", "L-1");

        ReconciliationPlan single = ReconciliationPlanner.plan(spec(user), null, new TargetSchemaFingerprint(1,
                "PostgreSQL", "17", "d", List.of(one)), List.of(codeSet), TRANSFORMERS);
        ReconciliationPlan ambiguous = ReconciliationPlanner.plan(spec(user), null, new TargetSchemaFingerprint(1,
                "PostgreSQL", "17", "d", List.of(one, other)), null, TRANSFORMERS);

        assertThat(single.mapping("legacy.user_mst").targetPrimaryKey()).containsExactly("user_sn");
        assertThat(single.codeSets()).containsExactly(codeSet);
        assertThat(ambiguous.mapping("legacy.user_mst").targetPrimaryKey()).as("어느 schema 인지 모른다").isEmpty();
        assertThat(ambiguous.codeSets()).isEmpty();
    }

    private static MappingSpec spec(TableMapping... tables) {
        return new MappingSpec(null, null, List.of(tables), Map.of());
    }

    private static TableMapping table(String source, String target, String where, String id, String key) {
        return new TableMapping(source, target, where, key, List.of(), key.toLowerCase(),
                List.of(new ColumnMapping(key, key.toLowerCase(), null, null, null, null, null),
                        new ColumnMapping("PAY", "pay_amt", null, null, null, null, null)),
                null, null, List.of(), id, List.of());
    }

    private static CatalogSnapshot snapshot(CatalogObject... objects) {
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-15T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), List.of(objects), List.of());
    }

    private static CatalogObject object(String name) {
        return new CatalogObject(ObjectKind.TABLE, "db", "legacy", name, false, null, null, List.of(), Map.of());
    }

    private static CatalogObject column(String table, String column, int jdbcType, String nativeType, int size,
                                        int scale, int ordinal) {
        return new CatalogObject(ObjectKind.COLUMN, "db", "legacy", table + "." + column, false, null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", table)),
                Map.of("parentTable", table, "originalName", column, "jdbcType", Integer.toString(jdbcType),
                        "nativeType", nativeType, "size", Integer.toString(size), "scale", Integer.toString(scale),
                        "ordinal", Integer.toString(ordinal)));
    }
}
