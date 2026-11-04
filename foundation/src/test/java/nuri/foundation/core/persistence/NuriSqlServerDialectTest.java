package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ServiceLoader;
import org.hibernate.LockMode;
import org.hibernate.LockOptions;
import org.hibernate.Timeouts;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolver;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.sql.ast.SqlAstTranslator;
import org.hibernate.sql.ast.spi.AbstractSqlAstTranslator;
import org.hibernate.sql.ast.tree.select.SelectStatement;
import org.hibernate.sql.exec.spi.JdbcSelect;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** 실제 잠금 동작은 SQL Server 위 통합 시험(가입 경합·설문 투표와 편집)이 본다. 여기서는 힌트 모양을 고정한다. */
@SuppressWarnings("removal") // 방언 메서드의 인자 타입(LockOptions)이 SPI 패키지로 옮겨질 예정이다.
class NuriSqlServerDialectTest {

    private final NuriSqlServerDialect dialect = new NuriSqlServerDialect();

    private static LockOptions lock(LockMode mode) {
        return new LockOptions(mode);
    }

    @ParameterizedTest
    @EnumSource(value = LockMode.class, names = {"PESSIMISTIC_WRITE", "WRITE", "PESSIMISTIC_READ"})
    @DisplayName("엔티티 잠금은 범위 잠금(holdlock) 없이 행 갱신 잠금이다 — 없는 행을 잠가도 그 키의 입력을 막지 않는다")
    void entityLocksHoldOnlyExistingRows(LockMode mode) {
        String hinted = dialect.appendLockHint(lock(mode), "tb_cmnty_user_map c1_0");

        assertThat(hinted).isEqualTo("tb_cmnty_user_map c1_0 with (updlock,rowlock)").doesNotContain("holdlock");
        assertThat(new org.hibernate.dialect.SQLServerDialect().appendLockHint(lock(mode), "t"))
                .as("기본 방언이 범위 잠금을 거는 것이 이 확장의 이유다").contains("holdlock");
    }

    @Test
    @DisplayName("대기 없음과 건너뛰기는 같은 힌트를 덧붙인다")
    void noWaitAndSkipLocked() {
        assertThat(dialect.appendLockHint(lock(LockMode.PESSIMISTIC_WRITE).setTimeout(Timeouts.NO_WAIT), "t"))
                .isEqualTo("t with (updlock,rowlock,nowait)");
        assertThat(dialect.appendLockHint(lock(LockMode.PESSIMISTIC_WRITE).setTimeout(Timeouts.SKIP_LOCKED), "t"))
                .isEqualTo("t with (updlock,rowlock,readpast)");
        assertThat(dialect.appendLockHint(lock(LockMode.UPGRADE_NOWAIT), "t")).isEqualTo("t with (updlock,rowlock,nowait)");
        assertThat(dialect.appendLockHint(lock(LockMode.UPGRADE_SKIPLOCKED), "t")).isEqualTo("t with (updlock,rowlock,readpast)");
        assertThat(dialect.appendLockHint(lock(LockMode.NONE), "t")).isEqualTo("t");
    }

    @ParameterizedTest
    @EnumSource(value = LockMode.class, names = {"PESSIMISTIC_WRITE", "WRITE", "PESSIMISTIC_READ", "UPGRADE_NOWAIT", "UPGRADE_SKIPLOCKED"})
    @DisplayName("번역기가 만드는 기본 힌트는 대기·대기 없음·건너뛰기 모두 범위 잠금 없이 행 갱신 잠금이 된다")
    void translatorHintsLoseTheRangeLock(LockMode mode) {
        for (int timeout : new int[] {Timeouts.WAIT_FOREVER_MILLI, 5_000, Timeouts.NO_WAIT_MILLI, Timeouts.SKIP_LOCKED_MILLI}) {
            String original = org.hibernate.dialect.sql.ast.SQLServerSqlAstTranslator.determineLockHint(mode, timeout);
            String hinted = NuriSqlServerSqlAstTranslator.rangeFree(original).toString();

            assertThat(hinted).as(mode + " " + timeout).doesNotContain("holdlock").contains("updlock,rowlock");
            assertThat(hinted.contains("nowait")).as("대기 없음은 유지한다").isEqualTo(original.contains("nowait"));
            assertThat(hinted.contains("readpast")).as("건너뛰기는 유지한다").isEqualTo(original.contains("readpast"));
        }
        assertThat(NuriSqlServerSqlAstTranslator.rangeFree("tb_cmnty_user_map")).as("다른 조각은 그대로다").isEqualTo("tb_cmnty_user_map");
    }

    @Test
    @DisplayName("방언의 번역기는 덧붙는 기본 잠금 힌트만 범위 잠금 없는 힌트로 바꾸고 다른 조각은 그대로 둔다")
    void dialectUsesTheRangeFreeTranslator() {
        SessionFactoryImplementor sessionFactory = mock(SessionFactoryImplementor.class, RETURNS_DEEP_STUBS);
        when(sessionFactory.getJdbcServices().getDialect()).thenReturn(dialect);

        SqlAstTranslator<JdbcSelect> translator =
                dialect.getSqlAstTranslatorFactory().buildSelectTranslator(sessionFactory, mock(SelectStatement.class));

        assertThat(translator).isInstanceOf(NuriSqlServerSqlAstTranslator.class);
        AbstractSqlAstTranslator<?> sql = (AbstractSqlAstTranslator<?>) translator;
        sql.append("select c1_0.user_id from tb_cmnty_user_map c1_0");
        sql.append(" with (updlock,holdlock,rowlock)");
        sql.append(" where c1_0.cmmnty_id=?");
        assertThat(sql.getSql()).isEqualTo("select c1_0.user_id from tb_cmnty_user_map c1_0 with (updlock,rowlock) where c1_0.cmmnty_id=?");
    }

    @Test
    @DisplayName("설정이 없어도 연결한 제품명으로 이 방언을 고른다")
    void resolvedFromTheConnectedProduct() {
        DialectResolutionInfo sqlServer = mock(DialectResolutionInfo.class, CALLS_REAL_METHODS);
        doReturn("Microsoft SQL Server").when(sqlServer).getDatabaseName();
        doReturn(16).when(sqlServer).getDatabaseMajorVersion();
        DialectResolutionInfo postgres = mock(DialectResolutionInfo.class);
        when(postgres.getDatabaseName()).thenReturn("PostgreSQL");

        NuriSqlServerDialectResolver resolver = new NuriSqlServerDialectResolver();

        assertThat(resolver.resolveDialect(sqlServer)).isInstanceOf(NuriSqlServerDialect.class);
        assertThat(resolver.resolveDialect(postgres)).isNull();
        assertThat(ServiceLoader.load(DialectResolver.class)).anyMatch(NuriSqlServerDialectResolver.class::isInstance);
    }
}
