package nuri.migration.validate;

import nuri.migration.domain.DomainViolation;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.LookupKey;
import nuri.migration.model.MappingSpec.Nullify;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

/**
 * 매핑 선언(mapping.yml) <b>사전 검증</b> 테스트.
 *
 * <p>[2026-08-09 신설] 이 클래스에는 <b>테스트가 하나도 없었다</b>.
 *
 * <p>이 검증기는 <b>이관이 실행되기 전</b>에 매핑 선언의 오류를 잡는 자리다.
 * 여기서 놓친 오류는 실행 중에 예외로 드러나지 않고 <b>잘못 이관된 데이터</b>로 남는다 —
 * 그래서 검증기 자신이 검증돼야 한다.
 *
 * <p>특히 {@code fkRef} 검사는 소스 코드가 스스로 경고를 적어 두었다:
 * <i>"fkRef 부모 소스 테이블이 매핑에 없음 — <b>모든 자식 행이 고아가 됩니다</b>"</i>.
 * 부모 PK 가 재채번되는데 부모 테이블이 매핑에 없으면 자식의 FK 는 번역될 대상이 없다.
 *
 * <p>errors 와 warnings 의 <b>구분 자체가 검증 대상</b>이다 —
 * errors 는 이관을 막고 warnings 는 막지 않는다. 한 항목이 잘못된 쪽에 들어가면
 * 막아야 할 것이 통과하거나, 통과해도 될 것이 막힌다.
 */
@DisplayName("매핑 선언 검증 테스트")
class MappingValidatorTest {

    /** 모든 단위 시나리오가 타깃 표준 대조를 실제로 거치도록 하는 검증기. */
    private static MappingValidator withSchema() {
        try {
            java.net.URL url = MappingValidatorTest.class.getClassLoader().getResource("db-columns-fixture.json");
            if (url == null) {
                throw new IllegalStateException("테스트 schema catalog 없음");
            }
            return new MappingValidator(new TransformerRegistry(), Path.of(url.toURI()).toString());
        } catch (URISyntaxException e) {
            throw new IllegalStateException(e);
        }
    }

    private static MappingSpec spec(List<TableMapping> tables) {
        return new MappingSpec(null, null, tables, Map.of());
    }

    private static MappingSpec spec(List<TableMapping> tables, Map<String, MappingSpec.CodeMap> codemaps) {
        return new MappingSpec(null, null, tables, codemaps);
    }

    /**
     * 표준 catalog 자체는 모든 테스트에서 필수이므로 업무 경고만 반환한다.
     */
    private static List<String> warningsExceptSchemaNotice(ValidationResult r) {
        return r.warnings();
    }

    private static ColumnMapping col(String source, String target) {
        return new ColumnMapping(source, target, null, null, null, null, null);
    }

    @Test
    @DisplayName("YAML의 null 테이블 항목은 해당 위치의 검증 오류로 거절한다")
    void nullTableEntryFromYamlIsValidationError() {
        MappingSpec mapping = new MappingLoader(ignored -> null).loadContent("""
                tables:
                  - source: legacy_user
                    target: tb_user_info
                    columns:
                      - { source: user_id, target: user_id }
                  - null
                """);

        ValidationResult result = withSchema().validate(mapping);

        assertThat(result.ok()).isFalse();
        assertThat(result.errors()).containsExactly("tables[1]: 테이블 매핑 항목은 null일 수 없습니다");
        assertThat(result.warnings()).isEmpty();
    }

    @Test
    @DisplayName("두 컬럼 항목이 같은 타깃 컬럼을 채우면 앞 값이 조용히 빠지므로 거절한다(ADR-0029 L3a-2)")
    void twoColumnEntriesWritingTheSameTargetAreRejected() {
        MappingSpec mapping = new MappingLoader(ignored -> null).loadContent("""
                tables:
                  - source: legacy_user
                    target: tb_user_info
                    columns:
                      - { source: user_id, target: user_id }
                      - { source: user_nm, target: user_nm }
                      - { source: alias_nm, target: USER_NM }
                      - { target: user_nm, const: 무명 }
                """);

        ValidationResult result = withSchema().validate(mapping);

        assertThat(result.errors()).filteredOn(error -> error.contains("타깃 컬럼을 두")).containsExactly(
                "tb_user_info: 같은 타깃 컬럼을 두 컬럼 항목이 채웁니다: USER_NM",
                "tb_user_info: 같은 타깃 컬럼을 두 컬럼 항목이 채웁니다: user_nm");
    }

    @Test
    @DisplayName("YAML의 null 컬럼 항목은 해당 위치의 검증 오류로 거절한다")
    void nullColumnEntryFromYamlIsValidationError() {
        MappingSpec mapping = new MappingLoader(ignored -> null).loadContent("""
                tables:
                  - source: legacy_user
                    target: tb_user_info
                    columns:
                      - { source: user_id, target: user_id }
                      - null
                """);

        ValidationResult result = withSchema().validate(mapping);

        assertThat(result.ok()).isFalse();
        assertThat(result.errors()).containsExactly("tables[0].columns[1]: 컬럼 매핑 항목은 null일 수 없습니다");
        assertThat(result.warnings()).isEmpty();
    }

