package nuri.migration.validate;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.domain.DomainViolation;
import nuri.migration.domain.TargetValueGuard;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.Nullify;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
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
                "REG_DE, timestamp without time zone, false",
                "REG_DE, timestamp with time zone, false",
                "REG_DT, timestamp without time zone, true",
                "REG_DT, date, false",
                "REG_DT, character varying, false",
                "REG_TZ, timestamp with time zone, true",
                "REG_TZ, timestamp without time zone, false",
                "USE_AT, boolean, true",
                "USE_AT, character varying, false",
                "OPEN_TM, time without time zone, true",
                "OPEN_TM, time with time zone, false",
                "TIME_TZ, time with time zone, true",
                "TIME_TZ, time without time zone, false",
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
            ColumnMapping builtinTruncate = new ColumnMapping("ITEM_ID", "reg_ymd", "date-truncate", null, null, null, null);
            TargetSchemaFingerprint target = target(table(StandardStatus.ABSENT, varchar(1, "reg_ymd", 8)));

            assertThat(errors(spec(custom), target)).isEmpty();
            assertThat(errors(spec(unregistered), target)).isEmpty();
            assertThat(errors(spec(builtinDate), target)).singleElement().asString().contains("값 DATE");
            assertThat(errors(spec(builtinTimestamp), target)).singleElement().asString().contains("값 TIMESTAMP");
            // date-truncate 는 날짜를 낸다(DEC-OPS-309) — 문자열 컬럼에 쓰면 종류가 다르다.
            assertThat(errors(spec(builtinTruncate), target)).singleElement().asString().contains("값 DATE");
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

        // 날짜·시각 힌트는 날짜·시각 소스(REG_DT)로 본다 — 문자 소스는 구조 규칙이 따로 막는다(ADR-0029 L3a-2).
        @ParameterizedTest(name = "{0} 힌트 → {1}")
        @CsvSource({
                "boolean, boolean, 0, ITEM_ID", "bool, character varying, 1, ITEM_ID",
                "date, date, 0, REG_DT", "datetime, timestamp without time zone, 0, REG_DT",
                "timestamp, date, 1, REG_DT",
                "double, double precision, 0, ITEM_ID", "string, text, 0, ITEM_ID", "varchar, text, 0, ITEM_ID",
                "char, text, 0, ITEM_ID", "integer, integer, 0, ITEM_ID", "bigint, bigint, 0, ITEM_ID",
                "numeric, numeric, 0, ITEM_ID", "unknown-hint, jsonb, 0, ITEM_ID"
        })
        void typeHintDecidesValueFamily(String hint, String targetType, int expectedErrors, String source) {
            assertThat(errors(spec(hinted(source, "target_col", hint)),
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
            Map<String, CodeMap> codemaps = new LinkedHashMap<>();
            codemaps.put("closed", new CodeMap(Map.of("1", "Y", "0", "N"), UnmappedPolicy.FALLBACK, "N"));
            codemaps.put("open", new CodeMap(Map.of("1", "SECRET-CODE-VALUE"), UnmappedPolicy.PASSTHROUGH, null));
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
        void codemapWithFallbackIsBoundByItsOwnValues() {
            Map<String, CodeMap> codemaps = Map.of("wide",
                    new CodeMap(Map.of("1", "ABC"), UnmappedPolicy.FALLBACK, "ABCDEF"));
            MappingSpec spec = new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null, List.of(
                    new ColumnMapping("ITEM_NM", "code_cd", null, null, "wide", null, null)), null)), codemaps);

            assertThat(validator.validate(spec, target(table(StandardStatus.ABSENT, varchar(1, "code_cd", 5))),
                    inventory()).errors()).singleElement().asString().contains("값 6");
            assertThat(validator.validate(spec, target(table(StandardStatus.ABSENT, varchar(1, "code_cd", 6))),
                    inventory()).errors()).isEmpty();
        }

        @Test
        void failingCodemapIsBoundByItsCodesAndNullFallback() {
            // 기본 unmapped: fail 은 미매핑 코드를 쓰지 않으므로 원천 길이(ITEM_NM 100)가 남지 않는다.
            Map<String, CodeMap> codemaps = Map.of(
                    "strict", new CodeMap(Map.of("1", "ABC"), UnmappedPolicy.FAIL, null),
                    "nullable", new CodeMap(Map.of("1", "ABC"), UnmappedPolicy.FAIL, "ABCDEF", NullPolicy.FALLBACK));
            TargetSchemaFingerprint narrow = target(table(StandardStatus.ABSENT, varchar(1, "code_cd", 5)));

            assertThat(validator.validate(new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null,
                    List.of(new ColumnMapping("ITEM_NM", "code_cd", null, null, "strict", null, null)), null)),
                    codemaps), narrow, inventory()).errors()).isEmpty();
            assertThat(validator.validate(new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null,
                    List.of(new ColumnMapping("ITEM_NM", "code_cd", null, null, "nullable", null, null)), null)),
                    codemaps), narrow, inventory()).errors()).singleElement().asString().contains("값 6");
        }

        @Test
        void codemapPassthroughKeepsUnmappedSourceLength() {
            Map<String, CodeMap> codemaps = Map.of("open",
                    new CodeMap(Map.of("1", "LONGER-CODE-VALUE-XYZ"), UnmappedPolicy.PASSTHROUGH, null));
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
                    .as("[ADR-0029 L3b] 문자 소스 → decimal 의 정밀도는 행마다 값 한계 가드가 판정한다(RowGuards)")
                    .isEmpty();
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

    @Nested
    @DisplayName("암호문·표준 ID 처럼 매핑이 직접 쓰지 않는 값도 실제로 쓰는 길이로 대조한다")
    class WrittenValues {

        private static final String RRNO_TOO_LONG = "값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.user_enrrno"
                + " — 값 536, 물리 컬럼 character varying 길이 256";

        @Test
        void encryptedColumnIsCheckedByItsCiphertextLength() {
            TargetSchemaFingerprint target = target(table(StandardStatus.ABSENT, varchar(1, "user_enrrno", 256)));

            assertThat(errors(spec(encrypted("JUMIN", null)), target))
                    .as("13자 주민번호의 암호문은 88자다").isEmpty();
            assertThat(errors(spec(encrypted("ITEM_NM", null)), target))
                    .as("평문 100자가 들어가도 암호문 536자는 들어가지 않는다").containsExactly(RRNO_TOO_LONG);
            assertThat(TargetValueDomain.ciphertextLength(13)).isEqualTo(88);
            assertThat(TargetValueDomain.ciphertextLength(48)).isEqualTo(256);
            assertThat(TargetValueDomain.ciphertextLength(49)).isEqualTo(280);
        }

        @Test
        void encryptedColumnTakesOnlyTextSourceValues() {
            TargetSchemaFingerprint target = target(table(StandardStatus.ABSENT, varchar(1, "user_enrrno", 256)));
            String numeric = "암호화 컬럼은 문자열 소스 값만 암호화합니다 — 숫자·날짜는 앞자리 0·표기가 바뀌므로"
                    + " 정규화하는 변환기를 선언하세요: public.tb_item.user_enrrno ← legacy.legacy_item.";

            assertThat(errors(spec(encrypted("JUMIN_NUM", null)), target)).containsExactly(numeric + "JUMIN_NUM");
            assertThat(errors(spec(encrypted("JUMIN_NUM", "trim")), target))
                    .as("내장 변환기는 toString 이라 정규화가 아니다").containsExactly(numeric + "JUMIN_NUM");
            assertThat(errors(spec(encrypted("REG_DE", null)), target)).containsExactly(numeric + "REG_DE");
            assertThat(errors(spec(encrypted("JUMIN", "date")), target)).containsExactly(numeric + "JUMIN");
            assertThat(errors(spec(encrypted("JUMIN_NUM", "yyyymmdd")), target))
                    .as("내장이 아닌 변환기는 출력 계약을 스스로 진다").isEmpty();
        }

        @Test
        void generatedIdIsCheckedAgainstTheNarrowerOfColumnAndDomain() {
            TableMapping table = new TableMapping(SOURCE, TARGET, null, null, List.of(), null,
                    List.of(map("ITEM_ID", "item_id")), new IdStrategy("esntl_id", "ITEM_", "ITEM_ID"));

            assertThat(errors(spec(table), target(table(StandardStatus.ABSENT,
                    varchar(1, "item_id", 20), varchar(2, "esntl_id", 20))))).isEmpty();
            assertThat(errors(spec(table), target(table(StandardStatus.ABSENT,
                    varchar(1, "item_id", 20), varchar(2, "esntl_id", 16)))))
                    .containsExactly("값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.esntl_id — 값 20,"
                            + " 물리 컬럼 character varying 길이 16");
            assertThat(errors(spec(table), target(table(StandardStatus.PRESENT,
                    withTerm(varchar(1, "item_id", 20), found("ITEM_ID", "ID V20", "VARCHAR", 20)),
                    withTerm(varchar(2, "esntl_id", 20), found("ESNTL_ID", "ID V16", "VARCHAR", 16))))))
                    .containsExactly("값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.esntl_id — 값 20,"
                            + " 표준 도메인 ID V16 길이 16");
        }

        @Test
        void longPrefixesLeaveTooFewRandomDigits() {
            TableMapping table = new TableMapping(SOURCE, TARGET, null, null, List.of(), null,
                    List.of(map("ITEM_ID", "item_id")), new IdStrategy("esntl_id", " LONG_PREFIX_ ", "ITEM_ID"));

            assertThat(errors(spec(table), target(table(StandardStatus.ABSENT,
                    varchar(1, "item_id", 20), varchar(2, "esntl_id", 20)))))
                    .containsExactly("idStrategy 접두사가 길어 표준 ID 의 무작위 자릿수가 8자뿐입니다 — 온라인 앱의 최소"
                            + " 10자보다 짧아 충돌 위험이 큽니다: public.tb_item.esntl_id");
            assertThat(errors(spec(new TableMapping(SOURCE, TARGET, null, null, List.of(), null,
                    List.of(map("ITEM_ID", "item_id")), new IdStrategy("esntl_id", "PREFIX_10_", "ITEM_ID"))),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_id", 20), varchar(2, "esntl_id", 20)))))
                    .as("hex 10자는 온라인 GROUP_ 과 같다").isEmpty();
        }

        @Test
        void foreignKeyValuesUseTheParentGeneratedIdLength() {
            TableMapping table = new TableMapping(SOURCE, TARGET, null, null, List.of(), null,
                    List.of(map("ITEM_ID", "item_id"),
                            new ColumnMapping("ITEM_ID", "parent_id", null, null, null, SOURCE, null)),
                    new IdStrategy("esntl_id", "ITEM_", "ITEM_ID"));

            assertThat(errors(spec(table), target(table(StandardStatus.ABSENT, varchar(1, "item_id", 20),
                    varchar(2, "esntl_id", 20), varchar(3, "parent_id", 16)))))
                    .containsExactly("값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.parent_id — 값 20,"
                            + " 물리 컬럼 character varying 길이 16");
            assertThat(errors(spec(new TableMapping(SOURCE, TARGET, null, List.of(map("ITEM_ID", "item_id"),
                    new ColumnMapping("ITEM_ID", "parent_id", null, null, null, "unknown_parent", null)), null)),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_id", 20), varchar(3, "parent_id", 16)))))
                    .as("부모를 모르면 길이도 모른다").isEmpty();
        }

        private static ColumnMapping encrypted(String source, String transform) {
            return new ColumnMapping(source, "user_enrrno", transform, null, null, null, null, "aria-egov-v1");
        }
    }

    @Nested
    @DisplayName("표준 도메인 변환기와 정제 선언을 live 계약으로 대조한다(ADR-0029 L3a-1)")
    class StandardDomainTransformers {

        private static final String DATE_INTO_TIMESTAMP = "값 타입이 타깃과 맞지 않습니다: public.tb_item.reg_dt — 값 DATE,"
                + " 물리 컬럼 timestamp without time zone — 날짜를 그날 00:00 일시로 쓰려면 transform:"
                + " timestamp-from-date 를 선언하세요";
        private static final String ZONED_ESCAPE = "그대로 시간대 있는 컬럼(timestamptz·timetz)에 옮기세요(시간대를 정하는"
                + " 내장 변환기는 아직 없습니다)";
        private static final String ZONED_CONVERTED = "시간대가 있는 소스 값은 변환하면 실행 환경의 시간대에 따라 다른"
                + " 날짜·시각이 됩니다 — " + ZONED_ESCAPE + ": public.tb_item.target_col ← legacy.legacy_item.";
        private static final String ZONED_KEPT = " — 시간대가 있는 값은 시간대 없는 컬럼에 쓰면 실행 환경의 시간대에 따라"
                + " 다른 일시·시각이 됩니다. " + ZONED_ESCAPE;

        @Test
        void ymd8WritesEightCharactersWhateverTheSourceLength() {
            ColumnMapping fromNumber = transformed("YMD_NUM", "end_ymd", "ymd8");

            assertThat(errors(spec(fromNumber), target(table(StandardStatus.ABSENT, varchar(1, "end_ymd", 8)))))
                    .as("NUMBER(8) 를 문자로 쓰면 부호 자리까지 9자지만 ymd8 은 8자를 낸다").isEmpty();
            assertThat(errors(spec(fromNumber), target(table(StandardStatus.ABSENT, varchar(1, "end_ymd", 7)))))
                    .containsExactly("값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.end_ymd — 값 8,"
                            + " 물리 컬럼 character varying 길이 7");
            assertThat(errors(spec(transformed("ITEM_NM", "end_ymd", "ymd8")),
                    target(table(StandardStatus.ABSENT, varchar(1, "end_ymd", 8)))))
                    .as("100자 문자 소스도 8자로 쓴다").isEmpty();
        }

        @ParameterizedTest(name = "{0} 은 {1} 에 맞고 {2} 에는 맞지 않는다")
        @CsvSource({
                "ymd8-truncate, REG_DT, 'character varying,8', 'character varying,7'",
                "ymdhms14, ITEM_NM, 'character varying,14', 'character varying,13'",
                "hms6, ITEM_NM, 'character varying,6', 'character varying,5'",
                "yn, ITEM_NM, 'character varying,1', 'integer,'",
                "date-text, ITEM_NM, 'date,', 'character varying,10'",
                "date-truncate, REG_DT, 'date,', 'timestamp without time zone,'",
                "timestamp-text, ITEM_NM, 'timestamp without time zone,', 'date,'",
                "timestamp-from-date, REG_DE, 'timestamp without time zone,', 'character varying,29'"
        })
        void eachDomainTransformerDeclaresItsOutput(String transform, String source, String fits, String misfits) {
            assertThat(errors(spec(transformed(source, "target_col", transform)), target(table(StandardStatus.ABSENT,
                    declared(fits))))).as(transform + " → " + fits).isEmpty();
            assertThat(errors(spec(transformed(source, "target_col", transform)), target(table(StandardStatus.ABSENT,
                    declared(misfits))))).as(transform + " → " + misfits).hasSize(1);
        }

        @Test
        void dateValuesCannotBeWrittenIntoTimestampColumns() {
            TargetSchemaFingerprint target = target(table(StandardStatus.ABSENT, timestamp(1, "reg_dt")));

            assertThat(errors(spec(map("REG_DE", "reg_dt")), target)).containsExactly(DATE_INTO_TIMESTAMP);
            assertThat(errors(spec(hinted("ITEM_NM", "reg_dt", "date")), target)).containsExactly(DATE_INTO_TIMESTAMP);
            assertThat(errors(spec(transformed("ITEM_NM", "reg_dt", "date-text")), target))
                    .containsExactly(DATE_INTO_TIMESTAMP);
            assertThat(errors(spec(transformed("REG_DE", "reg_dt", "timestamp-from-date")), target))
                    .as("그날 00:00 일시로 밝히면 쓸 수 있다").isEmpty();
            assertThat(errors(spec(map("REG_DE", "reg_de")), target(table(StandardStatus.ABSENT,
                    column(1, "reg_de", "date", null, null, null))))).isEmpty();
        }

        @Test
        void nonTemporalSourcesReachTimeColumnsOnlyThroughTransformersThatJudgeEachValue() {
            TargetSchemaFingerprint dateColumn = target(table(StandardStatus.ABSENT,
                    column(1, "reg_de", "date", null, null, null)));
            TargetSchemaFingerprint timestampColumn = target(table(StandardStatus.ABSENT, timestamp(1, "reg_dt")));
            String loose = "날짜·시각이 아닌 소스 값은 type(date·timestamp·datetime)이나 내장 date·timestamp 로 날짜·시각"
                    + " 컬럼에 옮기지 않습니다 — 값마다 판정하는 date-text·timestamp-text·timestamp-from-date·"
                    + "date-truncate 를 쓰세요: ";

            for (ColumnMapping mapping : List.of(hinted("ITEM_NM", "reg_de", "date"),
                    hinted("ITEM_NM", "reg_de", "DATE"), transformed("ITEM_NM", "reg_de", "date"),
                    hinted("YMD_NUM", "reg_de", "date"))) {
                assertThat(errors(spec(mapping), dateColumn)).as(mapping.toString())
                        .containsExactly(loose + "public.tb_item.reg_de ← legacy.legacy_item." + mapping.source());
            }
            for (ColumnMapping mapping : List.of(hinted("ITEM_NM", "reg_dt", "timestamp"),
                    hinted("ITEM_NM", "reg_dt", "datetime"), transformed("ITEM_NM", "reg_dt", "timestamp"))) {
                assertThat(errors(spec(mapping), timestampColumn)).as(mapping.toString())
                        .containsExactly(loose + "public.tb_item.reg_dt ← legacy.legacy_item.ITEM_NM");
            }
            assertThat(errors(spec(transformed("ITEM_NM", "reg_de", "date-text")), dateColumn)).isEmpty();
            assertThat(errors(spec(transformed("YMD_NUM", "reg_de", "date-truncate")), dateColumn)).isEmpty();
            assertThat(errors(spec(transformed("ITEM_NM", "reg_dt", "timestamp-text")), timestampColumn)).isEmpty();
            assertThat(errors(spec(hinted("REG_DE", "reg_de", "date")), dateColumn))
                    .as("날짜 소스를 그대로 옮기는 type 은 받는다").isEmpty();
            assertThat(errors(spec(hinted("REG_DT", "reg_dt", "timestamp")), timestampColumn)).isEmpty();
        }

        @ParameterizedTest(name = "{0}")
        @CsvSource({"PG_TZ", "ORA_TZ", "ORA_LTZ", "MS_DTO", "REG_TZ", "CUBRID_TZ", "GENERIC_TZ", "GENERIC_LTZ",
                "PG_TIMETZ", "TIME_TZ"})
        void timeZoneSourcesAreNotConvertedIntoLocalDatesOrTimes(String source) {
            String rejected = ZONED_CONVERTED + source;
            TargetSchemaFingerprint text = target(table(StandardStatus.ABSENT, varchar(1, "target_col", 8)));
            TargetSchemaFingerprint local = target(table(StandardStatus.ABSENT, timestamp(1, "target_col")));

            assertThat(errors(spec(transformed(source, "target_col", "ymd8")), text)).containsExactly(rejected);
            assertThat(errors(spec(transformed(source, "target_col", "timestamp-text")), local))
                    .containsExactly(rejected);
            assertThat(errors(spec(hinted(source, "target_col", "timestamp")), local)).containsExactly(rejected);
            assertThat(errors(spec(transformed(source, "target_col", "yyyymmdd")), text))
                    .as("사용자 변환기는 시간대 규칙을 스스로 진다").isEmpty();
        }

        @Test
        void postgresTimestamptzReportedAsTimestampIsStillAZonedValue() {
            assertThat(errors(spec(map("PG_TZ", "chg_dt")), target(table(StandardStatus.ABSENT, timestamp(1, "chg_dt")))))
                    .as("그대로 옮겨도 시간대 없는 컬럼에는 쓰지 않고 그 이유를 말한다")
                    .containsExactly("값 타입이 타깃과 맞지 않습니다: public.tb_item.chg_dt — 값 TIMESTAMPTZ,"
                            + " 물리 컬럼 timestamp without time zone" + ZONED_KEPT);
            assertThat(errors(spec(map("PG_TZ", "chg_dt")), target(table(StandardStatus.ABSENT,
                    column(1, "chg_dt", "timestamp with time zone", null, null, null))))).isEmpty();
            assertThat(errors(spec(map("REG_DT", "chg_dt")), target(table(StandardStatus.ABSENT, timestamp(1, "chg_dt")))))
                    .as("시간대 없는 timestamp 는 그대로다").isEmpty();
            assertThat(errors(spec(map("LOCAL_DT", "chg_dt")), target(table(StandardStatus.ABSENT,
                    timestamp(1, "chg_dt"))))).as("타입 이름이 시간대를 말하지 않으면 지역 일시다").isEmpty();
            assertThat(errors(spec(transformed("LOCAL_DT", "end_ymd", "ymd8")), target(table(StandardStatus.ABSENT,
                    varchar(1, "end_ymd", 8))))).isEmpty();
        }

        @Test
        void zonedTimesAreNotKeptInLocalTimeColumns() {
            TargetSchemaFingerprint local = target(table(StandardStatus.ABSENT,
                    column(1, "open_tm", "time without time zone", null, null, null)));
            TargetSchemaFingerprint zoned = target(table(StandardStatus.ABSENT,
                    column(1, "open_tm", "time with time zone", null, null, null)));

            assertThat(errors(spec(map("PG_TIMETZ", "open_tm")), local))
                    .as("PostgreSQL 드라이버는 timetz 를 TIME 으로 알린다 — 타입 이름으로 가린다")
                    .containsExactly("값 타입이 타깃과 맞지 않습니다: public.tb_item.open_tm — 값 TIMETZ,"
                            + " 물리 컬럼 time without time zone" + ZONED_KEPT);
            assertThat(errors(spec(map("TIME_TZ", "open_tm")), local)).singleElement().asString()
                    .contains("값 TIMETZ").endsWith(ZONED_KEPT);
            assertThat(errors(spec(map("PG_TIMETZ", "open_tm")), zoned)).isEmpty();
            assertThat(errors(spec(map("TIME_TZ", "open_tm")), zoned)).isEmpty();
            assertThat(errors(spec(map("OPEN_TM", "open_tm")), local)).as("시간대 없는 시각은 그대로다").isEmpty();
            assertThat(errors(spec(map("OPEN_TM", "open_tm")), zoned))
                    .as("시간대 없는 시각을 timetz 에 쓰면 실행 환경의 시간대가 붙는다 — timestamp→timestamptz 와 같다")
                    .containsExactly("값 타입이 타깃과 맞지 않습니다: public.tb_item.open_tm — 값 TIME,"
                            + " 물리 컬럼 time with time zone");
        }

        @ParameterizedTest(name = "{0}")
        @CsvSource({"MySQL", "MariaDB"})
        void sessionZonedTimestampsOfMySqlAndMariaDbAreZoned(String product) {
            CatalogSnapshot inventory = productInventory(product);
            TargetSchemaFingerprint text = target(table(StandardStatus.ABSENT, varchar(1, "target_col", 8)));
            TargetSchemaFingerprint local = target(table(StandardStatus.ABSENT, timestamp(1, "target_col")));
            TargetSchemaFingerprint zoned = target(table(StandardStatus.ABSENT,
                    column(1, "target_col", "timestamp with time zone", null, null, null)));

            assertThat(validator.validate(spec(transformed("MY_TS", "target_col", "ymd8")), text, inventory).errors())
                    .containsExactly(ZONED_CONVERTED + "MY_TS");
            assertThat(validator.validate(spec(hinted("MY_TS", "target_col", "date")), target(table(
                    StandardStatus.ABSENT, column(1, "target_col", "date", null, null, null))), inventory).errors())
                    .containsExactly(ZONED_CONVERTED + "MY_TS");
            assertThat(validator.validate(spec(map("MY_TS", "target_col")), local, inventory).errors())
                    .containsExactly("값 타입이 타깃과 맞지 않습니다: public.tb_item.target_col — 값 TIMESTAMPTZ,"
                            + " 물리 컬럼 timestamp without time zone" + ZONED_KEPT);
            assertThat(validator.validate(spec(map("MY_TS", "target_col")), zoned, inventory).errors()).isEmpty();
            assertThat(validator.validate(spec(transformed("MY_DT", "target_col", "ymd8")), text, inventory).errors())
                    .as("DATETIME 은 시간대가 없다").isEmpty();
            assertThat(validator.validate(spec(map("MY_DT", "target_col")), local, inventory).errors()).isEmpty();
            assertThat(validator.validate(spec(transformed("MY_TS", "target_col", "ymd8")), text,
                    productInventory("Oracle")).errors())
                    .as("다른 제품의 TIMESTAMP 이름은 시간대를 말하지 않는다").isEmpty();
        }

        @ParameterizedTest(name = "{0} ← {1}: {2}")
        @CsvSource({
                "ymd8, YMD_NUM, true", "ymd8, QTY, true", "ymd8, REG_DE, true", "ymd8, REG_DT, true",
                "ymd8, BODY, true", "ymd8, USE_AT, false", "ymd8, OPEN_TM, false", "ymd8, RATE, false",
                "ymd8, PHOTO, false",
                "date-text, REG_DT, true", "timestamp-from-date, REG_DE, true", "date-truncate, OPEN_TM, false",
                "ymdhms14, REG_DT, true", "ymdhms14, AMOUNT, true", "ymdhms14, REG_DE, false",
                "timestamp-text, REG_DE, false",
                "hms6, OPEN_TM, true", "hms6, QTY, true", "hms6, REG_DT, false",
                "yn, USE_AT, true", "yn, ITEM_NM, true", "yn, QTY, false", "yn, REG_DE, false"
        })
        void domainTransformersOnlyTakeSourceKindsTheyCanRead(String transform, String source, boolean accepted) {
            String targetType = transform.startsWith("date") ? "date"
                    : transform.startsWith("timestamp") ? "timestamp without time zone" : "text";
            List<String> errors = errors(spec(transformed(source, "target_col", transform)),
                    target(table(StandardStatus.ABSENT, column(1, "target_col", targetType, null, null, null))));

            if (accepted) {
                assertThat(errors).as(transform + " ← " + source).isEmpty();
            } else {
                assertThat(errors).as(transform + " ← " + source).singleElement().asString()
                        .startsWith("표준 도메인 변환기 '" + transform + "' 는 ")
                        .endsWith(" 소스 값을 받지 않습니다 — 모든 행이 거부됩니다: public.tb_item.target_col"
                                + " ← legacy.legacy_item." + source);
            }
        }

        @Test
        void undiscoveredSourceOfADomainTransformerIsUnknown() {
            assertThat(errors(spec(transformed("NOT_DISCOVERED", "end_ymd", "ymd8")),
                    target(table(StandardStatus.ABSENT, varchar(1, "end_ymd", 8)))))
                    .containsExactly("소스 컬럼의 타입을 승인 inventory 에서 확인할 수 없습니다(없음·모호·미지원):"
                            + " public.tb_item.end_ymd ← legacy.legacy_item.NOT_DISCOVERED");
        }

        @Test
        void nullifyNeedsANullableTargetEvenWhenTheColumnHasADefault() {
            ColumnMapping cleaned = new ColumnMapping("ITEM_NM", "end_ymd", "ymd8", null, null, null, null, null,
                    List.of(new Nullify(DomainViolation.PLACEHOLDER_DATE, 3L)));
            String rejected = "nullify 는 NULL 을 받는 타깃 컬럼에만 선언할 수 있습니다 — 매핑한 컬럼은 NULL 을 명시해"
                    + " 쓰므로 기본값이 있어도 NOT NULL 이 거부합니다: public.tb_item.end_ymd";

            assertThat(errors(spec(cleaned), target(table(StandardStatus.ABSENT, varchar(1, "end_ymd", 8))))).isEmpty();
            assertThat(errors(spec(cleaned), target(table(StandardStatus.ABSENT,
                    withDefault(required(varchar(1, "end_ymd", 8))))))).containsExactly(rejected);
            assertThat(errors(spec(cleaned), target(table(StandardStatus.ABSENT,
                    required(varchar(1, "end_ymd", 8)))))).containsExactly(rejected);
        }

        @Test
        void yesNoDomainCodemapsWriteOnlyYOrN() {
            ColumnContract useYn = withTerm(varchar(1, "use_yn", 1), found("USE_YN", "여부C1", "CHAR", 1));
            ColumnContract code = withTerm(varchar(1, "use_yn", 1), found("USE_YN", "코드C1", "CHAR", 1));
            Map<String, CodeMap> codemaps = new LinkedHashMap<>();
            codemaps.put("flags", new CodeMap(Map.of("1", "Y", "0", "N"), UnmappedPolicy.FAIL, null));
            codemaps.put("odd", new CodeMap(Map.of("1", "Y", "0", "X"), UnmappedPolicy.FAIL, null));
            codemaps.put("odd_fallback", new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FALLBACK, "Z"));
            codemaps.put("null_fallback", new CodeMap(Map.of("1", "Y"), UnmappedPolicy.FAIL, "Z", NullPolicy.FALLBACK));
            codemaps.put("open", new CodeMap(Map.of("1", "Y", "0", "N"), UnmappedPolicy.PASSTHROUGH, null));
            String values = "여부 도메인 컬럼의 codemap 은 Y·N 만 내야 합니다(codemap '";
            String passthrough = "여부 도메인 컬럼의 codemap 은 unmapped: passthrough 를 쓸 수 없습니다 — 미매핑 레거시 값이"
                    + " 그대로 들어갑니다(codemap 'open'): public.tb_item.use_yn";

            assertThat(codemapErrors("flags", codemaps, useYn)).isEmpty();
            assertThat(codemapErrors("odd", codemaps, useYn))
                    .containsExactly(values + "odd'): public.tb_item.use_yn");
            assertThat(codemapErrors("odd_fallback", codemaps, useYn))
                    .containsExactly(values + "odd_fallback'): public.tb_item.use_yn");
            assertThat(codemapErrors("null_fallback", codemaps, useYn))
                    .containsExactly(values + "null_fallback'): public.tb_item.use_yn");
            assertThat(codemapErrors("open", codemaps, useYn)).contains(passthrough);
            assertThat(codemapErrors("odd", codemaps, code)).as("여부 도메인이 아니면 대조하지 않는다").isEmpty();
            assertThat(String.join("\n", codemapErrors("odd_fallback", codemaps, useYn)))
                    .as("코드값은 싣지 않는다").doesNotContain("Z").doesNotContain("X");
        }

        @Test
        void booleanSourceCodemapKeysAreExactlyTrueAndFalse() {
            Map<String, CodeMap> codemaps = new LinkedHashMap<>();
            codemaps.put("bool", new CodeMap(Map.of("true", "Y", "false", "N"), UnmappedPolicy.FAIL, null));
            codemaps.put("digits", new CodeMap(Map.of("1", "Y", "0", "N"), UnmappedPolicy.FAIL, null));
            codemaps.put("half", new CodeMap(Map.of("true", "Y"), UnmappedPolicy.FALLBACK, "N"));
            codemaps.put("extra", new CodeMap(Map.of("true", "Y", "false", "N", "1", "Y"), UnmappedPolicy.FAIL, null));
            ColumnContract useYn = varchar(1, "use_yn", 1);
            String rejected = "Boolean 소스의 codemap 키는 true·false 두 개여야 합니다(codemap '";

            assertThat(booleanErrors("bool", codemaps, useYn)).isEmpty();
            assertThat(booleanErrors("digits", codemaps, useYn))
                    .containsExactly(rejected + "digits'): public.tb_item.use_yn ← legacy.legacy_item.USE_AT");
            assertThat(booleanErrors("half", codemaps, useYn))
                    .containsExactly(rejected + "half'): public.tb_item.use_yn ← legacy.legacy_item.USE_AT");
            assertThat(booleanErrors("extra", codemaps, useYn))
                    .containsExactly(rejected + "extra'): public.tb_item.use_yn ← legacy.legacy_item.USE_AT");
            assertThat(validator.validate(new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null,
                    List.of(new ColumnMapping("ITEM_NM", "use_yn", null, null, "digits", null, null)), null)),
                    codemaps), target(table(StandardStatus.ABSENT, useYn)), inventory()).errors())
                    .as("문자 소스는 대조하지 않는다").isEmpty();
        }

        @Test
        void booleanSourceCodemapKeysFollowTheBuiltinTransformBeforeThem() {
            Map<String, CodeMap> codemaps = new LinkedHashMap<>();
            codemaps.put("bool", new CodeMap(Map.of("true", "Y", "false", "N"), UnmappedPolicy.FAIL, null));
            codemaps.put("upper_bool", new CodeMap(Map.of("TRUE", "Y", "FALSE", "N"), UnmappedPolicy.FAIL, null));
            codemaps.put("yn_fallback", new CodeMap(Map.of("Y", "Y", "N", "N"), UnmappedPolicy.FALLBACK, "N"));
            ColumnContract useYn = varchar(1, "use_yn", 1);
            String location = "'): public.tb_item.use_yn ← legacy.legacy_item.USE_AT";

            assertThat(booleanErrors("yn_fallback", "trim", codemaps, useYn))
                    .as("trim 은 Boolean 을 true·false 로 바꾼다 — 다른 키는 모든 행을 대체값으로 만든다")
                    .containsExactly("Boolean 소스의 codemap 키는 true·false 두 개여야 합니다(codemap 'yn_fallback"
                            + location);
            assertThat(booleanErrors("bool", "trim", codemaps, useYn)).isEmpty();
            assertThat(booleanErrors("bool", "lower", codemaps, useYn)).isEmpty();
            assertThat(booleanErrors("bool", "upper", codemaps, useYn))
                    .containsExactly("Boolean 소스의 codemap 키는 TRUE·FALSE(upper 뒤) 두 개여야 합니다(codemap 'bool"
                            + location);
            assertThat(booleanErrors("upper_bool", "upper", codemaps, useYn)).isEmpty();
            assertThat(booleanErrors("bool", "date", codemaps, useYn))
                    .containsExactly("Boolean 소스에는 내장 변환기 'date' 뒤에 codemap 을 쓸 수 없습니다 — 변환한 값이"
                            + " codemap 키에 닿지 않습니다(codemap 'bool" + location);
        }

        private List<String> booleanErrors(String codemap, String transform, Map<String, CodeMap> codemaps,
                                           ColumnContract column) {
            return validator.validate(new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null,
                    List.of(new ColumnMapping("USE_AT", "use_yn", transform, null, codemap, null, null)), null)),
                    codemaps), target(table(StandardStatus.ABSENT, column)), inventory()).errors();
        }

        private List<String> codemapErrors(String codemap, Map<String, CodeMap> codemaps, ColumnContract column) {
            return validator.validate(new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null,
                    List.of(new ColumnMapping("STATUS_CD", "use_yn", null, null, codemap, null, null)), null)),
                    codemaps), target(table(StandardStatus.PRESENT, column)), inventory()).errors();
        }

        private List<String> booleanErrors(String codemap, Map<String, CodeMap> codemaps, ColumnContract column) {
            return validator.validate(new MappingSpec(null, null, List.of(new TableMapping(SOURCE, TARGET, null,
                    List.of(new ColumnMapping("USE_AT", "use_yn", null, null, codemap, null, null)), null)),
                    codemaps), target(table(StandardStatus.ABSENT, column)), inventory()).errors();
        }

        /** {@code "타입,길이"} — 길이가 비면 null. */
        private static ColumnContract declared(String typeAndLength) {
            String[] parts = typeAndLength.split(",", -1);
            Integer length = parts[1].isEmpty() ? null : Integer.valueOf(parts[1]);
            return column(1, "target_col", parts[0], length, null, null);
        }
    }

    @Nested
    @DisplayName("행 단위 값 한계 가드로 옮기는 컬럼과 그 한계(ADR-0029 L3b)")
    class RowGuards {

        private static final String UNKNOWN_PRECISION = "값의 선언 정밀도·소수 자릿수를 확인할 수 없습니다: public.tb_item.amt";

        @Test
        void onlyTextSourcesTypedAsDecimalMoveTheirPrecisionCheckToTheRowGuard() {
            TargetSchemaFingerprint numeric = target(table(StandardStatus.ABSENT, column(1, "amt", "numeric", null, 10, 2)));
            TargetSchemaFingerprint integer = target(table(StandardStatus.ABSENT, integer(1, "amt")));

            assertThat(errors(spec(hinted("ITEM_ID", "amt", "decimal")), numeric)).isEmpty();
            assertThat(guards(spec(hinted("ITEM_ID", "amt", "decimal")), numeric))
                    .containsExactly(Map.entry("amt", new TargetValueGuard.Limit(null, 8, 2, null, false)));
            assertThat(errors(spec(hinted("ITEM_NM", "amt", "NUMERIC")), integer)).isEmpty();
            assertThat(guards(spec(hinted("ITEM_NM", "amt", "NUMERIC")), integer))
                    .containsExactly(Map.entry("amt", new TargetValueGuard.Limit(null, null, null, 3, false)));
            ColumnMapping trimmed = new ColumnMapping("ITEM_ID", "amt", "trim", "decimal", null, null, null);
            assertThat(errors(spec(trimmed), numeric)).as("내장 문자 변환 뒤에도 문자다").isEmpty();
            assertThat(guards(spec(trimmed), numeric)).containsOnlyKeys("amt");

            assertThat(errors(spec(map("ORACLE_NUMBER", "amt")), target(table(StandardStatus.ABSENT, bigint(1, "amt")))))
                    .as("선언을 모르는 숫자 소스는 그대로 정적으로 막는다")
                    .containsExactly(UNKNOWN_PRECISION + " — 물리 컬럼 bigint");
            assertThat(guards(spec(map("ORACLE_NUMBER", "amt")), target(table(StandardStatus.ABSENT, bigint(1, "amt")))))
                    .isEmpty();
            assertThat(errors(spec(hinted("REG_DE", "amt", "decimal")), numeric)).as("날짜 소스는 옮기지 않는다")
                    .containsExactly(UNKNOWN_PRECISION + " — 물리 컬럼 numeric");
            ColumnMapping dated = new ColumnMapping("ITEM_ID", "amt", "date", "decimal", null, null, null);
            assertThat(errors(spec(dated), numeric)).as("문자 소스라도 날짜로 바꾼 값은 옮기지 않는다")
                    .containsExactly(UNKNOWN_PRECISION + " — 물리 컬럼 numeric");
            assertThat(errors(spec(hinted("ITEM_ID", "amt", "decimal")),
                    target(table(StandardStatus.ABSENT, varchar(1, "amt", 10)))))
                    .as("길이 판정은 옮기지 않는다")
                    .containsExactly("값의 선언 최대 길이를 확인할 수 없습니다: public.tb_item.amt — 물리 컬럼"
                            + " character varying 길이 10");
        }

        @Test
        void theLimitIsTheNarrowerOfThePhysicalColumnAndTheDomainAndNotNullIgnoresTheDefault() {
            ColumnContract amount = withDefault(required(withTerm(column(1, "amt", "numeric", null, 15, 6),
                    found("AMT", "수N15,2", "NUMERIC", 15))));

            assertThat(errors(spec(hinted("ITEM_ID", "amt", "decimal")), target(table(StandardStatus.PRESENT, amount))))
                    .isEmpty();
            assertThat(guards(spec(hinted("ITEM_ID", "amt", "decimal")), target(table(StandardStatus.PRESENT, amount))))
                    .containsExactly(Map.entry("amt", new TargetValueGuard.Limit(null, 9, 2, null, true)));
            assertThat(guards(spec(hinted("ITEM_ID", "amt", "decimal")), target(table(StandardStatus.ABSENT, amount))))
                    .as("사전이 없으면 물리 컬럼만").containsExactly(
                            Map.entry("amt", new TargetValueGuard.Limit(null, 9, 6, null, true)));
            ColumnContract bigintDomain = withTerm(bigint(1, "amt"), found("AMT", "수N10", "NUMERIC", 10));
            assertThat(guards(spec(hinted("ITEM_ID", "amt", "numeric")), target(table(StandardStatus.PRESENT,
                    bigintDomain)))).containsExactly(Map.entry("amt", new TargetValueGuard.Limit(null, 10, 0, 4, false)));
        }

        @Test
        void isolatedColumnsAreGuardedWithTheirStaticChecksKept() {
            ColumnMapping isolated = new ColumnMapping("ITEM_NM", "item_nm", null, null, null, null, null, null,
                    List.of(), new MappingSpec.Isolate("L1", 3L, List.of("REQUIRED_MISSING")));
            ColumnContract named = required(withTerm(varchar(1, "item_nm", 200), found("ITEM_NM", "명V150",
                    "VARCHAR", 150)));

            assertThat(errors(spec(isolated, map("ITEM_ID", "item_id")),
                    target(table(StandardStatus.PRESENT, named, varchar(2, "item_id", 20))))).isEmpty();
            assertThat(guards(spec(isolated, map("ITEM_ID", "item_id")),
                    target(table(StandardStatus.PRESENT, named, varchar(2, "item_id", 20)))))
                    .as("격리 선언이 없는 컬럼은 가드를 받지 않는다")
                    .containsExactly(Map.entry("item_nm", new TargetValueGuard.Limit(150L, null, null, null, true)));
            assertThat(errors(spec(isolated), target(table(StandardStatus.ABSENT, varchar(1, "item_nm", 50)))))
                    .as("격리 컬럼도 선언 길이의 정적 판정은 그대로다")
                    .containsExactly("값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.item_nm — 값 100,"
                            + " 물리 컬럼 character varying 길이 50");
        }

        @Test
        @DisplayName("[DEC-OPS-322] 원장이 승인한 LENGTH_EXCEEDED·PRECISION_EXCEEDED 의 정적 판정만 값 한계 가드로 옮긴다")
        void approvedLengthAndPrecisionExceptionsMoveTheirStaticJudgementToTheRowGuard() {
            TargetSchemaFingerprint narrowText = target(table(StandardStatus.ABSENT, varchar(1, "item_nm", 50)));
            ColumnMapping lengthApproved = isolated("ITEM_NM", "item_nm", null, "LENGTH_EXCEEDED");
            assertThat(errors(spec(lengthApproved), narrowText)).as("선언 100자 → 50자도 행마다 판정한다").isEmpty();
            assertThat(guards(spec(lengthApproved), narrowText))
                    .containsExactly(Map.entry("item_nm", new TargetValueGuard.Limit(50L, null, null, null, false)));
            ColumnMapping unknownLength = isolated("BODY", "item_nm", null, "LENGTH_EXCEEDED");
            assertThat(errors(spec(unknownLength), narrowText)).as("선언 길이를 모르는 CLOB 도 옮긴다").isEmpty();
            ColumnContract domainNarrower = withTerm(varchar(1, "item_nm", 200), found("ITEM_NM", "명V40", "VARCHAR", 40));
            assertThat(errors(spec(lengthApproved), target(table(StandardStatus.PRESENT, domainNarrower))))
                    .as("표준 도메인 길이 판정도 옮긴다").isEmpty();
            assertThat(guards(spec(lengthApproved), target(table(StandardStatus.PRESENT, domainNarrower))))
                    .containsExactly(Map.entry("item_nm", new TargetValueGuard.Limit(40L, null, null, null, false)));

            TargetSchemaFingerprint narrowDecimal = target(table(StandardStatus.ABSENT,
                    column(1, "amt", "numeric", null, 10, 2)));
            ColumnMapping precisionApproved = isolated("AMOUNT", "amt", null, "PRECISION_EXCEEDED");
            assertThat(errors(spec(precisionApproved), narrowDecimal)).as("numeric(12,4) → numeric(10,2)").isEmpty();
            assertThat(guards(spec(precisionApproved), narrowDecimal))
                    .containsExactly(Map.entry("amt", new TargetValueGuard.Limit(null, 8, 2, null, false)));
            assertThat(errors(spec(isolated("BIG", "amt", null, "PRECISION_EXCEEDED")),
                    target(table(StandardStatus.ABSENT, integer(1, "amt"))))).as("bigint → integer 범위도 옮긴다")
                    .isEmpty();
            assertThat(errors(spec(isolated("ORACLE_NUMBER", "amt", null, "PRECISION_EXCEEDED")), narrowDecimal))
                    .as("선언 정밀도를 모르는 수도 옮긴다").isEmpty();
        }

        @Test
        @DisplayName("[DEC-OPS-322] 그 코드를 승인하지 않았거나 가드가 길이를 재지 않는 값은 정적 판정이 그대로 멈춘다")
        void columnsWithoutTheApprovedCodeOrWithValuesTheGuardCannotMeasureKeepTheStaticJudgement() {
            TargetSchemaFingerprint narrowText = target(table(StandardStatus.ABSENT, varchar(1, "item_nm", 50)));
            String tooLong = "값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.item_nm — 값 100, 물리 컬럼 character"
                    + " varying 길이 50";
            assertThat(errors(spec(isolated("ITEM_NM", "item_nm", null, "PRECISION_EXCEEDED", "FORMAT")), narrowText))
                    .as("정밀도만 승인한 문자 컬럼").containsExactly(tooLong);
            assertThat(errors(spec(map("ITEM_NM", "item_nm")), narrowText)).as("isolate 가 없는 컬럼")
                    .containsExactly(tooLong);

            TargetSchemaFingerprint narrowDecimal = target(table(StandardStatus.ABSENT,
                    column(1, "amt", "numeric", null, 10, 2)));
            assertThat(errors(spec(isolated("AMOUNT", "amt", null, "LENGTH_EXCEEDED")), narrowDecimal))
                    .as("길이만 승인한 수 컬럼")
                    .containsExactly("소수 자릿수가 타깃보다 많아 반올림됩니다: public.tb_item.amt — 값 4, 물리 컬럼 numeric 2");

            assertThat(errors(spec(isolated("ITEM_ID", "item_nm", "uuid", "LENGTH_EXCEEDED")),
                    target(table(StandardStatus.ABSENT, varchar(1, "item_nm", 10)))))
                    .as("가드는 UUID 표기 길이를 재지 않는다")
                    .containsExactly("값의 선언 최대 길이가 타깃보다 깁니다: public.tb_item.item_nm — 값 36, 물리 컬럼"
                            + " character varying 길이 10");
            assertThat(errors(spec(isolated("REG_DE", "item_nm", null, "LENGTH_EXCEEDED")), narrowText))
                    .as("값 종류가 맞지 않는 것은 늘 정적이다")
                    .containsExactly("값 타입이 타깃과 맞지 않습니다: public.tb_item.item_nm — 값 DATE, 물리 컬럼 character"
                            + " varying");
        }

        private static ColumnMapping isolated(String source, String target, String type, String... violations) {
            return new ColumnMapping(source, target, null, type, null, null, null, null, List.of(),
                    new MappingSpec.Isolate("L1", 3L, List.of(violations)));
        }

        @Test
        void relaxedColumnsOfTargetGeneratedMappingsAreGuardedToo() {
            TableMapping generated = new TableMapping(SOURCE, TARGET, null, "ITEM_ID", List.of(), null,
                    List.of(hinted("ITEM_ID", "amt", "decimal")), null,
                    new IdentityStrategy(TargetIdentityPolicy.TARGET_GENERATED,
                            List.of(new IdentityComponentSpec("ITEM_ID", IdentityValueType.TEXT)),
                            List.of(new IdentityComponentSpec("item_sn", IdentityValueType.SIGNED_INTEGER))),
                    List.of());

            assertThat(guards(spec(generated), target(table(StandardStatus.ABSENT,
                    column(1, "amt", "numeric", null, 5, 2), identity(bigint(2, "item_sn"), "BY DEFAULT")))))
                    .containsExactly(Map.entry("amt", new TargetValueGuard.Limit(null, 3, 2, null, false)));
        }

        @Test
        void guardsCannotBeComputedWithoutTheLiveContract() {
            MappingSpec spec = spec(hinted("ITEM_ID", "amt", "decimal"));
            TableMapping table = spec.tables().getFirst();

            org.assertj.core.api.Assertions.assertThatThrownBy(() -> validator.rowGuards(spec, table, null, inventory()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("값 한계 가드에 쓸 타깃 live 계약 또는 소스 inventory 가 없습니다");
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> validator.rowGuards(spec, table,
                            target(new TableContract("public", "tb_other", ContractStatus.READ, StandardStatus.ABSENT,
                                    List.of(varchar(1, "x", 1)))), inventory()))
                    .hasMessage("값 한계 가드에 쓸 타깃 표 계약이 없습니다: public.tb_item");
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> validator.rowGuards(spec, table,
                            target(table(StandardStatus.ABSENT, varchar(1, "other", 1))), inventory()))
                    .hasMessage("값 한계 가드에 쓸 타깃 컬럼 계약이 없습니다: public.tb_item.amt");
        }

        @Test
        void theWorkflowHandsGuardsToTheExecutorPerSourceTableOnlyForTablesThatNeedThem() {
            TableMapping guarded = new TableMapping(SOURCE, TARGET, null, List.of(hinted("ITEM_ID", "amt", "decimal")),
                    null);
            TableMapping plain = new TableMapping("legacy.legacy_note", "public.tb_note", null,
                    List.of(map("ITEM_ID", "note_id")), null);
            MappingSpec spec = new MappingSpec(null, null, List.of(guarded, plain), Map.of());
            TargetSchemaFingerprint target = target(table(StandardStatus.ABSENT, column(1, "amt", "numeric", null, 10, 2)),
                    new TableContract("public", "tb_note", ContractStatus.READ, StandardStatus.ABSENT,
                            List.of(varchar(1, "note_id", 20))));

            assertThat(new MappingValidator(transformers, "unused-db-columns.json").rowGuards(spec, target, inventory()))
                    .containsExactly(Map.entry(SOURCE, Map.of("amt", new TargetValueGuard.Limit(null, 8, 2, null, false))));
        }

        /**
         * [ADR-0029 L3c·L3d] 가드 표의 키는 매핑 라벨이다 — 소스를 나눈 매핑은 {@code source#id} 마다 자기 가드를 갖고, 조회 조인을
         * 쓰는 매핑(id 필수)도 그렇다. 소스 이름으로 묶으면 나눈 매핑의 가드가 서로를 덮고, 실행기가 라벨로 찾을 때 비어
         * PostgreSQL 이 numeric 값을 조용히 반올림한다.
         */
        @Test
        void guardsAreKeyedByTheMappingLabelForSplitAndLookupMappings() {
            TableMapping main = new TableMapping(SOURCE, TARGET, null, "ITEM_ID", List.of(), null,
                    List.of(hinted("ITEM_ID", "amt", "decimal")), null, null, List.of(), "main");
            TableMapping extension = new TableMapping(SOURCE, "public.tb_item_ext", null, "ITEM_ID", List.of(), null,
                    List.of(hinted("ITEM_NM", "fee", "decimal")), null, null, List.of(), "ext");
            TableMapping orders = new TableMapping("legacy.legacy_order", "public.tb_order", null, "ITEM_ID",
                    List.of(), null, List.of(hinted("ORDER_AMT", "amt", "decimal")), null, null, List.of(), "orders",
                    List.of(new MappingSpec.Lookup("item", SOURCE, null, new MappingSpec.LookupKey("ITEM_ID", "ITEM_ID"),
                            MappingSpec.LookupCardinality.EXACTLY_ONE, null)));
            MappingSpec spec = new MappingSpec(null, null, List.of(main, extension, orders), Map.of());
            TargetSchemaFingerprint target = target(table(StandardStatus.ABSENT, column(1, "amt", "numeric", null, 10, 2)),
                    new TableContract("public", "tb_item_ext", ContractStatus.READ, StandardStatus.ABSENT,
                            List.of(column(1, "fee", "numeric", null, 7, 2))),
                    new TableContract("public", "tb_order", ContractStatus.READ, StandardStatus.ABSENT,
                            List.of(column(1, "amt", "numeric", null, 12, 3))));
            List<CatalogObject> objects = new ArrayList<>(inventory().objects());
            objects.add(tableObject("legacy_order"));
            objects.add(columnObject("legacy_order", "ITEM_ID", Types.VARCHAR, 20, 0));
            objects.add(columnObject("legacy_order", "ORDER_AMT", Types.VARCHAR, 20, 0));

            assertThat(new MappingValidator(transformers, "unused-db-columns.json").rowGuards(spec, target,
                    inventory(objects))).containsExactly(
                    Map.entry(SOURCE + "#main", Map.of("amt", new TargetValueGuard.Limit(null, 8, 2, null, false))),
                    Map.entry(SOURCE + "#ext", Map.of("fee", new TargetValueGuard.Limit(null, 5, 2, null, false))),
                    Map.entry("legacy.legacy_order#orders",
                            Map.of("amt", new TargetValueGuard.Limit(null, 9, 3, null, false))));
        }

        private Map<String, TargetValueGuard.Limit> guards(MappingSpec spec, TargetSchemaFingerprint target) {
            return validator.rowGuards(spec, spec.tables().getFirst(), target, inventory());
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

    private static ColumnMapping transformed(String source, String target, String transform) {
        return new ColumnMapping(source, target, transform, null, null, null, null);
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
        objects.add(columnObject("legacy_item", "JUMIN", Types.VARCHAR, 13, 0));
        objects.add(columnObject("legacy_item", "JUMIN_NUM", Types.NUMERIC, 13, 0));
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
        objects.add(columnObject("legacy_item", "YMD_NUM", Types.NUMERIC, 8, 0));
        objects.add(columnObject("legacy_item", "STATUS_CD", Types.VARCHAR, 2, 0));
        // 시간대가 있는 소스 — JDBC 타입 번호로만, 또는 드라이버 타입 이름으로만 알 수 있는 경우를 모두 둔다.
        objects.add(nativeColumn("PG_TZ", Types.TIMESTAMP, "timestamptz"));
        objects.add(nativeColumn("CUBRID_TZ", Types.TIMESTAMP, "DATETIMELTZ"));
        objects.add(nativeColumn("ORA_TZ", -101, "TIMESTAMP(6) WITH TIME ZONE"));
        objects.add(nativeColumn("ORA_LTZ", -102, "TIMESTAMP(6) WITH LOCAL TIME ZONE"));
        objects.add(nativeColumn("MS_DTO", -155, "datetimeoffset"));
        objects.add(nativeColumn("GENERIC_TZ", Types.TIMESTAMP, "TIMESTAMP ( 6 )  WITH TIME ZONE"));
        objects.add(nativeColumn("GENERIC_LTZ", Types.TIMESTAMP, "timestamp(3) with local time zone"));
        objects.add(nativeColumn("LOCAL_DT", Types.TIMESTAMP, "TIMESTAMP(6)"));
        objects.add(nativeColumn("PG_TIMETZ", Types.TIME, "timetz"));
        objects.add(nativeColumn("TIME_TZ", Types.TIME_WITH_TIMEZONE, "time with time zone"));
        return inventory(objects);
    }

    /**
     * {@code product} 제품의 inventory — MySQL·MariaDB 드라이버는 TIMESTAMP 와 DATETIME 을 모두 JDBC TIMESTAMP 로,
     * 타입 이름만 다르게 알린다.
     */
    private static CatalogSnapshot productInventory(String product) {
        List<CatalogObject> objects = new ArrayList<>();
        objects.add(tableObject("legacy_item"));
        objects.add(nativeColumn("MY_TS", Types.TIMESTAMP, "TIMESTAMP"));
        objects.add(nativeColumn("MY_DT", Types.TIMESTAMP, "DATETIME"));
        return new CatalogSnapshot(CatalogSnapshot.CURRENT_SCHEMA_VERSION, Instant.parse("2026-10-13T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo(product, "8.4", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), objects, List.of());
    }

    private static CatalogObject nativeColumn(String column, int jdbcType, String nativeType) {
        return new CatalogObject(ObjectKind.COLUMN, "db", "legacy", "legacy_item." + column, false, null, null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", "legacy_item")),
                Map.of("parentTable", "legacy_item", "originalName", column, "jdbcType", Integer.toString(jdbcType),
                        "nativeType", nativeType, "size", "35", "scale", "6"));
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
