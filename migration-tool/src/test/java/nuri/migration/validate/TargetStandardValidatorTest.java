package nuri.migration.validate;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.postgres.TargetStandardSnapshot;
import nuri.migration.postgres.TargetStandardSnapshot.ColumnContract;
import nuri.migration.postgres.TargetStandardSnapshot.ContractStatus;
import nuri.migration.postgres.TargetStandardSnapshot.StandardStatus;
import nuri.migration.postgres.TargetStandardSnapshot.StandardTerm;
import nuri.migration.postgres.TargetStandardSnapshot.TableContract;
import nuri.migration.postgres.TargetStandardSnapshot.TermStatus;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 표준화 적재가 대상 표준을 조용히 깨지 않는지 보는 live 계약 검증(DEC-OPS-307).
 *
 * <p>fixture 는 information_schema 행과 승인 inventory 의 JDBC 컬럼 선언을 그대로 흉내 낸다.
 * 각 위반은 오류 메시지의 문구까지 단언한다 — 다른 이유로 실패해도 통과하는 거짓 red 를 막기 위해서다.
 */
@DisplayName("타깃 표준 계약 검증")
class TargetStandardValidatorTest {

    private static final String TARGET = "public.tb_item";
    private static final String SOURCE = "legacy.legacy_item";

    private final TransformerRegistry transformers = registryWithCustom();
    private final TargetStandardValidator validator = new TargetStandardValidator(transformers::isBuiltin);

    @Nested
    @DisplayName("live 계약을 읽지 못하면 실패한다")
    class FailClosed {

        @Test
        void standardSnapshotMissingFailsWithoutSnapshotFallback() {
            TargetSchemaFingerprint unbound = new TargetSchemaFingerprint(1, "PostgreSQL", "17", "d".repeat(64),
                    List.of(), null);
            ValidationResult result = validator.validate(spec(map("ITEM_ID", "item_id")), unbound, inventory());

            assertThat(result.errors()).singleElement().asString()
                    .contains("표준 검증을 할 수 없습니다").contains("코드젠 스냅샷으로 대신하지 않습니다");
        }

        @Test
        void fingerprintOrInventoryMissingFails() {
            assertThat(validator.validate(spec(map("ITEM_ID", "item_id")), null, inventory()).ok()).isFalse();
            assertThat(validator.validate(spec(map("ITEM_ID", "item_id")),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_id", 20))), null).errors())
                    .singleElement().asString().contains("표준 검증을 할 수 없습니다");
        }

        @Test
        void missingTableContractFails() {
            TargetSchemaFingerprint other = target(new TableContract("public", "tb_other", ContractStatus.READ,
                    StandardStatus.ABSENT, List.of(varchar(1, "item_id", 20))));

            assertThat(errors(spec(map("ITEM_ID", "item_id")), other))
                    .containsExactly("live 컬럼 계약이 없는 타깃 표: public.tb_item");
        }

        @Test
        void unreadableOrIncompleteContractFailsAndStopsTableChecks() {
            TableContract unreadable = new TableContract("public", "tb_item", ContractStatus.UNREADABLE,
                    StandardStatus.UNREADABLE, List.of());
            TableContract incomplete = new TableContract("public", "tb_item", ContractStatus.INCOMPLETE,
                    StandardStatus.ABSENT, List.of(varchar(1, "item_id", 20)));

            assertThat(errors(spec(map("ITEM_ID", "item_id")), target(unreadable)))
                    .containsExactly("타깃 표의 컬럼 계약을 information_schema 에서 읽지 못했습니다: public.tb_item");
            assertThat(errors(spec(map("ITEM_ID", "item_id")), target(incomplete))).singleElement().asString()
                    .contains("JDBC metadata 와 다릅니다");
        }

        @Test
        void incompleteOrUnreadableStandardFailsButPhysicalChecksStillRun() {
            List<String> incomplete = errors(spec(map("ITEM_ID", "item_id")),
                    target(table(StandardStatus.INCOMPLETE, varchar(1, "item_id", 5))));
            List<String> unreadable = errors(spec(map("ITEM_ID", "item_id")),
                    target(table(StandardStatus.UNREADABLE, varchar(1, "item_id", 5))));

            assertThat(incomplete).hasSize(2).first().asString().contains("표준 사전이 불완전합니다");
            assertThat(incomplete.get(1)).contains("값의 선언 최대 길이가 타깃보다 깁니다");
            assertThat(unreadable).hasSize(2).first().asString().contains("표준 사전을 읽지 못했습니다");
        }

        @Test
        void unqualifiedTargetFails() {
            MappingSpec unqualified = new MappingSpec(null, null, List.of(new TableMapping(
                    SOURCE, "tb_item", null, List.of(map("ITEM_ID", "item_id")), null)), Map.of());

            assertThat(errors(unqualified, target(table(StandardStatus.ABSENT, varchar(1, "item_id", 20)))))
                    .containsExactly("타깃 표는 schema.table 로 한정해야 표준 검증을 할 수 있습니다: tb_item");
        }
    }

    @Nested
    @DisplayName("기본값 없는 NOT NULL 컬럼은 반드시 채운다")
    class NotNullCoverage {

        @Test
        void uncoveredRequiredColumnWithoutDefaultFails() {
            List<String> errors = errors(spec(map("ITEM_ID", "item_id")), target(table(StandardStatus.ABSENT,
                    varchar(1, "item_id", 20),
                    required(varchar(2, "frst_rgtr_id", 20)),
                    varchar(3, "optional_nm", 20),
                    withDefault(required(timestamp(4, "crt_dt"))),
                    identity(required(bigint(5, "seq_no")), "BY DEFAULT"),
                    generated(required(bigint(6, "derived_no"))))));

            assertThat(errors).containsExactly(
                    "기본값 없는 NOT NULL 타깃 컬럼을 채우는 매핑·const 가 없습니다: public.tb_item.frst_rgtr_id");
        }

        @Test
        void constantIdStrategyAndIdentityComponentsCoverRequiredColumns() {
            TableMapping table = new TableMapping(SOURCE, TARGET, null, null, List.of(), null,
                    List.of(map("ITEM_ID", "ITEM_ID"), constant("FRST_RGTR_ID", "MIGRATION")),
                    new IdStrategy("esntl_id", "ITEM_", "ITEM_ID"));
            TableMapping identityTable = new TableMapping(SOURCE, TARGET, null, null, List.of(), null,
                    List.of(map("ITEM_ID", "item_id")), null,
                    new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                            List.of(new IdentityComponentSpec("ITEM_ID", IdentityValueType.TEXT)),
                            List.of(new IdentityComponentSpec("item_code", IdentityValueType.TEXT))),
                    List.of());

            assertThat(errors(spec(table), target(table(StandardStatus.ABSENT,
                    required(varchar(1, "item_id", 20)),
                    required(varchar(2, "frst_rgtr_id", 20)),
                    required(varchar(3, "esntl_id", 20)))))).isEmpty();
            assertThat(errors(spec(identityTable), target(table(StandardStatus.ABSENT,
                    varchar(1, "item_id", 20),
                    required(varchar(2, "item_code", 20)))))).isEmpty();
        }

        @Test
        void targetGeneratedIdentityComponentIsNotACoverage() {
            TableMapping generatedIdentity = new TableMapping(SOURCE, TARGET, null, null, List.of(), null,
                    List.of(map("ITEM_ID", "item_id")), null,
                    new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                            List.of(new IdentityComponentSpec("ITEM_ID", IdentityValueType.TEXT)),
                            List.of(new IdentityComponentSpec("item_sn", IdentityValueType.SIGNED_INTEGER))),
                    List.of());

            assertThat(errors(spec(generatedIdentity), target(table(StandardStatus.ABSENT,
                    varchar(1, "item_id", 20), required(bigint(2, "item_sn"))))))
                    .containsExactly("기본값 없는 NOT NULL 타깃 컬럼을 채우는 매핑·const 가 없습니다: public.tb_item.item_sn");
        }

