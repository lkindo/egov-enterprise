package nuri.api.harness;

import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.core.JacksonException;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.business.service.auth.dto.AuthorizationDto;
import nuri.business.service.user.dto.UserDto;
import nuri.foundation.domain.common.IntegralStringConverter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.beans.Introspector;
import java.io.IOException;
import java.lang.annotation.Annotation;
import java.lang.reflect.AnnotatedElement;
import java.lang.reflect.AnnotatedParameterizedType;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 입력 DTO 의미 계약 표적 미러 게이트.
 *
 * <p>DTO는 Entity의 전수 복제본이 아니라 투영이므로 이름이 같은 모든 필드를 기계적으로 비교하면
 * 응답 전용·파생 필드까지 입력 제약으로 오인한다. 대신 실제 {@code @RequestBody}로 저장되는 고위험
 * 관리자 입력의 직접 저장 필드만 명시적으로 묶는다. 이 표적은 다음 여섯 구간을 한 번에 보호한다.
 *
 * <ol>
 *   <li>Entity {@code @Column(length)}보다 DTO {@code @Size(max)}가 크거나 빠지지 않았는가</li>
 *   <li>문자열 상태 코드가 런타임 {@code @Pattern}과 OpenAPI {@code allowableValues}로 제한되는가</li>
 *   <li>명시적으로 동결한 필수 필드가 런타임 제약과 OpenAPI required 양쪽에 남아 있는가</li>
 *   <li>중첩 입력 DTO의 원소 타입에 {@code @Valid}와 OpenAPI item schema가 함께 연결되는가</li>
 *   <li>서버 소유·응답 전용 필드가 Jackson과 OpenAPI에서 함께 read-only인가</li>
 *   <li>같은 maxLength·enum·required가 커밋된 {@code api-docs.json}까지 전파됐는가</li>
 * </ol>
 *
 * <p>마지막 검사는 DTO 애노테이션만 고치고 api-docs/codegen 갱신을 잊는 로컬 false-green을 막는다.
 * 하류의 {@code codegen:verify}/{@code codegen:verify:zod}와 결합하면
 * Entity → DTO → OpenAPI → TypeScript/Zod 체인이 닫힌다.
 *
 * <p><b>표적 원장은 {@code config/governance/input-contract-mirror-census.json} 이다.</b> 종전에는 표적을 이 클래스의
 * 상수와 도메인 타입 import 로 두었는데, 재사용 base 투영은 빠진 기능의 타입을 참조하는 파일을 통째로 지우므로
 * <b>남는 코어 DTO 까지 검사하던 이 게이트가 축소 프로필에서 사라졌다</b>(GAP-PACK-001 ④). 원장은 항목마다 참조 타입의
 * 이진 이름을 적는다(소유는 적지 않는다 — 11단계 C4 에서 pack 태그를 걷었다). 저장소에서는 원장 전체를, 생성물에서는 참조 타입이
 * 모두 생성기의 투영 계획({@link ReusableHarnessProfile#retainsType})에서 남은 항목만 검사한다. 지운 항목은
 * <b>참조 타입 중 하나가 {@code ClassNotFoundException} 일 때만</b> 부재로 인정한다 — 전부 로드되면 투영 기록과 트리가 어긋난 것이고,
 * 링크 오류는 판정할 수 없는 것이라 둘 다 red 다. 표적 하한(원장의 {@code expected})은 프로필과 무관하게 원장 <b>전체</b>에 적용한다.
 * 항목이 기능 소유대로 생성기의 실제 제거 계획에서 남고 빠지는지는 {@code scripts/input-contract-mirror-census-contract.test.mjs} 가
 * 시작 구성마다 대조한다.
 *
 * <p>이 파일이 직접 참조하는 도메인 타입은 모든 프로필에 남는 business-core 권한·사용자 DTO 뿐이다.
 */
@Tag("governance-harness")
class InputContractMirrorLinterTest {

    @Test
    @DisplayName("현재 권한 입력의 정상 snapshot과 길이·유형·null 항목 위반을 실제 검증기로 구분한다")
    void authorizationInputBoundariesRejectInvalidSnapshots() {
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            org.junit.jupiter.api.Assertions.assertTrue(validator.validate(
                    new AuthorizationDto.CreateGroup("TEAM", "name", "description")).isEmpty());
            org.junit.jupiter.api.Assertions.assertTrue(validator.validate(
                    new AuthorizationDto.ReplaceGrants(List.of(new AuthorizationDto.Grant("OPERATION", "BOARD_READ")), "v1", true)).isEmpty());
            for (Object invalid : List.of(
                    new AuthorizationDto.CreateGroup("X".repeat(21), "name", "description"),
                    new AuthorizationDto.CreateGroup("TEAM", "X".repeat(101), "description"),
                    new AuthorizationDto.CreateGroup("TEAM", "name", "X".repeat(4001)),
                    new AuthorizationDto.ReplaceGrants(List.of(new AuthorizationDto.Grant("UNKNOWN", "BOARD_READ")), "v1", true),
                    new AuthorizationDto.ReplaceGrants(List.of(new AuthorizationDto.Grant("OPERATION", "X".repeat(21))), "v1", true),
                    new AuthorizationDto.ReplaceGrants(java.util.Collections.singletonList(null), "v1", true),
                    new AuthorizationDto.ReplaceGrants(List.of(), "v1", false))) {
                org.junit.jupiter.api.Assertions.assertFalse(validator.validate(invalid).isEmpty(), invalid.getClass().getSimpleName());
            }
        }
    }

    private static final Logger log = LoggerFactory.getLogger(InputContractMirrorLinterTest.class);

    private static final String API_DOCS_FILE = "api-docs.json";
    private static final String CENSUS_REGISTRY = "config/governance/input-contract-mirror-census.json";
    // 타입 import 대신 이름으로 묶어 optional 기능이 빠진 재사용 제품에서도 이 게이트를 유지한다.
    // NUMERIC에는 @Column.length의 기본값 255가 저장 한도가 아니다. 승인된 precision과 요청 정수 범위를 함께 본다.
    private static final Map<String, NumericStringContract> NUMERIC_STRING_CONTRACTS = Map.of(
            "nuri.business.domain.deptjob.DeptJob.prrtyRnk", new NumericStringContract(10, "^(?:1|2|3)$"),
            "nuri.business.domain.promotion.popup.Popup.popupVrtcSz",
            new NumericStringContract(7, "^(?:[1-9][0-9]{2}|[1-3][0-9]{3}|4000)$"),
            "nuri.business.domain.promotion.popup.Popup.popupWdthSz",
            new NumericStringContract(7, "^(?:[1-9][0-9]{2}|[1-3][0-9]{3}|4000)$"));

    // 표적 하한은 원장의 expected 다(Registry.Floors). 하한은 원장 전체에 적용한다 — 축소 프로필에서 검사하는 부분집합은
    //   작아지지만, 원장을 비워 게이트를 줄이는 경로는 여전히 red 다. 표면을 걷어 검증 대상 자체가 사라지면(약화가 아니다)
    //   같은 변경에서 expected 를 내린다. 원장은 하네스 기준선의 __registry 해시로도 묶여 있다. 수의 증감 이력은 git·결정 기록에 있다.
    // 일정 시작일의 필수 판정은 DTO 가 아니라 ScheduleService 가 한다 — ScheduleDto 는 응답에도 쓰여 NotBlank 가 응답 계약을 바꾼다.

    private static final java.util.regex.Pattern TYPE_NAME = java.util.regex.Pattern.compile(
            "[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)*\\.[A-Z][A-Za-z0-9_]*(?:\\$[A-Z][A-Za-z0-9_]*)*");
    private static final java.util.regex.Pattern FIELD_NAME = java.util.regex.Pattern.compile("[a-z][A-Za-z0-9_]*");

    private static final Map<String, Class<? extends Annotation>> REQUIRED_CONSTRAINTS = Map.of(
            "NotBlank", NotBlank.class,
            "NotNull", NotNull.class,
            "NotEmpty", NotEmpty.class);

    private static Census census;

    /** 현재 트리의 원장과 투영 계획으로 해석한 표적. 한 테스트 JVM 에서 한 번만 읽는다. */
    private static synchronized Census census() {
        if (census == null) {
            Path root = HarnessSourceIndex.repoRoot();
            Registry registry = Registry.parse(readRepoFile(root, CENSUS_REGISTRY));
            ClassLoader loader = InputContractMirrorLinterTest.class.getClassLoader();
            ReusableHarnessProfile profile = ReusableHarnessProfile.current();
            // 저장소에서는 retainsType 이 늘 참이라 원장 전체를, 생성물에서는 참조 타입이 모두 남은 표적만 검사한다.
            census = resolve(registry, name -> Class.forName(name, false, loader), spec -> {
                boolean retained = true;
                for (String type : spec.types()) retained &= profile.retainsType(type);
                return retained;
            });
        }
        return census;
    }

    @Test
    @DisplayName("달력 날짜 입력 제약이 OpenAPI와 생성 Zod의 원본까지 전파된다")
    void calendarDatePatternsReachCommittedOpenApi() throws Exception {
        JsonNode schemas = JsonMapper.builder().configureForJackson2().build().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        List<String> violations = new ArrayList<>();
        for (FieldsBinding binding : census().calendarDateBindings()) {
            for (String name : binding.fields()) {
                boolean calendar = propertyConstraints(binding.dtoType(), name, Pattern.class).stream()
                        .anyMatch(pattern -> nuri.foundation.core.validation.Ymd.OPTIONAL_PATTERN.equals(pattern.regexp()));
                if (!calendar) {
                    violations.add(binding.dtoType().getSimpleName() + "." + name + " — calendar constraint missing");
                }
                JsonNode property = openApiProperty(schemas, binding.dtoType(), name, violations);
                if (property != null && !nuri.foundation.core.validation.Ymd.OPTIONAL_PATTERN.equals(property.path("pattern").asString())) {
                    violations.add(binding.dtoType().getSimpleName() + "." + name + " — OpenAPI calendar pattern drift");
                }
            }
        }
        if (!violations.isEmpty()) fail(String.join("\n", violations));
    }

    @Test
    @DisplayName("입력 DTO 길이와 enum 제약이 Entity 저장 계약을 넘지 않는다")
    void targetedDtoConstraintsMirrorEntityStorageContract() {
        Census census = census();
        List<String> floors = floorViolations(census.registry());
        if (!floors.isEmpty()) {
            fail("게이트 무결성 파손: 표적 필드가 하한보다 적습니다 " + floors + ". 표적 삭제로 게이트를 축소하지 마십시오.");
        }

        List<String> violations = new ArrayList<>();
        Set<String> visitedNumericBindings = new TreeSet<>();
        for (LengthBinding binding : census.lengthBindings()) {
            for (String fieldName : binding.fields()) {
                Field entityField = declaredField(binding.entityType(), binding.entityField(fieldName), violations, "Entity");
                Field dtoField = declaredField(binding.dtoType(), fieldName, violations, "DTO");
                if (entityField == null || dtoField == null) {
                    continue;
                }
                Column column = entityField.getAnnotation(Column.class);
                Size size = dtoField.getAnnotation(Size.class);
                NumericStringContract numeric = NUMERIC_STRING_CONTRACTS.get(
                        binding.entityType().getName() + "." + entityField.getName());
                Convert convert = entityField.getAnnotation(Convert.class);
                if (numeric != null || (convert != null && convert.converter() == IntegralStringConverter.class)) {
                    visitedNumericBindings.add(binding.entityType().getName() + "." + entityField.getName());
                    violations.addAll(numericStringViolations(entityField, dtoField, numeric));
                    continue;
                }
                if (column == null) {
                    violations.add(binding.entityType().getSimpleName() + "." + fieldName
                            + " — @Column(length)가 없어 저장 상한을 판정할 수 없습니다");
                    continue;
                }
                if (size == null || size.max() == Integer.MAX_VALUE) {
                    violations.add(binding.dtoType().getSimpleName() + "." + fieldName
                            + " — @Size(max)가 없어 Entity 상한 " + column.length() + "을 입력에서 보호하지 못합니다");
                    continue;
                }
                if (size.max() > column.length()) {
                    violations.add(binding.dtoType().getSimpleName() + "." + fieldName + " max=" + size.max()
                            + " > " + binding.entityType().getSimpleName() + " @Column(length=" + column.length() + ")");
                }
            }
        }

        for (String missing : missingNumericBindings(visitedNumericBindings, ReusableHarnessProfile.current()::retainsType)) {
            violations.add(missing + " — 승인된 숫자 문자열 필드가 입력 원장 검사에서 빠졌습니다");
        }
        for (EnumBinding binding : census.enumBindings()) {
            Field dtoField = declaredField(binding.dtoType(), binding.field(), violations, "DTO");
            if (dtoField == null) {
                continue;
            }
            Pattern pattern = dtoField.getAnnotation(Pattern.class);
            String expectedPattern = canonicalPattern(binding.allowedValues());
            if (pattern == null || !expectedPattern.equals(pattern.regexp())) {
                violations.add(binding.dtoType().getSimpleName() + "." + binding.field()
                        + " — @Pattern(regexp=\"" + expectedPattern + "\")가 필요합니다");
            }
            Schema schema = dtoField.getAnnotation(Schema.class);
            Set<String> actualValues = schema == null
                    ? Set.of()
                    : new LinkedHashSet<>(Arrays.asList(schema.allowableValues()));
            if (!actualValues.equals(new LinkedHashSet<>(binding.allowedValues()))) {
                violations.add(binding.dtoType().getSimpleName() + "." + binding.field()
                        + " — @Schema allowableValues=" + actualValues + " (expected=" + binding.allowedValues() + ")");
            }
        }

        failIfAny("[INPUT CONTRACT] Entity ↔ DTO 의미 제약 불일치", violations);
        log.info("✅ 입력 계약 표적 미러: 길이 {}필드, enum {}필드.",
                census.lengthBindings().stream().mapToInt(binding -> binding.fields().size()).sum(),
                census.enumBindings().size());
    }

    private static Set<String> missingNumericBindings(Set<String> visited, Predicate<String> retainedType) {
        Set<String> missing = new TreeSet<>();
        for (String key : NUMERIC_STRING_CONTRACTS.keySet()) {
            if (retainedType.test(key.substring(0, key.lastIndexOf('.'))) && !visited.contains(key)) missing.add(key);
        }
        return missing;
    }

    private static List<String> numericStringViolations(Field entity, Field dto, NumericStringContract expected) {
        List<String> violations = new ArrayList<>();
        String label = entity.getDeclaringClass().getSimpleName() + "." + entity.getName();
        if (expected == null) {
            return List.of(label + " — 승인된 숫자 문자열 저장 계약이 없습니다");
        }
        Column column = entity.getAnnotation(Column.class);
        Convert convert = entity.getAnnotation(Convert.class);
        if (entity.getType() != String.class || dto.getType() != String.class
                || convert == null || convert.disableConversion() || convert.converter() != IntegralStringConverter.class
                || column == null || column.precision() != expected.precision() || column.scale() != 0) {
            violations.add(label + " — String/IntegralStringConverter/NUMERIC(" + expected.precision() + ",0) 계약 불일치");
        }
        Pattern pattern = dto.getAnnotation(Pattern.class);
        Size size = dto.getAnnotation(Size.class);
        if (pattern == null || !expected.pattern().equals(pattern.regexp()) || pattern.flags().length != 0
                || size == null || size.max() == Integer.MAX_VALUE) {
            violations.add(label + " — NUMERIC 범위 안의 정규 정수 요청 Pattern·Size 계약 불일치");
        }
        return violations;
    }

    @Test
    @DisplayName("NUMERIC 문자열 저장 검사는 기본 length=255로 precision·scale·변환기·입력 패턴 위반을 숨기지 않는다")
    void numericStringsUsePrecisionAndStrictRequestInsteadOfDefaultLength() throws Exception {
        NumericStringContract expected = new NumericStringContract(7, "^(?:[1-9][0-9]{2}|[1-3][0-9]{3}|4000)$");
        Field goodEntity = NumericStorageFixtures.class.getDeclaredField("good");
        Field goodRequest = NumericRequestFixtures.class.getDeclaredField("good");
        assertThat(goodEntity.getAnnotation(Column.class).length()).isEqualTo(255);
        assertThat(numericStringViolations(goodEntity, goodRequest, expected)).isEmpty();
        for (String field : List.of("precision", "scale", "missingConverter", "disabledConverter", "wrongType")) {
            assertThat(numericStringViolations(NumericStorageFixtures.class.getDeclaredField(field), goodRequest, expected))
                    .as(field).isNotEmpty();
        }
        for (String field : List.of("unboundedPattern", "missingPattern", "missingSize", "wrongType")) {
            assertThat(numericStringViolations(goodEntity, NumericRequestFixtures.class.getDeclaredField(field), expected))
                    .as(field).isNotEmpty();
        }
        assertThat(numericStringViolations(goodEntity, goodRequest, null)).isNotEmpty();
        assertThat(missingNumericBindings(NUMERIC_STRING_CONTRACTS.keySet(), ignored -> true)).isEmpty();
        Set<String> incomplete = new TreeSet<>(NUMERIC_STRING_CONTRACTS.keySet());
        String removed = incomplete.iterator().next();
        incomplete.remove(removed);
        assertThat(missingNumericBindings(incomplete, ignored -> true)).containsExactly(removed);
        assertThat(missingNumericBindings(Set.of(), ignored -> false)).isEmpty();
    }

    private record NumericStringContract(int precision, String pattern) {}

    private static class NumericStorageFixtures {
        @Column(precision = 7, scale = 0) @Convert(converter = IntegralStringConverter.class) String good;
        @Column(precision = 6, scale = 0) @Convert(converter = IntegralStringConverter.class) String precision;
        @Column(precision = 7, scale = 1) @Convert(converter = IntegralStringConverter.class) String scale;
        @Column(precision = 7, scale = 0) String missingConverter;
        @Column(precision = 7, scale = 0) @Convert(converter = IntegralStringConverter.class, disableConversion = true) String disabledConverter;
        @Column(precision = 7, scale = 0) @Convert(converter = IntegralStringConverter.class) Long wrongType;
    }

    private static class NumericRequestFixtures {
        @Size(max = 12) @Pattern(regexp = "^(?:[1-9][0-9]{2}|[1-3][0-9]{3}|4000)$") String good;
        @Size(max = 12) @Pattern(regexp = "[0-9]+") String unboundedPattern;
        @Size(max = 12) String missingPattern;
        @Pattern(regexp = "^(?:[1-9][0-9]{2}|[1-3][0-9]{3}|4000)$") String missingSize;
        @Size(max = 12) @Pattern(regexp = "^(?:[1-9][0-9]{2}|[1-3][0-9]{3}|4000)$") Long wrongType;
    }

    @Test
    @DisplayName("입력 DTO 길이와 enum 제약이 api-docs.json까지 전파된다")
    void targetedDtoConstraintsReachCommittedOpenApi() throws IOException {
        Census census = census();
        JsonNode schemas = JsonMapper.builder().configureForJackson2().build().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        if (!schemas.isObject()) {
            fail("게이트 무결성 파손: api-docs.json components.schemas가 없습니다");
        }

        List<String> violations = new ArrayList<>();
        for (LengthBinding binding : census.lengthBindings()) {
            for (String fieldName : binding.fields()) {
                Field dtoField = declaredField(binding.dtoType(), fieldName, violations, "DTO");
                if (dtoField == null) {
                    continue;
                }
                Size size = dtoField.getAnnotation(Size.class);
                if (size == null || size.max() == Integer.MAX_VALUE) {
                    continue; // 첫 테스트가 더 구체적인 원인을 보고한다.
                }
                JsonNode property = openApiProperty(schemas, binding.dtoType(), fieldName, violations);
                if (property != null && property.path("maxLength").asInt(-1) != size.max()) {
                    violations.add(binding.dtoType().getSimpleName() + "." + fieldName
                            + " — OpenAPI maxLength=" + property.path("maxLength").asString("<missing>")
                            + " (DTO @Size max=" + size.max() + ")");
                }
            }
        }

        for (EnumBinding binding : census.enumBindings()) {
            JsonNode property = openApiProperty(schemas, binding.dtoType(), binding.field(), violations);
            if (property == null) {
                continue;
            }
            Set<String> actualEnum = new LinkedHashSet<>();
            property.path("enum").forEach(node -> actualEnum.add(node.asString()));
            Set<String> expectedEnum = new LinkedHashSet<>(binding.allowedValues());
            if (!actualEnum.equals(expectedEnum)) {
                violations.add(binding.dtoType().getSimpleName() + "." + binding.field()
                        + " — OpenAPI enum=" + actualEnum + " (expected=" + expectedEnum + ")");
            }
            String expectedPattern = canonicalPattern(binding.allowedValues());
            if (!expectedPattern.equals(property.path("pattern").asString())) {
                violations.add(binding.dtoType().getSimpleName() + "." + binding.field()
                        + " — OpenAPI pattern=" + property.path("pattern").asString("<missing>")
                        + " (expected=" + expectedPattern + ")");
            }
        }

        failIfAny("[INPUT CONTRACT] DTO ↔ OpenAPI 의미 제약 드리프트", violations);
        log.info("✅ 입력 계약 OpenAPI 전파: 길이 {}바인딩, enum {}바인딩.",
                census.lengthBindings().size(), census.enumBindings().size());
    }

    @Test
    @DisplayName("중첩 입력 DTO 검증과 OpenAPI item schema가 함께 연결된다")
    void nestedInputValidationIsCascadedAndDocumented() throws IOException {
        Census census = census();
        JsonNode schemas = JsonMapper.builder().configureForJackson2().build().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        List<String> violations = new ArrayList<>();
        for (NestedValidationBinding binding : census.nestedValidationBindings()) {
            Field parentField = declaredField(binding.parentType(), binding.field(), violations, "DTO");
            if (parentField == null) {
                continue;
            }
            violations.addAll(nestedValidationViolations(parentField, binding.itemType()));

            JsonNode property = openApiProperty(schemas, binding.parentType(), binding.field(), violations);
            if (property == null) {
                continue;
            }
            String expectedRef = "#/components/schemas/" + binding.itemType().getSimpleName();
            if (!"array".equals(property.path("type").asString())
                    || !expectedRef.equals(property.path("items").path("$ref").asString())) {
                violations.add(binding.parentType().getSimpleName() + "." + binding.field()
                        + " — OpenAPI array item $ref가 " + expectedRef + "이 아닙니다");
            }
        }

        failIfAny("[INPUT CONTRACT] 중첩 DTO 검증 경계 불일치", violations);
        log.info("✅ 중첩 입력 계약: {}필드.", census.nestedValidationBindings().size());
    }

    @Test
    @DisplayName("입력 DTO 필수 필드가 런타임과 OpenAPI에서 함께 유지된다")
    void requiredFieldsRemainRequiredAtRuntimeAndInOpenApi() throws IOException {
        Census census = census();
        List<String> violations = new ArrayList<>();
        Set<Class<?>> lengthTypes = new LinkedHashSet<>();
        census.lengthBindings().forEach(binding -> lengthTypes.add(binding.dtoType()));
        Set<Class<?>> requiredTypes = new LinkedHashSet<>();
        census.requiredBindings().forEach(binding -> requiredTypes.add(binding.dtoType()));
        if (!requiredTypes.equals(lengthTypes)) {
            violations.add("필수 binding DTO 집합=" + simpleNames(requiredTypes)
                    + " (길이 binding DTO 집합=" + simpleNames(lengthTypes) + ")");
        }

        JsonNode schemas = JsonMapper.builder().configureForJackson2().build().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        if (!schemas.isObject()) {
            fail("게이트 무결성 파손: api-docs.json components.schemas가 없습니다");
        }

        for (RequiredBinding binding : census.requiredBindings()) {
            Set<RequiredField> expectedContracts = new LinkedHashSet<>(binding.fields());
            Set<String> expected = new TreeSet<>();
            binding.fields().stream().map(RequiredField::field).forEach(expected::add);

            Set<RequiredField> runtimeContracts = requiredContracts(binding.dtoType());
            if (!runtimeContracts.equals(expectedContracts)) {
                violations.add(binding.dtoType().getSimpleName() + " — 런타임 필수 계약="
                        + describeRequired(runtimeContracts) + " (expected="
                        + describeRequired(expectedContracts) + ")");
            }

            JsonNode schema = schemas.path(binding.dtoType().getSimpleName());
            if (!schema.isObject()) {
                violations.add("OpenAPI schema 부재: " + binding.dtoType().getSimpleName());
                continue;
            }
            Set<String> responseOnly = census.requiredResponseFields().getOrDefault(binding.dtoType(), Set.of());
            Set<String> openApiExpected = new TreeSet<>(expected);
            openApiExpected.addAll(responseOnly);
            if (!schemaRequiredFieldsMatch(schema, openApiExpected)) {
                violations.add(binding.dtoType().getSimpleName() + " — OpenAPI required="
                        + schema.path("required") + " (expected input + response-only=" + openApiExpected + ")");
            }
            for (String field : responseOnly) {
                JsonNode property = schema.path("properties").path(field);
                if (!property.path("readOnly").asBoolean(false) || allowsNull(property)) {
                    violations.add(binding.dtoType().getSimpleName() + "." + field + " — required response-only field direction/nullability drift");
                }
            }
            for (String fieldName : expected) {
                JsonNode property = openApiProperty(schemas, binding.dtoType(), fieldName, violations);
                if (property != null && allowsNull(property)) {
                    violations.add(binding.dtoType().getSimpleName() + "." + fieldName
                            + " — OpenAPI required property가 null을 허용합니다");
                }
            }
        }

        failIfAny("[INPUT CONTRACT] 필수 입력 의미 계약 불일치", violations);
        log.info("✅ 입력 필수 계약: {} DTO, {}필드.", census.requiredBindings().size(),
                census.requiredBindings().stream().mapToInt(binding -> binding.fields().size()).sum());
    }

    private static boolean schemaRequiredFieldsMatch(JsonNode schema, Set<String> expected) {
        Set<String> actual = new TreeSet<>();
        schema.path("required").forEach(node -> actual.add(node.asString()));
        return actual.equals(expected);
    }

    @Test
    @DisplayName("인가 응답 필수 필드는 요청으로 주입할 수 없고 입력 필수 계약도 줄어들지 않는다")
    void authorizationResponseFieldsCannotBecomeRequestPermissions() throws IOException {
        var mapper = JsonMapper.builder().configureForJackson2().build();
        UserDto request = mapper.readValue("""
                {"userId":"member01","userNm":"회원","groups":["ROLE_ADMIN"],
                 "permissions":["AUTHRT_GRANT"],"authorizationVersion":"forged"}
                """, UserDto.class);
        org.junit.jupiter.api.Assertions.assertNull(request.groups());
        org.junit.jupiter.api.Assertions.assertNull(request.permissions());
        org.junit.jupiter.api.Assertions.assertNull(request.authorizationVersion());
        JsonNode actual = mapper.readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas").path("UserDto");
        Set<String> expected = Set.of("userId", "userNm", "pswd", "groups", "permissions", "authorizationVersion");
        org.junit.jupiter.api.Assertions.assertTrue(schemaRequiredFieldsMatch(actual, expected));
        for (String removed : List.of("userId", "authorizationVersion")) {
            var changed = actual.deepCopy();
            var required = mapper.createArrayNode();
            actual.path("required").forEach(field -> { if (!removed.equals(field.asString())) required.add(field.asString()); });
            ((tools.jackson.databind.node.ObjectNode) changed).set("required", required);
            org.junit.jupiter.api.Assertions.assertFalse(schemaRequiredFieldsMatch(changed, expected), removed);
        }
    }

    @Test
    @DisplayName("서버 소유 필드는 요청 역직렬화와 OpenAPI에서 함께 read-only다")
    void serverOwnedFieldsRemainReadOnlyAtRuntimeAndInOpenApi() throws IOException {
        Census census = census();
        JsonNode schemas = JsonMapper.builder().configureForJackson2().build().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        List<String> violations = new ArrayList<>();
        for (FieldsBinding binding : census.readOnlyBindings()) {
            for (String fieldName : binding.fields()) {
                Field dtoField = declaredField(binding.dtoType(), fieldName, violations, "DTO");
                if (dtoField == null) {
                    continue;
                }
                JsonProperty jsonProperty = dtoField.getAnnotation(JsonProperty.class);
                if (jsonProperty == null || jsonProperty.access() != JsonProperty.Access.READ_ONLY) {
                    violations.add(binding.dtoType().getSimpleName() + "." + fieldName
                            + " — @JsonProperty(READ_ONLY)가 없어 요청 값이 바인딩될 수 있습니다");
                }
                Schema schemaAnnotation = dtoField.getAnnotation(Schema.class);
                if (schemaAnnotation == null || schemaAnnotation.accessMode() != Schema.AccessMode.READ_ONLY) {
                    violations.add(binding.dtoType().getSimpleName() + "." + fieldName
                            + " — @Schema(READ_ONLY)가 없어 생성 요청 계약에 노출됩니다");
                }
                JsonNode property = openApiProperty(schemas, binding.dtoType(), fieldName, violations);
                if (property != null && !property.path("readOnly").asBoolean(false)) {
                    violations.add(binding.dtoType().getSimpleName() + "." + fieldName
                            + " — OpenAPI readOnly=true가 아닙니다");
                }
            }
        }

        failIfAny("[INPUT CONTRACT] 서버 소유 필드 방향성 불일치", violations);
        log.info("✅ 서버 소유 입력 차단 계약: {} DTO, {}필드.", census.readOnlyBindings().size(),
                census.readOnlyBindings().stream().mapToInt(binding -> binding.fields().size()).sum());
    }

    @Test
    @DisplayName("부정 증명: 투영 필터는 참조 타입 중 하나의 '클래스 없음' 만 부재로 인정하고 기록 불일치·링크 오류·낡은 원장을 red 로 만든다")
    void projectionFilterAcceptsOnlyMissingClassesAsAbsence() {
        Registry registry = Registry.parse(json("{'schemaVersion':1,'expected':" + fixtureFloors() + ","
                + "'lengthBindings':["
                + "{'entity':'example.kept.KeptEntity','dto':'example.kept.KeptDto','fields':['name']},"
                + "{'entity':'example.kept.KeptEntity','dto':'example.gone.GoneDto','fields':['name']}],"
                + "'enumBindings':[],'nestedValidationBindings':[],"
                + "'requiredBindings':["
                + "{'dto':'example.kept.KeptDto','fields':[]},"
                + "{'dto':'example.gone.GoneDto','fields':[]}],"
                + "'requiredResponseFields':[],'readOnlyBindings':[],'calendarDateBindings':[]}"));
        Predicate<Spec> everything = spec -> true;
        // 엔티티는 남아도 된다 — 참조 타입 중 하나(DTO)가 지워진 표적만 빠진다.
        Predicate<Spec> kept = spec -> spec.types().stream().noneMatch(type -> type.startsWith("example.gone."));

        // ① 저장소(투영 아님)에서는 전 항목을 검사한다.
        Census all = resolve(registry, name -> Object.class, everything);
        assertThat(all.lengthBindings()).hasSize(2);

        // ② 투영 계획이 지운 표적은 참조 타입 중 하나가 정말 없을 때만 빠진다.
        Census reduced = resolve(registry, name -> {
            if (name.startsWith("example.gone.")) {
                throw new ClassNotFoundException(name);
            }
            return Object.class;
        }, kept);
        assertThat(reduced.lengthBindings()).hasSize(1);
        assertThat(reduced.requiredBindings()).hasSize(1);

        // ③ 지운 표적인데 참조 타입이 모두 남아 있으면 투영 기록과 트리가 어긋난 것이다.
        assertThatThrownBy(() -> resolve(registry, name -> Object.class, kept))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("example.gone.GoneDto")
                .hasMessageContaining("투영 계획이 지운 표적");

        // ④ 링크 오류는 부재로 인정하지 않는다.
        assertThatThrownBy(() -> resolve(registry, name -> {
            if (name.startsWith("example.gone.")) {
                throw new NoClassDefFoundError(name);
            }
            return Object.class;
        }, kept))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("링크 오류");

        // ⑤ 남아야 하는 표적의 타입이 없으면 원장이 낡은 것이다.
        assertThatThrownBy(() -> resolve(registry, name -> {
            if (name.equals("example.kept.KeptEntity")) {
                throw new ClassNotFoundException(name);
            }
            return Object.class;
        }, everything))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("example.kept.KeptEntity")
                .hasMessageContaining("원장이 낡았습니다");
    }

    @Test
    @DisplayName("부정 증명: 원장 형식·교차 일관성·하한 위반은 fail-closed 로 거부한다")
    void registryIsFailClosed() {
        String tail = "'enumBindings':[],'nestedValidationBindings':[],'requiredResponseFields':[],"
                + "'readOnlyBindings':[],'calendarDateBindings':[]}";
        String length = "{'entity':'example.kept.KeptEntity','dto':'example.kept.KeptDto','fields':['name']}";
        String required = "{'dto':'example.kept.KeptDto','fields':[{'field':'name','constraint':'NotBlank','groups':[]}]}";
        String head = "{'schemaVersion':1,'expected':" + fixtureFloors() + ",";

        assertThatThrownBy(() -> Registry.parse(json(head + "'enumBindings':[],'lengthBindings':[],'requiredBindings':[]," + tail)))
                .as("중복 키").isInstanceOf(AssertionError.class);
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length.replace("example.kept.KeptDto", "example.kept.keptDto")
                + "],'requiredBindings':[" + required + "]," + tail)))
                .as("이진 이름 형식").isInstanceOf(AssertionError.class);
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length + "],'requiredBindings':["
                + required.replace("NotBlank", "Size") + "]," + tail)))
                .as("필수 제약 어휘").isInstanceOf(AssertionError.class).hasMessageContaining("Size");
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length + "],'requiredBindings':["
                + required.replace("'groups':[]", "'groups':['example.b.G','example.a.G']") + "]," + tail)))
                .as("groups 정렬").isInstanceOf(AssertionError.class).hasMessageContaining("groups");
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length + "," + length
                + "],'requiredBindings':[" + required + "]," + tail)))
                .as("길이 binding DTO 중복").isInstanceOf(AssertionError.class).hasMessageContaining("중복");
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length + "],'requiredBindings':[]," + tail)))
                .as("필수·길이 DTO 집합 불일치").isInstanceOf(AssertionError.class).hasMessageContaining("집합");
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length.replace("'fields'", "'note':'x','fields'")
                + "],'requiredBindings':[" + required + "]," + tail)))
                .as("모르는 필드").isInstanceOf(AssertionError.class).hasMessageContaining("note");
        // 소유는 원장에 적지 않는다(11단계 C4) — 옛 pack 태그·어휘가 되살아나면 모르는 필드로 거부한다.
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length.replace("'fields'", "'pack':'core','fields'")
                + "],'requiredBindings':[" + required + "]," + tail)))
                .as("옛 pack 태그").isInstanceOf(AssertionError.class).hasMessageContaining("'pack'");
        assertThatThrownBy(() -> Registry.parse(json(head + "'packs':['core'],'lengthBindings':[" + length
                + "],'requiredBindings':[" + required + "]," + tail)))
                .as("옛 packs 어휘").isInstanceOf(AssertionError.class).hasMessageContaining("'packs'");

        String withResponse = head + "'lengthBindings':[" + length + "],'requiredBindings':[" + required + "],"
                + tail.replace("'requiredResponseFields':[]", "'requiredResponseFields':[RESPONSE]");
        assertThatThrownBy(() -> Registry.parse(json(withResponse.replace("RESPONSE",
                "{'dto':'example.kept.OtherDto','fields':['groups']}"))))
                .as("필수 binding 없는 응답 전용 DTO").isInstanceOf(AssertionError.class).hasMessageContaining("requiredBindings");
        assertThat(Registry.parse(json(withResponse.replace("RESPONSE",
                "{'dto':'example.kept.KeptDto','fields':['groups']}"))).requiredResponseFields())
                .as("대조군: 짝이 맞으면 받는다").hasSize(1);

        Registry small = Registry.parse(json(head + "'lengthBindings':[" + length + "],'requiredBindings':[" + required + "]," + tail));
        assertThat(floorViolations(small)).as("하한은 원장 전체 기준으로 계산한다").contains("length=1 < 2");

        // 하한은 원장의 expected 하나가 정한다 — 빠지거나, 모르는 항목·빠진 항목이 있거나, 양의 정수가 아니면 거부한다.
        String body = "'lengthBindings':[" + length + "],'requiredBindings':[" + required + "]," + tail;
        assertThatThrownBy(() -> Registry.parse(json("{'schemaVersion':1," + body)))
                .as("expected 없음").isInstanceOf(AssertionError.class).hasMessageContaining("expected");
        assertThatThrownBy(() -> Registry.parse(json(head.replace("'calendarDateFields':1", "'calendarDateFields':1,'blogFields':1") + body)))
                .as("모르는 하한").isInstanceOf(AssertionError.class).hasMessageContaining("blogFields");
        assertThatThrownBy(() -> Registry.parse(json(head.replace(",'calendarDateFields':1", "") + body)))
                .as("빠진 하한").isInstanceOf(AssertionError.class).hasMessageContaining("calendarDateFields");
        for (String invalid : List.of("0", "-1", "1.5", "'1'")) {
            assertThatThrownBy(() -> Registry.parse(json(head.replace("'enumFields':1", "'enumFields':" + invalid) + body)))
                    .as("하한 " + invalid).isInstanceOf(AssertionError.class).hasMessageContaining("enumFields");
        }
    }

    /** 원장 전체(프로필 무관) 표적 하한. 축소 프로필의 부분집합이 아니라 원장 자체의 축소를 막는다. 하한 값은 원장의 expected 다. */
    static List<String> floorViolations(Registry registry) {
        Floors floors = registry.floors();
        List<String> violations = new ArrayList<>();
        int length = registry.lengthBindings().stream().mapToInt(spec -> spec.fields().size()).sum();
        int required = registry.requiredBindings().stream().mapToInt(spec -> spec.fields().size()).sum();
        int readOnly = registry.readOnlyBindings().stream().mapToInt(spec -> spec.fields().size()).sum();
        int calendar = registry.calendarDateBindings().stream().mapToInt(spec -> spec.fields().size()).sum();
        if (length < floors.lengthFields()) violations.add("length=" + length + " < " + floors.lengthFields());
        if (registry.enumBindings().size() < floors.enumFields()) {
            violations.add("enum=" + registry.enumBindings().size() + " < " + floors.enumFields());
        }
        if (registry.nestedValidationBindings().size() < floors.nestedValidationFields()) {
            violations.add("nested=" + registry.nestedValidationBindings().size() + " < " + floors.nestedValidationFields());
        }
        if (required < floors.requiredFields()) violations.add("required=" + required + " < " + floors.requiredFields());
        if (readOnly < floors.readOnlyFields()) violations.add("readOnly=" + readOnly + " < " + floors.readOnlyFields());
        if (calendar < floors.calendarDateFields()) violations.add("calendar=" + calendar + " < " + floors.calendarDateFields());
        return violations;
    }

    /**
     * 표적을 클래스로 해석한다. 순수 함수 — 클래스 로드는 주입된 resolver 로만 하고, 남길 표적은 투영 계획(저장소는 전부)이 정한다.
     *
     * <p>투영 계획이 지운 표적은 참조 타입 중 하나가 {@link ClassNotFoundException} 을 던질 때만 제외한다.
     */
    static Census resolve(Registry registry, TypeResolver resolver, Predicate<Spec> included) {
        Map<String, Class<?>> loaded = new LinkedHashMap<>();
        List<String> violations = new ArrayList<>();
        for (Spec spec : registry.allSpecs()) {
            boolean present = included.test(spec);
            boolean anyMissing = false;
            boolean linkageBroken = false;
            for (String type : spec.types()) {
                try {
                    Class<?> clazz = loaded.containsKey(type) ? loaded.get(type) : resolver.resolve(type);
                    loaded.put(type, clazz);
                } catch (ClassNotFoundException ex) {
                    anyMissing = true;
                    if (present) {
                        violations.add(spec.label() + ": " + type + " 는 남아야 하는 표적의 타입인데 클래스가 없습니다 — 원장이 낡았습니다.");
                    }
                } catch (LinkageError ex) {
                    linkageBroken = true;
                    violations.add(spec.label() + ": " + type + " 로드 중 링크 오류(" + ex + ") — 부재인지 판정할 수 없습니다.");
                }
            }
            if (!present && !anyMissing && !linkageBroken) {
                violations.add(spec.label() + " 는 투영 계획이 지운 표적인데 참조 타입이 모두 남아 있습니다 — 투영 기록과 트리가 어긋났습니다.");
            }
        }
        if (!violations.isEmpty()) {
            throw new AssertionError("🔒 [INPUT CONTRACT] 표적 투영 판정 실패:\n   · " + String.join("\n   · ", violations));
        }

        List<LengthBinding> lengths = new ArrayList<>();
        for (LengthSpec spec : registry.lengthBindings()) {
            if (included.test(spec)) {
                lengths.add(new LengthBinding(loaded.get(spec.entity()), loaded.get(spec.dto()), spec.fields(), spec.entityFields()));
            }
        }
        List<EnumBinding> enums = new ArrayList<>();
        for (EnumSpec spec : registry.enumBindings()) {
            if (included.test(spec)) {
                enums.add(new EnumBinding(loaded.get(spec.dto()), spec.field(), spec.allowedValues()));
            }
        }
        List<NestedValidationBinding> nested = new ArrayList<>();
        for (NestedSpec spec : registry.nestedValidationBindings()) {
            if (included.test(spec)) {
                nested.add(new NestedValidationBinding(loaded.get(spec.parent()), spec.field(), loaded.get(spec.item())));
            }
        }
        List<RequiredBinding> required = new ArrayList<>();
        for (RequiredSpec spec : registry.requiredBindings()) {
            if (included.test(spec)) {
                List<RequiredField> fields = new ArrayList<>();
                for (RequiredFieldSpec field : spec.fields()) {
                    fields.add(new RequiredField(field.field(), REQUIRED_CONSTRAINTS.get(field.constraint()), Set.copyOf(field.groups())));
                }
                required.add(new RequiredBinding(loaded.get(spec.dto()), List.copyOf(fields)));
            }
        }
        Map<Class<?>, Set<String>> responseFields = new LinkedHashMap<>();
        for (FieldsSpec spec : registry.requiredResponseFields()) {
            if (included.test(spec)) {
                responseFields.put(loaded.get(spec.dto()), Set.copyOf(spec.fields()));
            }
        }
        return new Census(registry, List.copyOf(lengths), List.copyOf(enums), List.copyOf(nested),
                List.copyOf(required), Map.copyOf(responseFields),
                fieldsBindings(registry.readOnlyBindings(), included, loaded),
                fieldsBindings(registry.calendarDateBindings(), included, loaded));
    }

    private static List<FieldsBinding> fieldsBindings(List<FieldsSpec> specs, Predicate<Spec> included, Map<String, Class<?>> loaded) {
        List<FieldsBinding> bindings = new ArrayList<>();
        for (FieldsSpec spec : specs) {
            if (included.test(spec)) {
                bindings.add(new FieldsBinding(loaded.get(spec.dto()), spec.fields()));
            }
        }
        return List.copyOf(bindings);
    }

    @Test
    @DisplayName("중첩 검증 판정: 원소 타입 @Valid만 통과하고 컨테이너 @Valid·누락은 거부한다")
    void nestedValidationJudgementRequiresElementValid() throws NoSuchFieldException {
        assertThat(nestedValidationViolations(NestedFixture.class.getDeclaredField("elementValid"), NestedItem.class))
                .isEmpty();
        assertThat(nestedValidationViolations(NestedFixture.class.getDeclaredField("containerValid"), NestedItem.class))
                .anySatisfy(v -> assertThat(v).contains("HV000271"));
        assertThat(nestedValidationViolations(NestedFixture.class.getDeclaredField("missingValid"), NestedItem.class))
                .anySatisfy(v -> assertThat(v).contains("원소 타입에 @Valid가 없어"));
        assertThat(nestedValidationViolations(NestedFixture.class.getDeclaredField("missingNotNull"), NestedItem.class))
                .anySatisfy(v -> assertThat(v).contains("type-use @NotNull"));
    }

    @Test
    @DisplayName("필수 계약 판정: 상위 클래스 필드와 하위 클래스가 재정의한 getter 의 제약을 함께 읽는다")
    void requiredContractsFollowBeanValidationPropertyRules() {
        assertThat(describeRequired(requiredContracts(RequiredChild.class)))
                .containsExactlyInAnyOrder("code:@NotNull groups=[]", "name:@NotBlank groups=[]", "active:@NotNull groups=[]");
        assertThat(describeRequired(requiredContracts(RequiredParent.class)))
                .containsExactly("code:@NotNull groups=[]");
    }

    @SuppressWarnings("unused")
    private static class RequiredParent {
        @NotNull
        private String code;
        private String name;
        private boolean active;

        public String getName() {
            return name;
        }

        public boolean isActive() {
            return active;
        }
    }

    private static final class RequiredChild extends RequiredParent {
        @Override
        @NotBlank
        public String getName() {
            return super.getName();
        }

        @Override
        @NotNull
        public boolean isActive() {
            return super.isActive();
        }
    }

    /**
     * 제약이 있는 요청 DTO 를 받는 컨트롤러 파라미터는 {@code @Valid} 나 {@code @Validated} 를 단다.
     *
     * <p>[2026-09-24 ZAP API 스캔] 이 게이트는 DTO 에 제약이 있는지만 보았다. 게시글 첨부 등록·수정은 JSON 경로와
     * 같은 {@code BoardSaveRequest} 를 {@code @RequestPart} 로 받으면서 {@code @Valid} 가 없어, 제목 필수·본문 4000자·
     * 비밀글 Y/N 검사를 통째로 건너뛰었다. 화면은 첨부가 있으면 그 경로를 쓴다. DTO 의 제약과 경계의 검사는
     * 같은 입력 계약이라 새 게이트가 아니라 여기서 함께 본다.
     */
    @Test
    @DisplayName("제약이 있는 요청 DTO 는 컨트롤러 경계에서 @Valid 나 @Validated 로 받는다")
    void constrainedRequestBodiesAreValidatedAtTheBoundary() throws ClassNotFoundException {
        List<Class<?>> controllers = mainControllers();
        List<String> checked = new ArrayList<>();
        List<String> violations = unvalidatedRequestBodies(controllers, checked);
        if (checked.size() < MIN_VALIDATED_REQUEST_BODIES) {
            fail("게이트 무결성 파손: 제약 있는 요청 DTO 파라미터가 " + checked.size() + "개로 하한 "
                    + MIN_VALIDATED_REQUEST_BODIES + " 보다 적습니다 — 컨트롤러 탐색이 비었을 수 있습니다.");
        }
        failIfAny("[INPUT CONTRACT] 제약 있는 요청 DTO 를 검사 없이 받는 컨트롤러", violations);

        List<String> fixture = unvalidatedRequestBodies(List.of(BoundaryFixture.class), new ArrayList<>());
        assertThat(fixture).containsExactlyInAnyOrder(
                "BoundaryFixture#json — Constrained",
                "BoundaryFixture#part — Constrained",
                "BoundaryFixture#getterOnly — GetterConstrained",
                "BoundaryFixture#listContainerValid — Constrained",
                "BoundaryFixture#listPlain — Constrained");
        log.info("✅ 요청 DTO 경계 검사: 컨트롤러 {}개, 제약 있는 요청 DTO 파라미터 {}개.", controllers.size(), checked.size());
    }

    /** 제약 있는 요청 DTO 를 받는 파라미터가 이보다 적으면 탐색이 빈 것으로 본다(축소 프로필도 넘는 작은 값). */
    private static final int MIN_VALIDATED_REQUEST_BODIES = 5;

    private static List<Class<?>> mainControllers() throws ClassNotFoundException {
        var scanner = new org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new org.springframework.core.type.filter.AnnotationTypeFilter(
                org.springframework.stereotype.Controller.class));
        List<Class<?>> controllers = new ArrayList<>();
        for (var candidate : scanner.findCandidateComponents("nuri")) {
            Class<?> type = Class.forName(candidate.getBeanClassName());
            var source = type.getProtectionDomain().getCodeSource();
            String location = source == null ? "" : source.getLocation().toString();
            // 테스트 클래스패스에 올라온 테스트용 컨트롤러는 제품 경계가 아니다.
            if (location.contains("/test/") || location.contains("testFixtures") || location.contains("test-fixtures")) {
                continue;
            }
            controllers.add(type);
        }
        return controllers;
    }

    static List<String> unvalidatedRequestBodies(List<Class<?>> controllers, List<String> checked) {
        List<String> violations = new ArrayList<>();
        for (Class<?> controller : controllers) {
            for (Method method : controller.getDeclaredMethods()) {
                for (java.lang.reflect.Parameter parameter : method.getParameters()) {
                    if (!parameter.isAnnotationPresent(org.springframework.web.bind.annotation.RequestBody.class)
                            && !parameter.isAnnotationPresent(org.springframework.web.bind.annotation.RequestPart.class)) {
                        continue;
                    }
                    Class<?> bodyType = bodyType(parameter);
                    if (!hasConstraints(bodyType)) {
                        continue;
                    }
                    String label = controller.getSimpleName() + "#" + method.getName() + " — " + bodyType.getSimpleName();
                    checked.add(label);
                    // 목록 본문은 원소 타입의 @Valid(List<@Valid T>)만 원소를 검사한다 — 파라미터에 단 @Valid 는
                    //   List 객체를 검사할 뿐이다(중첩 DTO 의 HV000271 규칙과 같은 기준).
                    boolean validated = parameter.getAnnotatedType() instanceof AnnotatedParameterizedType generic
                            && generic.getAnnotatedActualTypeArguments().length == 1
                            ? generic.getAnnotatedActualTypeArguments()[0].isAnnotationPresent(Valid.class)
                            : parameter.isAnnotationPresent(Valid.class)
                                    || parameter.isAnnotationPresent(org.springframework.validation.annotation.Validated.class);
                    if (!validated) {
                        violations.add(label);
                    }
                }
            }
        }
        return violations;
    }

    private static Class<?> bodyType(java.lang.reflect.Parameter parameter) {
        if (parameter.getParameterizedType() instanceof ParameterizedType generic
                && generic.getActualTypeArguments().length == 1
                && generic.getActualTypeArguments()[0] instanceof Class<?> element) {
            return element;
        }
        return parameter.getType();
    }

    /** 필드·getter·클래스 어디든 Bean Validation 제약(또는 @Valid 캐스케이드)이 있으면 검사 대상이다. */
    private static boolean hasConstraints(Class<?> type) {
        if (type.isPrimitive() || type.getName().startsWith("java.")) {
            return false;
        }
        for (Class<?> current = type; current != null && current != Object.class; current = current.getSuperclass()) {
            if (anyConstraint(current.getAnnotations())) {
                return true;
            }
            for (Field field : current.getDeclaredFields()) {
                if (anyConstraint(field.getAnnotations()) || anyConstraint(field.getAnnotatedType().getAnnotations())) {
                    return true;
                }
            }
            for (Method method : current.getDeclaredMethods()) {
                if (getterProperty(method) != null && anyConstraint(method.getAnnotations())) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean anyConstraint(Annotation[] annotations) {
        for (Annotation annotation : annotations) {
            if (annotation instanceof Valid
                    || annotation.annotationType().isAnnotationPresent(jakarta.validation.Constraint.class)) {
                return true;
            }
        }
        return false;
    }

    @SuppressWarnings("unused")
    private static final class BoundaryFixture {
        public void json(@org.springframework.web.bind.annotation.RequestBody Constrained body) {
        }

        public void part(@org.springframework.web.bind.annotation.RequestPart("x") Constrained body) {
        }

        public void valid(@Valid @org.springframework.web.bind.annotation.RequestBody Constrained body) {
        }

        public void validated(@org.springframework.validation.annotation.Validated
                @org.springframework.web.bind.annotation.RequestBody Constrained body) {
        }

        public void plain(@org.springframework.web.bind.annotation.RequestBody Plain body) {
        }

        public void getterOnly(@org.springframework.web.bind.annotation.RequestBody GetterConstrained body) {
        }

        public void listElementValid(@org.springframework.web.bind.annotation.RequestBody List<@Valid Constrained> items) {
        }

        public void listContainerValid(@Valid @org.springframework.web.bind.annotation.RequestBody List<Constrained> items) {
        }

        public void listPlain(@org.springframework.web.bind.annotation.RequestBody List<Constrained> items) {
        }
    }

    @SuppressWarnings("unused")
    private static final class Constrained {
        @NotBlank
        private String name;
    }

    @SuppressWarnings("unused")
    private static final class Plain {
        private String name;
    }

    @SuppressWarnings("unused")
    private static final class GetterConstrained {
        private String name;

        @NotBlank
        public String getName() {
            return name;
        }
    }

    private static final class NestedItem {
    }

    @SuppressWarnings("unused")
    private static final class NestedFixture {
        private List<@NotNull @Valid NestedItem> elementValid;
        @Valid
        private List<@NotNull NestedItem> containerValid;
        private List<@NotNull NestedItem> missingValid;
        private List<@Valid NestedItem> missingNotNull;
    }

    /**
     * 중첩 DTO 의 캐스케이드 검증 경계. Hibernate Validator 9 는 컨테이너에 붙인 {@code @Valid} 를 deprecated 로
     * 경고한다(HV000271) — 원소 타입({@code List<@NotNull @Valid T>})에 두고, 컨테이너 쪽은 거부해 되돌아가지 않게 한다.
     */
    static List<String> nestedValidationViolations(Field parentField, Class<?> itemType) {
        String label = parentField.getDeclaringClass().getSimpleName() + "." + parentField.getName();
        List<String> violations = new ArrayList<>();
        if (parentField.isAnnotationPresent(Valid.class)) {
            violations.add(label + " — 컨테이너에 붙인 @Valid는 Hibernate Validator 9에서 deprecated입니다(HV000271)."
                    + " 원소 타입(List<@Valid T>)에 두십시오");
        }
        if (!(parentField.getGenericType() instanceof ParameterizedType parameterized)
                || parameterized.getActualTypeArguments().length != 1
                || !itemType.equals(parameterized.getActualTypeArguments()[0])) {
            violations.add(label + " — 중첩 item 타입이 " + itemType.getSimpleName() + "이 아닙니다");
        }
        if (!(parentField.getAnnotatedType() instanceof AnnotatedParameterizedType annotated)
                || annotated.getAnnotatedActualTypeArguments().length != 1) {
            violations.add(label + " — 원소 타입 애노테이션을 읽을 수 없습니다");
            return violations;
        }
        var element = annotated.getAnnotatedActualTypeArguments()[0];
        if (!element.isAnnotationPresent(Valid.class)) {
            violations.add(label + " — 원소 타입에 @Valid가 없어 중첩 DTO 제약이 요청 검증에 전파되지 않습니다");
        }
        if (!element.isAnnotationPresent(NotNull.class)) {
            violations.add(label + " — null item을 400으로 거절하는 type-use @NotNull이 필요합니다");
        }
        return violations;
    }

    private static Field declaredField(Class<?> type, String name, List<String> violations, String layer) {
        Field field = hierarchyField(type, name);
        if (field == null) {
            violations.add(layer + " 필드 부재: " + type.getSimpleName() + "." + name);
        }
        return field;
    }

    /** 요청 DTO 가 다른 DTO 를 상속해 제약만 더하는 경우 필드는 상위 클래스에 있다. */
    private static Field hierarchyField(Class<?> type, String name) {
        for (Class<?> current = type; current != null && current != Object.class; current = current.getSuperclass()) {
            try {
                return current.getDeclaredField(name);
            } catch (NoSuchFieldException notHere) {
                // 상위 클래스를 본다.
            }
        }
        return null;
    }

    private static JsonNode openApiProperty(JsonNode schemas, Class<?> dtoType, String field,
            List<String> violations) {
        JsonNode schema = schemas.path(dtoType.getSimpleName());
        if (!schema.isObject()) {
            violations.add("OpenAPI schema 부재: " + dtoType.getSimpleName());
            return null;
        }
        JsonNode property = schema.path("properties").path(field);
        if (!property.isObject()) {
            violations.add("OpenAPI property 부재: " + dtoType.getSimpleName() + "." + field);
            return null;
        }
        return property;
    }

    private static String canonicalPattern(List<String> allowedValues) {
        return "^(?:" + String.join("|", allowedValues) + ")$";
    }

    /**
     * Bean Validation 은 속성 제약을 필드와 getter 에서, 그 타입과 상위 클래스 모두에서 모은다. 요청 DTO 가 응답 DTO 를
     * 상속하고 getter 를 재정의해 필수 제약만 더하는 형태(행사 등록 요청)를 필드만 읽으면 그 제약을 지워도 게이트가 모른다.
     */
    private static Set<RequiredField> requiredContracts(Class<?> dtoType) {
        Set<RequiredField> contracts = new LinkedHashSet<>();
        for (Class<?> type = dtoType; type != null && type != Object.class; type = type.getSuperclass()) {
            for (Field field : type.getDeclaredFields()) {
                addRequiredContracts(contracts, field.getName(), field);
            }
            for (Method method : type.getDeclaredMethods()) {
                String property = getterProperty(method);
                if (property != null) {
                    addRequiredContracts(contracts, property, method);
                }
            }
        }
        return contracts;
    }

    private static void addRequiredContracts(Set<RequiredField> contracts, String property, AnnotatedElement element) {
        for (Class<? extends Annotation> constraint : List.of(NotNull.class, NotBlank.class, NotEmpty.class)) {
            Annotation annotation = element.getAnnotation(constraint);
            if (annotation != null) {
                Set<String> groupNames = new TreeSet<>();
                Arrays.stream(validationGroups(annotation)).map(Class::getName).forEach(groupNames::add);
                contracts.add(new RequiredField(property, constraint, Set.copyOf(groupNames)));
            }
        }
    }

    /** 한 속성에 걸린 제약을 필드와 getter 양쪽에서, 상속 계층 전체에서 모은다(Bean Validation 과 같은 범위). */
    private static <A extends Annotation> List<A> propertyConstraints(Class<?> dtoType, String property, Class<A> constraint) {
        List<A> found = new ArrayList<>();
        for (Class<?> type = dtoType; type != null && type != Object.class; type = type.getSuperclass()) {
            for (Field field : type.getDeclaredFields()) {
                if (field.getName().equals(property) && field.getAnnotation(constraint) != null) {
                    found.add(field.getAnnotation(constraint));
                }
            }
            for (Method method : type.getDeclaredMethods()) {
                if (property.equals(getterProperty(method)) && method.getAnnotation(constraint) != null) {
                    found.add(method.getAnnotation(constraint));
                }
            }
        }
        return found;
    }

    /** Hibernate Validator 의 기본 getter 판정과 같다 — get 은 반환값이 있을 때, is·has 는 boolean 을 돌려줄 때. */
    private static String getterProperty(Method method) {
        if (Modifier.isStatic(method.getModifiers()) || method.isSynthetic() || method.isBridge()
                || method.getParameterCount() != 0) {
            return null;
        }
        String name = method.getName();
        if (name.startsWith("get") && name.length() > 3 && method.getReturnType() != void.class) {
            return Introspector.decapitalize(name.substring(3));
        }
        for (String prefix : List.of("is", "has")) {
            if (name.startsWith(prefix) && name.length() > prefix.length() && method.getReturnType() == boolean.class) {
                return Introspector.decapitalize(name.substring(prefix.length()));
            }
        }
        return null;
    }

    private static Class<?>[] validationGroups(Annotation annotation) {
        if (annotation instanceof NotNull notNull) {
            return notNull.groups();
        }
        if (annotation instanceof NotBlank notBlank) {
            return notBlank.groups();
        }
        if (annotation instanceof NotEmpty notEmpty) {
            return notEmpty.groups();
        }
        throw new IllegalArgumentException("지원하지 않는 필수 제약: " + annotation.annotationType().getName());
    }

    private static Set<String> describeRequired(Set<RequiredField> contracts) {
        Set<String> descriptions = new TreeSet<>();
        contracts.forEach(contract -> descriptions.add(contract.field() + ":@"
                + contract.constraint().getSimpleName() + " groups=" + new TreeSet<>(contract.groups())));
        return descriptions;
    }

    private static Set<String> simpleNames(Set<Class<?>> types) {
        Set<String> names = new TreeSet<>();
        types.forEach(type -> names.add(type.getSimpleName()));
        return names;
    }

    private static boolean allowsNull(JsonNode schema) {
        if (schema.path("nullable").asBoolean(false)) {
            return true;
        }
        JsonNode type = schema.path("type");
        if (type.isString() && "null".equals(type.asString())) {
            return true;
        }
        if (type.isArray()) {
            for (JsonNode candidate : type) {
                if ("null".equals(candidate.asString())) {
                    return true;
                }
            }
        }
        for (String union : List.of("anyOf", "oneOf")) {
            for (JsonNode candidate : schema.path(union)) {
                if (allowsNull(candidate)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static Path resolveApiDocs() {
        Path candidate = HarnessSourceIndex.repoRoot().resolve(API_DOCS_FILE);
        if (Files.isRegularFile(candidate)) {
            return candidate;
        }
        fail("게이트 무결성 파손: 저장소 루트의 " + API_DOCS_FILE + "을 찾을 수 없습니다 (repoRoot="
                + HarnessSourceIndex.repoRoot() + ")");
        return candidate;
    }

    private static String readRepoFile(Path root, String relative) {
        try {
            return HarnessSourceIndex.read(root.resolve(relative));
        } catch (IOException ex) {
            throw new AssertionError(relative + " 를 읽지 못했습니다 — 원장 없이는 판정하지 않습니다.", ex);
        }
    }

    private static JsonNode readJson(String json, String source) {
        try {
            return JsonMapper.builder()
                    .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                    .build()
                    .readTree(json);
        } catch (JacksonException ex) {
            throw new AssertionError(source + " 를 JSON 으로 읽지 못했습니다: " + ex.getMessage(), ex);
        }
    }

    private static String json(String singleQuoted) {
        return singleQuoted.replace('\'', '"');
    }

    /** 부정 증명 픽스처의 expected — 길이 하한만 2 라 길이 표적 하나짜리 원장은 하한 아래다. */
    private static String fixtureFloors() {
        return "{'lengthFields':2,'enumFields':1,'nestedValidationFields':1,'requiredFields':1,'readOnlyFields':1,'calendarDateFields':1}";
    }

    private static void failIfAny(String heading, List<String> violations) {
        if (violations.isEmpty()) {
            return;
        }
        Set<String> unique = new TreeSet<>(violations);
        StringBuilder message = new StringBuilder("\n").append(heading).append(" ")
                .append(unique.size()).append("건:\n");
        unique.forEach(violation -> message.append("  - ").append(violation).append('\n'));
        fail(message.toString());
    }

    @FunctionalInterface
    interface TypeResolver {
        Class<?> resolve(String binaryName) throws ClassNotFoundException;
    }

    record Census(Registry registry, List<LengthBinding> lengthBindings,
                  List<EnumBinding> enumBindings, List<NestedValidationBinding> nestedValidationBindings,
                  List<RequiredBinding> requiredBindings, Map<Class<?>, Set<String>> requiredResponseFields,
                  List<FieldsBinding> readOnlyBindings, List<FieldsBinding> calendarDateBindings) {
    }

    private record LengthBinding(Class<?> entityType, Class<?> dtoType, List<String> fields,
                                 Map<String, String> entityFields) {
        String entityField(String dtoField) { return entityFields.getOrDefault(dtoField, dtoField); }
    }

    private record EnumBinding(Class<?> dtoType, String field, List<String> allowedValues) {
    }

    private record NestedValidationBinding(Class<?> parentType, String field, Class<?> itemType) {
    }

    private record RequiredBinding(Class<?> dtoType, List<RequiredField> fields) {
    }

    private record FieldsBinding(Class<?> dtoType, List<String> fields) {
    }

    private record RequiredField(String field, Class<? extends Annotation> constraint, Set<String> groups) {
    }

    /** 원장 항목의 공통 형태 — 판정에 필요한 참조 타입 이진 이름. */
    interface Spec {
        String label();

        List<String> types();
    }

    record LengthSpec(String entity, String dto, List<String> fields, Map<String, String> entityFields) implements Spec {
        public String label() { return "lengthBindings " + dto; }

        public List<String> types() { return List.of(entity, dto); }
    }

    record EnumSpec(String dto, String field, List<String> allowedValues) implements Spec {
        public String label() { return "enumBindings " + dto + "." + field; }

        public List<String> types() { return List.of(dto); }
    }

    record NestedSpec(String parent, String field, String item) implements Spec {
        public String label() { return "nestedValidationBindings " + parent + "." + field; }

        public List<String> types() { return List.of(parent, item); }
    }

    record RequiredFieldSpec(String field, String constraint, List<String> groups) {
    }

    record RequiredSpec(String dto, List<RequiredFieldSpec> fields) implements Spec {
        public String label() { return "requiredBindings " + dto; }

        public List<String> types() {
            List<String> types = new ArrayList<>();
            types.add(dto);
            fields.forEach(field -> types.addAll(field.groups()));
            return types;
        }
    }

    record FieldsSpec(String section, String dto, List<String> fields) implements Spec {
        public String label() { return section + " " + dto; }

        public List<String> types() { return List.of(dto); }
    }

    /** 원장 expected — 원장 전체에 적용하는 표적 하한. 길이·필수·읽기 전용·달력 날짜는 필드 수 합, enum·중첩 검증은 바인딩 수다. */
    record Floors(int lengthFields, int enumFields, int nestedValidationFields, int requiredFields,
                  int readOnlyFields, int calendarDateFields) {

        static Floors parse(JsonNode root) {
            JsonNode node = root.get("expected");
            Set<String> keys = Set.of("lengthFields", "enumFields", "nestedValidationFields", "requiredFields",
                    "readOnlyFields", "calendarDateFields");
            Registry.requireFields(node, CENSUS_REGISTRY + " expected", keys, keys);
            return new Floors(positive(node, "lengthFields"), positive(node, "enumFields"),
                    positive(node, "nestedValidationFields"), positive(node, "requiredFields"),
                    positive(node, "readOnlyFields"), positive(node, "calendarDateFields"));
        }

        private static int positive(JsonNode node, String field) {
            JsonNode value = node.get(field);
            // 0 이하는 하한을 끄는 것과 같다 — 게이트를 비우는 경로가 되므로 받지 않는다.
            if (value == null || !value.isInt() || value.intValue() <= 0) {
                throw new AssertionError(CENSUS_REGISTRY + " expected." + field + " 는 양의 정수여야 합니다: " + value);
            }
            return value.intValue();
        }
    }

    record Registry(List<LengthSpec> lengthBindings, List<EnumSpec> enumBindings,
                    List<NestedSpec> nestedValidationBindings, List<RequiredSpec> requiredBindings,
                    List<FieldsSpec> requiredResponseFields, List<FieldsSpec> readOnlyBindings,
                    List<FieldsSpec> calendarDateBindings, Floors floors) {

        List<Spec> allSpecs() {
            List<Spec> all = new ArrayList<>();
            all.addAll(lengthBindings);
            all.addAll(enumBindings);
            all.addAll(nestedValidationBindings);
            all.addAll(requiredBindings);
            all.addAll(requiredResponseFields);
            all.addAll(readOnlyBindings);
            all.addAll(calendarDateBindings);
            return all;
        }

        static Registry parse(String json) {
            JsonNode root = readJson(json, CENSUS_REGISTRY);
            Set<String> sections = Set.of("lengthBindings", "enumBindings", "nestedValidationBindings", "requiredBindings",
                    "requiredResponseFields", "readOnlyBindings", "calendarDateBindings");
            Set<String> topAllowed = new TreeSet<>(sections);
            topAllowed.addAll(Set.of("schemaVersion", "description", "expected"));
            Set<String> topRequired = new TreeSet<>(sections);
            topRequired.addAll(Set.of("schemaVersion", "expected"));
            requireFields(root, CENSUS_REGISTRY, topAllowed, topRequired);
            if (root.get("schemaVersion").asInt(-1) != 1) {
                throw new AssertionError(CENSUS_REGISTRY + " schemaVersion 은 1 이어야 합니다.");
            }

            List<LengthSpec> lengths = new ArrayList<>();
            Set<String> lengthDtos = new LinkedHashSet<>();
            for (JsonNode node : array(root, "lengthBindings")) {
                requireFields(node, "lengthBindings", Set.of("entity", "dto", "fields", "entityFields"),
                        Set.of("entity", "dto", "fields"));
                String dto = typeName(node, "dto");
                Map<String, String> entityFields = new LinkedHashMap<>();
                JsonNode mapping = node.get("entityFields");
                if (mapping != null) {
                    if (!mapping.isObject()) {
                        throw new AssertionError("lengthBindings.entityFields 는 객체여야 합니다: " + node);
                    }
                    for (Map.Entry<String, JsonNode> entry : mapping.properties()) {
                        entityFields.put(fieldName(entry.getKey()), fieldName(entry.getValue().asString()));
                    }
                }
                LengthSpec spec = new LengthSpec(typeName(node, "entity"), dto, fieldList(node, "fields", false),
                        Map.copyOf(entityFields));
                if (!lengthDtos.add(dto)) {
                    throw new AssertionError("길이 binding DTO 중복: " + dto);
                }
                lengths.add(spec);
            }

            List<EnumSpec> enums = new ArrayList<>();
            Set<String> enumKeys = new LinkedHashSet<>();
            for (JsonNode node : array(root, "enumBindings")) {
                requireFields(node, "enumBindings", Set.of("dto", "field", "allowedValues"),
                        Set.of("dto", "field", "allowedValues"));
                EnumSpec spec = new EnumSpec(typeName(node, "dto"), fieldName(text(node, "field")),
                        stringList(node, "allowedValues"));
                if (!enumKeys.add(spec.dto() + "." + spec.field())) {
                    throw new AssertionError("enumBindings 중복: " + spec.dto() + "." + spec.field());
                }
                enums.add(spec);
            }

            List<NestedSpec> nested = new ArrayList<>();
            for (JsonNode node : array(root, "nestedValidationBindings")) {
                requireFields(node, "nestedValidationBindings", Set.of("parent", "field", "item"),
                        Set.of("parent", "field", "item"));
                nested.add(new NestedSpec(typeName(node, "parent"), fieldName(text(node, "field")), typeName(node, "item")));
            }

            List<RequiredSpec> required = new ArrayList<>();
            Set<String> requiredDtos = new LinkedHashSet<>();
            for (JsonNode node : array(root, "requiredBindings")) {
                requireFields(node, "requiredBindings", Set.of("dto", "fields"), Set.of("dto", "fields"));
                String dto = typeName(node, "dto");
                List<RequiredFieldSpec> fields = new ArrayList<>();
                Set<String> fieldNames = new LinkedHashSet<>();
                for (JsonNode fieldNode : array(node, "fields")) {
                    requireFields(fieldNode, "requiredBindings.fields", Set.of("field", "constraint", "groups"),
                            Set.of("field", "constraint", "groups"));
                    String field = fieldName(text(fieldNode, "field"));
                    String constraint = text(fieldNode, "constraint");
                    if (!REQUIRED_CONSTRAINTS.containsKey(constraint)) {
                        throw new AssertionError("requiredBindings.constraint 는 " + REQUIRED_CONSTRAINTS.keySet()
                                + " 중 하나여야 합니다: " + constraint);
                    }
                    List<String> groups = new ArrayList<>();
                    for (JsonNode group : array(fieldNode, "groups")) {
                        groups.add(typeNameValue(group.asString(), "requiredBindings.groups"));
                    }
                    if (!new ArrayList<>(new TreeSet<>(groups)).equals(groups)) {
                        throw new AssertionError("requiredBindings.groups 는 중복 없이 정렬돼야 합니다: " + dto + "." + field + " " + groups);
                    }
                    if (!fieldNames.add(field)) {
                        throw new AssertionError("필수 binding 필드 중복: " + dto + "." + field);
                    }
                    fields.add(new RequiredFieldSpec(field, constraint, List.copyOf(groups)));
                }
                RequiredSpec spec = new RequiredSpec(dto, List.copyOf(fields));
                if (!requiredDtos.add(dto)) {
                    throw new AssertionError("필수 binding DTO 중복: " + dto);
                }
                required.add(spec);
            }
            if (!requiredDtos.equals(lengthDtos)) {
                throw new AssertionError("필수 binding DTO 집합=" + new TreeSet<>(requiredDtos)
                        + " 이 길이 binding DTO 집합=" + new TreeSet<>(lengthDtos) + " 과 다릅니다.");
            }
            // 같은 DTO 의 길이·필수·응답 전용 표적이 어느 구성에서나 함께 남고 빠지는지(소유 기능 집합이 같은지)는 원장에 소유를 적지 않으므로
            // scripts/input-contract-mirror-census-contract.test.mjs 가 소스에서 계산해 본다(종전의 '같은 pack' 규칙).

            // 응답 전용 필수 필드는 필수 binding 검사 안에서만 소비된다 — 짝이 없는 DTO 는 받아 두고 영영 검사하지 않게 된다.
            List<FieldsSpec> responseFields = fieldsSpecs(root, "requiredResponseFields");
            for (FieldsSpec spec : responseFields) {
                if (!requiredDtos.contains(spec.dto())) {
                    throw new AssertionError("requiredResponseFields DTO 에 requiredBindings 항목이 없어 검사되지 않습니다: " + spec.dto());
                }
            }

            return new Registry(List.copyOf(lengths), List.copyOf(enums), List.copyOf(nested),
                    List.copyOf(required), responseFields,
                    fieldsSpecs(root, "readOnlyBindings"), fieldsSpecs(root, "calendarDateBindings"), Floors.parse(root));
        }

        private static List<FieldsSpec> fieldsSpecs(JsonNode root, String section) {
            List<FieldsSpec> specs = new ArrayList<>();
            Set<String> dtos = new LinkedHashSet<>();
            for (JsonNode node : array(root, section)) {
                requireFields(node, section, Set.of("dto", "fields"), Set.of("dto", "fields"));
                FieldsSpec spec = new FieldsSpec(section, typeName(node, "dto"), fieldList(node, "fields", false));
                if (!dtos.add(spec.dto())) {
                    throw new AssertionError(section + " DTO 중복: " + spec.dto());
                }
                specs.add(spec);
            }
            return List.copyOf(specs);
        }

        private static Iterable<JsonNode> array(JsonNode node, String field) {
            JsonNode value = node.get(field);
            if (value == null || !value.isArray()) {
                throw new AssertionError(CENSUS_REGISTRY + " 의 " + field + " 는 배열이어야 합니다.");
            }
            return value;
        }

        private static String text(JsonNode node, String field) {
            JsonNode value = node.get(field);
            if (value == null || !value.isString() || value.asString().isBlank()) {
                throw new AssertionError(field + " 는 비어 있지 않은 문자열이어야 합니다: " + node);
            }
            return value.asString();
        }

        private static String typeName(JsonNode node, String field) {
            return typeNameValue(text(node, field), field);
        }

        private static String typeNameValue(String value, String field) {
            if (!TYPE_NAME.matcher(value).matches()) {
                throw new AssertionError(field + " 는 이진 이름 형식의 타입이어야 합니다: " + value);
            }
            return value;
        }

        private static String fieldName(String value) {
            if (!FIELD_NAME.matcher(value).matches()) {
                throw new AssertionError("필드 이름 형식 오류: " + value);
            }
            return value;
        }

        private static List<String> stringList(JsonNode node, String field) {
            List<String> values = new ArrayList<>();
            for (JsonNode value : array(node, field)) {
                if (!value.isString() || value.asString().isEmpty()) {
                    throw new AssertionError(field + " 에 빈 값·비문자열이 있습니다: " + node);
                }
                values.add(value.asString());
            }
            if (values.isEmpty() || new LinkedHashSet<>(values).size() != values.size()) {
                throw new AssertionError(field + " 는 비어 있지 않고 중복이 없어야 합니다: " + node);
            }
            return List.copyOf(values);
        }

        private static List<String> fieldList(JsonNode node, String field, boolean allowEmpty) {
            List<String> values = new ArrayList<>();
            for (JsonNode value : array(node, field)) {
                values.add(fieldName(value.asString()));
            }
            if ((!allowEmpty && values.isEmpty()) || new LinkedHashSet<>(values).size() != values.size()) {
                throw new AssertionError(field + " 는 비어 있지 않고 중복이 없어야 합니다: " + node);
            }
            return List.copyOf(values);
        }

        private static void requireFields(JsonNode node, String section, Set<String> allowed, Set<String> required) {
            if (node == null || !node.isObject()) {
                throw new AssertionError(section + " 항목은 객체여야 합니다: " + node);
            }
            for (Iterator<String> names = node.propertyNames().iterator(); names.hasNext(); ) {
                String name = names.next();
                if (!allowed.contains(name)) {
                    throw new AssertionError(section + " 에 모르는 필드 '" + name + "' 가 있습니다: " + node);
                }
            }
            for (String name : required) {
                if (!node.hasNonNull(name)) {
                    throw new AssertionError(section + " 항목에 '" + name + "' 가 없습니다: " + node);
                }
            }
        }
    }
}
