package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * COMMIT 경로 통합 검증(H2): idStrategy 채번 + 키맵 + fkRef FK 재작성 + 위상정렬 + 실증 검증기.
 * 참조 무결성(자식 FK 가 신규 부모 키를 가리키는지)과 false-green 제거(FAIL 감지)를 증명한다.
 */
class EtlCommitIntegrationTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    private final EtlExecutor executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
    private final MigrationVerifier verifier = new MigrationVerifier();

    @Test
    void commitMintsKeysAndRewritesChildFkInTopologicalOrder() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        DbConfig tgt = h2Config(tag + "tgt");
        seedSource(src, false);
        seedTargetSchema(tgt);

        MappingSpec spec = spec(src, tgt);
        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        JdbcTemplate tgtJt = jdbc(tgt);
        MigrationReport report = verifier.verify(spec, results, tgtJt);

        // 검증기 전면 PASS (false-green 아님 — 실제 타깃 재조회 대조)
        assertThat(report.overall()).isEqualTo(MigrationReport.Status.PASS);

        // 부모/자식 각각 2행 적재
        assertThat(count(tgtJt, "tb_org")).isEqualTo(2);
        assertThat(count(tgtJt, "tb_user_info")).isEqualTo(2);

        // 신규 대리키: ORG*/USR* prefix
        assertThat(tgtJt.queryForList("SELECT org_id FROM tb_org", String.class))
                .allMatch(id -> id.startsWith("ORG"));
        assertThat(tgtJt.queryForList("SELECT user_id FROM tb_user_info", String.class))
                .allMatch(id -> id.startsWith("USR"));

        // 참조 무결성: 자식 FK(org_id)가 실제 부모 신규 키를 가리킨다 → JOIN 이 2행 전부 매칭
        Integer joined = tgtJt.queryForObject(
                "SELECT count(*) FROM tb_user_info u JOIN tb_org o ON u.org_id = o.org_id", Integer.class);
        assertThat(joined).isEqualTo(2);

        // 키맵 영속: org 2 + user 2 = 4
        assertThat(count(tgtJt, "migration_control.tb_migration_key_map")).isEqualTo(4);

        // 코드맵 적용 확인
        assertThat(tgtJt.queryForList("SELECT user_stts_cd FROM tb_user_info", String.class))
                .containsExactlyInAnyOrder("A", "D");
    }

    @Test
    void fkOrphanRowStopsTheTableWithoutCommittingAnyRowOfItsChunk() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        DbConfig tgt = h2Config(tag + "tgt");
        seedSource(src, true); // u3 → 존재하지 않는 ORG_ID '99'
        seedTargetSchema(tgt);

        MappingSpec spec = spec(src, tgt);
        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);
        JdbcTemplate tgtJt = jdbc(tgt);
        MigrationReport report = verifier.verify(spec, results, tgtJt);

        // [2026-10-13 DEC-OPS-309] 고아 행 하나 때문에 같은 chunk 의 u1·u2 도 쓰지 않는다(종전: u1·u2 커밋).
        assertThat(report.overall()).isEqualTo(MigrationReport.Status.FAIL);
        assertThat(count(tgtJt, "tb_org")).isEqualTo(2);
        assertThat(count(tgtJt, "tb_user_info")).isZero();
        EtlExecutor.TableResult users = results.stream()
                .filter(result -> result.sourceTable().equals("LEGACY_USER")).findFirst().orElseThrow();
        assertThat(users.errors()).containsExactly("행 변환 실패(LEGACY_USER, column=org_id, row=3): "
                + "ROW_TRANSFORM_FAILED:FK_REF_ORPHAN — 이 chunk 는 기록하지 않고 적재를 멈췄습니다");
        assertThat(users.errors().getFirst()).doesNotContain("99", "u3", "Park");
        // 실패 chunk 에서 새로 만든 사용자 keymap(u1·u2)도 남지 않는다. 부모 org 2건만 남는다.
        assertThat(count(tgtJt, "migration_control.tb_migration_key_map")).isEqualTo(2);
        assertThat(tgtJt.queryForObject("SELECT run_stts_cd FROM migration_control.tb_migration_run",
                String.class)).isEqualTo("FAILED");
        assertThat(report.tables()).anySatisfy(table -> assertThat(table.note())
                .contains("첫 오류: 행 변환 실패(LEGACY_USER, column=org_id, row=3)"));
    }

    @Test
    void unmappedCodeStopsTheRunSoLaterTablesAreReportedAsNotProcessed() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        DbConfig tgt = h2Config(tag + "tgt");
        seedSource(src, false);
        jdbc(src).update("INSERT INTO LEGACY_ORG VALUES ('30','LEGACY-ONLY-SENSITIVE')");
        seedTargetSchema(tgt);
        jdbc(src).execute("CREATE TABLE LEGACY_NOTE (NOTE_ID varchar(20), BODY varchar(50))");
        jdbc(src).update("INSERT INTO LEGACY_NOTE VALUES ('n1','memo')");
        jdbc(tgt).execute("CREATE TABLE tb_note (note_id varchar(20) PRIMARY KEY, body varchar(50))");
        TableMapping org = new TableMapping("LEGACY_ORG", "tb_org", null, "ORG_ID", null, List.of(
                new ColumnMapping("ORG_NM", "org_nm", "trim", null, "org_name", null, null)
        ), new IdStrategy("org_id", "ORG", "ORG_ID"));
        TableMapping note = new TableMapping("LEGACY_NOTE", "tb_note", null, "NOTE_ID", "note_id", List.of(
                new ColumnMapping("NOTE_ID", "note_id", null, null, null, null, null),
                new ColumnMapping("BODY", "body", null, null, null, null, null)), null);
        MappingSpec spec = new MappingSpec(src, tgt, List.of(org, note),
                Map.of("org_name", MappingSpec.CodeMap.of(Map.of("HQ", "본사", "Sales", "영업"))),
                new RunContext("commit-unmapped", "legacy-crm"));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);
        JdbcTemplate tgtJt = jdbc(tgt);

        assertThat(results).extracting(EtlExecutor.TableResult::sourceTable)
                .containsExactly("LEGACY_ORG", "LEGACY_NOTE");
        assertThat(results.getFirst().errors()).singleElement().asString()
                .startsWith("행 변환 실패(LEGACY_ORG, column=org_nm, row=3): ROW_TRANSFORM_FAILED:CODEMAP_UNMAPPED")
                .doesNotContain("LEGACY-ONLY-SENSITIVE");
        assertThat(results.get(1).read()).isZero();
        assertThat(results.get(1).errors()).containsExactly("적재 중단으로 처리하지 않음(LEGACY_NOTE): 앞 테이블 "
                + "LEGACY_ORG 의 행 변환 실패 — RUN_STOPPED_BY_ROW_FAILURE");
        assertThat(count(tgtJt, "tb_org")).isZero();
        assertThat(count(tgtJt, "tb_note")).isZero();
        assertThat(count(tgtJt, "migration_control.tb_migration_key_map")).isZero();
        assertThat(count(tgtJt, "migration_control.tb_migration_checkpoint")).isZero();
        MigrationReport report = verifier.verify(spec, results, tgtJt);
        assertThat(report.overall()).isEqualTo(MigrationReport.Status.FAIL);
        assertThat(report.tables()).noneSatisfy(table -> assertThat(table.source()).isEqualTo("<execution-contract>"));
    }

    @Test
    void dryRunStopsAtTheSameRowSoItPredictsWhereCommitWouldStop() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        seedSource(src, true);

        MappingSpec commitSpec = spec(src, h2Config(tag + "tgt"));
        MappingSpec dryRun = new MappingSpec(src, null, commitSpec.tables(), commitSpec.codemaps());
        List<EtlExecutor.TableResult> results = executor.execute(dryRun, MigrationMode.DRY_RUN);

        EtlExecutor.TableResult users = results.stream()
                .filter(result -> result.sourceTable().equals("LEGACY_USER")).findFirst().orElseThrow();
        assertThat(users.read()).isEqualTo(3);
        assertThat(users.transformed()).isEqualTo(2);
        assertThat(users.errors()).singleElement().asString()
                .startsWith("행 변환 실패(LEGACY_USER, column=org_id, row=3): ROW_TRANSFORM_FAILED:FK_REF_ORPHAN");
    }

    @Test
    void missingSurrogateKeyIsAnIdentityStageFailureNamingTheIdColumn() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        DbConfig tgt = h2Config(tag + "tgt");
        seedSource(src, false);
        jdbc(src).update("INSERT INTO LEGACY_ORG VALUES ('30', NULL)");
        seedTargetSchema(tgt);
        // 대리키 원천(ORG_NM)이 NULL 이면 대리키를 만들 수 없다 — checkpoint identity 단계의 실패다.
        TableMapping org = new TableMapping("LEGACY_ORG", "tb_org", null, "ORG_ID", null, List.of(
                new ColumnMapping("ORG_ID", "org_nm", null, null, null, null, null)
        ), new IdStrategy("org_id", "ORG", "ORG_NM"));
        MappingSpec spec = new MappingSpec(src, tgt, List.of(org), Map.of(),
                new RunContext("commit-identity", "legacy-crm"));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> assertThat(result.errors()).containsExactly(
                "행 변환 실패(LEGACY_ORG, column=org_id, row=3): ROW_TRANSFORM_FAILED:IDENTITY_FAILED"
                        + " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다"));
        assertThat(count(jdbc(tgt), "tb_org")).isZero();
    }

    // ── 행 변환 실패의 단계 라벨(2026-10-13 PR-D 검토) ─────────────────────────
    // 런북은 오류의 <단계> 로 운영자 조치를 안내한다. 단계마다 한 건씩 실제 실행으로 라벨을 고정한다.

    @Test
    void undefinedCodemapReferenceIsAStageFailureInsteadOfSkippingTheCodemap() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        DbConfig tgt = h2Config(tag + "tgt");
        seedSource(src, false);
        seedTargetSchema(tgt);
        // 검증기가 먼저 막지만, 실행기도 정의 없는 codemap 을 조용히 건너뛰지 않는다(종전: 원천 값을 그대로 썼다).
        MappingSpec spec = new MappingSpec(src, tgt, List.of(orgTable(
                new ColumnMapping("ORG_NM", "org_nm", null, null, "missing_map", null, null))), Map.of(),
                new RunContext("commit-undefined-codemap", "legacy-crm"));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> assertThat(result.errors()).containsExactly(
                "행 변환 실패(LEGACY_ORG, column=org_nm, row=1): ROW_TRANSFORM_FAILED:CODEMAP_UNDEFINED"
                        + " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다"));
        assertThat(count(jdbc(tgt), "tb_org")).isZero();
    }

    @Test
    void binaryValueIntoACodemapIsAnInputStageFailureNotAnUnmappedCode() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        DbConfig tgt = h2Config(tag + "tgt");
        jdbc(src).execute("CREATE TABLE LEGACY_FLAG (FLAG_ID varchar(20), FLAG varbinary(4))");
        jdbc(src).update("INSERT INTO LEGACY_FLAG VALUES ('f1', X'01')");
        jdbc(tgt).execute("CREATE TABLE tb_flag (flag_id varchar(20) PRIMARY KEY, flag_cd varchar(1))");
        TableMapping flag = new TableMapping("LEGACY_FLAG", "tb_flag", null, "FLAG_ID", "flag_id", List.of(
                new ColumnMapping("FLAG_ID", "flag_id", null, null, null, null, null),
                new ColumnMapping("FLAG", "flag_cd", null, null, "flag_map", null, null)), null);
        MappingSpec spec = new MappingSpec(src, tgt, List.of(flag),
                Map.of("flag_map", MappingSpec.CodeMap.of(Map.of("1", "Y"))),
                new RunContext("commit-binary-codemap", "legacy-crm"));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> assertThat(result.errors()).containsExactly(
                "행 변환 실패(LEGACY_FLAG, column=flag_cd, row=1): ROW_TRANSFORM_FAILED:CODEMAP_INPUT_INVALID"
                        + " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다"));
        assertThat(count(jdbc(tgt), "tb_flag")).isZero();
    }

    @Test
    void throwingCustomTransformerIsATransformStageFailureWithoutItsMessage() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        DbConfig tgt = h2Config(tag + "tgt");
        seedSource(src, false);
        seedTargetSchema(tgt);
        TransformerRegistry registry = new TransformerRegistry();
        registry.register("explode", "test:explode:v1", "0".repeat(64), value -> {
            if ("Sales".equals(value)) {
                throw new IllegalStateException("cannot transform Sales");
            }
            return value;
        });
        EtlExecutor exploding = new EtlExecutor(new SourceIntrospector(), registry);
        MappingSpec spec = new MappingSpec(src, tgt, List.of(orgTable(
                new ColumnMapping("ORG_NM", "org_nm", "explode", null, null, null, null))), Map.of(),
                new RunContext("commit-transform-failure", "legacy-crm"));

        List<EtlExecutor.TableResult> results = exploding.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> assertThat(result.errors()).containsExactly(
                "행 변환 실패(LEGACY_ORG, column=org_nm, row=2): ROW_TRANSFORM_FAILED:TRANSFORM_FAILED"
                        + " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다"));
        assertThat(results.getFirst().errors().getFirst()).doesNotContain("Sales", "cannot transform");
        // 같은 chunk 의 1행(HQ)도 쓰지 않는다.
        assertThat(count(jdbc(tgt), "tb_org")).isZero();
        assertThat(count(jdbc(tgt), "migration_control.tb_migration_key_map")).isZero();
    }

    @Test
    void typedIdentityConflictIsAnIdentityStageFailure() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        DbConfig tgt = h2Config(tag + "tgt");
        jdbc(src).execute("CREATE TABLE LEGACY_TYPED (ID bigint, OTHER_ID bigint, PAYLOAD varchar(20))");
        jdbc(src).update("INSERT INTO LEGACY_TYPED VALUES (1, 1, 'a')");
        jdbc(src).update("INSERT INTO LEGACY_TYPED VALUES (2, 9, 'b')"); // 컬럼 매핑 값과 PRESERVE identity 가 어긋난다
        jdbc(tgt).execute("CREATE TABLE tb_typed (id bigint PRIMARY KEY, payload varchar(20))");
        IdentityComponentSpec sourceId = new IdentityComponentSpec("ID", IdentityValueType.SIGNED_INTEGER);
        IdentityComponentSpec targetId = new IdentityComponentSpec("id", IdentityValueType.SIGNED_INTEGER);
        TableMapping typed = new TableMapping("LEGACY_TYPED", "tb_typed", null, null, List.of("ID"), null, List.of(
                new ColumnMapping("OTHER_ID", "id", null, null, null, null, null),
                new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)), null,
                // 시험 대상 PK 는 시퀀스로 채번되지 않는다(DEC-OPS-306 none 선언). 선언이 없으면 PostgreSQL 이
                // 아닌 대상은 시퀀스를 판정할 수 없어 행을 읽기 전에 멈추므로 identity 단계까지 가지 못한다.
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE, List.of(sourceId), List.of(targetId),
                        Map.of("id", IdentityStrategy.NO_SEQUENCE)), List.of());
        MappingSpec spec = new MappingSpec(src, tgt, List.of(typed), Map.of(),
                new RunContext("commit-typed-identity", "legacy-crm"));

        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> assertThat(result.errors()).containsExactly(
                "행 변환 실패(LEGACY_TYPED, column=<identity>, row=2): ROW_TRANSFORM_FAILED:IDENTITY_FAILED"
                        + " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다"));
        assertThat(count(jdbc(tgt), "tb_typed")).isZero();
        assertThat(count(jdbc(tgt), "migration_control.tb_migration_key_map")).isZero();
    }

    @Test
    void targetGeneratedDryRunStopsAtTheFailingSecondRowAndStopsTheRun() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        JdbcTemplate source = jdbc(src);
        source.execute("CREATE TABLE LEGACY_GEN (CODE varchar(10), STAT varchar(1))");
        source.update("INSERT INTO LEGACY_GEN VALUES ('a', '1')");
        source.update("INSERT INTO LEGACY_GEN VALUES ('b', '9')"); // 미매핑 코드
        source.execute("CREATE TABLE LEGACY_NEXT (NOTE_ID varchar(20), BODY varchar(50))");
        source.update("INSERT INTO LEGACY_NEXT VALUES ('n1', 'memo')");
        TableMapping generated = new TableMapping("LEGACY_GEN", "tb_gen", null, null, List.of("CODE"), null, List.of(
                new ColumnMapping("CODE", "code", null, null, null, null, null),
                new ColumnMapping("STAT", "stat_cd", null, null, "stat_map", null, null)), null,
                new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                        List.of(new IdentityComponentSpec("CODE", IdentityValueType.TEXT)),
                        List.of(new IdentityComponentSpec("id", IdentityValueType.SIGNED_INTEGER))),
                List.of());
        TableMapping next = new TableMapping("LEGACY_NEXT", "tb_next", null, "NOTE_ID", "note_id", List.of(
                new ColumnMapping("NOTE_ID", "note_id", null, null, null, null, null)), null);
        MappingSpec dryRun = new MappingSpec(src, null, List.of(generated, next),
                Map.of("stat_map", MappingSpec.CodeMap.of(Map.of("1", "A"))));

        List<EtlExecutor.TableResult> results = executor.execute(dryRun, MigrationMode.DRY_RUN);

        assertThat(results).extracting(EtlExecutor.TableResult::sourceTable).containsExactly("LEGACY_GEN", "LEGACY_NEXT");
        EtlExecutor.TableResult gen = results.getFirst();
        assertThat(gen.transformed()).isEqualTo(1);
        assertThat(gen.errors()).containsExactly(
                "행 변환 실패(LEGACY_GEN, column=stat_cd, row=2): ROW_TRANSFORM_FAILED:CODEMAP_UNMAPPED"
                        + " — 이 chunk 는 기록하지 않고 적재를 멈췄습니다",
                "LEGACY_GEN: TARGET_GENERATED dry-run은 DB 생성 identity를 materialize할 수 없습니다");
        assertThat(results.get(1).read()).isZero();
        assertThat(results.get(1).errors()).containsExactly("적재 중단으로 처리하지 않음(LEGACY_NEXT): 앞 테이블 "
                + "LEGACY_GEN 의 행 변환 실패 — RUN_STOPPED_BY_ROW_FAILURE");
    }

    // ── fixtures ──────────────────────────────────────────────────────────

    private MappingSpec spec(DbConfig src, DbConfig tgt) {
        // 자식(LEGACY_USER)을 부모(LEGACY_ORG)보다 먼저 선언 → 위상정렬이 재배치해야 한다.
        TableMapping user = new TableMapping("LEGACY_USER", "tb_user_info", null,
                "USER_ID", null, List.of(
                new ColumnMapping("USER_NM", "user_nm", "trim", null, null, null, null),
                new ColumnMapping("ORG_ID", "org_id", null, null, null, "LEGACY_ORG", null), // fkRef 부모
                new ColumnMapping("STAT", "user_stts_cd", null, null, "user_status", null, null),
                new ColumnMapping(null, "frst_rgtr_id", null, null, null, null, "MIGRATION")
        ), new IdStrategy("user_id", "USR", "USER_ID"));

        TableMapping org = new TableMapping("LEGACY_ORG", "tb_org", null,
                "ORG_ID", null, List.of(
                new ColumnMapping("ORG_NM", "org_nm", null, null, null, null, null)
        ), new IdStrategy("org_id", "ORG", "ORG_ID"));

        Map<String, MappingSpec.CodeMap> codemaps = Map.of(
                "user_status", MappingSpec.CodeMap.of(Map.of("1", "A", "0", "D")));

        return new MappingSpec(src, tgt, List.of(user, org), codemaps,
                new RunContext("commit-integration", "legacy-crm"));
    }

    private static TableMapping orgTable(ColumnMapping column) {
        return new TableMapping("LEGACY_ORG", "tb_org", null, "ORG_ID", null, List.of(column),
                new IdStrategy("org_id", "ORG", "ORG_ID"));
    }

    private void seedSource(DbConfig cfg, boolean withOrphan) {
        JdbcTemplate jt = jdbc(cfg);
        jt.execute("CREATE TABLE LEGACY_ORG (ORG_ID varchar(20), ORG_NM varchar(50))");
        jt.update("INSERT INTO LEGACY_ORG VALUES ('10','HQ')");
        jt.update("INSERT INTO LEGACY_ORG VALUES ('20','Sales')");
        jt.execute("CREATE TABLE LEGACY_USER (USER_ID varchar(20), USER_NM varchar(50), ORG_ID varchar(20), STAT varchar(1))");
        jt.update("INSERT INTO LEGACY_USER VALUES ('u1','  Kim ','10','1')");
        jt.update("INSERT INTO LEGACY_USER VALUES ('u2','Lee','20','0')");
        if (withOrphan) {
            jt.update("INSERT INTO LEGACY_USER VALUES ('u3','Park','99','1')"); // ORG 99 없음
        }
    }

    private void seedTargetSchema(DbConfig cfg) {
        JdbcTemplate jt = jdbc(cfg);
        jt.execute("CREATE TABLE tb_org (org_id varchar(20) PRIMARY KEY, org_nm varchar(50))");
        jt.execute("CREATE TABLE tb_user_info (user_id varchar(20) PRIMARY KEY, user_nm varchar(50), "
                + "org_id varchar(20), user_stts_cd varchar(1), frst_rgtr_id varchar(20))");
    }

    private static DbConfig h2Config(String name) {
        return new DbConfig("jdbc:h2:mem:" + name + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
    }

    private static JdbcTemplate jdbc(DbConfig cfg) {
        DriverManagerDataSource ds = new DriverManagerDataSource(cfg.url(), cfg.username(), cfg.password());
        ds.setDriverClassName(cfg.driver());
        return new JdbcTemplate(ds);
    }

    private static int count(JdbcTemplate jt, String table) {
        Integer c = jt.queryForObject("SELECT count(*) FROM " + table, Integer.class);
        return c == null ? 0 : c;
    }
}
