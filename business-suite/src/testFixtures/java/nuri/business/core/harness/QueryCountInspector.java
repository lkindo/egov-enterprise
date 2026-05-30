package nuri.business.core.harness;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * ThreadLocal 기반으로 쿼리 실행 횟수 및 SQL 원문을 관리하는 인스펙터 (테스트용 피스처)
 */
public class QueryCountInspector {

    private static final ThreadLocal<QueryCounter> queryCounter = new ThreadLocal<>();

    public static void start() {
        queryCounter.set(new QueryCounter());
    }

    public static void increment(String sql) {
        QueryCounter counter = queryCounter.get();
        if (counter != null) {
            counter.increment(sql);
        }
    }

    public static int getCount() {
        QueryCounter counter = queryCounter.get();
        return counter != null ? counter.getCount() : 0;
    }

    public static List<String> getQueries() {
        QueryCounter counter = queryCounter.get();
        return counter != null ? counter.getQueries() : Collections.emptyList();
    }

    public static void clear() {
        queryCounter.remove();
    }

    public static class QueryCounter {
        private final List<String> queries = Collections.synchronizedList(new ArrayList<>());

        public void increment(String sql) {
            queries.add(sql);
        }

        public int getCount() {
            return queries.size();
        }

        public List<String> getQueries() {
            return new ArrayList<>(queries);
        }
    }
}
