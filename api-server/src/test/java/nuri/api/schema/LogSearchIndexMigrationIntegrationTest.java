package nuri.api.schema;

import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import java.sql.Statement;
import static org.assertj.core.api.Assertions.*;

@Tag("schema-validation")
class LogSearchIndexMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {
    private void migrate(String version) {
        flyway(org.flywaydb.core.api.MigrationVersion.fromVersion(version)).migrate();
    }

    @Test
    void indexMigrationIsAtomicUnderContentionAndSupportsDateQueries() throws Exception {
        migrate("2.96");
        try (var c = openConnection(); var s = c.createStatement()) {
            s.executeUpdate("INSERT INTO tb_login_log(crt_dt) SELECT timestamp '2000-01-01' + n * interval '1 day' FROM generate_series(1,10000) n");
            s.executeUpdate("INSERT INTO tb_sys_log(dmnd_id,ocrn_ymd) SELECT 'IDX_SYS_' || n, to_char(date '2000-01-01' + n, 'YYYYMMDD') FROM generate_series(1,10000) n");
            s.executeUpdate("INSERT INTO tb_privacy_log(dmnd_id,inq_dt) SELECT 'IDX_PRVC_' || n, timestamp '2000-01-01' + n * interval '1 day' FROM generate_series(1,10000) n");
        }
        long before;
        try (var c = openConnection(); var s = c.createStatement()) {
            before = count(s, "SELECT (SELECT count(*) FROM tb_login_log) + (SELECT count(*) FROM tb_sys_log) + (SELECT count(*) FROM tb_privacy_log)");
            c.setAutoCommit(false);
            s.execute("LOCK TABLE tb_login_log IN ROW EXCLUSIVE MODE");
            assertThatThrownBy(() -> migrate("2.97")).isInstanceOf(FlywayException.class);
            assertThat(count(s, "SELECT count(*) FROM pg_indexes WHERE indexname IN ('ix_tb_login_log_crt_dt','ix_tb_sys_log_ocrn_ymd','ix_tb_sys_log_ocrn_ymd_trim','ix_tb_privacy_log_inq_dt')")).isZero();
            c.rollback();
        }
        migrate("2.97");
        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(count(s, "SELECT (SELECT count(*) FROM tb_login_log) + (SELECT count(*) FROM tb_sys_log) + (SELECT count(*) FROM tb_privacy_log)")).isEqualTo(before);
            s.execute("ANALYZE tb_login_log");
            s.execute("ANALYZE tb_sys_log");
            s.execute("ANALYZE tb_privacy_log");
            assertPlan(s, "SELECT lgn_sn FROM tb_login_log WHERE crt_dt >= timestamp '2026-01-01' AND crt_dt < timestamp '2026-01-02' ORDER BY crt_dt DESC", "ix_tb_login_log_crt_dt");
            // [2026-09-26 DIP B5 F10] 일별 로그인 통계도 같은 인덱스를 탄다. 문장은 저장소 애노테이션에서 그대로 읽는다 —
            //   종전 to_char(CRT_DT) BETWEEN 은 컬럼을 문자열로 바꿔 비교해 인덱스를 쓸 수 없었다.
            assertPlan(s, nuri.business.domain.log.LoginLogRepository.class
                    .getMethod("countLoginsByDate", String.class, String.class)
                    .getAnnotation(org.springframework.data.jpa.repository.Query.class).value()
                    .replace(":fromDate", "'20260101'").replace(":toDate", "'20260102'"), "ix_tb_login_log_crt_dt");
            assertPlan(s, "SELECT sys_log_sn FROM tb_sys_log WHERE btrim(ocrn_ymd) BETWEEN '20260101' AND '20260102'", "ix_tb_sys_log_ocrn_ymd_trim");
            assertPlan(s, "SELECT sys_log_sn FROM tb_sys_log ORDER BY ocrn_ymd DESC LIMIT 10", "ix_tb_sys_log_ocrn_ymd");
            assertPlan(s, "SELECT prvc_log_sn FROM tb_privacy_log WHERE inq_dt >= timestamp '2026-01-01' AND inq_dt < timestamp '2026-01-02' ORDER BY inq_dt DESC", "ix_tb_privacy_log_inq_dt");
        }
    }

    private static long count(Statement s, String sql) throws Exception {
        try (var r = s.executeQuery(sql)) { r.next(); return r.getLong(1); }
    }

    private static void assertPlan(Statement s, String sql, String index) throws Exception {
        try (var r = s.executeQuery("EXPLAIN (FORMAT JSON) " + sql)) {
            r.next();
            assertThat(r.getString(1)).contains(index);
        }
    }
}
