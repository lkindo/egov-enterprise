package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.SQLException;
import org.hibernate.JDBCException;
import org.hibernate.QueryTimeoutException;
import org.hibernate.cfg.JdbcSettings;
import org.hibernate.exception.ConstraintViolationException;
import org.hibernate.exception.LockAcquisitionException;
import org.hibernate.exception.LockTimeoutException;
import org.hibernate.exception.spi.SQLExceptionConversionDelegate;
import org.hibernate.dialect.lock.PessimisticLockStyle;
import org.hibernate.dialect.lock.internal.LockingSupportSimple;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.type.SqlTypes;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 실제 잠금 동작은 CUBRID 위 통합 시험(비관적 잠금·대기 초과)이 본다. 여기서는 방언이 잠금 절을 내는 설정을 고정한다. */
class NuriCubridDialectTest {

    @Test
    @DisplayName("비관적 잠금은 잠금 절(FOR UPDATE)로 낸다 — 커뮤니티 방언은 잠금 절을 내지 않는다")
    void pessimisticLocksRenderForUpdate() {
        NuriCubridDialect dialect = new NuriCubridDialect();

        assertThat(dialect.getForUpdateString()).isEqualTo(" for update");
        assertThat(dialect.getLockingSupport()).isSameAs(LockingSupportSimple.NO_OUTER_JOIN);
        assertThat(dialect.getLockingSupport().getMetadata().getPessimisticLockStyle()).isEqualTo(PessimisticLockStyle.CLAUSE);
    }

    @Test
    @DisplayName("생성 키는 드라이버 getGeneratedKeys 가 아니라 LAST_INSERT_ID 조회로 읽게 기본값을 끈다")
    void readsIdentityThroughLastInsertId() {
        NuriCubridDialect dialect = new NuriCubridDialect();

        assertThat(dialect.getDefaultProperties().getProperty(JdbcSettings.USE_GET_GENERATED_KEYS)).isEqualTo("false");
        assertThat(dialect.getIdentityColumnSupport().getIdentitySelectString("t", "c", 0)).containsIgnoringCase("last_insert_id()");
    }

    @Test
    @DisplayName("STRING 컬럼(VARCHAR 로 보인다)은 긴 문자열 속성과 같은 타입이다 — CLOB·숫자는 아니다")
    void longTextMatchesStringColumns() {
        NuriCubridDialect dialect = new NuriCubridDialect();

        assertThat(dialect.equivalentTypes(SqlTypes.LONG32VARCHAR, SqlTypes.VARCHAR)).isTrue();
        assertThat(dialect.equivalentTypes(SqlTypes.VARCHAR, SqlTypes.LONGVARCHAR)).isTrue();
        assertThat(dialect.equivalentTypes(SqlTypes.CLOB, SqlTypes.VARCHAR)).isFalse();
        assertThat(dialect.equivalentTypes(SqlTypes.INTEGER, SqlTypes.VARCHAR)).isFalse();
    }