    private static JdbcTemplate orderingMetadataJdbc() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        given(dataSource.getConnection()).willReturn(connection);
        given(connection.getMetaData()).willReturn(metadata);
        given(connection.getCatalog()).willReturn("fixture_catalog");
        given(connection.getSchema()).willReturn("fixture_schema");
        given(metadata.getColumns(any(), any(), any(), any())).willAnswer(ignored -> {
            ResultSet rows = mock(ResultSet.class);
            AtomicInteger cursor = new AtomicInteger(-1);
            AtomicBoolean closed = new AtomicBoolean();
            given(rows.next()).willAnswer(invocation -> {
                if (closed.get()) throw new SQLException("Metadata result set is closed");
                if (cursor.get() < 2) cursor.incrementAndGet();
                return cursor.get() < 2;
            });
            given(rows.getString(anyString())).willAnswer(invocation -> {
                if (closed.get()) throw new SQLException("Metadata result set is closed");
                if (cursor.get() < 0 || cursor.get() >= 2) {
                    throw new SQLException("Metadata result set has no current row");
                }
                return switch (invocation.getArgument(0, String.class)) {
                    case "TABLE_CAT" -> "fixture_catalog";
                    case "TABLE_SCHEM" -> "fixture_schema";
                    case "TABLE_NAME" -> "legacy_user";
                    case "COLUMN_NAME" -> cursor.get() == 0 ? "id" : "tenant_id";
                    case "TYPE_NAME" -> "BIGINT";
                    default -> throw new SQLException("Unsupported metadata string column");
                };
            });
            given(rows.getInt(anyString())).willAnswer(invocation -> {
                if (closed.get()) throw new SQLException("Metadata result set is closed");
                if (cursor.get() < 0 || cursor.get() >= 2) {
                    throw new SQLException("Metadata result set has no current row");
                }
                if (!"DATA_TYPE".equals(invocation.getArgument(0, String.class))) {
                    throw new SQLException("Unsupported metadata integer column");
                }
                return Types.BIGINT;
            });
            given(rows.isClosed()).willAnswer(invocation -> closed.get());
            doAnswer(invocation -> { closed.set(true); return null; }).when(rows).close();
            return rows;
        });
        return new JdbcTemplate(dataSource);
    }

    @Test
    @DisplayName("테이블과 정렬·타깃 키에는 SQL 구문이나 한정 컬럼명을 허용하지 않는다")
    void unsafeTableAndOrderingIdentifiersFailClosed() {
        List<Map.Entry<String, TableMapping>> cases = List.of(
                Map.entry("소스 테이블", new TableMapping(
                        "fixture_schema.legacy_user;SELECT 1", "tb_user_info", null,
                        null, List.of(), null, List.of(), null)),
                Map.entry("타깃 테이블", new TableMapping(
                        "legacy_user", "tb_user_info--comment", null,
                        null, List.of(), null, List.of(), null)),
                Map.entry("orderBy", new TableMapping(
                        "legacy_user", "tb_user_info", null,
                        "id DESC", List.of(), null, List.of(), null)),
                Map.entry("orderByKeys", new TableMapping(
                        "legacy_user", "tb_user_info", null,
                        null, List.of("id", "tenant_id DESC"), null, List.of(), null)),
                Map.entry("targetKey", new TableMapping(
                        "legacy_user", "tb_user_info", null,
                        null, List.of(), "public.user_id", List.of(), null)));

        for (Map.Entry<String, TableMapping> entry : cases) {
            ValidationResult result = withSchema().validate(spec(List.of(entry.getValue())));

            assertThat(result.ok()).as(entry.getKey()).isFalse();
            assertThat(result.errors()).as(entry.getKey()).singleElement().asString()
                    .contains(entry.getKey(), "식별자 오류");
            assertThat(result.warnings()).as(entry.getKey()).isEmpty();
        }
    }

    @Test
    @DisplayName("단일 정렬과 복합 정렬을 각각 선언하면 안전한 한정 테이블명과 함께 허용한다")
    void singleOrCompositeOrderingIsAcceptedWhenDeclaredSeparately() {
        List<TableMapping> cases = List.of(
                new TableMapping("fixture_schema.legacy_user", "public.tb_user_info", null,
                        "id_2", List.of(), "user_id", List.of(), null),
                new TableMapping("fixture_schema.legacy_user", "public.tb_user_info", null,
                        null, List.of("tenant_id", "id_2"), "user_id", List.of(), null));

        for (TableMapping table : cases) {
            ValidationResult result = withSchema().validate(spec(List.of(table)));

            assertThat(result.errors()).as("orderBy=%s, orderByKeys=%s",
                    table.orderBy(), table.orderByKeys()).isEmpty();
            assertThat(result.ok()).isTrue();
            assertThat(result.warnings()).isEmpty();
        }
    }

    @Test
    @DisplayName("실 source의 모든 정렬 컬럼을 대조하고 없는 단일·복합 키는 거절한다")
    void liveSourceRequiresEveryEffectiveOrderingColumn() throws Exception {
        List<Map.Entry<TableMapping, List<String>>> cases = List.of(
                Map.entry(new TableMapping("legacy_user", "tb_user_info", null,
                        "ID", List.of(), null, List.of(), null), List.of()),
                Map.entry(new TableMapping("legacy_user", "tb_user_info", null,
                        null, List.of("TENANT_ID", "ID"), null, List.of(), null), List.of()),
                Map.entry(new TableMapping("legacy_user", "tb_user_info", null,
                        "missing_id", List.of(), null, List.of(), null),
                        List.of("실 source에 없는 order key: legacy_user.missing_id")),
                Map.entry(new TableMapping("legacy_user", "tb_user_info", null,
                        null, List.of("tenant_id", "missing_id"), null, List.of(), null),
                        List.of("실 source에 없는 order key: legacy_user.missing_id")));

        for (Map.Entry<TableMapping, List<String>> entry : cases) {
            ValidationResult result = withSchema().validateLiveSource(
                    spec(List.of(entry.getKey())), orderingMetadataJdbc());

            assertThat(result.errors()).as("effectiveOrderKeys=%s",
                    entry.getKey().effectiveOrderKeys()).containsExactlyElementsOf(entry.getValue());
            assertThat(result.ok()).isEqualTo(entry.getValue().isEmpty());
            assertThat(result.warnings()).isEmpty();
        }
    }

    @Nested
    @DisplayName("이관을 막아야 하는 오류(errors)")
    class BlockingErrors {

        @Test
        @DisplayName("타깃 테이블 미지정은 오류이고, 그 테이블의 컬럼은 더 보지 않는다")
        void missingTargetTableIsErrorAndSkipsColumns() {
            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", null, null,
                            List.of(col("id", null)), null))));

            assertThat(r.ok()).isFalse();
            assertThat(r.errors()).hasSize(1);
            // 타깃이 없으면 컬럼 오류 메시지를 만들 이름 자체가 없다 — continue 를 지우면 여기서 늘어난다.
            assertThat(r.errors().get(0)).contains("타깃 테이블 미지정", "legacy_user");
        }

        @Test
        @DisplayName("타깃 컬럼 미지정은 오류다")
        void missingTargetColumnIsError() {
            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null,
                            List.of(col("id", "  ")), null))));

            assertThat(r.errors()).singleElement().asString().contains("타깃 컬럼 미지정");
        }

        @Test
        @DisplayName("정의되지 않은 코드맵 참조는 오류다")
        void unknownCodemapIsError() {
            ColumnMapping c = new ColumnMapping("stat", "user_stts_cd", null, null, "statusMap", null, null);

            ValidationResult r = withSchema().validate(spec(
                    List.of(new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null)),
                    Map.of()));

            assertThat(r.errors()).singleElement().asString()
                    .contains("정의되지 않은 코드맵", "statusMap");
        }

        @Test
        @DisplayName("정의된 코드맵은 오류가 아니다")
        void declaredCodemapIsAccepted() {
            ColumnMapping c = new ColumnMapping("stat", "user_stts_cd", null, null, "statusMap", null, null);

            ValidationResult r = withSchema().validate(spec(
                    List.of(new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null)),
                    Map.of("statusMap", MappingSpec.CodeMap.of(Map.of("1", "P")))));

            assertThat(r.errors()).isEmpty();
        }

        @Test
        @DisplayName("codemap 정의 결함은 실행기와 같은 판정으로 오류다 — 이름을 밝힌다")
        void codemapDefinitionProblemsAreErrorsNamingTheCodemap() {
            ColumnMapping c = new ColumnMapping("stat", "user_stts_cd", null, null, "statusMap", null, null);
            List<TableMapping> tables = List.of(new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null));
            Map<MappingSpec.CodeMap, String> cases = Map.of(
                    new MappingSpec.CodeMap(Map.of(), MappingSpec.UnmappedPolicy.FAIL, null),
                    "codemap 'statusMap': values 에 대응이 하나도 없습니다",
                    new MappingSpec.CodeMap(Map.of("1", "P"), MappingSpec.UnmappedPolicy.FALLBACK, null),
                    "codemap 'statusMap': unmapped: fallback 에는 fallback 값이 필요합니다",
                    new MappingSpec.CodeMap(Map.of("1", "P"), MappingSpec.UnmappedPolicy.PASSTHROUGH, "X"),
                    "codemap 'statusMap': fallback 값은 unmapped: fallback 이나 nullAs: fallback 일 때만 쓸 수 있습니다",
                    new MappingSpec.CodeMap(Map.of("1", "P"), MappingSpec.UnmappedPolicy.FAIL, null,
                            MappingSpec.NullPolicy.FALLBACK),
                    "codemap 'statusMap': nullAs: fallback 에는 fallback 값이 필요합니다");
            for (Map.Entry<MappingSpec.CodeMap, String> entry : cases.entrySet()) {
                ValidationResult r = withSchema().validate(spec(tables, Map.of("statusMap", entry.getKey())));
                assertThat(r.errors()).containsExactly(entry.getValue());
                assertThat(r.warnings()).isEmpty();
            }
            ValidationResult fallback = withSchema().validate(spec(tables, Map.of("statusMap",
                    new MappingSpec.CodeMap(Map.of("1", "P"), MappingSpec.UnmappedPolicy.FALLBACK, "X"))));
            assertThat(fallback.errors()).isEmpty();
        }

        @Test
        @DisplayName("숫자처럼 보이지만 정규형이 아닌 코드는 경고다 — 위치만 밝히고 코드 값은 싣지 않는다")
        void nonCanonicalNumericCodesAreWarningsNotErrors() {
            ColumnMapping c = new ColumnMapping("stat", "user_stts_cd", null, null, "statusMap", null, null);
            List<TableMapping> tables = List.of(new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null));
            java.util.LinkedHashMap<String, String> values = new java.util.LinkedHashMap<>();
            values.put("1", "P");
            values.put("1.0", "A");
            values.put("Y", "Y");
            values.put("007", "D");

            ValidationResult r = withSchema().validate(spec(tables,
                    Map.of("statusMap", MappingSpec.CodeMap.of(values))));

            assertThat(r.errors()).isEmpty();
            assertThat(r.warnings()).containsExactly("codemap 'statusMap': values 의 2·4번째 코드는 숫자처럼 보이지만"
                    + " 정규형이 아닙니다 — 숫자 원천값은 정규형(1.0·01 → 1)으로 찾으므로 숫자 열에서는 이 코드에 닿지"
                    + " 않습니다. 문자열 열의 코드라면 그대로 두십시오.");
            assertThat(r.warnings().getFirst()).doesNotContain("007");
            ValidationResult canonical = withSchema().validate(spec(tables,
                    Map.of("statusMap", MappingSpec.CodeMap.of(Map.of("1", "P", "-3", "D", "2.5", "H")))));
            assertThat(canonical.warnings()).isEmpty();
        }

        @Test
        @DisplayName("fkRef 부모가 매핑에 없으면 오류다 — 모든 자식 행이 고아가 된다")
        void danglingFkRefIsError() {
            ColumnMapping fk = new ColumnMapping("dept_id", "ognz_id", null, null, null, "legacy_dept", null);

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(fk), null))));

            // 부모 PK 가 재채번되는데 부모 테이블이 매핑에 없으면 자식 FK 를 번역할 대상이 없다.
            assertThat(r.errors()).singleElement().asString()
                    .contains("fkRef", "legacy_dept", "고아");
        }

        @Test
        @DisplayName("fkRef 부모가 매핑에 있으면 오류가 아니다 — 대소문자를 가리지 않는다")
        void fkRefResolvesCaseInsensitively() {
            ColumnMapping fk = new ColumnMapping("dept_id", "ognz_id", null, null, null, "LEGACY_DEPT", null);

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_dept", "tb_ognz_info", null, List.of(),
                            new IdStrategy("ognz_id", "ORG", "id")),
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(fk), null))));

            // 소스 테이블명 수집을 소문자로 정규화하지 않으면 여기서 거짓 오류가 난다.
            assertThat(r.errors()).isEmpty();
        }

        @Test
        @DisplayName("fkRef 부모의 완전한 idStrategy가 없으면 실행 전에 차단한다")
        void fkRefParentRequiresCompleteIdStrategy() {
            ColumnMapping fk = new ColumnMapping("dept_id", "ognz_id", null, null, null, "legacy_dept", null);

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_dept", "tb_ognz_info", null,
                            List.of(col("id", "ognz_id")), null),
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(fk), null))));

            assertThat(r.errors()).anySatisfy(e -> assertThat(e)
                    .contains("fkRef 부모", "idStrategy", "완전하지"));
        }

        @Test
        @DisplayName("같은 소스 테이블을 두 번 매핑하면 결과 identity가 모호하므로 차단한다")
        void duplicateSourceTableMappingIsErrorCaseInsensitively() {
            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null,
                            List.of(col("name", "user_nm")), null),
                    new TableMapping("LEGACY_USER", "tb_ognz_info", null,
                            List.of(col("id", "ognz_id")), null))));

            assertThat(r.errors()).anySatisfy(e -> assertThat(e).contains("중복 소스 테이블", "LEGACY_USER"));
        }

        @Test
        @DisplayName("[ADR-0029 L3c] 한 소스를 id 로 나눈 매핑은 허용하고, 확장 매핑의 자기 소스 fkRef 는 소유 매핑의 키를 쓴다")
        void splitMappingsWithIdsAreAllowedAndTheExtensionUsesTheOwnersKeyMap() {
            TableMapping owner = new TableMapping("legacy_user", "tb_user_info", null, "user_sn", List.of(), null,
                    List.of(col("nm", "user_nm")), new MappingSpec.IdStrategy("esntl_id", "USR", "user_sn"), null,
                    List.of(), null);
            TableMapping extension = new TableMapping("LEGACY_USER", "tb_ognz_info", null, "user_sn", List.of(),
                    "ognz_id", List.of(new ColumnMapping("user_sn", "ognz_id", null, null, null, "legacy_user", null)),
                    null, null, List.of(), "ext");

            assertThat(withSchema().validate(spec(List.of(extension, owner))).errors()).isEmpty();

            TableMapping secondOwner = new TableMapping("legacy_user", "tb_ognz_info", null, "user_sn", List.of(),
                    null, List.of(), new MappingSpec.IdStrategy("ognz_id", "OGN", "user_sn"), null, List.of(), "copy");
            assertThat(withSchema().validate(spec(List.of(owner, secondOwner))).errors()).anySatisfy(e ->
                    assertThat(e).contains("legacy_user", "keymap 을 만드는 매핑", "둘 이상"));

            TableMapping unowned = new TableMapping("legacy_user", "tb_ognz_info", null, "user_sn", List.of(),
                    "ognz_id", List.of(col("user_sn", "ognz_id")), null, null, List.of(), "plain");
            TableMapping child = new TableMapping("legacy_dept", "tb_ognz_info", null, "dept_id", List.of(),
                    "ognz_id", List.of(new ColumnMapping("user_sn", "ognz_id", null, null, null, "legacy_user", null)),
                    null, null, List.of(), null);
            TableMapping plainOwner = new TableMapping("legacy_user", "tb_user_info", null, "user_sn", List.of(),
                    "user_id", List.of(col("user_sn", "user_id")), null, null, List.of(), null);
            assertThat(withSchema().validate(spec(List.of(plainOwner, unowned, child))).errors()).anySatisfy(e ->
                    assertThat(e).contains("fkRef 부모 소스 테이블 'legacy_user'", "keymap 을 만드는 매핑"));
        }

        @Test
        @DisplayName("[ADR-0029 L3c] 형제 매핑을 거치는 의존은 소스 단위로는 순환이어도 매핑 단위로는 순환이 아니다")
        void dependencyThroughASiblingMappingIsNotReportedAsACycle() {
            TableMapping userOwner = new TableMapping("legacy_user", "tb_user_info", null, "user_sn", List.of(), null,
                    List.of(col("nm", "user_nm")), new MappingSpec.IdStrategy("esntl_id", "USR", "user_sn"), null,
                    List.of(), null);
            TableMapping userExt = new TableMapping("legacy_user", "tb_ognz_info", null, "user_sn", List.of(),
                    "ognz_id", List.of(new ColumnMapping("dept_id", "ognz_id", null, null, null, "legacy_dept", null)),
                    null, null, List.of(), "ext");
            TableMapping dept = new TableMapping("legacy_dept", "tb_user_info", null, "dept_id", List.of(), null,
                    List.of(new ColumnMapping("head_sn", "user_id", null, null, null, "legacy_user", null)),
                    new MappingSpec.IdStrategy("esntl_id", "DPT", "dept_id"), null, List.of(), null);

            assertThat(withSchema().validate(spec(List.of(userExt, dept, userOwner))).errors()).isEmpty();

            TableMapping cyclic = new TableMapping("legacy_user", "tb_user_info", null, "user_sn", List.of(), null,
                    List.of(new ColumnMapping("dept_id", "ognz_id", null, null, null, "legacy_dept", null)),
                    new MappingSpec.IdStrategy("esntl_id", "USR", "user_sn"), null, List.of(), null);
            assertThat(withSchema().validate(spec(List.of(cyclic, dept))).errors()).anySatisfy(e ->
                    assertThat(e).contains("교차 테이블 FK 순환", "legacy_user", "legacy_dept"));
        }

        @Test
        @DisplayName("where는 단일 읽기 조건식만 허용하고 주석·추가 SQL을 차단한다")
        void unsafeWhereFragmentIsError() {
            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", "1=1; DELETE FROM legacy_user",
                            List.of(col("nm", "user_nm")), null))));

            assertThat(r.errors()).anySatisfy(e -> assertThat(e).contains("where", "단일 읽기 조건식"));
        }

        @Test
        @DisplayName("단일 orderBy와 복합 orderByKeys의 동시 선언 및 복합키 중복은 차단한다")
        void ambiguousOrDuplicateOrderKeysAreErrors() {
            TableMapping both = new TableMapping("legacy_user", "tb_user_info", null,
                    "id", List.of("tenant_id", "id"), null,
                    List.of(col("name", "user_nm")), null);
            TableMapping duplicate = new TableMapping("legacy_dept", "tb_ognz_info", null,
                    null, List.of("id", "ID"), null,
                    List.of(col("name", "ognz_nm")), null);

            ValidationResult result = withSchema().validate(spec(List.of(both, duplicate)));

            assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                    .contains("orderBy와 orderByKeys", "함께"));
            assertThat(result.errors()).anySatisfy(error -> assertThat(error)
                    .contains("orderByKeys 중복", "ID"));
        }

        @Test
        @DisplayName("서로 다른 테이블의 FK 순환은 결정적 실행 순서가 없으므로 차단한다")
        void crossTableFkCycleIsError() {
            TableMapping a = new TableMapping("legacy_a", "tb_user_info", null, List.of(
                    new ColumnMapping("b_id", "ognz_id", null, null, null, "legacy_b", null)),
                    new IdStrategy("user_id", "A", "a_id"));
            TableMapping b = new TableMapping("legacy_b", "tb_ognz_info", null, List.of(
                    new ColumnMapping("a_id", "upper_ognz_id", null, null, null, "legacy_a", null)),
                    new IdStrategy("ognz_id", "B", "b_id"));

            ValidationResult r = withSchema().validate(spec(List.of(a, b)));

            assertThat(r.errors()).anySatisfy(e -> assertThat(e)
                    .contains("FK 순환", "legacy_a", "legacy_b"));
        }

        @Test
        @DisplayName("자기참조 FK는 교차 테이블 순환과 구분해 2-pass 대상으로 허용한다")
        void selfReferenceIsAllowed() {
            TableMapping self = new TableMapping("legacy_user", "tb_user_info", null, List.of(
                    new ColumnMapping("manager_id", "ognz_id", null, null, null, "legacy_user", null)),
                    new IdStrategy("user_id", "USR", "user_id"));

            ValidationResult r = withSchema().validate(spec(List.of(self)));

            assertThat(r.errors()).noneMatch(e -> e.contains("FK 순환"));
        }
    }

    @Nested
    @DisplayName("값·변환 선언의 strict 검증")
    class StrictValueValidation {

        @Test
        @DisplayName("idStrategy 에 sourceKey 가 없으면 이관을 막는다")
        void idStrategyWithoutSourceKeyIsWarning() {
            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null,
                            List.of(col("id", "esntl_id")),
                            new IdStrategy("esntl_id", "USRCNFRM_", null)))));

            assertThat(r.ok()).isFalse();
            assertThat(r.errors()).singleElement().asString().contains("sourceKey 미지정");
        }

        @Test
        @DisplayName("부분 선언된 idStrategy는 실행 경로에서 무시되지 않도록 차단한다")
        void idStrategyWithoutColumnIsError() {
            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null,
                            List.of(col("id", "esntl_id")),
                            new IdStrategy(null, "USRCNFRM_", null)))));

            assertThat(r.errors()).anySatisfy(e -> assertThat(e).contains("idStrategy.column"));
            assertThat(r.errors()).anySatisfy(e -> assertThat(e).contains("idStrategy.sourceKey"));
        }

        @Test
        @DisplayName("미등록 변환기는 실행 전에 오류로 차단한다")
        void unknownTransformerIsWarning() {
            ColumnMapping c = new ColumnMapping("nm", "user_nm", "nosuchtransform", null, null, null, null);

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(r.errors()).anySatisfy(e -> assertThat(e).contains("미등록 변환기", "nosuchtransform"));
        }

        @Test
        @DisplayName("등록된 변환기는 경고하지 않는다")
        void registeredTransformerIsAccepted() {
            ColumnMapping c = new ColumnMapping("nm", "user_nm", "trim", null, null, null, null);

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(warningsExceptSchemaNotice(r)).isEmpty();
        }

        @Test
        @DisplayName("미지 타입은 원본 통과시키지 않고 오류로 차단한다")
        void unknownTypeIsWarning() {
            ColumnMapping c = new ColumnMapping("cnt", "cnt", null, "nosuchtype", null, null, null);

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(r.errors()).anySatisfy(e -> assertThat(e).contains("미지 타입", "nosuchtype"));
        }

        @Test
        @DisplayName("알려진 타입은 경고하지 않는다")
        void knownTypeIsAccepted() {
            ColumnMapping c = new ColumnMapping("cnt", "cnt", null, "int", null, null, null);

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(warningsExceptSchemaNotice(r)).isEmpty();
        }

        @Test
        @DisplayName("source·const·fkRef 가 모두 없으면 null 쓰기를 허용하지 않고 차단한다")
        void columnWithoutAnyValueSourceIsError() {
            ColumnMapping c = new ColumnMapping(null, "user_nm", null, null, null, null, null);

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(r.errors()).anySatisfy(e -> assertThat(e).contains("source·const 모두 없음"));
        }

        @Test
        @DisplayName("const 만 있어도 값이 정해지므로 경고하지 않는다")
        void constantOnlyColumnIsAccepted() {
            ColumnMapping c = new ColumnMapping(null, "frst_rgtr_id", null, null, null, null, "SYSTEM");

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(warningsExceptSchemaNotice(r)).isEmpty();
        }

        @Test
        @DisplayName("fkRef만 있고 source가 없으면 번역이 실행되지 않으므로 차단한다")
        void fkRefWithoutSourceColumnIsError() {
            ColumnMapping fk = new ColumnMapping(null, "ognz_id", null, null, null, "legacy_dept", null);

            ValidationResult r = withSchema().validate(spec(List.of(
                    new TableMapping("legacy_dept", "tb_ognz_info", null, List.of(),
                            new IdStrategy("ognz_id", "ORG", "id")),
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(fk), null))));

            assertThat(r.errors()).anySatisfy(e -> assertThat(e).contains("fkRef", "source 컬럼"));
        }
    }

    @Nested
    @DisplayName("표준 도메인 변환기와 nullify 선언(ADR-0029 L3a-1)")
    class DomainTransformerLoad {

        private static final String LOCATION = "tb_user_info.user_nm: ";

        private List<String> errors(ColumnMapping column) {
            return withSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(column), null)))).errors();
        }

        private ColumnMapping load(String transform, String type, String codemap, String constant,
                                   List<Nullify> nullify) {
            return new ColumnMapping(constant == null ? "end_ymd" : null, "user_nm", transform, type, codemap, null,
                    constant, null, nullify);
        }

        @Test
        @DisplayName("도메인 변환기는 type·codemap 과 함께 쓸 수 없다 — 변환기가 대상 표기를 정한다")
        void domainTransformerOwnsTheTargetSpelling() {
            assertThat(errors(load("ymd8", null, null, null, List.of()))).isEmpty();
            assertThat(errors(load("ymd8", "date", null, null, List.of()))).containsExactly(LOCATION
                    + "표준 도메인 변환기 'ymd8' 는 type 과 함께 쓸 수 없습니다 — 변환기가 대상 표기를 정합니다");
            ValidationResult withCodemap = withSchema().validate(spec(List.of(new TableMapping("legacy_user",
                    "tb_user_info", null, List.of(load("yn", null, "flags", null, List.of())), null)),
                    Map.of("flags", new MappingSpec.CodeMap(Map.of("1", "Y"), MappingSpec.UnmappedPolicy.FAIL, null))));
            assertThat(withCodemap.errors()).containsExactly(LOCATION
                    + "표준 도메인 변환기 'yn' 는 codemap 과 함께 쓸 수 없습니다 — 변환기가 대상 표기를 정합니다");
            assertThat(errors(load("trim", "date", null, null, List.of())))
                    .as("도메인 변환기가 아니면 종전대로 둔다").isEmpty();
        }

        @Test
        @DisplayName("암호화 컬럼에는 도메인 변환기를 쓸 수 없다 — 암호화할 평문이 바뀐다")
        void encryptedColumnRejectsDomainTransformers(@TempDir Path tmp) throws IOException {
            Path catalog = tmp.resolve("db_columns.json");
            Files.writeString(catalog, "[{\"table_name\":\"tb_user_info\",\"column_name\":\"user_enrrno\"}]",
                    StandardCharsets.UTF_8);
            MappingValidator validator = new MappingValidator(new TransformerRegistry(), catalog.toString());

            ValidationResult domain = validator.validate(spec(List.of(new TableMapping("legacy_user", "tb_user_info",
                    null, List.of(new ColumnMapping("jumin", "user_enrrno", "ymd8", null, null, null, null,
                            "aria-egov-v1")), null))));
            ValidationResult plain = validator.validate(spec(List.of(new TableMapping("legacy_user", "tb_user_info",
                    null, List.of(new ColumnMapping("jumin", "user_enrrno", "trim", null, null, null, null,
                            "aria-egov-v1")), null))));

            assertThat(domain.errors()).containsExactly("tb_user_info.user_enrrno: 표준 도메인 변환기 'ymd8' 는"
                    + " 암호화 컬럼에 쓸 수 없습니다 — 암호화할 평문이 바뀝니다");
            assertThat(plain.errors()).isEmpty();
        }

        @Test
        @DisplayName("nullify 는 그 load 가 실제로 낼 수 있는 위반에만 선언한다")
        void nullifyCodesMustBeProducibleByTheLoad() {
            String notProduced = " 는 이 컬럼의 load 가 내지 않는 위반입니다 — BLANK 는 표준 도메인 변환기나 비문자 type,"
                    + " PLACEHOLDER_DATE 는 날짜 변환기가 냅니다";
            List<Nullify> blank = List.of(new Nullify(DomainViolation.BLANK, 2L));
            List<Nullify> placeholder = List.of(new Nullify(DomainViolation.PLACEHOLDER_DATE, 2L));

            assertThat(errors(load("ymd8", null, null, null, placeholder))).isEmpty();
            assertThat(errors(load("timestamp-text", null, null, null, placeholder))).isEmpty();
            assertThat(errors(load("ymd8", null, null, null, blank))).isEmpty();
            assertThat(errors(load(null, "int", null, null, blank))).as("비문자 type 의 공백").isEmpty();
            assertThat(errors(load("hms6", null, null, null, placeholder)))
                    .containsExactly(LOCATION + "nullify PLACEHOLDER_DATE" + notProduced);
            assertThat(errors(load("ymdhms14", null, null, null, placeholder)))
                    .containsExactly(LOCATION + "nullify PLACEHOLDER_DATE" + notProduced);
            assertThat(errors(load(null, "int", null, null, placeholder)))
                    .containsExactly(LOCATION + "nullify PLACEHOLDER_DATE" + notProduced);
            assertThat(errors(load("trim", null, null, null, blank)))
                    .containsExactly(LOCATION + "nullify BLANK" + notProduced);
            assertThat(errors(load(null, "string", null, null, blank)))
                    .as("문자 type 은 공백을 그대로 쓴다").containsExactly(LOCATION + "nullify BLANK" + notProduced);
            assertThat(errors(load(null, null, null, "SYSTEM", blank)))
                    .as("const 는 변환하지 않는다").containsExactly(LOCATION + "nullify BLANK" + notProduced);
        }

        @Test
        @DisplayName("nullify 선언은 BLANK·PLACEHOLDER_DATE 만, 위반마다 한 번, 1 이상의 상한과 함께 둔다")
        void nullifyDeclarationsAreBoundedAndUnique() {
            assertThat(errors(load("ymd8", null, null, null, List.of(new Nullify(DomainViolation.FORMAT, 2L)))))
                    .containsExactly(LOCATION + "nullify 는 BLANK·PLACEHOLDER_DATE 위반에만 선언할 수 있습니다");
            assertThat(errors(load("ymd8", null, null, null,
                    List.of(new Nullify(DomainViolation.PLACEHOLDER_DATE, 0L)))))
                    .containsExactly(LOCATION + "nullify maxRows 는 1 이상이어야 합니다");
            assertThat(errors(load("ymd8", null, null, null,
                    List.of(new Nullify(DomainViolation.PLACEHOLDER_DATE, null)))))
                    .containsExactly(LOCATION + "nullify maxRows 는 1 이상이어야 합니다");
            assertThat(errors(load("ymd8", null, null, null, List.of(new Nullify(DomainViolation.BLANK, 1L),
                    new Nullify(DomainViolation.BLANK, 5L)))))
                    .containsExactly(LOCATION + "nullify 에 같은 위반을 두 번 선언할 수 없습니다");
            assertThat(errors(load("ymd8", null, null, null, List.of(new Nullify(null, 0L)))))
                    .as("위반이 없으면 나머지 판정 없이 그 항목만 알린다")
                    .containsExactly(LOCATION + "nullify 항목에는 violation 이 필요합니다");
        }
    }

    @Nested
    @DisplayName("승인 행 격리 선언(ADR-0029 L3b)")
    class IsolateDeclaration {

        private static final String NOT_ON = "에는 isolate 를 둘 수 없습니다";
        private static final MappingSpec.Isolate APPROVED = new MappingSpec.Isolate("U4", 3L, List.of("INVALID_DATE"));
        private static final IdStrategy USER_ID = new IdStrategy("esntl_id", "USR_", "USER_SN");

        private List<String> errors(TableMapping... tables) {
            return withSchema().validate(spec(List.of(tables))).errors();
        }

        private ColumnMapping isolated(MappingSpec.Isolate isolate) {
            return new ColumnMapping("END_YMD", "user_nm", "ymd8", null, null, null, null, null, List.of(), isolate);
        }

        private TableMapping users(String orderBy, List<String> orderByKeys, ColumnMapping... columns) {
            return new TableMapping("legacy_user", "tb_user_info", null, orderBy, orderByKeys, null, List.of(columns),
                    USER_ID, null, List.of());
        }

        @Test
        @DisplayName("isolate 가 있는 표는 모드와 무관하게 순서 키가 필요하다")
        void anIsolatedTableNeedsAnOrderKey() {
            assertThat(errors(users(null, List.of(), isolated(APPROVED)))).containsExactly(
                    "legacy_user: isolate 가 있는 표에는 orderBy·orderByKeys 가 필요합니다 — 순서 없이 읽으면 격리 행의"
                            + " 순번이 정해지지 않습니다");
            assertThat(errors(users("USER_SN", List.of(), isolated(APPROVED)))).isEmpty();
            assertThat(errors(users(null, List.of("USER_SN"), isolated(APPROVED)))).isEmpty();
            assertThat(errors(users(null, List.of(), isolated(null)))).as("선언이 없으면 종전대로").isEmpty();
        }

        @Test
        @DisplayName("[ADR-0029 L4 D2, P3] 키를 그대로 쓰는 표의 isolate 는 참조 선언이나 '참조 없음' 확인이 필요하다")
        void aPreservedKeyTableThatIsolatesNeedsAVerifyDeclaration() {
            TableMapping preserved = new TableMapping("legacy_user", "tb_user_info", null, "USER_SN", List.of(),
                    "esntl_id", List.of(isolated(APPROVED)), null, null, List.of());
            TableMapping confirmed = new TableMapping("legacy_user", "tb_user_info", null, "USER_SN", List.of(),
                    "esntl_id", List.of(isolated(APPROVED)), null, null, List.of(), null, List.of(),
                    new MappingSpec.VerifyDeclaration(List.of(), "none", "이 키를 복사하는 표가 없다"));

            assertThat(errors(preserved)).containsExactly("legacy_user: isolate 가 있고 키를 그대로 쓰는 표는 이 표를"
                    + " 가리키는 verify.references 나 verify.referencedBy: none 과 사유가 필요합니다 — 격리한 행을 가리키는"
                    + " 자식을 찾게 합니다(VERIFY_REFERENCES_REQUIRED)");
            assertThat(errors(confirmed)).isEmpty();
        }

        @Test
        @DisplayName("다른 매핑이 부모로 참조하거나 자기참조·target_generated 인 표에는 둘 수 없다")
        void parentSelfReferencingAndTargetGeneratedTablesCannotIsolate() {
            TableMapping child = new TableMapping("legacy_ognz", "tb_ognz_info", null, "OGNZ_SN", null, List.of(
                    new ColumnMapping("OWNER_SN", "ognz_id", null, null, null, "LEGACY_USER", null)), null);
            TableMapping selfReferencing = users("USER_SN", List.of(), isolated(APPROVED),
                    new ColumnMapping("UP_SN", "ognz_id", null, null, null, "legacy_user", null));
            TableMapping generated = new TableMapping("legacy_user", "tb_user_info", null, "USER_SN", List.of(), null,
                    List.of(isolated(APPROVED)), null, new MappingSpec.IdentityStrategy(
                    nuri.migration.identity.TargetIdentityPolicy.TARGET_GENERATED,
                    List.of(new MappingSpec.IdentityComponentSpec("USER_SN",
                            nuri.migration.identity.IdentityValueType.SIGNED_INTEGER)),
                    List.of(new MappingSpec.IdentityComponentSpec("esntl_id",
                            nuri.migration.identity.IdentityValueType.TEXT))), List.of());

            assertThat(errors(users("USER_SN", List.of(), isolated(APPROVED)), child))
                    .containsExactly("legacy_user: 다른 매핑이 부모로 참조하는 매핑" + NOT_ON);
            assertThat(errors(selfReferencing)).containsExactly("legacy_user: 자기참조 매핑" + NOT_ON);
            assertThat(errors(generated)).containsExactly("legacy_user: target_generated 매핑" + NOT_ON);
            assertThat(errors(users("USER_SN", List.of(), isolated(APPROVED), new ColumnMapping("OWNER_SN", "ognz_id",
                    null, null, null, "legacy_ognz", null)), new TableMapping("legacy_ognz", "tb_ognz_info", null,
                    "OGNZ_SN", null, List.of(), new IdStrategy("ognz_id", "OGNZ_", "OGNZ_SN"))))
                    .as("부모를 참조하는 자식은 격리할 수 있다 — 막는 것은 부모다").isEmpty();
        }

        @Test
        @DisplayName("[ADR-0029 L3c] 한 소스를 나눈 매핑에는 어느 매핑에도 isolate 를 둘 수 없다")
        void aSourceSplitIntoSeveralMappingsCannotIsolate() {
            TableMapping extension = new TableMapping("LEGACY_USER", "tb_ognz_info", null, "USER_SN", List.of(),
                    "ognz_id", List.of(new ColumnMapping("OGNZ_CD", "ognz_id", null, null, null, null, null)),
                    null, null, List.of(), "ext");
            TableMapping isolatedExtension = new TableMapping("legacy_user", "tb_ognz_info", null, "USER_SN",
                    List.of(), "ognz_id", List.of(new ColumnMapping("END_YMD", "ognz_id", "ymd8", null, null, null,
                    null, null, List.of(), APPROVED)), null, null, List.of(), "ext");

            assertThat(errors(users("USER_SN", List.of(), isolated(APPROVED)), extension))
                    .as("keymap 을 만드는 소유 매핑에도").containsExactly("legacy_user: 분할한 소스의 매핑" + NOT_ON);
            assertThat(errors(users("USER_SN", List.of(), isolated(null)), isolatedExtension))
                    .as("id 로 나눈 확장 매핑에도")
                    .containsExactly("legacy_user#ext: 분할한 소스의 매핑" + NOT_ON);
            assertThat(errors(users("USER_SN", List.of(), isolated(APPROVED)))).as("나누지 않은 소스는 격리할 수 있다")
                    .isEmpty();
        }

        @Test
        @DisplayName("암호화·fkRef·값을 변환하지 않는 컬럼에는 둘 수 없다")
        void encryptedForeignKeyAndConstantColumnsCannotIsolate(@TempDir Path tmp) throws IOException {
            Path catalog = tmp.resolve("db_columns.json");
            Files.writeString(catalog, "[{\"table_name\":\"tb_user_info\",\"column_name\":\"user_enrrno\"},"
                    + "{\"table_name\":\"tb_user_info\",\"column_name\":\"ognz_id\"},"
                    + "{\"table_name\":\"tb_user_info\",\"column_name\":\"esntl_id\"},"
                    + "{\"table_name\":\"tb_user_info\",\"column_name\":\"frst_rgtr_id\"},"
                    + "{\"table_name\":\"tb_ognz_info\",\"column_name\":\"ognz_id\"}]", StandardCharsets.UTF_8);
            MappingValidator validator = new MappingValidator(new TransformerRegistry(), catalog.toString());
            TableMapping parent = new TableMapping("legacy_ognz", "tb_ognz_info", null, "OGNZ_SN", null, List.of(),
                    new IdStrategy("ognz_id", "OGNZ_", "OGNZ_SN"));
            TableMapping users = users("USER_SN", List.of(),
                    new ColumnMapping("JUMIN", "user_enrrno", null, null, null, null, null, "aria-egov-v1", List.of(),
                            new MappingSpec.Isolate("U6", 3L, List.of("BLANK"))),
                    new ColumnMapping("DEPT_CD", "ognz_id", "trim", null, null, "legacy_ognz", null, null, List.of(),
                            new MappingSpec.Isolate("U5", 3L, List.of("FORMAT"))),
                    new ColumnMapping(null, "frst_rgtr_id", null, null, null, null, "MIGRATION", null, List.of(),
                            new MappingSpec.Isolate("U8", 3L, List.of("LENGTH_EXCEEDED"))));

            assertThat(validator.validate(spec(List.of(users, parent))).errors()).containsExactly(
                    "tb_user_info.user_enrrno: 암호화 컬럼" + NOT_ON,
                    "tb_user_info.ognz_id: fkRef 컬럼" + NOT_ON,
                    "tb_user_info.frst_rgtr_id: 값을 변환하지 않는 컬럼(const·source 없음)" + NOT_ON);
        }

        @Test
        @DisplayName("선언은 원장 행 ID·1~1000 상한·격리할 수 있는 코드를 한 번씩, nullify 가 덮지 않는 위반만 담는다")
        void declarationsAreBoundedIsolatableAndNotCoveredByNullify() {
            String location = "tb_user_info.user_nm: ";
            String codes = "isolate 의 위반은 격리할 수 있는 코드(INVALID_DATE·PLACEHOLDER_DATE·TIME_PRESENT·FORMAT·BLANK·"
                    + "CODEMAP_UNMAPPED·LENGTH_EXCEEDED·PRECISION_EXCEEDED·REQUIRED_MISSING)를 한 번씩 둡니다";

            assertThat(errors(users("USER_SN", List.of(), isolated(new MappingSpec.Isolate("U 4", 3L,
                    List.of("FORMAT")))))).containsExactly(location
                    + "isolate.ledgerEntry 는 원장 행 ID 형식(영문·숫자·_.- 64자 이내)이어야 합니다");
            assertThat(errors(users("USER_SN", List.of(), isolated(new MappingSpec.Isolate(null, 3L,
                    List.of("FORMAT")))))).containsExactly(location
                    + "isolate.ledgerEntry 는 원장 행 ID 형식(영문·숫자·_.- 64자 이내)이어야 합니다");
            for (Long cap : java.util.Arrays.asList(0L, 1001L, null)) {
                assertThat(errors(users("USER_SN", List.of(), isolated(new MappingSpec.Isolate("U4", cap,
                        List.of("FORMAT")))))).as(String.valueOf(cap))
                        .containsExactly(location + "isolate maxRows 는 1~1000 이어야 합니다");
            }
            assertThat(errors(users("USER_SN", List.of(), isolated(new MappingSpec.Isolate("U4", 1000L,
                    List.of("FORMAT")))))).isEmpty();
            assertThat(errors(users("USER_SN", List.of(), isolated(new MappingSpec.Isolate("U4", 3L, List.of())))))
                    .containsExactly(location + "isolate 에는 격리할 위반(violations)이 필요합니다");
            for (List<String> invalid : List.of(List.of("NOT_ALLOWED"), List.of("UNSUPPORTED_VALUE_TYPE"),
                    List.of("format"), List.of("FORMAT", "FORMAT"))) {
                assertThat(errors(users("USER_SN", List.of(), isolated(new MappingSpec.Isolate("U4", 3L, invalid)))))
                        .as(invalid.toString()).containsExactly(location + codes);
            }
            ColumnMapping covered = new ColumnMapping("END_YMD", "user_nm", "ymd8", null, null, null, null, null,
                    List.of(new Nullify(DomainViolation.PLACEHOLDER_DATE, 5L)),
                    new MappingSpec.Isolate("U4", 3L, List.of("INVALID_DATE", "PLACEHOLDER_DATE")));
            assertThat(errors(users("USER_SN", List.of(), covered))).containsExactly(location
                    + "nullify 로 NULL 이 되는 위반(PLACEHOLDER_DATE)은 격리하지 않습니다 — 그 행은 실패하지 않습니다");
        }

        @Test
        @DisplayName("한 원장 행은 한 컬럼의 isolate 만 가리킨다")
        void oneLedgerEntryIsolatesOneColumn() {
            TableMapping shared = users("USER_SN", List.of(), isolated(APPROVED),
                    new ColumnMapping("CNT", "cnt", null, "integer", null, null, null, null, List.of(),
                            new MappingSpec.Isolate("U4", 3L, List.of("FORMAT"))));

            assertThat(errors(shared)).containsExactly("tb_user_info.cnt: 같은 원장 행(U4)을 두 컬럼의 isolate 가"
                    + " 가리킵니다 — user_nm, cnt");
        }

        @Test
        @DisplayName("YAML 은 isolate 를 글자 그대로만 읽고, 선언은 mapping digest 에 결속된다")
        void yamlIsReadStrictlyAndTheDeclarationIsBoundToTheDigest() {
            MappingLoader loader = new MappingLoader(ignored -> null);
            String template = """
                    tables:
                      - source: legacy_user
                        target: tb_user_info
                        orderBy: USER_SN
                        columns:
                          - { source: END_YMD, target: user_nm, transform: ymd8, isolate: %s }
                    """;

            assertThat(loader.loadContent(template.formatted(
                    "{ ledgerEntry: U4, maxRows: 3, violations: [INVALID_DATE, FORMAT] }")).tables().getFirst()
                    .columns().getFirst().isolate())
                    .isEqualTo(new MappingSpec.Isolate("U4", 3L, List.of("INVALID_DATE", "FORMAT")));
            assertThat(loader.loadContent(template.formatted("{ ledgerEntry: U4 }")).tables().getFirst().columns()
                    .getFirst().isolate()).as("빠진 칸은 검증이 거부한다")
                    .isEqualTo(new MappingSpec.Isolate("U4", null, List.of()));
            for (String invalid : List.of("{ ledgerEntry: U4, maxRows: 2.7, violations: [FORMAT] }",
                    "{ ledgerEntry: U4, maxRows: '3', violations: [FORMAT] }",
                    "{ ledgerEntry: U4, maxRows: 3, violations: FORMAT }",
                    "{ ledgerEntry: U4, maxRows: 3, violations: [1] }",
                    "{ ledgerEntry: U4, maxRows: 3, violations: [~] }",
                    "{ ledgerEntry: 4, maxRows: 3, violations: [FORMAT] }",
                    "{ ledgerEntry: U4, maxRows: 3, violations: [FORMAT], reason: x }")) {
                org.assertj.core.api.Assertions.assertThatThrownBy(() -> loader.loadContent(template.formatted(invalid)))
                        .as(invalid).isInstanceOf(IllegalArgumentException.class)
                        .hasMessage("mapping YAML parsing failed");
            }

            ColumnMapping undeclared = new ColumnMapping("END_YMD", "user_nm", "ymd8", null, null, null, null, null,
                    List.of());
            ColumnMapping declared = isolated(APPROVED);
            ColumnMapping widened = isolated(new MappingSpec.Isolate("U4", 4L, List.of("INVALID_DATE")));
            String legacy = nuri.migration.artifact.MappingSpecDigester.sha256(spec(List.of(users("USER_SN",
                    List.of(), new ColumnMapping("END_YMD", "user_nm", "ymd8", null, null, null, null)))));
            assertThat(nuri.migration.artifact.MappingSpecDigester.sha256(spec(List.of(users("USER_SN", List.of(),
                    undeclared))))).as("선언이 없으면 digest 가 그대로다").isEqualTo(legacy);
            assertThat(nuri.migration.artifact.MappingSpecDigester.sha256(spec(List.of(users("USER_SN", List.of(),
                    declared))))).isNotEqualTo(legacy)
                    .as("상한을 넓히면 다시 승인해야 한다")
                    .isNotEqualTo(nuri.migration.artifact.MappingSpecDigester.sha256(spec(List.of(users("USER_SN",
                            List.of(), widened)))));
        }
    }

    @Nested
    @DisplayName("외부 보관 선언(ADR-0029 L3e)")
    class ArchiveDeclaration {

        private final TableMapping users = new TableMapping("legacy_user", "tb_user_info", null, "USER_SN", List.of(),
                null, List.of(new ColumnMapping("USER_NM", "user_nm", null, null, null, null, null)), null, null,
                List.of());

        private List<String> errors(List<TableMapping> tables, MappingSpec.ArchiveDump... archives) {
            return withSchema().validate(new MappingSpec(null, null, tables, Map.of(), null, null, List.of(archives)))
                    .errors();
        }

        private MappingSpec.ArchiveDump mapped(String id, String retainUntil, List<String> columns,
                                               List<String> entries) {
            return new MappingSpec.ArchiveDump(id, "legacy_user", null, List.of(), columns, entries, retainUntil);
        }

        private MappingSpec.ArchiveDump dumpOnly(String id, String where, List<String> keys, List<String> columns,
                                                 List<String> entries) {
            return new MappingSpec.ArchiveDump(id, "legacy_log", where, keys, columns, entries, "2031-12-31");
        }

        @Test
        @DisplayName("매핑된 표는 그 매핑의 읽기를 쓰고, 덤프만 하는 표는 정렬 키·where 를 스스로 선언한다")
        void aMappedTableUsesItsMappingsReadAndADumpOnlyTableDeclaresItsOwn() {
            MappingSpec.ArchiveDump fine = mapped("legacy_user_20311231", "2031-12-31", List.of("ETC1", "RMRK2"),
                    List.of("U7", "U8"));
            assertThat(errors(List.of(users), fine)).isEmpty();
            assertThat(errors(List.of(users), new MappingSpec.ArchiveDump("legacy_user_20311231", "LEGACY_USER",
                    "USE_YN = 'Y'", List.of("USER_SN"), List.of("ETC1"), List.of("U7"), "2031-12-31")))
                    .containsExactly("archives[0](legacy_user_20311231): 매핑된 표의 보관은 그 매핑의 where·정렬 키를 그대로"
                            + " 씁니다 — 보관 선언에 where·orderByKeys 를 두지 않습니다");
            TableMapping unordered = new TableMapping("legacy_user", "tb_user_info", null,
                    List.of(new ColumnMapping("USER_NM", "user_nm", null, null, null, null, null)), null);
            assertThat(errors(List.of(unordered), fine)).containsExactly("archives[0](legacy_user_20311231): 보관하는"
                    + " 매핑된 표에는 orderBy·orderByKeys 가 필요합니다 — 덤프 행의 키를 정할 수 없습니다");

            assertThat(errors(List.of(users), dumpOnly("legacy_log_20311231", "USE_YN = 'Y'", List.of("LOG_SN"),
                    List.of("LOG_MSG"), List.of("H2")))).isEmpty();
            assertThat(errors(List.of(users), dumpOnly("legacy_log_20311231", null, List.of(), List.of("LOG_MSG"),
                    List.of("H2")))).containsExactly("archives[0](legacy_log_20311231): 덤프만 하는 표의 보관에는 정렬"
                    + " 키(orderByKeys)가 필요합니다");
            for (String unsafe : List.of("1=1; DELETE FROM legacy_log", "LOG_SN > 0 -- x", " ")) {
                assertThat(errors(List.of(users), dumpOnly("legacy_log_20311231", unsafe, List.of("LOG_SN"),
                        List.of("LOG_MSG"), List.of("H2")))).as(unsafe).containsExactly("archives[0](legacy_log_20311231):"
                        + " where에는 단일 읽기 조건식만 허용됩니다(주석·세미콜론·SQL 문 금지)");
            }
            assertThat(errors(List.of(users), dumpOnly("legacy_log_20311231", null, List.of("LOG_SN"),
                    List.of("LOG_MSG"), List.of("H2")), new MappingSpec.ArchiveDump("legacy_log_20301231", "legacy_log",
                    "USE_YN = 'Y'", List.of("LOG_SN"), List.of("LOG_NOTE"), List.of("H3"), "2030-12-31")))
                    .containsExactly("archives[1](legacy_log_20301231): 같은 덤프만 하는 표의 보관 선언은 where·정렬 키가"
                            + " 같아야 합니다 — 한 번 읽어 나눠 씁니다");
        }

        @Test
        @DisplayName("[ADR-0029 L3c] 분할한 소스의 보관은 keymap 소유 매핑이나 id 를 생략한 매핑의 읽기에 붙는다")
        void aSplitSourcesArchiveAttachesToTheOwnerOrTheDefaultMapping() {
            MappingSpec.ArchiveDump dump = mapped("legacy_user_20311231", "2031-12-31", List.of("ETC1"),
                    List.of("U7"));
            TableMapping owner = new TableMapping("legacy_user", "tb_user_info", null, "USER_SN", List.of(), null,
                    List.of(new ColumnMapping("USER_NM", "user_nm", null, null, null, null, null)),
                    new IdStrategy("esntl_id", "USR_", "USER_SN"), null, List.of(), "main");
            TableMapping extension = new TableMapping("legacy_user", "tb_ognz_info", null, "USER_SN", List.of(),
                    "ognz_id", List.of(new ColumnMapping("OGNZ_CD", "ognz_id", null, null, null, null, null)), null,
                    null, List.of(), "ext");
            TableMapping secondExtension = new TableMapping("legacy_user", "tb_ognz_info", null, "USER_SN",
                    List.of(), "ognz_id", List.of(new ColumnMapping("UP_CD", "ognz_id", null, null, null, null, null)),
                    null, null, List.of(), "ext2");
            MappingSpec withOwner = new MappingSpec(null, null, List.of(extension, owner), Map.of(), null, null,
                    List.of(dump));
            MappingSpec withDefault = new MappingSpec(null, null, List.of(extension, users), Map.of(), null, null,
                    List.of(dump));

            assertThat(errors(List.of(extension, owner), dump)).isEmpty();
            assertThat(withOwner.mappedTableOf("LEGACY_USER")).as("선언 순서가 아니라 keymap 소유 매핑이다")
                    .isSameAs(owner);
            assertThat(withDefault.mappedTableOf("legacy_user")).as("소유 매핑이 없으면 id 를 생략한 매핑이다")
                    .isSameAs(users);
            assertThat(errors(List.of(extension, secondExtension), dump)).containsExactly(
                    "archives[0](legacy_user_20311231): 분할한 소스의 보관은 keymap 소유 매핑이나 id 를 생략한 매핑의 읽기에"
                            + " 붙습니다 — 둘 다 없어 보관 컬럼을 붙일 읽기를 정할 수 없습니다");
        }

        @Test
        @DisplayName("[ADR-0029 L3c·L3e] 분할한 소스의 보관은 읽는 매핑이 그 소스의 모든 매핑이 읽는 행을 읽을 때만 받는다")
        void aSplitSourcesArchiveNeedsAReaderThatReadsEveryMappingsRows() {
            MappingSpec.ArchiveDump dump = mapped("legacy_user_20311231", "2031-12-31", List.of("ETC1"),
                    List.of("U7"));
            String refusal = "archives[0](legacy_user_20311231): 분할한 소스의 보관은 읽는 매핑에 where 가 없거나 그"
                    + " 소스의 모든 매핑이 같은 where 를 써야 합니다 — 다른 where 로 적재한 행의 보관 컬럼이 덤프에서"
                    + " 빠집니다";

            // 소유 매핑(main)이 읽는다 — where 가 없으면 형제 매핑이 where 로 나눠 읽는 행도 덮는다.
            assertThat(errors(List.of(extensionWhere("KIND = 'C'"), ownerWhere(null)), dump)).isEmpty();
            assertThat(errors(List.of(extensionWhere(" KIND = 'C' "), ownerWhere("KIND = 'C'")), dump))
                    .as("앞뒤 공백만 다른 같은 where").isEmpty();
            assertThat(errors(List.of(extensionWhere(null), ownerWhere("KIND = 'P'")), dump))
                    .as("형제 매핑이 소스의 모든 행을 읽는다").containsExactly(refusal);
            assertThat(errors(List.of(extensionWhere("KIND = 'C'"), ownerWhere("KIND = 'P'")), dump))
                    .as("where 로 나눈 분할").containsExactly(refusal);
            assertThat(errors(List.of(extensionWhere("KIND='P'"), ownerWhere("KIND = 'P'")), dump))
                    .as("같은 뜻의 다른 표기는 같은 행을 읽는다고 증명할 수 없다").containsExactly(refusal);
            assertThat(errors(List.of(extensionWhere("KIND = 'C'"), ownerWhere("KIND = 'P'"))))
                    .as("보관이 없으면 where 로 나눈 분할을 막지 않는다").isEmpty();
        }

        private static TableMapping ownerWhere(String where) {
            return new TableMapping("legacy_user", "tb_user_info", where, "USER_SN", List.of(), null,
                    List.of(new ColumnMapping("USER_NM", "user_nm", null, null, null, null, null)),
                    new IdStrategy("esntl_id", "USR_", "USER_SN"), null, List.of(), "main");
        }

        private static TableMapping extensionWhere(String where) {
            return new TableMapping("legacy_user", "tb_ognz_info", where, "USER_SN", List.of(), "ognz_id",
                    List.of(new ColumnMapping("OGNZ_CD", "ognz_id", null, null, null, null, null)), null, null,
                    List.of(), "ext");
        }

        @Test
        @DisplayName("선언은 id·보존 기한·같은 순서의 원장 행을 갖고, 컬럼·원장 행·(표, 기한)은 한 번씩이다")
        void declarationsAreNamedDatedPairedAndUnique() {
            assertThat(errors(List.of(users), mapped("Legacy-User", "2031-12-31", List.of("ETC1"), List.of("U7"))))
                    .containsExactly("archives[0]: 보관 id 는 소문자로 시작하는 소문자·숫자·밑줄 63자 이내여야 합니다");
            assertThat(errors(List.of(users), mapped("a", "2031-02-30", List.of("ETC1"), List.of("U7"))))
                    .containsExactly("archives[0](a): 보존 기한(retainUntil)은 yyyy-MM-dd 날짜여야 합니다");
            assertThat(errors(List.of(users), mapped("a", "2031-12-31", List.of(), List.of())))
                    .containsExactly("archives[0](a): 보관할 컬럼(columns)이 필요합니다");
            assertThat(errors(List.of(users), mapped("a", "2031-12-31", List.of("ETC1", "RMRK2"), List.of("U7"))))
                    .containsExactly("archives[0](a): ledgerEntries 는 columns 와 같은 순서·같은 수의 원장 행 ID 여야 합니다");
            assertThat(errors(List.of(users), mapped("a", "2031-12-31", List.of("ETC1"), List.of("U 7"))))
                    .containsExactly("archives[0](a): ledgerEntries 는 원장 행 ID 형식(영문·숫자·_.- 64자 이내)이어야"
                            + " 합니다");
            assertThat(errors(List.of(users), mapped("a", "2031-12-31", List.of("ETC1"), List.of("U7")),
                    mapped("a", "2030-12-31", List.of("ETC2"), List.of("U8")))).containsExactly(
                    "archives[1](a): 같은 보관 id 가 두 번 있습니다");
            assertThat(errors(List.of(users), mapped("a", "2031-12-31", List.of("ETC1"), List.of("U7")),
                    mapped("b", "2031-12-31", List.of("etc1"), List.of("U7")))).containsExactly(
                    "archives[1](b): 같은 소스 표·보존 기한의 보관 선언이 둘입니다 — 하나로 묶습니다",
                    "archives[1](b): 같은 소스 컬럼(etc1)을 두 번 보관합니다 — archives[0](a)",
                    "archives[1](b): 같은 원장 행(U7)을 두 보관 컬럼이 가리킵니다");
        }

        @Test
        @DisplayName("보관은 적재 run 과 함께만 쓴다 — 보관만 있는 mapping 은 받지 않는다")
        void archivesAloneCannotRun() {
            assertThat(errors(List.of(), dumpOnly("legacy_log_20311231", null, List.of("LOG_SN"), List.of("LOG_MSG"),
                    List.of("H2")))).containsExactly("보관(archives)만 있는 mapping 은 실행할 수 없습니다 — 보관은 적재 run 과"
                    + " 같은 읽기 세션에서 씁니다");
        }

        @Test
        @DisplayName("암호화해 적재할 소스 값은 보관할 수 없다")
        void anEncryptedSourceCannotBeArchived(@TempDir Path tmp) throws IOException {
            Path catalog = tmp.resolve("db_columns.json");
            Files.writeString(catalog, "[{\"table_name\":\"tb_user_info\",\"column_name\":\"user_enrrno\"}]",
                    StandardCharsets.UTF_8);
            MappingValidator validator = new MappingValidator(new TransformerRegistry(), catalog.toString());
            TableMapping encrypted = new TableMapping("legacy_user", "tb_user_info", null, "USER_SN", List.of(), null,
                    List.of(new ColumnMapping("JUMIN", "user_enrrno", null, null, null, null, null, "aria-egov-v1")),
                    null, null, List.of());

            assertThat(validator.validate(new MappingSpec(null, null, List.of(encrypted), Map.of(), null, null,
                    List.of(mapped("a", "2031-12-31", List.of("ETC1", "jumin"), List.of("U7", "U8"))))).errors())
                    .containsExactly("tb_user_info.user_enrrno: 암호화할 소스 값은 외부 보관 덤프에 넣을 수 없습니다(덤프에"
                            + " 평문으로 남습니다)");
            assertThat(validator.validate(new MappingSpec(null, null, List.of(encrypted), Map.of(), null, null,
                    List.of(mapped("a", "2031-12-31", List.of("ETC1"), List.of("U7"))))).errors()).isEmpty();
        }

        @Test
        @DisplayName("YAML 은 보관 선언을 글자 그대로만 읽는다")
        void yamlIsReadStrictly() {
            MappingLoader loader = new MappingLoader(ignored -> null);
            String template = """
                    tables:
                      - source: legacy_user
                        target: tb_user_info
                        orderBy: USER_SN
                        columns:
                          - { source: USER_NM, target: user_nm }
                    archives:
                      - %s
                    """;

            assertThat(loader.loadContent(template.formatted("{ id: legacy_user_20311231, source: legacy_user,"
                    + " columns: [ETC1], ledgerEntries: [U7], retainUntil: 2031-12-31 }")).archives())
                    .containsExactly(new MappingSpec.ArchiveDump("legacy_user_20311231", "legacy_user", null, List.of(),
                            List.of("ETC1"), List.of("U7"), "2031-12-31"));
            for (String invalid : List.of("{ id: a, source: legacy_user, columns: [1], ledgerEntries: [U7] }",
                    "{ id: a, source: legacy_user, columns: [ETC1], ledgerEntries: [U7], retainUntil: 20311231 }",
                    "{ id: 7, source: legacy_user, columns: [ETC1], ledgerEntries: [U7] }",
                    "{ id: a, source: legacy_user, columns: [ETC1], ledgerEntries: U7 }",
                    "{ id: a, source: legacy_user, columns: [ETC1], ledgerEntries: [U7], reason: x }")) {
                org.assertj.core.api.Assertions.assertThatThrownBy(() -> loader.loadContent(template.formatted(invalid)))
                        .as(invalid).isInstanceOf(IllegalArgumentException.class)
                        .hasMessage("mapping YAML parsing failed");
            }
        }
    }

    @Nested
    @DisplayName("표준 스키마 대조 (db_columns.json)")
    class TargetColumnCheck {

        @Test
        @DisplayName("파일이 없으면 타깃 표준을 증명할 수 없어 검증을 막는다")
        void missingSchemaFileFailsClosed() {
            ColumnMapping c = col("x", "definitely_not_a_standard_column");

            MappingValidator missing = new MappingValidator(new TransformerRegistry(), "no-such-db_columns.json");
            ValidationResult r = missing.validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(r.ok()).isFalse();
            assertThat(r.errors()).anySatisfy(e -> assertThat(e).contains("db_columns.json 부재"));
        }

        @Test
        @DisplayName("깨진 JSON과 빈 catalog도 검증을 건너뛰지 않는다")
        void malformedOrEmptySchemaCatalogFailsClosed(@TempDir Path tmp) throws IOException {
            Path malformed = tmp.resolve("malformed.json");
            Files.writeString(malformed, "[{", StandardCharsets.UTF_8);
            ValidationResult malformedResult = new MappingValidator(
                    new TransformerRegistry(), malformed.toString()).validate(spec(List.of()));
            assertThat(malformedResult.errors()).anySatisfy(e -> assertThat(e).contains("파싱 실패"));

            Path empty = tmp.resolve("empty.json");
            Files.writeString(empty, "[]", StandardCharsets.UTF_8);
            ValidationResult emptyResult = new MappingValidator(
                    new TransformerRegistry(), empty.toString()).validate(spec(List.of()));
            assertThat(emptyResult.errors()).anySatisfy(e -> assertThat(e).contains("유효한", "없습니다"));
        }

        @Test
        @DisplayName("파일이 있으면 표준에 없는 타깃 컬럼을 오류로 잡는다")
        void unknownTargetColumnIsError(@TempDir Path tmp) throws IOException {
            Path f = tmp.resolve("db_columns.json");
            Files.writeString(f,
                    "[{\"table_name\":\"tb_user_info\",\"column_name\":\"user_nm\"}]",
                    StandardCharsets.UTF_8);
            MappingValidator validator = new MappingValidator(new TransformerRegistry(), f.toString());

            ValidationResult r = validator.validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null,
                            List.of(col("nm", "user_nm"), col("x", "no_such_column")), null))));

            assertThat(r.errors()).singleElement().asString()
                    .contains("표준 스키마에 없는 타깃 컬럼", "tb_user_info.no_such_column");
        }

        @Test
        @DisplayName("대조는 대소문자를 가리지 않는다")
        void targetColumnMatchIsCaseInsensitive(@TempDir Path tmp) throws IOException {
            Path f = tmp.resolve("db_columns.json");
            Files.writeString(f,
                    "[{\"table_name\":\"tb_user_info\",\"column_name\":\"user_nm\"}]",
                    StandardCharsets.UTF_8);
            MappingValidator validator = new MappingValidator(new TransformerRegistry(), f.toString());

            ValidationResult r = validator.validate(spec(List.of(
                    new TableMapping("legacy_user", "TB_USER_INFO", null,
                            List.of(col("nm", "USER_NM")), null))));

            // 정규화가 빠지면 대문자로 쓴 매핑이 전부 거짓 오류가 된다.
            assertThat(r.errors()).isEmpty();
        }
    }

    @Test
    @DisplayName("유효한 catalog에서 빈 매핑 자체는 오류가 아니다")
    void emptySpecIsClean() {
        ValidationResult r = withSchema().validate(spec(List.of()));

        assertThat(r.errors()).isEmpty();
        assertThat(r.ok()).isTrue();
    }

    @Test
    @DisplayName("온라인 앱이 암호화해 저장하는 컬럼은 같은 encrypt 선언이 있어야 매핑할 수 있다(DEC-OPS-308)")
    void protectedTargetColumnRequiresTheOnlineEncryptDeclaration(@TempDir Path tmp) throws IOException {
        Path catalog = tmp.resolve("db_columns.json");
        Files.writeString(catalog, "[{\"table_name\":\"tb_user_info\",\"column_name\":\"user_nm\"},"
                + "{\"table_name\":\"tb_user_info\",\"column_name\":\"user_enrrno\"}]", StandardCharsets.UTF_8);
        MappingValidator validator = new MappingValidator(new TransformerRegistry(), catalog.toString());

        ValidationResult missing = validator.validate(spec(List.of(new TableMapping("legacy_user", "tb_user_info", null,
                List.of(col("nm", "user_nm"), col("jumin", "user_enrrno")), null))));
        ValidationResult declared = validator.validate(spec(List.of(new TableMapping("legacy_user", "tb_user_info", null,
                List.of(col("nm", "user_nm"),
                        new ColumnMapping("jumin", "user_enrrno", "trim", null, null, null, null, "aria-egov-v1")),
                null))));

        assertThat(missing.errors()).containsExactly("tb_user_info.user_enrrno: 온라인 앱이 암호화해 저장하는 컬럼입니다"
                + " — encrypt: aria-egov-v1 를 선언해야 평문으로 쓰지 않습니다");
        assertThat(declared.errors()).isEmpty();
    }

    @Nested
    @DisplayName("조회 조인(lookups, ADR-0029 L3d)")
    class LookupJoin {

        private TableMapping orders(String id, String orderBy, Lookup lookup, ColumnMapping... columns) {
            return new TableMapping("public.legacy_orders", "tb_user_info", null, orderBy, List.of(), "user_id",
                    List.of(columns), null, null, List.of(), id, List.of(lookup));
        }

        private Lookup lookup(String source, String where, String from, String to) {
            return new Lookup("cust", source, where, new LookupKey(from, to), LookupCardinality.EXACTLY_ONE, null);
        }

        @Test
        @DisplayName("정적 검증은 실행기와 같은 조회 규칙과 조회 표 where 의 안전성을 본다")
        void staticValidationAppliesTheLookupRulesAndTheWhereSafety() {
            TableMapping good = orders("orders", "order_no", lookup("public.legacy_customer", "use_yn = 'Y'",
                    "cust_no", "cust_no"), col("order_no", "user_id"), col("cust.cust_nm", "user_nm"));
            TableMapping unsafe = orders("orders", "order_no", lookup("public.legacy_customer",
                    "1=1; DELETE FROM legacy_customer", "cust_no", "cust_no"), col("order_no", "user_id"),
                    col("cust.cust_nm", "user_nm"));
            TableMapping anonymous = orders(null, "order_no", lookup("public.legacy_customer", null, "cust_no",
                    "cust_no"), col("order_no", "user_id"), col("cust.cust_nm", "user_nm"));

            assertThat(withSchema().validate(spec(List.of(good))).errors()).isEmpty();
            assertThat(withSchema().validate(spec(List.of(unsafe))).errors()).containsExactly(
                    "public.legacy_orders#orders.lookups[cust]: where에는 단일 읽기 조건식만 허용됩니다(주석·세미콜론·SQL 문"
                            + " 금지)");
            assertThat(withSchema().validate(spec(List.of(anonymous))).errors()).containsExactly(
                    "public.legacy_orders: 조회 조인(lookups)을 쓰는 매핑에는 id 가 필요합니다 — 원장의 via.mapping 이 이"
                            + " id 를 가리킵니다");
        }

        /** H2 의 실제 metadata 로 조회 표·키·조회 컬럼의 실재와 키 계열을 본다. */
        @Test
        @DisplayName("live source 는 조회 표·조회 키·조회 컬럼이 실재하고 키 두 컬럼이 같은 계열인지 본다")
        void liveSourceChecksTheLookupTableItsColumnsAndTheKeyFamily() {
            JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(
                    "jdbc:h2:mem:lookup_live;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", ""));
            jdbc.execute("CREATE TABLE IF NOT EXISTS legacy_orders (order_no BIGINT, cust_no BIGINT, cust_cd CHAR(3),"
                    + " cust_txt VARCHAR(10), rate DOUBLE PRECISION)");
            jdbc.execute("CREATE TABLE IF NOT EXISTS legacy_customer (cust_no NUMERIC(12,0), cust_nm VARCHAR(50),"
                    + " cust_cd CHAR(3), cust_txt VARCHAR(10), rate DOUBLE PRECISION)");
            List<Map.Entry<TableMapping, List<String>>> cases = List.of(
                    Map.entry(orders("orders", "order_no", lookup("public.legacy_customer", null, "cust_no", "cust_no"),
                            col("order_no", "user_id"), col("cust.cust_nm", "user_nm")), List.of()),
                    Map.entry(orders("orders", "order_no", lookup("public.legacy_customer", null, "cust_txt",
                            "cust_txt"), col("order_no", "user_id"), col("cust.cust_nm", "user_nm")), List.of()),
                    Map.entry(orders("orders", "order_no", lookup("public.legacy_nowhere", null, "cust_no", "cust_no"),
                            col("order_no", "user_id"), col("cust.cust_nm", "user_nm")),
                            List.of("실 source에 없는 조회 표 또는 metadata 접근 불가: public.legacy_nowhere")),
                    Map.entry(orders("orders", "order_no", lookup("public.legacy_customer", null, "cust_id", "cust_id"),
                            col("order_no", "user_id"), col("cust.cust_nm", "user_nm"), col("cust.missing", "cnt")),
                            List.of("실 source에 없는 조회 키 컬럼: public.legacy_orders.cust_id",
                                    "실 source에 없는 조회 키 컬럼: public.legacy_customer.cust_id",
                                    "실 source에 없는 조회 컬럼: public.legacy_customer.missing")),
                    Map.entry(orders("orders", "order_no", lookup("public.legacy_customer", null, "cust_cd", "cust_cd"),
                            col("order_no", "user_id"), col("cust.cust_nm", "user_nm")),
                            List.of("public.legacy_orders#orders.lookups[cust]: 조회 키는 가변 길이 문자(VARCHAR 계열)나"
                                    + " 정수·고정소수 컬럼이어야 합니다 — CHAR 는 공백 채움 비교가 DBMS 마다 달라 받지 않습니다:"
                                    + " CHARACTER / CHARACTER")),
                    Map.entry(orders("orders", "order_no", lookup("public.legacy_customer", null, "rate", "rate"),
                            col("order_no", "user_id"), col("cust.cust_nm", "user_nm")),
                            List.of("public.legacy_orders#orders.lookups[cust]: 조회 키는 가변 길이 문자(VARCHAR 계열)나"
                                    + " 정수·고정소수 컬럼이어야 합니다 — CHAR 는 공백 채움 비교가 DBMS 마다 달라 받지 않습니다:"
                                    + " DOUBLE PRECISION / DOUBLE PRECISION")),
                    Map.entry(orders("orders", "order_no", lookup("public.legacy_customer", null, "cust_no", "cust_txt"),
                            col("order_no", "user_id"), col("cust.cust_nm", "user_nm")),
                            List.of("public.legacy_orders#orders.lookups[cust]: 조회 키 두 컬럼의 계열(문자·수)이 다릅니다:"
                                    + " BIGINT / CHARACTER VARYING")));

            for (Map.Entry<TableMapping, List<String>> entry : cases) {
                ValidationResult result = withSchema().validateLiveSource(spec(List.of(entry.getKey())), jdbc);

                assertThat(result.errors()).as("%s", entry.getKey().lookups())
                        .containsExactlyElementsOf(entry.getValue());
            }
        }
    }
}
