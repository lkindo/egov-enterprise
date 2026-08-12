package nuri.business.core.harness;

/**
 * {@code ThreadLocalCopyTaskDecorator}의 선택적 테스트 하네스 계약을 검증하는 최소 스텁.
 */
public final class QueryCountInspector {

    private static final ThreadLocal<QueryCounter> COUNTER = new ThreadLocal<>();

    private QueryCountInspector() {
    }

    public static QueryCounter getCounterObject() {
        return COUNTER.get();
    }

    public static void setCounterObject(QueryCounter counter) {
        COUNTER.set(counter);
    }

    public static void clear() {
        COUNTER.remove();
    }

    public static final class QueryCounter {
    }
}
