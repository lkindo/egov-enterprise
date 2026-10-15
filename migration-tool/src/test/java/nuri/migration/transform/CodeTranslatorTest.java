package nuri.migration.transform;

import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * codemap 적용 규칙(2026-10-13 DEC-OPS-309).
 *
 * <p>코드 매핑이 틀리면 예외가 아니라 표준 코드 컬럼의 조용한 오염으로 끝난다. 그래서 미매핑은 기본 실패,
 * 통과·대체값은 명시할 때만, 숫자 원천값은 표기를 정규화해 찾는다는 경계를 하나씩 고정한다.
 */
class CodeTranslatorTest {

    private static final CodeMap YN = CodeMap.of(Map.of("1", "Y", "0", "N"));

    @Test
    void mappedCodeIsReplacedAndNullStaysNull() {
        assertThat(CodeTranslator.map(YN, "1")).isEqualTo("Y");
        assertThat(CodeTranslator.map(YN, "0")).isEqualTo("N");
        assertThat(CodeTranslator.map(YN, null)).isNull();
    }

    @Test
    void unmappedCodeFailsByDefaultWithoutEchoingTheCode() {
        assertThatThrownBy(() -> CodeTranslator.map(YN, "LEGACY-SECRET-CODE"))
                .isInstanceOf(CodeTranslator.UnmappedCodeException.class)
                .hasNoCause()
                .hasMessage("codemap has no mapping for the source code")
                .hasMessageNotContaining("LEGACY-SECRET-CODE");
    }

    @Test
    void passthroughAndFallbackApplyOnlyWhenDeclared() {
        CodeMap passthrough = new CodeMap(Map.of("1", "Y"), UnmappedPolicy.PASSTHROUGH, null);
        CodeMap fallback = new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FALLBACK, "Z");

