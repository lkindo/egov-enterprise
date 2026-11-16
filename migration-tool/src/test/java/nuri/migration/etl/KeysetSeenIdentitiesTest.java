package nuri.migration.etl;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * keyset 적재의 표 전체 중복 판정(2026-11-16). 판정은 힙 집합에서 실행 전용 디스크 색인으로 옮겼고, 판정 결과는 같아야 한다.
 */
class KeysetSeenIdentitiesTest {

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    @Test
    @DisplayName("같은 값은 두 번째부터 거절하고, source identity 와 order identity 는 서로 다른 집합이다")
    void detectsRepeatsPerSetAndClosesTheIndex() {
        KeysetSeenIdentities seen = new KeysetSeenIdentities();
        try (seen) {
            assertThat(seen.firstSourceKey("A")).isTrue();
            assertThat(seen.firstSourceKey("a")).as("정확한 일치만 같다").isTrue();
            assertThat(seen.firstSourceKey("A")).isFalse();
            assertThat(seen.firstOrderDigest("A")).as("다른 집합").isTrue();
            assertThat(seen.firstOrderDigest("A")).isFalse();
        }
        assertThatThrownBy(() -> seen.firstSourceKey("B")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("정렬 키는 다르지만 source identity 가 같은 두 행은 멈춘다 — 첫 쪽과 다음 쪽에 나뉘어 있어도 잡는다")
    void duplicateSourceIdentityAcrossPagesStopsTheLoad() {
        Fixture fixture = fixture();
        // 한 쪽은 500행이다(EtlExecutor.CHUNK). 1행과 마지막 행이 같은 source identity 라 서로 다른 쪽에 있다 — 쪽마다 집합을 새로
        //   만드는 판정은 이 중복을 놓친다.
        insertRows(fixture.source(), ROWS, id -> id == ROWS ? "R1" : "R" + id);

        var results = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry())
                .execute(fixture.mapping(), MigrationMode.DRY_RUN, fixture.source(), fixture.target());

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.written()).isZero();
            assertThat(result.errors()).containsExactly("이관 실패(LEGACY_DUP): SQL_EXECUTION_FAILED");
        });
    }

    @Test
    @DisplayName("대조: source identity 가 모두 다르면 같은 매핑이 여러 쪽을 끝까지 읽는다")
    void distinctSourceIdentitiesLoadThrough() {
        Fixture fixture = fixture();
        insertRows(fixture.source(), ROWS, id -> "R" + id);

        var results = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry())
                .execute(fixture.mapping(), MigrationMode.DRY_RUN, fixture.source(), fixture.target());

        assertThat(results).singleElement().satisfies(result -> {
            assertThat(result.read()).isEqualTo(ROWS);
            assertThat(result.errors()).isEmpty();
        });
    }

    /** 두 쪽에 걸치는 행 수. */
    private static final int ROWS = 600;

    private static void insertRows(JdbcTemplate source, int rows, java.util.function.IntFunction<String> rowId) {
        List<Object[]> values = new java.util.ArrayList<>(rows);
        for (int id = 1; id <= rows; id++) {
            values.add(new Object[]{id, rowId.apply(id), "nm" + id});
        }
        source.batchUpdate("INSERT INTO LEGACY_DUP VALUES (?, ?, ?)", values);
    }

    private static Fixture fixture() {
        int sequence = SEQUENCE.incrementAndGet();
        DbConfig sourceConfig = h2Config("seen_identity_source_" + sequence);
        DbConfig targetConfig = h2Config("seen_identity_target_" + sequence);
        JdbcTemplate source = new JdbcTemplate(new DriverManagerDataSource(
                sourceConfig.url(), sourceConfig.username(), sourceConfig.password()));
        JdbcTemplate target = new JdbcTemplate(new DriverManagerDataSource(
                targetConfig.url(), targetConfig.username(), targetConfig.password()));
        source.execute("CREATE TABLE LEGACY_DUP (ID bigint, ROW_ID varchar(20), NM varchar(20))");
        target.execute("CREATE TABLE tb_dup (item_id varchar(40) PRIMARY KEY, nm varchar(20))");
        // source identity 가 정렬 키와 갈리는 것은 형식 있는 identity 선언뿐이다 — 옛 idStrategy 는 정렬 키 값이 곧 source identity 다.
        TableMapping table = new TableMapping("LEGACY_DUP", "tb_dup", null, null, List.of("ID"), null,
                List.of(new ColumnMapping("NM", "nm", null, null, null, null, null)), null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(new IdentityComponentSpec("ROW_ID", IdentityValueType.TEXT)),
                        List.of(new IdentityComponentSpec("item_id", IdentityValueType.TEXT))),
                List.of());
        MappingSpec mapping = new MappingSpec(sourceConfig, targetConfig, List.of(table), Map.of(),
                new MappingSpec.RunContext("seen-identities-" + sequence, "synthetic-duplicate-source"));
        return new Fixture(source, target, mapping);
    }

    private static DbConfig h2Config(String name) {
        return new DbConfig("jdbc:h2:mem:" + name + ";DB_CLOSE_DELAY=-1", "sa", "", "org.h2.Driver");
    }

    private record Fixture(JdbcTemplate source, JdbcTemplate target, MappingSpec mapping) {}
}