        @Test
        void writtenColumnsMustExistAndBeWritable() {
            MappingSpec spec = spec(map("ITEM_ID", "item_id"), map("ITEM_ID", "missing_nm"),
                    map("ITEM_ID", "derived_nm"), map("ITEM_ID", "always_no"));

            assertThat(errors(spec, target(table(StandardStatus.ABSENT,
                    varchar(1, "item_id", 20),
                    generated(varchar(2, "derived_nm", 20)),
                    identity(varchar(3, "always_no", 20), "ALWAYS")))))
                    .containsExactlyInAnyOrder(
                            "live 타깃에 없는 컬럼: public.tb_item.missing_nm",
                            "생성 컬럼(GENERATED ALWAYS AS)에는 값을 쓸 수 없습니다: public.tb_item.derived_nm",
                            "GENERATED ALWAYS identity 컬럼에는 값을 쓸 수 없습니다: public.tb_item.always_no");
        }

        @Test
        void identityByDefaultMayBeWritten() {
            assertThat(errors(spec(map("ITEM_ID", "item_id")), target(table(StandardStatus.ABSENT,
                    identity(varchar(1, "item_id", 20), "BY DEFAULT"))))).isEmpty();
        }
    }

    @Nested
    @DisplayName("값 타입과 live 타깃 타입을 대조한다")
    class TypeCompatibility {

        @Test
        void textSourceIntoIntegerNeedsTypeHint() {
            List<String> withoutHint = errors(spec(map("ITEM_ID", "item_no")),
                    target(table(StandardStatus.ABSENT, integer(1, "item_no"))));

            assertThat(withoutHint).containsExactly(
                    "값 타입이 타깃과 맞지 않습니다: public.tb_item.item_no — 값 TEXT, 물리 컬럼 integer");
            assertThat(errors(spec(hinted("ITEM_ID", "item_no", "int")),
                    target(table(StandardStatus.ABSENT, integer(1, "item_no"))))).isEmpty();
        }

        @Test
        void constantBindsAsTextEvenWithTypeHint() {
            ColumnMapping hintedConstant = new ColumnMapping(null, "item_no", null, "int", null, null, "1");

            assertThat(errors(spec(hintedConstant), target(table(StandardStatus.ABSENT, integer(1, "item_no")))))
                    .containsExactly("값 타입이 타깃과 맞지 않습니다: public.tb_item.item_no — 값 TEXT"
                            + "(const 는 type 힌트 없이 문자열로 바인딩됨), 물리 컬럼 integer");
        }

        @Test
        void dateSourceCannotSilentlyBecomeText() {
            List<String> plain = errors(spec(map("REG_DE", "reg_ymd")),
                    target(table(StandardStatus.ABSENT, varchar(1, "reg_ymd", 8))));
            List<String> asText = errors(spec(hinted("REG_DE", "reg_ymd", "text")),
                    target(table(StandardStatus.ABSENT, varchar(1, "reg_ymd", 8))));

            assertThat(plain).singleElement().asString().contains("값 DATE");
            assertThat(asText).containsExactly("값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.reg_ymd"
                    + " — 값 10, 물리 컬럼 character varying 길이 8");
        }

