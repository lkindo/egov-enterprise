package nuri.migration.validate.ledger;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.domain.DomainCategory;
import nuri.migration.domain.DomainViolation;
import nuri.migration.model.MappingSpec;
import nuri.migration.validate.ledger.TermLedger.Load;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** 원장 load 가 실행 때 무엇을 판정하는지의 표(ADR-0029 L3a-2). 실행기 순서 transform → codemap → type 을 따른다. */
class LoadCapabilitiesTest {

    private static final Load NONE = new Load(null, null, null, List.of());

    private final LoadCapabilities capabilities = new LoadCapabilities();

    @Test
    void builtinNamesComeFromTheDefaultRegistry() {
        assertThat(capabilities.builtin("ymd8")).isTrue();
        assertThat(capabilities.domain("ymd8")).isTrue();
        assertThat(capabilities.builtin("trim")).isTrue();
        assertThat(capabilities.domain("trim")).isFalse();
        assertThat(capabilities.builtin("yyyymmdd")).isFalse();
        assertThat(capabilities.builtin(null)).isFalse();
        assertThat(capabilities.domain(null)).isFalse();
        assertThat(LoadCapabilities.codemapName("flag_map-1.v2")).isTrue();
        assertThat(LoadCapabilities.codemapName("bad name")).isFalse();
        assertThat(LoadCapabilities.codemapName("x".repeat(65))).isFalse();
        assertThat(LoadCapabilities.codemapName(null)).isFalse();
    }

    @Test
    void hintsAreMappingVocabularyOnly() {
        assertThat(Arrays.asList(null, "codemap", "mixed", "transform:ymd8", "transform:timestamp-from-date",
                "type:numeric", "type:integer", "type:bigint")).allSatisfy(hint ->
                assertThat(capabilities.hint(hint)).as(String.valueOf(hint)).isTrue());
        assertThat(List.of("custom:ymd8", "custom:mixed", "transform:yyyymmdd", "transform:", "type:NUMERIC",
                "type:xml", "type:", "", "ymd8", "Codemap")).allSatisfy(hint ->
                assertThat(capabilities.hint(hint)).as(hint).isFalse());
        assertThat(capabilities.builtinOf("transform:ymd8")).isEqualTo("ymd8");
        assertThat(capabilities.builtinOf("transform:trim")).isEqualTo("trim");
        assertThat(capabilities.builtinOf("transform:yyyymmdd")).isNull();
        assertThat(capabilities.builtinOf("type:numeric")).isNull();
        assertThat(capabilities.builtinOf("codemap")).isNull();
        assertThat(capabilities.builtinOf(null)).isNull();
    }

    @Test
    void nullifyReachesOnlyWhatTheLoadRejectsLikeTheMappingValidator() {
        assertThat(capabilities.nullifiable(load("ymd8")))
                .containsExactlyInAnyOrder(DomainViolation.BLANK, DomainViolation.PLACEHOLDER_DATE);
        assertThat(capabilities.nullifiable(load("hms6"))).containsExactly(DomainViolation.BLANK);
        assertThat(capabilities.nullifiable(typed("integer"))).containsExactly(DomainViolation.BLANK);
        assertThat(capabilities.nullifiable(typed("string"))).isEmpty();
        assertThat(capabilities.nullifiable(load("trim"))).isEmpty();
        assertThat(capabilities.nullifiable(NONE)).isEmpty();
        assertThat(capabilities.nullifiable(null)).isEmpty();
        assertThat(Arrays.stream(DomainViolation.values()).filter(LoadCapabilities::nullifyCode))
                .containsExactlyInAnyOrder(DomainViolation.BLANK, DomainViolation.PLACEHOLDER_DATE);
        assertThat(LoadCapabilities.nullifyCode(null)).isFalse();
    }

    @Test
    void aStandardDomainTransformerStopsAValueWithItsOwnCodeOrFormat() {
        assertThat(codes(load("ymd8"))).containsExactly("BLANK", "PLACEHOLDER_DATE", "INVALID_DATE", "FORMAT", null);
        assertThat(codes(load("hms6"))).as("시각 변환기는 날짜를 형식 밖으로 멈춘다")
                .containsExactly("BLANK", "FORMAT", "FORMAT", "FORMAT", null);
        assertThat(codes(load("timestamp-text")))
                .containsExactly("BLANK", "PLACEHOLDER_DATE", "INVALID_DATE", "FORMAT", null);
    }

