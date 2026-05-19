package nuri.foundation.core.harness;

import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import java.lang.reflect.Method;

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
            int maxAllowed = getMaxAllowed(context);
            QueryCountInspector.clear();

            if (count > maxAllowed) {
                throw new AssertionError(String.format(
                    "JPA Performance Guardrail violation: Expected maximum %d queries, but executed %d queries! " +
                    "Potential N+1 query problem or unoptimized query loop detected.", 
                    maxAllowed, count
                ));
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