        @ParameterizedTest(name = "{0} → {1}: {2}")
        @CsvSource({
                "REG_DE, date, true",
                "REG_DE, timestamp without time zone, true",
                "REG_DE, timestamp with time zone, false",
                "REG_DT, timestamp without time zone, true",
                "REG_DT, date, false",
                "REG_DT, character varying, false",
                "REG_TZ, timestamp with time zone, true",
                "REG_TZ, timestamp without time zone, false",
                "USE_AT, boolean, true",
                "USE_AT, character varying, false",
                "OPEN_TM, time without time zone, true",
                "OPEN_TM, time with time zone, true",
                "PHOTO, bytea, true",
                "PHOTO, character varying, false",
                "RATE, double precision, true",
                "RATE, real, true",
                "RATE, numeric, false",
                "RATE, text, true",
                "QTY, double precision, true",
                "QTY, text, true",
                "QTY, boolean, false",
                "AMOUNT, numeric, true",
                "AMOUNT, bigint, false",
                "ITEM_ID, jsonb, false",
                "ODD, character varying, false"
        })
        void sourceFamilyMatrix(String sourceColumn, String targetType, boolean compatible) {
            ColumnContract column = column(1, "target_col", targetType, null, null, null);

            assertThat(errors(spec(map(sourceColumn, "target_col")), target(table(StandardStatus.ABSENT, column))))
                    .as(sourceColumn + " → " + targetType)
                    .hasSize(compatible ? 0 : 1);
        }

        @Test
        void missingOrAmbiguousSourceDeclarationFails() {
            CatalogSnapshot duplicated = inventory(List.of(
                    tableObject("legacy_item"), tableObject("LEGACY_ITEM"),
                    columnObject("legacy_item", "ITEM_ID", Types.VARCHAR, 20, 0),
                    columnObject("LEGACY_ITEM", "ITEM_ID", Types.VARCHAR, 20, 0)));
            TargetSchemaFingerprint target = target(table(StandardStatus.ABSENT, varchar(1, "item_id", 20)));

            assertThat(validator.validate(spec(map("NOT_DISCOVERED", "item_id")), target, inventory()).errors())
                    .containsExactly("소스 컬럼의 타입을 승인 inventory 에서 확인할 수 없습니다(없음·모호·미지원):"
                            + " public.tb_item.item_id ← legacy.legacy_item.NOT_DISCOVERED");
            assertThat(validator.validate(spec(map("ITEM_ID", "item_id")), target, duplicated).errors())
                    .singleElement().asString().contains("확인할 수 없습니다");
        }