    @Test
    void theBuiltinParsersStopUnreadableTextAsFormatButLetPlaceholdersThrough() {
        assertThat(codes(load("date"))).containsExactly("FORMAT", null, "FORMAT", "FORMAT", null);
        assertThat(codes(load("timestamp"))).containsExactly("FORMAT", null, "FORMAT", "FORMAT", null);
    }

    @Test
    void aCodemapStopsEverythingItCannotFindBeforeTheTypeSeesIt() {
        assertThat(codes(new Load(null, null, "status", List.of()))).containsExactly("CODEMAP_UNMAPPED",
                "CODEMAP_UNMAPPED", "CODEMAP_UNMAPPED", "CODEMAP_UNMAPPED", null);
        assertThat(codes(new Load("trim", "integer", "status", List.of()))).containsExactly("CODEMAP_UNMAPPED",
                "CODEMAP_UNMAPPED", "CODEMAP_UNMAPPED", "CODEMAP_UNMAPPED", null);
    }

    @Test
    void aNonTextTypeStopsBlanksAndUnreadableValuesButNotPlausibleNumbers() {
        assertThat(codes(typed("integer"))).containsExactly("BLANK", null, null, "FORMAT", null);
        assertThat(codes(typed("NUMERIC"))).containsExactly("BLANK", null, null, "FORMAT", null);
        assertThat(codes(typed("date"))).containsExactly("BLANK", null, "FORMAT", "FORMAT", null);
        assertThat(codes(typed("timestamp"))).containsExactly("BLANK", null, "FORMAT", "FORMAT", null);
        assertThat(codes(typed("datetime"))).containsExactly("BLANK", null, "FORMAT", "FORMAT", null);
        assertThat(codes(typed("string"))).containsOnlyNulls();
        assertThat(codes(load("trim"))).containsOnlyNulls();
        assertThat(codes(NONE)).containsOnlyNulls();
        assertThat(capabilities.runtimeCode(null, "BLANK")).isNull();
        assertThat(capabilities.runtimeCode(load("ymd8"), null)).isNull();
    }

    @Test
    void valueTypesTheEstimatorCouldNotJudgeAreJudgedByDomainTransformersAndTypes() {
        assertThat(capabilities.judgesValueType(load("ymd8"))).isTrue();
        assertThat(capabilities.judgesValueType(typed("text"))).isTrue();
        assertThat(capabilities.judgesValueType(typed("integer"))).isTrue();
        assertThat(capabilities.judgesValueType(load("trim"))).isFalse();
        assertThat(capabilities.judgesValueType(new Load(null, null, "status", List.of()))).isFalse();
        assertThat(capabilities.judgesValueType(NONE)).isFalse();
        assertThat(capabilities.judgesValueType(null)).isFalse();
    }

    @Test
    void fixedFormatAndYesNoCategoriesAreGuarded() {
        assertThat(capabilities.guarded(DomainCategory.DATE8, load("ymd8"))).isTrue();
        assertThat(capabilities.guarded(DomainCategory.DATE8, load("ymd8-truncate"))).isTrue();
        assertThat(capabilities.guarded(DomainCategory.DATE8, load("date-text"))).isFalse();
        assertThat(capabilities.guarded(DomainCategory.DATE8, NONE)).isFalse();
        assertThat(capabilities.guarded(DomainCategory.DATE8, null)).isFalse();
        assertThat(capabilities.guarded(DomainCategory.DATETIME14, load("ymdhms14"))).isTrue();
        assertThat(capabilities.guarded(DomainCategory.DATETIME14, load("ymd8"))).isFalse();
        assertThat(capabilities.guarded(DomainCategory.TIME6, load("hms6"))).isTrue();
        assertThat(capabilities.guarded(DomainCategory.TIME6, typed("string"))).isFalse();
        assertThat(capabilities.guarded(DomainCategory.YN, load("yn"))).isTrue();
        assertThat(capabilities.guarded(DomainCategory.YN, new Load(null, null, "flags", List.of()))).isTrue();
        assertThat(capabilities.guarded(DomainCategory.YN, new Load("ymd8", null, "flags", List.of())))
                .as("도메인 변환기와 codemap 은 함께 쓸 수 없다").isFalse();
        assertThat(capabilities.guarded(DomainCategory.YN, NONE)).isFalse();
        assertThat(List.of(DomainCategory.TEMPORAL, DomainCategory.NUMERIC, DomainCategory.CODE, DomainCategory.TEXT))
                .allSatisfy(category -> {
                    assertThat(capabilities.guarded(category, null)).isTrue();
                    assertThat(LoadCapabilities.guardLabel(category)).isNull();
                });
        assertThat(LoadCapabilities.guardLabel(DomainCategory.DATE8)).isEqualTo("ymd8 또는 ymd8-truncate");
        assertThat(LoadCapabilities.guardLabel(DomainCategory.YN)).isEqualTo("yn 또는 codemap");
    }

