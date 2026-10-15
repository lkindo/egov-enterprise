package nuri.migration.transform;

import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.UnmappedPolicy;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 코드값 매핑 적용: 레거시 코드 → 표준 코드.
 *
 * <p>[2026-10-13 DEC-OPS-309] 미매핑 코드는 기본으로 실패한다. 그대로 통과({@code passthrough})와
 * 대체값({@code fallback})은 codemap 이 명시할 때만 쓴다. NULL 은 코드가 아니므로 NULL 그대로 둔다 —
 * NULL 도 대체값으로 바꾸려면 codemap 이 {@code nullAs: fallback} 으로 밝힌다(옛 {@code default} 의 의미).
 * 숫자 원천값은 표기를 정규화한 뒤 찾는다 — {@code NUMBER(5,1)} 의 {@code 1.0} 과 {@code NUMBER(1)} 의 {@code 1}
 * 은 같은 코드 {@code "1"} 이다. 문자열 원천값은 그대로 찾는다({@code "01"} 과 {@code "1"} 은 다른 코드다).
 * 실패 예외는 값을 담지 않는 고정 문구다.
 *
 * <p>종전 이름은 {@code CodeMapper} 였다. 루트 PIT 설정이 보일러플레이트로 보고 {@code **.*Mapper} 를
 * 뮤테이션에서 빼므로, 이 fail-closed 경계를 migration-transform-converter 범위에 넣으려고 이름을 바꿨다.
 */
public final class CodeTranslator {

    /** 숫자처럼 보이는 코드. 지수 표기는 넣지 않는다(정규화가 큰 문자열을 만들 수 있다). */
    private static final Pattern NUMERIC_CODE = Pattern.compile("[+-]?\\d{1,40}(\\.\\d{1,40})?");

    private CodeTranslator() {
    }

    /**
     * codemap 정의 자체의 결함을 고정 문구로 돌려준다. 결함이 없으면 {@code null}.
     * 검증기(MappingValidator)와 실행기({@link #map})가 같은 판정을 쓴다.
     */
    public static String definitionProblem(CodeMap codemap) {
        if (codemap == null) {
            return "정의가 비어 있습니다";
        }
        if (codemap.values().isEmpty()) {
            return "values 에 대응이 하나도 없습니다";
        }
        if (codemap.unmapped() == UnmappedPolicy.FALLBACK && codemap.fallback() == null) {
            return "unmapped: fallback 에는 fallback 값이 필요합니다";
        }
        if (codemap.nullAs() == NullPolicy.FALLBACK && codemap.fallback() == null) {
            return "nullAs: fallback 에는 fallback 값이 필요합니다";
        }
        if (codemap.unmapped() != UnmappedPolicy.FALLBACK && codemap.nullAs() != NullPolicy.FALLBACK
                && codemap.fallback() != null) {
            return "fallback 값은 unmapped: fallback 이나 nullAs: fallback 일 때만 쓸 수 있습니다";
        }
        return null;
    }

    /**
     * 숫자처럼 보이지만 정규형이 아닌 코드(키)의 위치 — {@code values} 선언 순서로 1부터 센다.
     *
     * <p>숫자 원천값은 정규형({@code 1.0}·{@code 01} → {@code "1"})으로 찾으므로 이런 키는 숫자 열에서 닿지 않는다.
     * 문자열 열의 {@code "01"} 은 정상 코드라서 오류가 아니라 검증 경고의 근거로만 쓴다. 키 값은 돌려주지 않는다.
     */
    public static List<Integer> nonCanonicalNumericCodes(CodeMap codemap) {
        List<Integer> positions = new ArrayList<>();
        int position = 0;
        for (String code : codemap.values().keySet()) {
            position++;
            if (NUMERIC_CODE.matcher(code).matches() && !canonical(new BigDecimal(code)).equals(code)) {
                positions.add(position);
            }
        }
        return positions;
    }

    /**
     * 원천 값을 표준 코드로 바꾼다. 미매핑이고 정책이 fail 이면 {@link UnmappedCodeException}.
     * NULL 은 {@code nullAs: fallback} 일 때만 대체값이 되고, 아니면 NULL 이다.
     */
    public static String map(CodeMap codemap, Object sourceValue) {
        return translate(codemap, sourceValue).value();
    }

    /**
     * [ADR-0029 L4 D2·D7] {@link #map} 과 같은 판정·예외로 결과와 그 종류를 함께 돌려준다. 대사가 codemap 결과 분포와
     * 종류(대응·통과·대체·NULL 대체)를 세는 데 쓴다. 맞은 키는 표 위치를 셀 때만 쓰고 증거에는 위치만 싣는다.
     */
    public static Translation translate(CodeMap codemap, Object sourceValue) {
        if (definitionProblem(codemap) != null) {
            throw new IllegalArgumentException("codemap definition is invalid");
        }
        if (sourceValue == null) {
            return codemap.nullAs() == NullPolicy.FALLBACK
                    ? new Translation(codemap.fallback(), Translation.Kind.NULL_FALLBACK, null)
                    : new Translation(null, Translation.Kind.NULL_KEPT, null);
        }
        String code = lookupKey(sourceValue);
        String mapped = codemap.values().get(code);
        if (mapped != null) {
            return new Translation(mapped, Translation.Kind.MAPPED, code);
        }
        return switch (codemap.unmapped()) {
            case PASSTHROUGH -> new Translation(code, Translation.Kind.PASSTHROUGH, null);
            case FALLBACK -> new Translation(codemap.fallback(), Translation.Kind.FALLBACK, null);
            case FAIL -> throw new UnmappedCodeException();
        };
    }

    /**
     * codemap 한 번 적용의 결과(ADR-0029 L4). {@code matchedKey} 는 {@link Kind#MAPPED} 일 때 {@code values} 에서 맞은
     * 키다. 값을 담으므로 직렬화하지 않고, {@code toString} 은 종류만 보인다.
     */
    public record Translation(String value, Kind kind, String matchedKey) {

        /** 결과의 종류. 대체는 미매핑 코드의 대체, NULL 대체는 {@code nullAs: fallback} 이다. */
        public enum Kind { MAPPED, PASSTHROUGH, FALLBACK, NULL_FALLBACK, NULL_KEPT }

        @Override
        public String toString() {
            return "Translation[" + kind + "]";
        }
    }

    /** 대조에 쓰는 코드 표기. 숫자는 정규화하고, 이진 값은 코드가 될 수 없다. */
    static String lookupKey(Object value) {
        if (value instanceof byte[]) {
            throw new IllegalArgumentException("codemap cannot consume binary data");
        }
        if (value instanceof BigDecimal decimal) {
            return canonical(decimal);
        }
        if (value instanceof Double || value instanceof Float) {
            if (!Double.isFinite(((Number) value).doubleValue())) {
                throw new IllegalArgumentException("codemap cannot consume a non-finite number");
            }
            return canonical(new BigDecimal(value.toString()));
        }
        // 정수 타입(Integer·Long·BigInteger 등)의 toString 은 이미 정규형이다.
        return value.toString();
    }

    private static String canonical(BigDecimal decimal) {
        return decimal.stripTrailingZeros().toPlainString();
    }

    /** 미매핑 코드. 코드값을 담지 않는다. */
    public static final class UnmappedCodeException extends IllegalArgumentException {
        private UnmappedCodeException() {
            super("codemap has no mapping for the source code");
        }
    }
}