        assertThat(CodeTranslator.map(passthrough, "1")).isEqualTo("Y");
        assertThat(CodeTranslator.map(passthrough, "7")).isEqualTo("7");
        assertThat(CodeTranslator.map(fallback, "1")).isEqualTo("Y");
        assertThat(CodeTranslator.map(fallback, "7")).isEqualTo("Z");
        assertThat(CodeTranslator.map(fallback, null)).as("NULL 은 코드가 아니므로 fallback 으로 바꾸지 않는다").isNull();
    }

    /** 옛 평면 형식의 default 는 NULL 도 바꿨다. 그 의미는 nullAs: fallback 으로 밝힐 때만 쓴다. */
    @Test
    void nullBecomesTheFallbackOnlyWithNullAsFallbackIndependentlyOfTheUnmappedPolicy() {
        CodeMap nullOnly = new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FAIL, "N", NullPolicy.FALLBACK);
        CodeMap both = new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FALLBACK, "Z", NullPolicy.FALLBACK);

        assertThat(CodeTranslator.map(nullOnly, null)).isEqualTo("N");
        assertThat(CodeTranslator.map(nullOnly, "1")).isEqualTo("Y");
        assertThatThrownBy(() -> CodeTranslator.map(nullOnly, "9"))
                .as("nullAs 는 미매핑 정책을 바꾸지 않는다")
                .isInstanceOf(CodeTranslator.UnmappedCodeException.class);
        assertThat(CodeTranslator.map(both, null)).isEqualTo("Z");
        assertThat(CodeTranslator.map(both, "9")).isEqualTo("Z");
        assertThat(CodeTranslator.map(new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FALLBACK, "Z", NullPolicy.KEEP), null))
                .isNull();
    }

    @Test
    void legacyCodeNamedDefaultIsAnOrdinaryCodeNotAFallbackKey() {
        CodeMap codemap = CodeMap.of(Map.of("default", "D", "1", "Y"));

        assertThat(CodeTranslator.map(codemap, "default")).isEqualTo("D");
        assertThatThrownBy(() -> CodeTranslator.map(codemap, "9"))
                .isInstanceOf(CodeTranslator.UnmappedCodeException.class);
    }

    @Test
    void numericSourceValuesAreNormalisedBeforeLookupButTextIsNot() {
        assertThat(CodeTranslator.map(YN, new BigDecimal("1.0"))).isEqualTo("Y");
        assertThat(CodeTranslator.map(YN, new BigDecimal("1.000"))).isEqualTo("Y");
        assertThat(CodeTranslator.map(YN, new BigDecimal("0.00"))).isEqualTo("N");
        assertThat(CodeTranslator.map(YN, 1)).isEqualTo("Y");
        assertThat(CodeTranslator.map(YN, 0L)).isEqualTo("N");
        assertThat(CodeTranslator.map(YN, BigInteger.ONE)).isEqualTo("Y");
        assertThat(CodeTranslator.map(YN, 1.0d)).isEqualTo("Y");
        assertThat(CodeTranslator.map(YN, 0.0f)).isEqualTo("N");
        // 문자열 원천은 그대로 찾는다 — "01" 과 "1" 은 다른 문자 코드이고, "1.0" 이라는 텍스트도 코드 "1" 이 아니다.
        assertThatThrownBy(() -> CodeTranslator.map(YN, "1.0")).isInstanceOf(CodeTranslator.UnmappedCodeException.class);
        assertThatThrownBy(() -> CodeTranslator.map(YN, "01")).isInstanceOf(CodeTranslator.UnmappedCodeException.class);
    }

    @Test
    void lookupKeyIsThePlainCanonicalNumber() {
        assertThat(CodeTranslator.lookupKey(new BigDecimal("10"))).isEqualTo("10");
        assertThat(CodeTranslator.lookupKey(new BigDecimal("1E+1"))).isEqualTo("10");
        assertThat(CodeTranslator.lookupKey(new BigDecimal("-2.50"))).isEqualTo("-2.5");
        assertThat(CodeTranslator.lookupKey(new BigDecimal("0E-9"))).isEqualTo("0");
        assertThat(CodeTranslator.lookupKey(2.5f)).isEqualTo("2.5");
        assertThat(CodeTranslator.lookupKey(1.0e20d)).isEqualTo("100000000000000000000");
        assertThat(CodeTranslator.lookupKey(Boolean.TRUE)).isEqualTo("true");
        assertThat(CodeTranslator.lookupKey(" A ")).isEqualTo(" A ");
    }

    @Test
    void passthroughWritesTheNormalisedNumberNotTheOriginalScale() {
        CodeMap passthrough = new CodeMap(Map.of("1", "Y"), UnmappedPolicy.PASSTHROUGH, null);

        assertThat(CodeTranslator.map(passthrough, new BigDecimal("2.0"))).isEqualTo("2");
    }

    @Test
    void binaryAndNonFiniteValuesCannotBecomeCodes() {
        assertThatThrownBy(() -> CodeTranslator.map(YN, new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("codemap cannot consume binary data");
        for (Object nonFinite : new Object[] {Double.NaN, Double.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY}) {
            assertThatThrownBy(() -> CodeTranslator.map(YN, nonFinite))
                    .as(String.valueOf(nonFinite))
                    .isInstanceOf(IllegalArgumentException.class)
                    .isNotInstanceOf(CodeTranslator.UnmappedCodeException.class)
                    .hasMessage("codemap cannot consume a non-finite number");
        }
    }

    @Test
    void definitionProblemsAreFixedMessagesSharedWithTheValidator() {
        assertThat(CodeTranslator.definitionProblem(null)).isEqualTo("정의가 비어 있습니다");
        assertThat(CodeTranslator.definitionProblem(new CodeMap(Map.of(), UnmappedPolicy.PASSTHROUGH, null)))
                .isEqualTo("values 에 대응이 하나도 없습니다");
        assertThat(CodeTranslator.definitionProblem(new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FALLBACK, null)))
                .isEqualTo("unmapped: fallback 에는 fallback 값이 필요합니다");
        assertThat(CodeTranslator.definitionProblem(new CodeMap(Map.of("1", "Y"), UnmappedPolicy.PASSTHROUGH, "Z")))
                .isEqualTo("fallback 값은 unmapped: fallback 이나 nullAs: fallback 일 때만 쓸 수 있습니다");
        assertThat(CodeTranslator.definitionProblem(new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FAIL, "Z")))
                .isEqualTo("fallback 값은 unmapped: fallback 이나 nullAs: fallback 일 때만 쓸 수 있습니다");
        assertThat(CodeTranslator.definitionProblem(
                new CodeMap(Map.of("1", "Y"), UnmappedPolicy.PASSTHROUGH, null, NullPolicy.FALLBACK)))
                .isEqualTo("nullAs: fallback 에는 fallback 값이 필요합니다");
        assertThat(CodeTranslator.definitionProblem(
                new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FALLBACK, null, NullPolicy.FALLBACK)))
                .isEqualTo("unmapped: fallback 에는 fallback 값이 필요합니다");
        assertThat(CodeTranslator.definitionProblem(
                new CodeMap(Map.of("1", "Y"), UnmappedPolicy.PASSTHROUGH, "Z", NullPolicy.FALLBACK))).isNull();
        assertThat(CodeTranslator.definitionProblem(
                new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FAIL, "Z", NullPolicy.FALLBACK))).isNull();
        assertThat(CodeTranslator.definitionProblem(new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FALLBACK, "Z"))).isNull();
        assertThat(CodeTranslator.definitionProblem(new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FALLBACK, ""))).isNull();
        assertThat(CodeTranslator.definitionProblem(YN)).isNull();
    }

    @Test
    void invalidDefinitionFailsClosedEvenForNullAndMappedValues() {
        CodeMap broken = new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FALLBACK, null);

        for (Object value : new Object[] {null, "1", "9"}) {
            assertThatThrownBy(() -> CodeTranslator.map(broken, value))
                    .as(String.valueOf(value))
                    .isInstanceOf(IllegalArgumentException.class)
                    .isNotInstanceOf(CodeTranslator.UnmappedCodeException.class)
                    .hasMessage("codemap definition is invalid");
        }
        assertThatThrownBy(() -> CodeTranslator.map(null, "1"))
                .hasMessage("codemap definition is invalid");
    }

    @Test
    void codemapRecordDefaultsToFailAndRejectsNullEntries() {
        CodeMap implicit = new CodeMap(Map.of("1", "Y"), null, null);
        assertThat(implicit.unmapped()).isEqualTo(UnmappedPolicy.FAIL);
        assertThat(new CodeMap(null, null, null).values()).isEmpty();
        Map<String, String> withNull = new HashMap<>();
        withNull.put("1", null);
        assertThatThrownBy(() -> new CodeMap(withNull, UnmappedPolicy.FAIL, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> implicit.values().put("2", "N"))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThat(UnmappedPolicy.parse(" Passthrough ")).isEqualTo(UnmappedPolicy.PASSTHROUGH);
        assertThat(UnmappedPolicy.FALLBACK.externalName()).isEqualTo("fallback");
        assertThat(implicit.nullAs()).isEqualTo(NullPolicy.KEEP);
        assertThat(new CodeMap(Map.of("1", "Y"), null, null, null).nullAs()).isEqualTo(NullPolicy.KEEP);
        assertThat(NullPolicy.parse(" Fallback ")).isEqualTo(NullPolicy.FALLBACK);
        assertThat(NullPolicy.KEEP.externalName()).isEqualTo("keep");
        assertThatThrownBy(() -> NullPolicy.parse(" ")).isInstanceOf(IllegalArgumentException.class);
    }

    /** 숫자 원천값은 정규형으로 찾으므로 정규형이 아닌 숫자 모양 키는 숫자 열에서 닿지 않는다 — 검증 경고의 근거다. */
    @Test
    void nonCanonicalNumericCodesAreReportedByPositionOnly() {
        LinkedHashMap<String, String> values = new LinkedHashMap<>();
        for (String code : List.of("1", "1.0", "01", "-3", "2.5", "+1", "-0", "yes", "1E+1", "0", "10", "1.50", "Y")) {
            values.put(code, "S");
        }

        assertThat(CodeTranslator.nonCanonicalNumericCodes(CodeMap.of(values))).containsExactly(2, 3, 6, 7, 12);
        assertThat(CodeTranslator.nonCanonicalNumericCodes(CodeMap.of(Map.of("1", "Y", "0", "N")))).isEmpty();
        // 정규형 키는 같은 숫자 원천값과 실제로 만난다.
        assertThat(CodeTranslator.map(CodeMap.of(values), new BigDecimal("2.50"))).isEqualTo("S");
    }

    /** [ADR-0029 L4 D2·D7] translate 는 map 과 같은 판정이고 결과 종류와 맞은 키를 함께 준다. 종류가 대사 증거의 근거다. */
    @Test
    void translateReportsTheKindOfEachResult() {
        CodeMap codemap = new CodeMap(Map.of("1", "A01"), UnmappedPolicy.PASSTHROUGH, "Z", NullPolicy.FALLBACK);
        CodeMap fallback = new CodeMap(Map.of("1", "A01"), UnmappedPolicy.FALLBACK, "Z", NullPolicy.KEEP);

        assertThat(CodeTranslator.translate(codemap, new BigDecimal("1.0")))
                .isEqualTo(new CodeTranslator.Translation("A01", CodeTranslator.Translation.Kind.MAPPED, "1"));
        assertThat(CodeTranslator.translate(codemap, "7"))
                .isEqualTo(new CodeTranslator.Translation("7", CodeTranslator.Translation.Kind.PASSTHROUGH, null));
        assertThat(CodeTranslator.translate(codemap, null))
                .isEqualTo(new CodeTranslator.Translation("Z", CodeTranslator.Translation.Kind.NULL_FALLBACK, null));
        assertThat(CodeTranslator.translate(fallback, "7"))
                .isEqualTo(new CodeTranslator.Translation("Z", CodeTranslator.Translation.Kind.FALLBACK, null));
        assertThat(CodeTranslator.translate(fallback, null))
                .isEqualTo(new CodeTranslator.Translation(null, CodeTranslator.Translation.Kind.NULL_KEPT, null));
        assertThat(CodeTranslator.translate(codemap, "LEGACY-SECRET").toString())
                .isEqualTo("Translation[PASSTHROUGH]");
        assertThatThrownBy(() -> CodeTranslator.translate(YN, "9"))
                .isInstanceOf(CodeTranslator.UnmappedCodeException.class);
        assertThatThrownBy(() -> CodeTranslator.translate(new CodeMap(Map.of(), UnmappedPolicy.FAIL, null), "1"))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("codemap definition is invalid");
    }

    @Test
    void mapIsTheValueOfTranslate() {
        CodeMap codemap = new CodeMap(Map.of("1", "A01", "2", "A02"), UnmappedPolicy.FALLBACK, "Z",
                NullPolicy.FALLBACK);
        for (Object raw : new Object[]{"1", 2, new BigDecimal("2.00"), "9", null}) {
            assertThat(CodeTranslator.map(codemap, raw)).isEqualTo(CodeTranslator.translate(codemap, raw).value());
        }
    }
}