    @Test
    void loadsThatChangeValuesByRuleAreRefinements() {
        assertThat(capabilities.refines(load("ymd8-truncate"))).isTrue();
        assertThat(capabilities.refines(load("date-truncate"))).isTrue();
        assertThat(capabilities.refines(load("timestamp-from-date"))).isTrue();
        assertThat(capabilities.refines(load("ymd8", new MappingSpec.Nullify(DomainViolation.BLANK, 1L)))).isTrue();
        assertThat(capabilities.refines(load("ymd8"))).isFalse();
        assertThat(capabilities.refines(NONE)).isFalse();
        assertThat(capabilities.refines(null)).isFalse();
        Load nullified = load("ymd8", new MappingSpec.Nullify(DomainViolation.PLACEHOLDER_DATE, 3L));
        assertThat(LoadCapabilities.nullified(nullified, DomainViolation.PLACEHOLDER_DATE)).isTrue();
        assertThat(LoadCapabilities.nullified(nullified, DomainViolation.BLANK)).isFalse();
        assertThat(LoadCapabilities.nullified(null, DomainViolation.BLANK)).isFalse();
    }

    @Test
    void onlyCodesBeforeAColonOfACompleteListAreAllowedValues() {
        assertThat(LoadCapabilities.allowedCodes("Y : 여(예), N : 부(아니오)")).containsExactly("Y", "N");
        assertThat(LoadCapabilities.allowedCodes("A01:신청,B01 : 승인")).containsExactly("A01", "B01");
        assertThat(LoadCapabilities.allowedCodes("01 : 무학력, 02 : 취학면제 …")).isEmpty();
        assertThat(LoadCapabilities.allowedCodes("A : 가 ...")).isEmpty();
        assertThat(LoadCapabilities.allowedCodes("자유 서술")).isEmpty();
        assertThat(LoadCapabilities.allowedCodes("ABCDEFGHIJKLM : 열세 자")).isEmpty();
        assertThat(LoadCapabilities.allowedCodes(null)).isEmpty();
    }

    @Test
    void theVocabulariesSplitTheEstimatorCodesAndIsolateEveryDomainViolationExceptUnsupportedValues() {
        assertThat(LoadCapabilities.COUNTED).doesNotContainAnyElementsOf(LoadCapabilities.UNMEASURED);
        Set<String> isolatableDomain = Arrays.stream(DomainViolation.values()).map(Enum::name)
                .filter(LoadCapabilities.ISOLATABLE::contains).collect(Collectors.toSet());
        assertThat(isolatableDomain).containsExactlyInAnyOrder("BLANK", "PLACEHOLDER_DATE", "INVALID_DATE",
                "TIME_PRESENT", "FORMAT");
        assertThat(LoadCapabilities.ISOLATABLE).doesNotContain("NOT_ALLOWED", "UNSUPPORTED_VALUE_TYPE");
        assertThat(LoadCapabilities.MAX_EXCEPTION_ROWS).isEqualTo(1000);
    }

