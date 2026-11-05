package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.hibernate.dialect.lock.PessimisticLockStyle;
import org.hibernate.dialect.lock.internal.LockingSupportSimple;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
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
