package nuri.foundation.core.harness;

/**
 * ThreadLocal 기반으로 쿼리 실행 횟수를 관리하는 인스펙터 (테스트용 피스처)
 */
public class QueryCountInspector {

    private static final ThreadLocal<QueryCounter> queryCounter = new ThreadLocal<>();

    public static void start() {
        queryCounter.set(new QueryCounter());
    }

    public static void increment() {
        QueryCounter counter = queryCounter.get();
        if (counter != null) {
            counter.increment();
        }
    }

    public static int getCount() {
        QueryCounter counter = queryCounter.get();
        return counter != null ? counter.getCount() : 0;
    }

    public static void clear() {
        queryCounter.remove();
    }

    public static class QueryCounter {
        private int count = 0;

        public void increment() {
            count++;
        }

        public int getCount() {
            return count;
        }
    }
}
