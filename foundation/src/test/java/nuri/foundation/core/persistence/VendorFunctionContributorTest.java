package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ServiceLoader;
import org.hibernate.boot.model.FunctionContributions;
import org.hibernate.boot.model.FunctionContributor;
import org.hibernate.dialect.Dialect;
import org.hibernate.dialect.PostgreSQLDialect;
import org.hibernate.query.sqm.function.SqmFunctionRegistry;
import org.hibernate.type.spi.TypeConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class VendorFunctionContributorTest {

    private SqmFunctionRegistry contribute(Dialect dialect) {
        FunctionContributions contributions = mock(FunctionContributions.class);
        SqmFunctionRegistry registry = mock(SqmFunctionRegistry.class);
        when(contributions.getDialect()).thenReturn(dialect);
        when(contributions.getFunctionRegistry()).thenReturn(registry);
        when(contributions.getTypeConfiguration()).thenReturn(new TypeConfiguration());
        new VendorFunctionContributor().contributeFunctions(contributions);
        return registry;
    }

    @Test
    @DisplayName("Oracle 의 CLOB 은 <> 로 비교할 수 없어 DBMS_LOB.COMPARE 를 쓴다")
    void oracleComparesLobs() {
        verify(contribute(new NuriOracleDialect())).registerPattern(eq(VendorFunctionContributor.TEXT_DIFFERS),
                eq("CASE WHEN DBMS_LOB.COMPARE(?1, ?2) <> 0 THEN 1 ELSE 0 END"), any());
    }

    @Test
    @DisplayName("그 밖의 벤더는 표준 비교다")
    void otherVendorsUseTheStandardOperator() {
        verify(contribute(new PostgreSQLDialect())).registerPattern(eq(VendorFunctionContributor.TEXT_DIFFERS),
                eq("CASE WHEN ?1 <> ?2 THEN 1 ELSE 0 END"), any());
    }

    @Test
    @DisplayName("Hibernate 가 찾도록 서비스로 등록돼 있다")
    void registeredAsAService() {
        assertThat(ServiceLoader.load(FunctionContributor.class))
                .anyMatch(VendorFunctionContributor.class::isInstance);
    }
}
