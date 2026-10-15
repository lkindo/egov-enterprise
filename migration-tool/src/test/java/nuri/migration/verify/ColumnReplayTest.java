package nuri.migration.verify;

import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.ColumnReplay.Column;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [ADR-0029 L4 D2] 표본 재계산 — 실행기와 같은 순서(transform → codemap → type)로 원값을 다시 변환한다.
 */
@DisplayName("표본 재계산")
class ColumnReplayTest {

    private static final CodeMap STATUS = new CodeMap(orderedMap("1", "A01", "2", "A02"), UnmappedPolicy.FAIL, "Z",
            NullPolicy.FALLBACK);
    private final ColumnReplay replay = new ColumnReplay(new TransformerRegistry(), Map.of("status", STATUS));

    @Test
    @DisplayName("직접 복사·내장 변환기·표준 도메인 변환기·type 을 실행기와 같이 적용한다")
    void appliesTransformAndType() {
        assertThat(replay.expected(Column.source(null, null, null), "  x ")).isEqualTo("  x ");
        assertThat(replay.expected(Column.source("trim", null, null), "  x ")).isEqualTo("x");
        assertThat(replay.expected(Column.source("ymd8", null, null), "2024-01-31")).isEqualTo("20240131");
        assertThat(replay.expected(Column.source(null, null, "date"), "20240131")).isEqualTo(LocalDate.of(2024, 1, 31));
        assertThat(replay.expected(Column.source(null, null, "decimal"), "1.50")).isEqualTo(new BigDecimal("1.50"));
    }

    @Test
    @DisplayName("codemap 은 type 앞에 적용하고 NULL 대체도 실행기와 같다")
    void appliesCodemapBeforeType() {
        assertThat(replay.expected(Column.source("trim", "status", null), " 1 ")).isEqualTo("A01");
        assertThat(replay.expected(Column.source(null, "status", null), null)).isEqualTo("Z");
        assertThat(replay.expected(Column.source(null, "status", "string"), 2)).isEqualTo("A02");
    }

    @Test
    @DisplayName("상수 컬럼은 원값과 관계없이 상수다")
    void constantIsTheConstant() {
        assertThat(replay.expected(Column.constant("SYSTEM"), "anything")).isEqualTo("SYSTEM");
        assertThat(Column.constant("SYSTEM").toString()).doesNotContain("SYSTEM");
    }

    @Test
    @DisplayName("변환 실패·미매핑 코드·없는 codemap 은 값 없는 재계산 실패다")
    void failuresAreValueFree() {
        assertThatThrownBy(() -> replay.expected(Column.source("ymd8", null, null), "20240230"))
                .isInstanceOf(ColumnReplay.ReplayFailure.class).hasMessage("SAMPLE_REPLAY_FAILED").hasNoCause();
        assertThatThrownBy(() -> replay.expected(Column.source(null, "status", null), "LEGACY-SECRET"))
                .isInstanceOf(ColumnReplay.ReplayFailure.class).hasMessageNotContaining("LEGACY-SECRET");
        assertThatThrownBy(() -> replay.expected(Column.source(null, "missing", null), "1"))
                .isInstanceOf(ColumnReplay.ReplayFailure.class);
        assertThatThrownBy(() -> replay.expected(Column.source(null, null, "int"), "1.5"))
                .isInstanceOf(ColumnReplay.ReplayFailure.class);
    }

    @Test
    @DisplayName("codemap 키 순서를 위치 계산에 내준다")
    void codemapKeysKeepDeclarationOrder() {
        assertThat(replay.codemapKeys("status")).containsExactly("1", "2");
        assertThat(replay.codemapKeys("missing")).isEmpty();
        assertThat(replay.codemapKeys(null)).isEmpty();
    }

    private static Map<String, String> orderedMap(String... pairs) {
        Map<String, String> map = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            map.put(pairs[i], pairs[i + 1]);
        }
        return map;
    }
}
