package nuri.migration.verify;

import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.transform.CodeTranslator;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.transform.TypeConverter;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * [ADR-0029 L4 D2] 표본 재계산 — 실행기와 같은 순서(transform → codemap → type)로 원값을 다시 변환한다.
 *
 * <p>같은 함수를 다시 쓰므로 함수 자체의 결함은 잡지 못한다(그건 원천 집계가 맡는다). 키와 값의 짝, 배관 오류를 잡는다.
 * 실패는 값을 담지 않는 {@link ReplayFailure} 다. 표본에는 nullify·fkRef·암호화·조회·LOB 컬럼이 들어오지 않는다
 * ({@link ColumnClassifier}).
 */
public final class ColumnReplay {

    private final TransformerRegistry transformers;
    private final Map<String, CodeMap> codemaps;

    public ColumnReplay(TransformerRegistry transformers, Map<String, CodeMap> codemaps) {
        this.transformers = Objects.requireNonNull(transformers, "transformers");
        this.codemaps = codemaps == null ? Map.of() : Map.copyOf(codemaps);
    }

    /** 원값 {@code raw} 를 이 컬럼의 대상 값으로 다시 변환한다. 상수 컬럼은 상수다. */
    public Object expected(Column column, Object raw) {
        Objects.requireNonNull(column, "column");
        if (column.kind() == Column.Kind.CONSTANT) {
            return column.constant();
        }
        try {
            Object value = transformers.apply(column.transform(), raw);
            if (column.codemap() != null && !column.codemap().isBlank()) {
                CodeMap codemap = codemaps.get(column.codemap());
                if (codemap == null) {
                    throw new ReplayFailure();
                }
                value = CodeTranslator.map(codemap, value);
            }
            return TypeConverter.convert(column.type(), value);
        } catch (ReplayFailure failure) {
            throw failure;
        } catch (RuntimeException failure) {
            throw new ReplayFailure();
        }
    }

    /** codemap 의 키 순서(위치 계산용). 정의가 없으면 빈 목록이다. */
    public List<String> codemapKeys(String name) {
        CodeMap codemap = name == null ? null : codemaps.get(name);
        return codemap == null ? List.of() : List.copyOf(codemap.values().keySet());
    }

    @Override
    public String toString() {
        return "ColumnReplay";
    }

    /** 재계산 방법. 상수 값은 mapping 선언이지만 {@code toString} 으로 내지 않는다. */
    public record Column(Kind kind, String constant, String transform, String codemap, String type) {

        public enum Kind { CONSTANT, SOURCE }

        public Column {
            Objects.requireNonNull(kind, "kind");
        }

        public static Column constant(String value) {
            return new Column(Kind.CONSTANT, value, null, null, null);
        }

        public static Column source(String transform, String codemap, String type) {
            return new Column(Kind.SOURCE, null, transform, codemap, type);
        }

        @Override
        public String toString() {
            return "Column[" + kind + "]";
        }
    }

    /** 재계산 실패. 값·원인을 담지 않는다. */
    public static final class ReplayFailure extends RuntimeException {
        public ReplayFailure() {
            super("SAMPLE_REPLAY_FAILED", null, false, false);
        }
    }
}
