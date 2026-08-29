package nuri.migration.validate;

import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

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

    private static MappingSpec spec(List<TableMapping> tables, Map<String, Map<String, String>> codemaps) {
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
                    Map.of("statusMap", Map.of("1", "P"))));

            assertThat(r.errors()).isEmpty();
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
}
