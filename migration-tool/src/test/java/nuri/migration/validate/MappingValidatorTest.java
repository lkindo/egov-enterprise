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

    /** db_columns.json 이 없는 상태(타깃 컬럼 실재 검증 스킵)의 검증기. */
    private static MappingValidator withoutSchema() {
        return new MappingValidator(new TransformerRegistry(), "no-such-db_columns.json");
    }

    private static MappingSpec spec(List<TableMapping> tables) {
        return new MappingSpec(null, null, tables, Map.of());
    }

    private static MappingSpec spec(List<TableMapping> tables, Map<String, Map<String, String>> codemaps) {
        return new MappingSpec(null, null, tables, codemaps);
    }

    /**
     * db_columns.json 부재 경고를 걷어낸 나머지 경고.
     *
     * <p>파일이 없는 검증기는 <b>항상</b> 그 경고 하나를 낸다(대조 스킵 고지).
     * 그것까지 세면 "다른 경고가 없다" 를 확인할 수 없다.
     */
    private static List<String> warningsExceptSchemaNotice(ValidationResult r) {
        return r.warnings().stream().filter(w -> !w.contains("db_columns.json")).toList();
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
            ValidationResult r = withoutSchema().validate(spec(List.of(
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
            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null,
                            List.of(col("id", "  ")), null))));

            assertThat(r.errors()).singleElement().asString().contains("타깃 컬럼 미지정");
        }

        @Test
        @DisplayName("정의되지 않은 코드맵 참조는 오류다")
        void unknownCodemapIsError() {
            ColumnMapping c = new ColumnMapping("stat", "user_stts_cd", null, null, "statusMap", null, null);

            ValidationResult r = withoutSchema().validate(spec(
                    List.of(new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null)),
                    Map.of()));

            assertThat(r.errors()).singleElement().asString()
                    .contains("정의되지 않은 코드맵", "statusMap");
        }

        @Test
        @DisplayName("정의된 코드맵은 오류가 아니다")
        void declaredCodemapIsAccepted() {
            ColumnMapping c = new ColumnMapping("stat", "user_stts_cd", null, null, "statusMap", null, null);

            ValidationResult r = withoutSchema().validate(spec(
                    List.of(new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null)),
                    Map.of("statusMap", Map.of("1", "P"))));

            assertThat(r.errors()).isEmpty();
        }

        @Test
        @DisplayName("fkRef 부모가 매핑에 없으면 오류다 — 모든 자식 행이 고아가 된다")
        void danglingFkRefIsError() {
            ColumnMapping fk = new ColumnMapping("dept_id", "ognz_id", null, null, null, "legacy_dept", null);

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(fk), null))));

            // 부모 PK 가 재채번되는데 부모 테이블이 매핑에 없으면 자식 FK 를 번역할 대상이 없다.
            assertThat(r.errors()).singleElement().asString()
                    .contains("fkRef", "legacy_dept", "고아");
        }

        @Test
        @DisplayName("fkRef 부모가 매핑에 있으면 오류가 아니다 — 대소문자를 가리지 않는다")
        void fkRefResolvesCaseInsensitively() {
            ColumnMapping fk = new ColumnMapping("dept_id", "ognz_id", null, null, null, "LEGACY_DEPT", null);

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_dept", "tb_ognz_info", null, List.of(col("id", "ognz_id")), null),
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(fk), null))));

            // 소스 테이블명 수집을 소문자로 정규화하지 않으면 여기서 거짓 오류가 난다.
            assertThat(r.errors()).isEmpty();
        }
    }

    @Nested
    @DisplayName("막지는 않는 경고(warnings)")
    class NonBlockingWarnings {

        @Test
        @DisplayName("idStrategy 에 sourceKey 가 없으면 경고 — 오류는 아니다")
        void idStrategyWithoutSourceKeyIsWarning() {
            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null,
                            List.of(col("id", "esntl_id")),
                            new IdStrategy("esntl_id", "USRCNFRM_", null)))));

            // 이관은 되지만 레거시 키 매핑이 불가해 fkRef 번역이 깨진다 — 알려야 하되 막지는 않는다.
            assertThat(r.errors()).isEmpty();
            assertThat(r.ok()).isTrue();
            assertThat(warningsExceptSchemaNotice(r)).singleElement().asString().contains("sourceKey 미지정");
        }

        @Test
        @DisplayName("idStrategy 의 column 이 없으면 경고 대상이 아니다")
        void idStrategyWithoutColumnIsNotWarned() {
            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null,
                            List.of(col("id", "esntl_id")),
                            new IdStrategy(null, "USRCNFRM_", null)))));

            assertThat(warningsExceptSchemaNotice(r)).isEmpty();
        }

        @Test
        @DisplayName("미등록 변환기는 경고다")
        void unknownTransformerIsWarning() {
            ColumnMapping c = new ColumnMapping("nm", "user_nm", "nosuchtransform", null, null, null, null);

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(r.errors()).isEmpty();
            assertThat(r.warnings()).anySatisfy(w -> assertThat(w).contains("미등록 변환기", "nosuchtransform"));
        }

        @Test
        @DisplayName("등록된 변환기는 경고하지 않는다")
        void registeredTransformerIsAccepted() {
            ColumnMapping c = new ColumnMapping("nm", "user_nm", "trim", null, null, null, null);

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(warningsExceptSchemaNotice(r)).isEmpty();
        }

        @Test
        @DisplayName("미지 타입은 경고다 (원본 통과)")
        void unknownTypeIsWarning() {
            ColumnMapping c = new ColumnMapping("cnt", "cnt", null, "nosuchtype", null, null, null);

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(r.errors()).isEmpty();
            assertThat(r.warnings()).anySatisfy(w -> assertThat(w).contains("미지 타입", "nosuchtype"));
        }

        @Test
        @DisplayName("알려진 타입은 경고하지 않는다")
        void knownTypeIsAccepted() {
            ColumnMapping c = new ColumnMapping("cnt", "cnt", null, "int", null, null, null);

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(warningsExceptSchemaNotice(r)).isEmpty();
        }

        @Test
        @DisplayName("source·const·fkRef 가 모두 없으면 값이 정해지지 않는다는 경고")
        void columnWithoutAnyValueSourceIsWarned() {
            ColumnMapping c = new ColumnMapping(null, "user_nm", null, null, null, null, null);

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(r.warnings()).anySatisfy(w -> assertThat(w).contains("source·const 모두 없음"));
        }

        @Test
        @DisplayName("const 만 있어도 값이 정해지므로 경고하지 않는다")
        void constantOnlyColumnIsAccepted() {
            ColumnMapping c = new ColumnMapping(null, "frst_rgtr_id", null, null, null, null, "SYSTEM");

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            assertThat(warningsExceptSchemaNotice(r)).isEmpty();
        }

        @Test
        @DisplayName("fkRef 로 값이 정해지는 컬럼도 경고하지 않는다")
        void fkRefOnlyColumnIsAccepted() {
            ColumnMapping fk = new ColumnMapping(null, "ognz_id", null, null, null, "legacy_dept", null);

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_dept", "tb_ognz_info", null, List.of(col("id", "ognz_id")), null),
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(fk), null))));

            assertThat(warningsExceptSchemaNotice(r)).isEmpty();
            assertThat(r.errors()).isEmpty();
        }
    }

    @Nested
    @DisplayName("표준 스키마 대조 (db_columns.json)")
    class TargetColumnCheck {

        @Test
        @DisplayName("파일이 없으면 대조를 건너뛰고 경고만 남긴다 — 검증 자체가 막히면 안 된다")
        void missingSchemaFileWarnsAndSkips() {
            ColumnMapping c = col("x", "definitely_not_a_standard_column");

            ValidationResult r = withoutSchema().validate(spec(List.of(
                    new TableMapping("legacy_user", "tb_user_info", null, List.of(c), null))));

            // 파일이 없다고 모든 컬럼을 오류로 처리하면 로컬에서 검증을 아예 못 돌린다.
            assertThat(r.errors()).isEmpty();
            assertThat(r.warnings()).anySatisfy(w -> assertThat(w).contains("db_columns.json 부재"));
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
    @DisplayName("빈 매핑은 오류도 경고도 없다 (db_columns 경고 제외)")
    void emptySpecIsClean() {
        ValidationResult r = withoutSchema().validate(spec(List.of()));

        assertThat(r.errors()).isEmpty();
        assertThat(r.ok()).isTrue();
    }
}
