package nuri.migration.transform;

import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.UnmappedPolicy;

import java.math.BigDecimal;

/**
 * 코드값 매핑 적용: 레거시 코드 → 표준 코드.
 *
 * <p>[2026-10-13 DEC-OPS-309] 미매핑 코드는 기본으로 실패한다. 그대로 통과({@code passthrough})와
 * 대체값({@code fallback})은 codemap 이 명시할 때만 쓴다. NULL 은 코드가 아니므로 NULL 그대로 둔다.
 * 숫자 원천값은 표기를 정규화한 뒤 찾는다 — {@code NUMBER(5,1)} 의 {@code 1.0} 과 {@code NUMBER(1)} 의 {@code 1}
 * 은 같은 코드 {@code "1"} 이다. 문자열 원천값은 그대로 찾는다({@code "01"} 과 {@code "1"} 은 다른 코드다).
 * 실패 예외는 값을 담지 않는 고정 문구다.
 *
 * <p>종전 이름은 {@code CodeMapper} 였다. 루트 PIT 설정이 보일러플레이트로 보고 {@code **.*Mapper} 를
 * 뮤테이션에서 빼므로, 이 fail-closed 경계를 migration-transform-converter 범위에 넣으려고 이름을 바꿨다.
 */
public final class CodeTranslator {

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
        if (codemap.unmapped() != UnmappedPolicy.FALLBACK && codemap.fallback() != null) {
            return "fallback 값은 unmapped: fallback 일 때만 쓸 수 있습니다";
        }
        return null;
    }

    /** 원천 값을 표준 코드로 바꾼다. 미매핑이고 정책이 fail 이면 {@link UnmappedCodeException}. */
    public static String map(CodeMap codemap, Object sourceValue) {
        if (definitionProblem(codemap) != null) {
            throw new IllegalArgumentException("codemap definition is invalid");
        }
        if (sourceValue == null) {
            return null;
        }
        String code = lookupKey(sourceValue);
        String mapped = codemap.values().get(code);
        if (mapped != null) {
            return mapped;
        }
        return switch (codemap.unmapped()) {
            case PASSTHROUGH -> code;
            case FALLBACK -> codemap.fallback();
            case FAIL -> throw new UnmappedCodeException();
        };
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