        @Test
        void invalidJdbcTypeEvidenceIsUnknown() {
            CatalogSnapshot broken = inventory(List.of(tableObject("legacy_item"),
                    new CatalogObject(ObjectKind.COLUMN, "db", "legacy", "legacy_item.ITEM_ID", false, null, null,
                            List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", "legacy_item")),
                            Map.of("originalName", "ITEM_ID", "jdbcType", "not-a-number"))));

            assertThat(validator.validate(spec(map("ITEM_ID", "item_id")),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_id", 20))), broken).errors())
                    .singleElement().asString().contains("확인할 수 없습니다");
        }

        @Test
        void customTransformerOwnsItsOutputContract() {
            ColumnMapping custom = new ColumnMapping("REG_DE", "reg_ymd", "yyyymmdd", null, null, null, null);
            ColumnMapping unregistered = new ColumnMapping("REG_DE", "reg_ymd", "not-registered", null, null, null, null);
            ColumnMapping builtinDate = new ColumnMapping("ITEM_ID", "reg_ymd", "date", null, null, null, null);
            ColumnMapping builtinTimestamp = new ColumnMapping("ITEM_ID", "reg_ymd", "timestamp", null, null, null, null);
            TargetSchemaFingerprint target = target(table(StandardStatus.ABSENT, varchar(1, "reg_ymd", 8)));

            assertThat(errors(spec(custom), target)).isEmpty();
            assertThat(errors(spec(unregistered), target)).isEmpty();
            assertThat(errors(spec(builtinDate), target)).singleElement().asString().contains("값 DATE");
            assertThat(errors(spec(builtinTimestamp), target)).singleElement().asString().contains("값 TIMESTAMP");
        }

        @Test
        void foreignKeyTranslationWritesGeneratedTextKeys() {
            ColumnMapping fk = new ColumnMapping("ITEM_ID", "parent_id", null, "long", null, "legacy.parent", null);

            assertThat(errors(spec(fk), target(table(StandardStatus.ABSENT, varchar(1, "parent_id", 1))))).isEmpty();
            assertThat(errors(spec(fk), target(table(StandardStatus.ABSENT, bigint(1, "parent_id")))))
                    .singleElement().asString().contains("값 TEXT");
        }

        @Test
        void uuidHintFitsUuidOrLongEnoughText() {
            TargetSchemaFingerprint shortText = target(table(StandardStatus.ABSENT, varchar(1, "item_uuid", 20)));

            assertThat(errors(spec(hinted("ITEM_ID", "item_uuid", "uuid")),
                    target(table(StandardStatus.ABSENT, column(1, "item_uuid", "uuid", null, null, null))))).isEmpty();
            assertThat(errors(spec(hinted("ITEM_ID", "item_uuid", "uuid")),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_uuid", 36))))).isEmpty();
            assertThat(errors(spec(hinted("ITEM_ID", "item_uuid", "uuid")), shortText))
                    .singleElement().asString().contains("값 36");
            assertThat(errors(spec(hinted("ITEM_ID", "item_uuid", "uuid")),
                    target(table(StandardStatus.ABSENT, integer(1, "item_uuid")))))
                    .singleElement().asString().contains("값 UUID");
        }

        @ParameterizedTest(name = "{0} 힌트 → {1}")
        @CsvSource({
                "boolean, boolean, 0", "bool, character varying, 1",
                "date, date, 0", "datetime, timestamp without time zone, 0", "timestamp, date, 1",
                "double, double precision, 0", "string, text, 0", "varchar, text, 0", "char, text, 0",
                "integer, integer, 0", "bigint, bigint, 0", "numeric, numeric, 0", "unknown-hint, jsonb, 0"
        })
        void typeHintDecidesValueFamily(String hint, String targetType, int expectedErrors) {
            assertThat(errors(spec(hinted("ITEM_ID", "target_col", hint)),
                    target(table(StandardStatus.ABSENT, column(1, "target_col", targetType, null, null, null)))))
                    .hasSize(expectedErrors);
        }

        @Test
        void idStrategyColumnMustBeText() {
            TableMapping numericId = new TableMapping(SOURCE, TARGET, null,
                    List.of(map("ITEM_ID", "item_id")), new IdStrategy("esntl_no", "ITEM_", "ITEM_ID"));

            assertThat(errors(spec(numericId), target(table(StandardStatus.ABSENT,
                    varchar(1, "item_id", 20), required(bigint(2, "esntl_no"))))))
                    .containsExactly("idStrategy 가 만드는 표준 ID 는 문자열이라 문자 컬럼이어야 합니다:"
                            + " public.tb_item.esntl_no");
        }
    }

    @Nested
    @DisplayName("선언 길이·정밀도가 타깃을 넘지 않는다")
    class DeclaredLength {

        @ParameterizedTest(name = "varchar({0}) → {1}")
        @CsvSource({"50, 1", "100, 0", "200, 0"})
        void sourceLengthMustFitTargetLength(int targetLength, int expectedErrors) {
            assertThat(errors(spec(map("ITEM_NM", "item_nm")),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_nm", targetLength)))))
                    .hasSize(expectedErrors);
        }

        @Test
        void lengthErrorNamesBothLengthsButNoValues() {
            assertThat(errors(spec(map("ITEM_NM", "item_nm")),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_nm", 50)))))
                    .containsExactly("값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.item_nm"
                            + " — 값 100, 물리 컬럼 character varying 길이 50");
        }

        @Test
        void unboundedTargetsAcceptAnyLengthAndUnknownLengthFailsOnBoundedTargets() {
            assertThat(errors(spec(map("ITEM_NM", "item_nm")),
                    target(table(StandardStatus.ABSENT, column(1, "item_nm", "text", null, null, null))))).isEmpty();
            assertThat(errors(spec(map("ITEM_NM", "item_nm")),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_nm", null))))).isEmpty();
            assertThat(errors(spec(map("BODY", "body_cn")),
                    target(table(StandardStatus.ABSENT, column(1, "body_cn", "text", null, null, null))))).isEmpty();
            assertThat(errors(spec(map("BODY", "body_cn")), target(table(StandardStatus.ABSENT,
                    varchar(1, "body_cn", 4000))))).containsExactly(
                    "값의 선언 최대 길이를 확인할 수 없습니다: public.tb_item.body_cn — 물리 컬럼 character varying 길이 4000");
        }

        @Test
        void builtinTextTransformsKeepTheSourceLength() {
            for (String transform : List.of("trim", "upper", "lower")) {
                ColumnMapping mapping = new ColumnMapping("ITEM_NM", "item_nm", transform, null, null, null, null);
                assertThat(errors(spec(mapping), target(table(StandardStatus.ABSENT, varchar(1, "item_nm", 99)))))
                        .as(transform).singleElement().asString().contains("값 100");
                assertThat(errors(spec(mapping), target(table(StandardStatus.ABSENT, varchar(1, "item_nm", 100)))))
                        .as(transform).isEmpty();
            }
        }

        @Test
        void constantAndCodemapLengthsComeFromTheMappingWithoutPrintingThem() {
            String secret = "SECRET-CONST-VALUE";
            Map<String, Map<String, String>> codemaps = new LinkedHashMap<>();
            codemaps.put("closed", Map.of("1", "Y", "0", "N", "default", "N"));
            codemaps.put("open", Map.of("1", "SECRET-CODE-VALUE"));
            TargetSchemaFingerprint target = target(table(StandardStatus.ABSENT,
                    varchar(1, "frst_rgtr_id", 10), varchar(2, "use_yn", 1), varchar(3, "open_cd", 20)));
            MappingSpec spec = new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null, List.of(
                    constant("frst_rgtr_id", secret),
                    new ColumnMapping("ITEM_NM", "use_yn", null, null, "closed", null, null),
                    new ColumnMapping("ITEM_NM", "open_cd", null, null, "open", null, null)), null)), codemaps);

            List<String> errors = validator.validate(spec, target, inventory()).errors();

            assertThat(errors).containsExactly(
                    "값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.frst_rgtr_id — 값 18, 물리 컬럼 character varying 길이 10",
                    "값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.open_cd — 값 100, 물리 컬럼 character varying 길이 20");
            assertThat(String.join("\n", errors)).doesNotContain(secret).doesNotContain("SECRET-CODE-VALUE");
        }

        @Test
        void codemapWithDefaultIsBoundByItsOwnValues() {
            Map<String, Map<String, String>> codemaps = Map.of("wide", Map.of("1", "ABC", "default", "ABCDEF"));
            MappingSpec spec = new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null, List.of(
                    new ColumnMapping("ITEM_NM", "code_cd", null, null, "wide", null, null)), null)), codemaps);

            assertThat(validator.validate(spec, target(table(StandardStatus.ABSENT, varchar(1, "code_cd", 5))),
                    inventory()).errors()).singleElement().asString().contains("값 6");
            assertThat(validator.validate(spec, target(table(StandardStatus.ABSENT, varchar(1, "code_cd", 6))),
                    inventory()).errors()).isEmpty();
        }

        @Test
        void codemapWithoutDefaultKeepsUnmappedSourceLength() {
            Map<String, Map<String, String>> codemaps = Map.of("open", Map.of("1", "LONGER-CODE-VALUE-XYZ"));
            MappingSpec spec = new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null, List.of(
                    new ColumnMapping("STATUS", "sttus_cd", null, null, "open", null, null)), null)), codemaps);

            assertThat(validator.validate(spec, target(table(StandardStatus.ABSENT, varchar(1, "sttus_cd", 20))),
                    inventory()).errors()).singleElement().asString().contains("값 21");
            assertThat(validator.validate(spec, target(table(StandardStatus.ABSENT, varchar(1, "sttus_cd", 21))),
                    inventory()).errors()).isEmpty();
            assertThat(validator.validate(new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null,
                            List.of(new ColumnMapping("BODY", "sttus_cd", null, null, "open", null, null)), null)),
                            codemaps), target(table(StandardStatus.ABSENT, varchar(1, "sttus_cd", 21))), inventory())
                    .errors()).singleElement().asString().contains("확인할 수 없습니다");
        }

        @ParameterizedTest(name = "{0} → {1}({2},{3}): {4}")
        @CsvSource({
                "AMOUNT, numeric, 10, 2, 1",
                "AMOUNT, numeric, 12, 4, 0",
                "AMOUNT, numeric, 11, 4, 1",
                "AMOUNT, numeric, 13, 3, 1",
                "PRICE, numeric, 10, 2, 0",
                "PRICE, numeric, 8, 2, 1",
                "PRICE, integer, , , 1",
                "QTY, bigint, , , 0",
                "QTY, integer, , , 0",
                "QTY, smallint, , , 1",
                "QTY, numeric, 10, 0, 0",
                "QTY, numeric, 9, 0, 1",
                "SMALL, numeric, 4, 0, 1",
                "SMALL, numeric, 5, 0, 0",
                "TINY, smallint, , , 0",
                "BIG, integer, , , 1",
                "BIG, numeric, 19, 0, 0",
                "BIG, numeric, 18, 0, 1",
                "DIGITS9, integer, , , 0",
                "DIGITS10, integer, , , 1",
                "WHOLE18, bigint, , , 0",
                "WHOLE19, bigint, , , 1",
                "ORACLE_NUMBER, bigint, , , 1",
                "ORACLE_NUMBER, numeric, , , 0",
                "AMOUNT, numeric, , , 0",
                "NUM_UNSPECIFIED, bigint, , , 1",
                "FRACTION, numeric, 3, 2, 0",
                "FRACTION, numeric, 2, 1, 1"
        })
        void numericPrecisionAndScaleMustFit(String source, String targetType, Integer precision, Integer scale,
                                             int expectedErrors) {
            ColumnContract column = column(1, "target_col", targetType, null, precision, scale);

            assertThat(errors(spec(map(source, "target_col")), target(table(StandardStatus.ABSENT, column))))
                    .as(source + " → " + targetType).hasSize(expectedErrors);
        }

        @Test
        void numericErrorsSayWhichLimitWasExceeded() {
            assertThat(errors(spec(map("AMOUNT", "amt")),
                    target(table(StandardStatus.ABSENT, column(1, "amt", "numeric", null, 15, 2)))))
                    .containsExactly("소수 자릿수가 타깃보다 많아 반올림됩니다: public.tb_item.amt — 값 4,"
                            + " 물리 컬럼 numeric 2");
            assertThat(errors(spec(map("AMOUNT", "amt")),
                    target(table(StandardStatus.ABSENT, column(1, "amt", "numeric", null, 8, 4)))))
                    .containsExactly("정수 자릿수가 타깃보다 많습니다: public.tb_item.amt — 값 8, 물리 컬럼 numeric 4");
            assertThat(errors(spec(map("BIG", "amt")), target(table(StandardStatus.ABSENT, integer(1, "amt")))))
                    .containsExactly("정수 범위가 타깃보다 넓습니다: public.tb_item.amt — 물리 컬럼 integer");
            assertThat(errors(spec(map("ORACLE_NUMBER", "amt")), target(table(StandardStatus.ABSENT, bigint(1, "amt")))))
                    .containsExactly("값의 선언 정밀도·소수 자릿수를 확인할 수 없습니다: public.tb_item.amt — 물리 컬럼 bigint");
        }

        @Test
        void integerHintsDeclareTheirRange() {
            assertThat(errors(spec(hinted("ORACLE_NUMBER", "amt", "long")),
                    target(table(StandardStatus.ABSENT, bigint(1, "amt"))))).isEmpty();
            assertThat(errors(spec(hinted("ITEM_ID", "amt", "long")),
                    target(table(StandardStatus.ABSENT, integer(1, "amt"))))).hasSize(1);
            assertThat(errors(spec(hinted("ITEM_ID", "amt", "decimal")),
                    target(table(StandardStatus.ABSENT, column(1, "amt", "numeric", null, 10, 2)))))
                    .singleElement().asString().contains("확인할 수 없습니다");
            assertThat(errors(spec(hinted("PRICE", "amt", "decimal")),
                    target(table(StandardStatus.ABSENT, column(1, "amt", "numeric", null, 10, 2))))).isEmpty();
            assertThat(errors(spec(hinted("QTY", "amt", "numeric")),
                    target(table(StandardStatus.ABSENT, column(1, "amt", "numeric", null, 9, 0))))).hasSize(1);
        }

        @ParameterizedTest(name = "{0} 를 문자 {1} 칸에: {2}")
        @CsvSource({
                "QTY, 11, 0", "QTY, 10, 1", "TINY, 4, 0", "TINY, 3, 1", "SMALL, 6, 0", "SMALL, 5, 1",
                "BIG, 20, 0", "BIG, 19, 1", "PRICE, 11, 0", "PRICE, 10, 1", "WHOLE18, 19, 0", "WHOLE18, 18, 1",
                "ORACLE_NUMBER, 100, 1"
        })
        void numbersWrittenAsTextNeedRoomForSignAndPoint(String source, int targetLength, int expectedErrors) {
            assertThat(errors(spec(map(source, "target_col")),
                    target(table(StandardStatus.ABSENT, varchar(1, "target_col", targetLength)))))
                    .hasSize(expectedErrors);
        }

        @ParameterizedTest(name = "{0} 를 text 힌트로 {1} 칸에: {2}")
        @CsvSource({
                "REG_DE, 10, 0", "REG_DE, 9, 1", "REG_DT, 29, 0", "REG_DT, 28, 1", "OPEN_TM, 8, 0", "OPEN_TM, 7, 1",
                "USE_AT, 5, 0", "USE_AT, 4, 1", "REG_TZ, 100, 1", "PHOTO, 100, 1", "RATE, 100, 1"
        })
        void textHintLengthFollowsTheValueKind(String source, int targetLength, int expectedErrors) {
            assertThat(errors(spec(hinted(source, "target_col", "text")),
                    target(table(StandardStatus.ABSENT, varchar(1, "target_col", targetLength)))))
                    .hasSize(expectedErrors);
        }
    }

    @Nested
    @DisplayName("표준 사전이 있으면 도메인도 대조한다")
    class StandardDomain {

        @Test
        void narrowerDomainLengthWinsOverWiderPhysicalColumn() {
            ColumnContract column = withTerm(varchar(1, "item_nm", 200), found("ITEM_NM", "명V50", "VARCHAR", 50));

            assertThat(errors(spec(map("ITEM_NM", "item_nm")), target(table(StandardStatus.PRESENT, column))))
                    .containsExactly("값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.item_nm — 값 100,"
                            + " 표준 도메인 명V50 길이 50");
        }

        @Test
        void numericDomainScaleComesFromTheDomainName() {
            ColumnContract column = withTerm(column(1, "amt", "numeric", null, 15, 6),
                    found("AMT", "수N15,2", "NUMERIC", 15));

            assertThat(errors(spec(map("AMOUNT", "amt")), target(table(StandardStatus.PRESENT, column))))
                    .containsExactly("소수 자릿수가 타깃보다 많아 반올림됩니다: public.tb_item.amt — 값 4,"
                            + " 표준 도메인 수N15,2 2");
        }

        @Test
        void domainIntegerDigitsAreChecked() {
            ColumnContract amount = withTerm(column(1, "amt", "numeric", null, 12, 2),
                    found("AMT", "수N10,2", "NUMERIC", 10));
            ColumnContract rate = withTerm(column(1, "rt", "numeric", null, 3, 2), found("RT", "율N2,2", "NUMERIC", 2));

            assertThat(errors(spec(map("DIGITS9", "amt")), target(table(StandardStatus.PRESENT, amount))))
                    .containsExactly("정수 자릿수가 타깃보다 많습니다: public.tb_item.amt — 값 9, 표준 도메인 수N10,2 8");
            assertThat(errors(spec(map("FRACTION", "rt")), target(table(StandardStatus.PRESENT, rate)))).isEmpty();
        }

        @Test
        void physicalTypeOfAnotherKindThanTheDomainFails() {
            ColumnContract column = withTerm(varchar(1, "item_sn", 22), found("ITEM_SN", "일련번호N22", "NUMERIC", 22));

            assertThat(errors(spec(map("ITEM_ID", "item_sn")), target(table(StandardStatus.PRESENT, column))))
                    .containsExactly("물리 타입이 표준 도메인과 다릅니다: public.tb_item.item_sn"
                            + " — 물리 character varying, 표준 도메인 일련번호N22");
        }

        @Test
        void modernizedBigintSerialMatchesNumericDomain() {
            ColumnContract column = withTerm(bigint(1, "item_sn"), found("ITEM_SN", "일련번호N22", "NUMERIC", 22));

            assertThat(errors(spec(map("BIG", "item_sn")), target(table(StandardStatus.PRESENT, column)))).isEmpty();
            assertThat(errors(spec(map("QTY", "item_sn")),
                    target(table(StandardStatus.PRESENT, withTerm(bigint(1, "item_sn"),
                            found("ITEM_SN", "번호BIGINT", "BIGINT", 0)))))).isEmpty();
        }

        @ParameterizedTest(name = "{0}")
        @CsvSource({"AMBIGUOUS", "DOMAIN_MISSING", "DOMAIN_AMBIGUOUS"})
        void undecidableTermsFail(TermStatus status) {
            ColumnContract column = withTerm(varchar(1, "item_nm", 100),
                    new StandardTerm(status, "ITEM_NM", null, null, null));

            assertThat(errors(spec(map("ITEM_NM", "item_nm")), target(table(StandardStatus.PRESENT, column))))
                    .containsExactly("표준 용어의 도메인을 확정할 수 없습니다(" + status + "): public.tb_item.item_nm");
        }

        @ParameterizedTest(name = "{0} {1} {2}")
        @CsvSource({
                "명V0, VARCHAR, 0", "명V, VARCHAR, ", "내용, CLOB, 4000", "'수N15,4', NUMERIC, 10",
                "수N, NUMERIC, 0", "'수N2,4', NUMERIC, 2", "없음, , 10"
        })
        void unparseableDomainsFail(String domainName, String dataType, Integer length) {
            ColumnContract column = withTerm(varchar(1, "item_nm", 100), found("ITEM_NM", domainName, dataType, length));

            assertThat(errors(spec(map("ITEM_NM", "item_nm")), target(table(StandardStatus.PRESENT, column))))
                    .containsExactly("표준 도메인을 해석할 수 없습니다(" + domainName + "): public.tb_item.item_nm");
        }

        @ParameterizedTest(name = "{1} 도메인 {0} 물리: {3}")
        @CsvSource({
                "timestamp without time zone, DATETIME, REG_DT, 0",
                "timestamp with time zone, DATETIME, REG_TZ, 0",
                "date, DATETIME, REG_DE, 1",
                "date, DATE, REG_DE, 0",
                "timestamp without time zone, DATE, REG_DT, 1",
                "character varying, CHAR, ITEM_NM, 0"
        })
        void temporalAndCharDomains(String physicalType, String domainType, String source, int expectedErrors) {
            ColumnContract column = withTerm(column(1, "target_col", physicalType, null, null, null),
                    found("TARGET_COL", "도메인", domainType, 1000));

            assertThat(errors(spec(map(source, "target_col")), target(table(StandardStatus.PRESENT, column))))
                    .hasSize(expectedErrors);
        }

        @Test
        void columnWithoutTermIsOnlyAWarningAndAbsentDictionaryIsSilent() {
            ValidationResult present = validator.validate(spec(map("ITEM_NM", "item_nm")),
                    target(table(StandardStatus.PRESENT, varchar(1, "item_nm", 100))), inventory());
            ValidationResult absent = validator.validate(spec(map("ITEM_NM", "item_nm")),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_nm", 100))), inventory());

            assertThat(present.errors()).isEmpty();
            assertThat(present.warnings())
                    .containsExactly("표준 용어가 없는 타깃 컬럼(도메인 대조 생략): public.tb_item.item_nm");
            assertThat(absent.errors()).isEmpty();
            assertThat(absent.warnings()).isEmpty();
        }

        @Test
        void physicalMismatchIsReportedBeforeTheDomain() {
            ColumnContract column = withTerm(varchar(1, "item_nm", 10), found("ITEM_NM", "명V50", "VARCHAR", 50));

            assertThat(errors(spec(map("ITEM_NM", "item_nm")), target(table(StandardStatus.PRESENT, column))))
                    .containsExactly(
                            "값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.item_nm — 값 100, 물리 컬럼 character varying 길이 10",
                            "값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.item_nm — 값 100, 표준 도메인 명V50 길이 50");
        }
    }

    // ---------------------------------------------------------------------------------------------
    // fixtures

    private List<String> errors(MappingSpec spec, TargetSchemaFingerprint target) {
        return validator.validate(spec, target, inventory()).errors();
    }

    private static TransformerRegistry registryWithCustom() {
        TransformerRegistry registry = new TransformerRegistry();
        registry.register("yyyymmdd", "custom:yyyymmdd:v1", "a".repeat(64), value -> value);
        return registry;
    }

    private static MappingSpec spec(ColumnMapping... columns) {
        return spec(new TableMapping(SOURCE, TARGET, null, List.of(columns), null));
    }

    private static MappingSpec spec(TableMapping table) {
        return new MappingSpec(null, null, List.of(table), Map.of());
    }

    private static ColumnMapping map(String source, String target) {
        return new ColumnMapping(source, target, null, null, null, null, null);
    }

    private static ColumnMapping hinted(String source, String target, String type) {
        return new ColumnMapping(source, target, null, type, null, null, null);
    }

    private static ColumnMapping constant(String target, String value) {
        return new ColumnMapping(null, target, null, null, null, null, value);
    }

    private static TargetSchemaFingerprint target(TableContract... tables) {
        return new TargetSchemaFingerprint(3, "PostgreSQL", "17", "f".repeat(64), List.of(),
                new TargetStandardSnapshot(TargetStandardSnapshot.CURRENT_SCHEMA_VERSION, List.of(tables)));
    }

    private static TableContract table(StandardStatus standard, ColumnContract... columns) {
        return new TableContract("public", "tb_item", ContractStatus.READ, standard, List.of(columns));
    }

    private static ColumnContract column(int ordinal, String name, String dataType, Integer length,
                                         Integer precision, Integer scale) {
        return new ColumnContract(name, ordinal, dataType, length, precision, scale, true, false, null, false, null);
    }

    private static ColumnContract varchar(int ordinal, String name, Integer length) {
        return column(ordinal, name, "character varying", length, null, null);
    }

    private static ColumnContract integer(int ordinal, String name) {
        return column(ordinal, name, "integer", null, 32, 0);
    }

    private static ColumnContract bigint(int ordinal, String name) {
        return column(ordinal, name, "bigint", null, 64, 0);
    }

    private static ColumnContract timestamp(int ordinal, String name) {
        return column(ordinal, name, "timestamp without time zone", null, null, null);
    }

    private static ColumnContract required(ColumnContract c) {
        return new ColumnContract(c.name(), c.ordinal(), c.dataType(), c.characterMaximumLength(),
                c.numericPrecision(), c.numericScale(), false, c.hasDefault(), c.identityGeneration(),
                c.generated(), c.term());
    }

    private static ColumnContract withDefault(ColumnContract c) {
        return new ColumnContract(c.name(), c.ordinal(), c.dataType(), c.characterMaximumLength(),
                c.numericPrecision(), c.numericScale(), c.nullable(), true, c.identityGeneration(),
                c.generated(), c.term());
    }

    private static ColumnContract identity(ColumnContract c, String generation) {
        return new ColumnContract(c.name(), c.ordinal(), c.dataType(), c.characterMaximumLength(),
                c.numericPrecision(), c.numericScale(), c.nullable(), c.hasDefault(), generation,
                c.generated(), c.term());
    }

    private static ColumnContract generated(ColumnContract c) {
        return new ColumnContract(c.name(), c.ordinal(), c.dataType(), c.characterMaximumLength(),
                c.numericPrecision(), c.numericScale(), c.nullable(), c.hasDefault(), c.identityGeneration(),
                true, c.term());
    }

    private static ColumnContract withTerm(ColumnContract c, StandardTerm term) {
        return new ColumnContract(c.name(), c.ordinal(), c.dataType(), c.characterMaximumLength(),
                c.numericPrecision(), c.numericScale(), c.nullable(), c.hasDefault(), c.identityGeneration(),
                c.generated(), term);
    }

    private static StandardTerm found(String abbreviation, String domainName, String dataType, Integer length) {
        return new StandardTerm(TermStatus.FOUND, abbreviation, domainName, dataType, length);
    }

    /** 레거시 표 legacy.legacy_item 의 JDBC 컬럼 선언. */
    private static CatalogSnapshot inventory() {
        List<CatalogObject> objects = new ArrayList<>();
        objects.add(tableObject("legacy_item"));
        objects.add(columnObject("legacy_item", "ITEM_ID", Types.VARCHAR, 20, 0));
        objects.add(columnObject("legacy_item", "ITEM_NM", Types.VARCHAR, 100, 0));
        objects.add(columnObject("legacy_item", "STATUS", Types.CHAR, 21, 0));
        objects.add(columnObject("legacy_item", "BODY", Types.CLOB, 0, 0));
        objects.add(columnObject("legacy_item", "REG_DE", Types.DATE, 10, 0));
        objects.add(columnObject("legacy_item", "REG_DT", Types.TIMESTAMP, 29, 6));
        objects.add(columnObject("legacy_item", "REG_TZ", Types.TIMESTAMP_WITH_TIMEZONE, 35, 6));
        objects.add(columnObject("legacy_item", "OPEN_TM", Types.TIME, 8, 0));
        objects.add(columnObject("legacy_item", "USE_AT", Types.BIT, 1, 0));
        objects.add(columnObject("legacy_item", "PHOTO", Types.BLOB, 0, 0));
        objects.add(columnObject("legacy_item", "RATE", Types.DOUBLE, 17, 0));
        objects.add(columnObject("legacy_item", "AMOUNT", Types.NUMERIC, 12, 4));
        objects.add(columnObject("legacy_item", "PRICE", Types.DECIMAL, 9, 2));
        objects.add(columnObject("legacy_item", "QTY", Types.INTEGER, 10, 0));
        objects.add(columnObject("legacy_item", "SMALL", Types.SMALLINT, 5, 0));
        objects.add(columnObject("legacy_item", "TINY", Types.TINYINT, 3, 0));
        objects.add(columnObject("legacy_item", "BIG", Types.BIGINT, 19, 0));
        objects.add(columnObject("legacy_item", "DIGITS9", Types.NUMERIC, 9, 0));
        objects.add(columnObject("legacy_item", "DIGITS10", Types.NUMERIC, 10, 0));
        objects.add(columnObject("legacy_item", "WHOLE18", Types.NUMERIC, 18, 0));
        objects.add(columnObject("legacy_item", "WHOLE19", Types.NUMERIC, 19, 0));
        objects.add(columnObject("legacy_item", "ORACLE_NUMBER", Types.NUMERIC, 0, -127));
        objects.add(columnObject("legacy_item", "ODD", Types.OTHER, 10, 0));
        objects.add(columnObject("legacy_item", "NUM_UNSPECIFIED", Types.NUMERIC, 0, 0));
        objects.add(columnObject("legacy_item", "FRACTION", Types.NUMERIC, 2, 2));
        return inventory(objects);
    }

    private static CatalogSnapshot inventory(List<CatalogObject> objects) {
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-13T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("Oracle", "19", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), objects, List.of());
    }

    private static CatalogObject tableObject(String table) {
        return new CatalogObject(ObjectKind.TABLE, "db", "legacy", table, false, null, null, List.of(), Map.of());
    }

    private static CatalogObject columnObject(String table, String column, int jdbcType, long size, int scale) {
        return new CatalogObject(ObjectKind.COLUMN, "db", "legacy", table + "." + column, false, null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", table)),
                Map.of("parentTable", table, "originalName", column, "jdbcType", Integer.toString(jdbcType),
                        "size", Long.toString(size), "scale", Integer.toString(scale)));
    }
}
