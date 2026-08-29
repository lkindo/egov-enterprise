package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.IdStrategy;
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
        assertThat(count(tgtJt, "tb_migration_key_map")).isEqualTo(4);

        // 코드맵 적용 확인
        assertThat(tgtJt.queryForList("SELECT user_stts_cd FROM tb_user_info", String.class))
                .containsExactlyInAnyOrder("A", "D");
    }

    @Test
    void fkOrphanRowIsIsolatedAndReportedFail() {
        String tag = "it" + SEQ.incrementAndGet();
        DbConfig src = h2Config(tag + "src");
        DbConfig tgt = h2Config(tag + "tgt");
        seedSource(src, true); // u3 → 존재하지 않는 ORG_ID '99'
        seedTargetSchema(tgt);

        MappingSpec spec = spec(src, tgt);
        List<EtlExecutor.TableResult> results = executor.execute(spec, MigrationMode.COMMIT);
        JdbcTemplate tgtJt = jdbc(tgt);
        MigrationReport report = verifier.verify(spec, results, tgtJt);

        // 고아 행은 격리(오류 기록) → 해당 테이블 FAIL, 유효 2행만 적재
        assertThat(report.overall()).isEqualTo(MigrationReport.Status.FAIL);
        assertThat(count(tgtJt, "tb_user_info")).isEqualTo(2); // u1,u2 성공, u3 격리
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

        Map<String, Map<String, String>> codemaps = Map.of(
                "user_status", Map.of("1", "A", "0", "D", "default", "P"));

        return new MappingSpec(src, tgt, List.of(user, org), codemaps,
                new RunContext("commit-integration", "legacy-crm"));
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
