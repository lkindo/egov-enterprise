package nuri.business.core.harness;

import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import java.lang.reflect.Method;
import java.util.List;

/**
 * JUnit 5 Extension을 활용하여 각 테스트 생명주기 전후로 JPA 쿼리 성능을 자동 추적 및 검증하는 하네스 엔진 (테스트용 피스처)
 */
public class QueryCountGuardExtension implements BeforeEachCallback, AfterEachCallback {

    @Override
    public void beforeEach(ExtensionContext context) throws Exception {
        if (shouldGuard(context)) {
            QueryCountInspector.start();
        }
    }

    @Override
    public void afterEach(ExtensionContext context) throws Exception {
        if (shouldGuard(context)) {
            int count = QueryCountInspector.getCount();
            List<String> queries = QueryCountInspector.getQueries();
            int maxAllowed = getMaxAllowed(context);
            QueryCountInspector.clear();

            if (count > maxAllowed) {
                StringBuilder sb = new StringBuilder();
                sb.append("\n========================================================================\n");
                sb.append("🚨 [JPA PERFORMANCE GUARDRAIL VIOLATION] N+1 또는 비효율 쿼리 경보!\n");
                sb.append(String.format("👉 허용된 최대 쿼리 수: %d개 | 실제 실행된 쿼리 수: %d개\n", maxAllowed, count));
                sb.append("========================================================================\n");
                sb.append("⬇️ 실행된 SQL 목록 (순서별):\n");
                for (int i = 0; i < queries.size(); i++) {
                    sb.append(String.format("  [%02d] %s\n", i + 1, queries.get(i).trim()));
                }
                sb.append("========================================================================\n");
                sb.append("해결 팁: Fetch Join, EntityGraph, 또는 BatchSize 설정을 점검하여 쿼리 루프를 최적화하십시오.\n");
                
                throw new AssertionError(sb.toString());
            }
        }
    }

    private boolean shouldGuard(ExtensionContext context) {
        Method method = context.getTestMethod().orElse(null);
        Class<?> clazz = context.getTestClass().orElse(null);
        
        return (method != null && method.isAnnotationPresent(QueryCountGuard.class)) ||
               (clazz != null && clazz.isAnnotationPresent(QueryCountGuard.class));
    }

    private int getMaxAllowed(ExtensionContext context) {
        Method method = context.getTestMethod().orElse(null);
        if (method != null && method.isAnnotationPresent(QueryCountGuard.class)) {
            return method.getAnnotation(QueryCountGuard.class).max();
        }
        Class<?> clazz = context.getTestClass().orElse(null);
        if (clazz != null && clazz.isAnnotationPresent(QueryCountGuard.class)) {
            return clazz.getAnnotation(QueryCountGuard.class).max();
        }
        return 10;
    }
}
