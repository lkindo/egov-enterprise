package nuri.migration.lookup;

import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * 조회 조인(ADR-0029 L3d)의 짝 판정. 실행기가 주 표의 한 chunk 에서 키를 모아 같은 읽기 세션에서 조회 표를 읽으면, 이
 * 클래스가 행마다 짝을 정한다. DB 를 읽지 않는다.
 *
 * <p>키는 계열(문자·수)과 정규화한 글자로 비교한다. 문자는 그대로(공백을 깎지 않는다), 수는 {@link BigDecimal} 로 바꿔
 * 뒤 0 을 지운 표기다 — 주 표의 {@code BIGINT} 10 과 조회 표의 {@code NUMERIC} 10.0 은 같은 키다. 빈 문자열도 키다 —
 * 짝은 DB 가 정한다(Oracle 은 '' 를 NULL 로 저장해 읽으면 NULL 이다). 그 밖의 값(실수·날짜·이진)은 키로 쓰지 않는다
 * ({@link Failure#KEY_TYPE}).</p>
 *
 * <ul>
 *   <li>DB 의 비교 의미(대소문자를 무시하는 collation, 뒤 공백을 무시하는 비교)가 이 비교와 다르면 키가 있는 행은 모두
 *       {@link Failure#KEY_MISMATCH} 로 멈춘다. 두 경로로 안다 — DB 가 돌려준 조회 행의 키가 요청한 키와 정규화해 같지
 *       않거나, 정확히 같은 글자의 짝이 없는 키({@link #unmatchedBindValues})를 다시 물었을 때 DB 가 행을 돌려준다.
 *       둘째 경로가 없으면 판정이 chunk 구성에 따라 갈린다 — 'abc' 행만 있는 조회 표를 'abc'·'ABC' 가 함께 든 chunk 로
 *       물으면 첫 문장은 'abc' 행 하나만 돌려준다.</li>
 *   <li>같은 키의 조회 행이 둘 이상이면 {@link Failure#FANOUT}.</li>
 *   <li>짝이 없거나 키가 NULL 이면 {@code exactly_one} 은 {@link Failure#MISSING}, {@code at_most_one} 은 조회 컬럼을
 *       모두 NULL 로 둔 {@link Outcome#missed()} 다(상한은 {@link LookupMisses}).</li>
 * </ul>
 *
 * <p>결과 값의 키는 {@link LookupRef#rowKey()}({@code alias.column}, 소문자)다. 오류는 고정 코드뿐이고 값을 담지 않는다.</p>
 */
public final class LookupResolver {

    /**
     * 조회 한 문장의 키 수 상한. 주 표의 chunk(500행)보다 작지 않고, Oracle IN 목록 상한(1,000)과 SQL Server 파라미터
     * 상한(2,100)보다 작다.
     */
    public static final int MAX_KEYS_PER_QUERY = 500;

    private LookupResolver() {
    }

    /** 조회가 행을 멈추는 사유. 실행기는 {@code LOOKUP_} 을 붙여 행 변환 실패 코드로 쓴다. */
    public enum Failure { FANOUT, MISSING, KEY_TYPE, KEY_MISMATCH }

    /** 정규화한 조회 키. 계열이 다르면 글자가 같아도 다른 키다. */
    public record Key(boolean numeric, String text) {}

    /**
     * 한 행의 조회 결과. {@code failure} 가 있으면 그 행을 멈추고, {@code missed} 면 짝이 없어 조회 컬럼을 NULL 로 뒀다.
     * {@code values} 는 행에 넣을 조회 컬럼 값이다(멈춘 행은 비어 있다).
     */
    public record Outcome(Failure failure, boolean missed, Map<String, Object> values) {
        public Outcome {
            values = values == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(values));
        }
    }

    /** 한 chunk 의 조회 요청 — 행마다 정규화한 키(NULL 이면 null)와 키 계열 오류, 바인딩할 서로 다른 키의 첫 원값. */
    public record Request(List<Key> rowKeys, List<Boolean> rowTypeFailures, List<Object> bindValues, Set<Key> keys) {
        public Request {
            rowKeys = Collections.unmodifiableList(new ArrayList<>(rowKeys));
            rowTypeFailures = List.copyOf(rowTypeFailures);
            bindValues = Collections.unmodifiableList(new ArrayList<>(bindValues));
            keys = Collections.unmodifiableSet(new LinkedHashSet<>(keys));
        }

        /** 한 문장에 {@link #MAX_KEYS_PER_QUERY} 개까지 바인딩하도록 나눈다. 키가 없으면 빈 목록이다. */
        public List<List<Object>> batches() {
            return LookupResolver.batches(bindValues);
        }
    }

    /** 바인딩할 키를 한 문장에 {@link #MAX_KEYS_PER_QUERY} 개까지 나눈다. 키가 없으면 빈 목록이다. */
    public static List<List<Object>> batches(List<Object> bindValues) {
        Objects.requireNonNull(bindValues, "bindValues");
        List<List<Object>> batches = new ArrayList<>();
        for (int start = 0; start < bindValues.size(); start += MAX_KEYS_PER_QUERY) {
            batches.add(bindValues.subList(start, Math.min(bindValues.size(), start + MAX_KEYS_PER_QUERY)));
        }
        return batches;
    }

    /** 키 값을 정규화한다. NULL 이면 null, 키로 쓸 수 없는 값이면 {@link IllegalArgumentException}. */
    public static Key key(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof CharSequence || value instanceof Character) {
            return new Key(false, value.toString());
        }
        BigDecimal number;
        if (value instanceof BigDecimal decimal) {
            number = decimal;
        } else if (value instanceof BigInteger integer) {
            number = new BigDecimal(integer);
        } else if (value instanceof Long || value instanceof Integer || value instanceof Short
                || value instanceof Byte) {
            number = BigDecimal.valueOf(((Number) value).longValue());
        } else {
            throw new IllegalArgumentException("lookup key type");
        }
        return new Key(true, number.signum() == 0 ? "0" : number.stripTrailingZeros().toPlainString());
    }

    /** 주 표 행마다의 키 값(행 순서)으로 조회 요청을 만든다. 같은 키는 한 번만 바인딩한다. */
    public static Request request(List<Object> keyValues) {
        Objects.requireNonNull(keyValues, "keyValues");
        List<Key> rowKeys = new ArrayList<>(keyValues.size());
        List<Boolean> typeFailures = new ArrayList<>(keyValues.size());
        Map<Key, Object> first = new LinkedHashMap<>();
        for (Object value : keyValues) {
            Key key;
            try {
                key = key(value);
            } catch (IllegalArgumentException unsupported) {
                rowKeys.add(null);
                typeFailures.add(true);
                continue;
            }
            rowKeys.add(key);
            typeFailures.add(false);
            if (key != null) {
                first.putIfAbsent(key, value);
            }
        }
        return new Request(rowKeys, typeFailures, new ArrayList<>(first.values()), first.keySet());
    }

    /**
     * 정확히 같은 글자의 조회 행이 없는 요청 키의 바인딩 원값(요청 순서). 실행기는 이 키들을 같은 읽기 세션에서 DB 에 다시
     * 물어, DB 의 비교 의미로도 짝이 없는지 확인한다 — 행이 하나라도 돌아오면 {@link #match} 의
     * {@code unmatchedFoundByDatabase} 다. 돌려받은 조회 행에 이미 요청하지 않은 키가 있으면 키가 있는 행이 모두 멈추므로
     * 다시 물을 키가 없다(빈 목록).
     */
    public static List<Object> unmatchedBindValues(Request request, String keyColumn,
                                                   List<Map<String, Object>> fetched) {
        Objects.requireNonNull(request, "request");
        Groups groups = group(request, keyColumn, fetched);
        if (groups.mismatch()) {
            return List.of();
        }
        List<Object> unmatched = new ArrayList<>();
        int index = 0;
        for (Key key : request.keys()) {
            if (!groups.rows().containsKey(key)) {
                unmatched.add(request.bindValues().get(index));
            }
            index++;
        }
        return unmatched;
    }

    /**
     * 조회 행으로 행마다 짝을 정한다.
     *
     * @param lookup  조회 선언(별칭·짝의 수)
     * @param request {@link #request} 의 결과
     * @param keyColumn 조회 행에서 키를 담은 컬럼(소문자 라벨)
     * @param columns 행에 넣을 조회 컬럼(소문자 라벨, 선언 순서)
     * @param fetched DB 가 돌려준 조회 행(키 IN 조건으로 읽은 행)
     * @param unmatchedFoundByDatabase {@link #unmatchedBindValues} 를 다시 물었을 때 DB 가 행을 돌려줬는가 — 그렇다면
     *                                 DB 의 비교 의미가 이 비교와 달라 키가 있는 행을 모두 멈춘다
     */
    public static List<Outcome> match(Lookup lookup, Request request, String keyColumn, List<String> columns,
                                      List<Map<String, Object>> fetched, boolean unmatchedFoundByDatabase) {
        Objects.requireNonNull(lookup, "lookup");
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(columns, "columns");
        Objects.requireNonNull(lookup.cardinality(), "lookup cardinality");
        Groups grouped = group(request, keyColumn, fetched);
        Map<Key, List<Map<String, Object>>> groups = grouped.rows();
        boolean mismatch = grouped.mismatch() || unmatchedFoundByDatabase;
        Map<String, Object> missedValues = new LinkedHashMap<>();
        for (String column : columns) {
            missedValues.put(new LookupRef(lookup.alias(), column).rowKey(), null);
        }
        boolean exactlyOne = lookup.cardinality() == LookupCardinality.EXACTLY_ONE;
        List<Outcome> outcomes = new ArrayList<>(request.rowKeys().size());
        for (int index = 0; index < request.rowKeys().size(); index++) {
            Key key = request.rowKeys().get(index);
            if (request.rowTypeFailures().get(index)) {
                outcomes.add(failed(Failure.KEY_TYPE));
            } else if (key == null) {
                outcomes.add(exactlyOne ? failed(Failure.MISSING) : new Outcome(null, true, missedValues));
            } else if (mismatch) {
                outcomes.add(failed(Failure.KEY_MISMATCH));
            } else {
                List<Map<String, Object>> group = groups.getOrDefault(key, List.of());
                if (group.size() > 1) {
                    outcomes.add(failed(Failure.FANOUT));
                } else if (group.isEmpty()) {
                    outcomes.add(exactlyOne ? failed(Failure.MISSING) : new Outcome(null, true, missedValues));
                } else {
                    Map<String, Object> values = new LinkedHashMap<>();
                    Map<String, Object> row = group.getFirst();
                    for (String column : columns) {
                        values.put(new LookupRef(lookup.alias(), column).rowKey(),
                                row.get(column.toLowerCase(Locale.ROOT)));
                    }
                    outcomes.add(new Outcome(null, false, values));
                }
            }
        }
        return outcomes;
    }

    /** 돌려받은 조회 행을 요청한 키별로 묶은 결과와, 요청하지 않은 키(또는 키로 쓸 수 없는 값)의 행이 있었는지. */
    private record Groups(Map<Key, List<Map<String, Object>>> rows, boolean mismatch) {}

    private static Groups group(Request request, String keyColumn, List<Map<String, Object>> fetched) {
        Objects.requireNonNull(keyColumn, "keyColumn");
        Objects.requireNonNull(fetched, "fetched");
        Map<Key, List<Map<String, Object>>> groups = new HashMap<>();
        boolean mismatch = false;
        for (Map<String, Object> row : fetched) {
            Key key;
            try {
                key = key(row.get(keyColumn));
            } catch (IllegalArgumentException unsupported) {
                key = null;
            }
            if (key == null || !request.keys().contains(key)) {
                mismatch = true;
                continue;
            }
            groups.computeIfAbsent(key, ignored -> new ArrayList<>(1)).add(row);
        }
        return new Groups(groups, mismatch);
    }

    private static Outcome failed(Failure failure) {
        return new Outcome(failure, false, Map.of());
    }
}