    @Test
    @DisplayName("SQLState 없는 오류를 번호로 가른다 — 제약 종류·이름, 잠금 대기 초과·교착, 문장 시간 초과. ck_ 아닌 트리거 거부는 가르지 않는다")
    void convertsErrorsByNumber() {
        SQLExceptionConversionDelegate convert = new NuriCubridDialect().buildSQLExceptionConversionDelegate();
        java.util.function.BiFunction<Integer, String, JDBCException> of = (code, text) -> convert.convert(new SQLException(text, null, code), "m", "s");

        assertThat(of.apply(-670, "Operation would have caused one or more unique constraint violations. INDEX uk_c7_nm(B+tree: 0|4608|4609) ON CLASS app.c7"))
                .isInstanceOfSatisfying(ConstraintViolationException.class, failure -> {
                    assertThat(failure.getKind()).isEqualTo(ConstraintViolationException.ConstraintKind.UNIQUE);
                    assertThat(failure.getConstraintName()).isEqualTo("uk_c7_nm");
                });
        assertThat(of.apply(-922, "The constraint of the foreign key 'fk_c7_p7' is invalid, due to value ''zz''."))
                .isInstanceOfSatisfying(ConstraintViolationException.class, failure -> assertThat(failure.getConstraintName()).isEqualTo("fk_c7_p7"));
        assertThat(of.apply(-205, "Execute: Putting value 'NULL' into attribute 'v' returned: Attribute \"v\" cannot be made NULL."))
                .isInstanceOfSatisfying(ConstraintViolationException.class,
                        failure -> assertThat(failure.getKind()).isEqualTo(ConstraintViolationException.ConstraintKind.NOT_NULL));
        assertThat(of.apply(-517, "The operation has been rejected by trigger \"egov.ck_tb_x_amt_i\"."))
                .isInstanceOfSatisfying(ConstraintViolationException.class, failure -> assertThat(failure.getConstraintName()).isEqualTo("ck_tb_x_amt"));
        assertThat(of.apply(-517, "The operation has been rejected by trigger \"egov.tr_tb_sys_adt_log_d\".")).as("원장 보호 트리거는 제약 위반이 아니다").isNull();
        assertThat(of.apply(-75, "Your transaction (index 2) timed out waiting on X_LOCK")).isInstanceOf(LockTimeoutException.class);
        assertThat(of.apply(-72, "deadlock")).isInstanceOf(LockAcquisitionException.class);
        assertThat(of.apply(-4, "Has been interrupted.")).isInstanceOf(QueryTimeoutException.class);
        assertThat(of.apply(-494, "Semantic: Cannot coerce host var to type numeric.")).isNull();
    }

    @Test
    @DisplayName("예약어 컬럼(role·data_type)만 따옴표로 낸다 — 다른 이름과 표준 예약어는 그대로 둔다")
    void quotesOnlyTheReservedColumns() throws Exception {
        NuriCubridDialect dialect = new NuriCubridDialect();
        org.hibernate.engine.jdbc.env.spi.JdbcEnvironment environment = mock(org.hibernate.engine.jdbc.env.spi.JdbcEnvironment.class);
        when(environment.getDialect()).thenReturn(dialect);
        var builder = org.hibernate.engine.jdbc.env.spi.IdentifierHelperBuilder.from(environment);
        // JDBC 환경은 설정(hibernate.auto_quote_keyword, 기본 false)을 먼저 건 빌더를 넘긴다. 꺼진 빌더는 예약어를 받지 않는다.
        builder.setAutoQuoteKeywords(false);
        var helper = dialect.buildIdentifierHelper(builder, null);

        assertThat(helper.toIdentifier("role").isQuoted()).isTrue();
        assertThat(helper.toIdentifier("data_type").isQuoted()).isTrue();
        assertThat(helper.toIdentifier("user_nm").isQuoted()).isFalse();
        assertThat(helper.toIdentifier("value").isQuoted()).as("표준 예약어지만 CUBRID 가 따옴표 없이 받는다").isFalse();
    }

    @Test
    @DisplayName("제품명이 CUBRID 이면 판을 읽지 못해도 이 방언을 고르고, 다른 제품은 표준 해석에 넘긴다")
    void resolvesByProductName() {
        DialectResolutionInfo cubrid = mock(DialectResolutionInfo.class);
        when(cubrid.getDatabaseName()).thenReturn("CUBRID");
        DialectResolutionInfo postgres = mock(DialectResolutionInfo.class);
        when(postgres.getDatabaseName()).thenReturn("PostgreSQL");

        NuriCubridDialectResolver resolver = new NuriCubridDialectResolver();

        assertThat(resolver.resolveDialect(cubrid)).isInstanceOf(NuriCubridDialect.class);
        assertThat(resolver.resolveDialect(postgres)).isNull();
    }
}
