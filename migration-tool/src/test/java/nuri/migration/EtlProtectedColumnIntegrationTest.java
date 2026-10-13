package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.protect.ColumnProtector;
import nuri.migration.protect.EgovAriaColumnCipher;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 주민번호 컬럼 적재 경로(H2, DEC-OPS-308): 선언한 컬럼은 온라인 앱과 같은 암호문으로 쓰고, 키 부재·선언 누락은 행을
 * 쓰거나 실행 상태를 만들기 전에 멈추며, 온라인 앱이 되읽을 수 없는 값은 그 행만 쓰지 않는다.
 */
@DisplayName("보호 컬럼 적재 — 평문을 대상 DB 에 쓰지 않는다")
class EtlProtectedColumnIntegrationTest {

    private static final AtomicInteger SEQ = new AtomicInteger();
    private static final String KEY = "etl-protected-column-key";
    private static final String RRNO = "800101-1234567";

    @Test
    @DisplayName("encrypt 컬럼은 온라인 앱과 같은 암호문으로 쓰고, 빈 값은 NULL 로 둔다")
    void writesTheOnlineCiphertext() {
        Fixture fixture = new Fixture();
        fixture.seed("('u1', 'Kim', ' " + RRNO + " ')", "('u2', 'Lee', '   ')", "('u3', 'Park', NULL)");

        List<EtlExecutor.TableResult> results = executor(KEY).execute(fixture.spec("aria-egov-v1"), MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.errors()).isEmpty();
            assertThat(result.written()).isEqualTo(3);
        });
        JdbcTemplate target = fixture.target();
        String kim = target.queryForObject("SELECT user_enrrno FROM tb_user_info WHERE user_nm = 'Kim'", String.class);
        assertThat(kim).isEqualTo(new EgovAriaColumnCipher(KEY).encrypt(RRNO));
        assertThat(new EgovAriaColumnCipher(KEY).decrypt(kim)).isEqualTo(RRNO);
        assertThat(target.queryForList("SELECT user_enrrno FROM tb_user_info WHERE user_nm <> 'Kim'", String.class))
                .containsOnlyNulls().hasSize(2);
        assertThat(target.queryForObject(
                "SELECT count(*) FROM tb_user_info WHERE user_enrrno LIKE '%1234567%'", Integer.class)).isZero();
    }

    @Test
    @DisplayName("키가 없으면 dry-run 도 commit 도 행을 쓰거나 실행 상태를 만들기 전에 멈춘다")
    void missingKeyStopsBeforeAnyWrite() {
        Fixture fixture = new Fixture();
        fixture.seed("('u1', 'Kim', '" + RRNO + "')");

        for (MigrationMode mode : MigrationMode.values()) {
            assertThatThrownBy(() -> executor(null).execute(fixture.spec("aria-egov-v1"), mode))
                    .as(mode.name())
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageStartingWith("보호 컬럼 암호화 키가 없습니다 — 환경 변수 MIGRATION_ALGORITHM_KEY");
        }
        fixture.assertNothingWritten();
    }

    @Test
    @DisplayName("주민번호 컬럼을 encrypt 없이 매핑하면 키가 있어도 아무것도 쓰지 않는다")
    void undeclaredProtectedColumnStopsBeforeAnyWrite() {
        Fixture fixture = new Fixture();
        fixture.seed("('u1', 'Kim', '" + RRNO + "')");

        assertThatThrownBy(() -> executor(KEY).execute(fixture.spec(null), MigrationMode.COMMIT))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("보호 컬럼 선언 오류: tb_user_info.user_enrrno: 온라인 앱이 암호화해 저장하는 컬럼입니다"
                        + " — encrypt: aria-egov-v1 를 선언해야 평문으로 쓰지 않습니다");
        fixture.assertNothingWritten();
    }

    @Test
    @DisplayName("온라인 앱이 되읽을 수 없는 값은 그 행만 쓰지 않고, 오류에는 테이블·컬럼만 남긴다")
    void unreadableValueSkipsOnlyThatRow() {
        Fixture fixture = new Fixture();
        // 16바이트 배수이고 마지막 바이트가 1 이면 온라인 복호화가 1바이트를 걷어 낸다(trim 이 걷지 않게 변환을 뺀다).
        fixture.seed("('u1', 'Kim', '" + RRNO + "')", "('u2', 'Odd', 'ABCDEFGHIJKLMNO' || CHAR(1))");

        List<EtlExecutor.TableResult> results = executor(KEY).execute(
                fixture.spec("aria-egov-v1", null), MigrationMode.COMMIT);

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.written()).isEqualTo(1);
            assertThat(result.errors()).containsExactly("행 변환 실패(LEGACY_USER): PROTECTED_COLUMN"
                    + " tb_user_info.user_enrrno: 온라인 앱이 되읽을 수 없는 값입니다");
        });
        assertThat(fixture.target().queryForList("SELECT user_nm FROM tb_user_info", String.class)).containsExactly("Kim");
    }

    private static EtlExecutor executor(String key) {
        Function<String, String> environment = name -> ColumnProtector.KEY_ENVIRONMENT.equals(name) ? key : null;
        return new EtlExecutor(new SourceIntrospector(), new TransformerRegistry(), environment);
    }

    private static final class Fixture {
        private final String tag = "protect" + SEQ.incrementAndGet();
        private final DbConfig source = h2(tag + "src");
        private final DbConfig target = h2(tag + "tgt");

        void seed(String... rows) {
            JdbcTemplate src = jdbc(source);
            src.execute("CREATE TABLE LEGACY_USER (USER_ID varchar(20), USER_NM varchar(50), JUMIN varchar(40))");
            for (String row : rows) {
                src.update("INSERT INTO LEGACY_USER VALUES " + row);
            }
            target().execute("CREATE TABLE tb_user_info (user_id varchar(20) PRIMARY KEY, user_nm varchar(50), "
                    + "user_enrrno varchar(256))");
        }

        MappingSpec spec(String encrypt) {
            return spec(encrypt, "trim");
        }

        MappingSpec spec(String encrypt, String transform) {
            TableMapping user = new TableMapping("LEGACY_USER", "tb_user_info", null, "USER_ID", null, List.of(
                    new ColumnMapping("USER_NM", "user_nm", null, null, null, null, null),
                    new ColumnMapping("JUMIN", "user_enrrno", transform, null, null, null, null, encrypt)
            ), new IdStrategy("user_id", "USR_", "USER_ID"));
            return new MappingSpec(source, target, List.of(user), Map.of(),
                    new RunContext("protected-column-" + tag, "legacy-hr"));
        }

        JdbcTemplate target() {
            return jdbc(target);
        }

        void assertNothingWritten() {
            JdbcTemplate jt = target();
            assertThat(jt.queryForObject("SELECT count(*) FROM tb_user_info", Integer.class)).isZero();
            assertThat(jt.queryForObject("SELECT count(*) FROM INFORMATION_SCHEMA.SCHEMATA "
                    + "WHERE UPPER(SCHEMA_NAME) = 'MIGRATION_CONTROL'", Integer.class)).isZero();
        }
    }

    private static DbConfig h2(String name) {
        return new DbConfig("jdbc:h2:mem:" + name + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
    }

    private static JdbcTemplate jdbc(DbConfig cfg) {
        DriverManagerDataSource ds = new DriverManagerDataSource(cfg.url(), cfg.username(), cfg.password());
        ds.setDriverClassName(cfg.driver());
        return new JdbcTemplate(ds);
    }
}