    /**
     * ADR-0029 L4-B R3 — 공백으로 채워 오는 고정 길이 문자는 드라이버가 알린 타입 이름으로 정하고, 이름이 없을 때만 JDBC
     * 타입으로 정한다. 선언 길이 1 은 값이 늘 꽉 차 공백이 붙지 않는다.
     */
    @Test
    void fixedWidthCharacterIsDecidedByTheNativeTypeNameThenTheJdbcTypeAndNotForWidthOne() {
        for (String[] fixedWidth : new String[][]{{"CHAR", "12", "3"}, {"nchar", "12", null}, {"bpchar", null, "8"},
                {"character(3)", "1", "3"}, {"National  Character", "-15", "2"}, {"CHAR(3 BYTE)", "1", "3"},
                {null, "1", "3"}, {"  ", "-15", null}, {"CHAR", "1", " 2 "}}) {
            assertThat(LoadCapabilities.fixedWidthCharacter(typedColumn(fixedWidth[0], fixedWidth[1], fixedWidth[2])))
                    .as("%s/%s/%s", fixedWidth[0], fixedWidth[1], fixedWidth[2]).isTrue();
        }
        for (String[] variable : new String[][]{{"VARCHAR2", "1", "3"}, {"uniqueidentifier", "1", "36"},
                {"ENUM", "1", "5"}, {"character varying", "12", "3"}, {"nchar varying", "-9", "3"}, {null, "12", "3"},
                {null, null, null}, {"", null, "3"}, {"CHAR", "1", "1"}, {"NCHAR", "-15", " 1"}, {null, "1", "1"}}) {
            assertThat(LoadCapabilities.fixedWidthCharacter(typedColumn(variable[0], variable[1], variable[2])))
                    .as("%s/%s/%s", variable[0], variable[1], variable[2]).isFalse();
        }
        assertThat(LoadCapabilities.fixedWidthCharacter(null)).isFalse();
    }

    /** codemap 이 있고 trim 이 아닌 고정 길이 문자 소스만 걸린다 — 생성기와 coverage 가 함께 쓴다. */
    @Test
    void anUntrimmedCodemapIsRefusedOnlyOnAFixedWidthCharacterSource() {
        CatalogObject padded = typedColumn("CHAR", "1", "3");
        assertThat(LoadCapabilities.untrimmedFixedWidthCodemap(null, "status", padded)).isTrue();
        assertThat(LoadCapabilities.untrimmedFixedWidthCodemap("upper", "status", padded)).isTrue();
        assertThat(LoadCapabilities.untrimmedFixedWidthCodemap("trim", "status", padded)).isFalse();
        assertThat(LoadCapabilities.untrimmedFixedWidthCodemap(null, null, padded)).isFalse();
        assertThat(LoadCapabilities.untrimmedFixedWidthCodemap(null, "status", typedColumn("VARCHAR2", "12", "3")))
                .isFalse();
        assertThat(LoadCapabilities.untrimmedFixedWidthCodemap(null, "status", typedColumn("CHAR", "1", "1")))
                .isFalse();
        assertThat(LoadCapabilities.FIXED_WIDTH_TRIM_REQUIRED).contains("transform: trim", "unmapped: fail",
                "passthrough·fallback");
    }

    private static CatalogObject typedColumn(String nativeType, String jdbcType, String size) {
        Map<String, String> attributes = new LinkedHashMap<>();
        attributes.put("parentTable", "USER_MST");
        attributes.put("originalName", "STAT_CD");
        if (nativeType != null) {
            attributes.put("nativeType", nativeType);
        }
        if (jdbcType != null) {
            attributes.put("jdbcType", jdbcType);
        }
        if (size != null) {
            attributes.put("size", size);
        }
        return new CatalogObject(ObjectKind.COLUMN, "db", "legacy", "USER_MST.STAT_CD", false, null, null, List.of(),
                attributes);
    }

    /** 추정기 위반 BLANK·PLACEHOLDER_DATE·INVALID_DATE·FORMAT·NOT_ALLOWED 가 이 load 에서 받는 코드. */
    private List<String> codes(Load load) {
        return List.of("BLANK", "PLACEHOLDER_DATE", "INVALID_DATE", "FORMAT", "NOT_ALLOWED").stream()
                .map(recorded -> capabilities.runtimeCode(load, recorded))
                .collect(java.util.ArrayList::new, java.util.ArrayList::add, java.util.ArrayList::addAll);
    }

    private static Load load(String transform, MappingSpec.Nullify... nullify) {
        return new Load(transform, null, null, List.of(nullify));
    }

    private static Load typed(String type) {
        return new Load(null, type, null, List.of());
    }
}
