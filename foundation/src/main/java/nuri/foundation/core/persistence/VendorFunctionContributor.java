package nuri.foundation.core.persistence;

import org.hibernate.boot.model.FunctionContributions;
import org.hibernate.boot.model.FunctionContributor;
import org.hibernate.dialect.OracleDialect;
import org.hibernate.type.BasicType;
import org.hibernate.type.StandardBasicTypes;

/**
 * JPQL 이 벤더 차이 없이 쓰는 함수(ADR-0047 결정 4).
 *
 * <p>{@code text_differs(a, b)} 는 두 긴 문자열이 다르면 1 이다. Oracle 의 CLOB 은 {@code <>} 로 비교할 수 없다.
 * 어느 쪽이든 NULL 이면 0 이라 {@code a <> b} 가 UNKNOWN 인 경우와 뜻이 같다.
 */
public class VendorFunctionContributor implements FunctionContributor {

    static final String TEXT_DIFFERS = "text_differs";

    @Override
    public void contributeFunctions(FunctionContributions functions) {
        BasicType<Integer> integer = functions.getTypeConfiguration().getBasicTypeRegistry().resolve(StandardBasicTypes.INTEGER);
        String pattern = functions.getDialect() instanceof OracleDialect
                ? "CASE WHEN DBMS_LOB.COMPARE(?1, ?2) <> 0 THEN 1 ELSE 0 END"
                : "CASE WHEN ?1 <> ?2 THEN 1 ELSE 0 END";
        functions.getFunctionRegistry().registerPattern(TEXT_DIFFERS, pattern, integer);
    }
}
