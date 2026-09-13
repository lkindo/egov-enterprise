package nuri.api.harness;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.business.service.auth.dto.AuthorizationDto;
import nuri.business.service.user.dto.UserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.lang.annotation.Annotation;
import java.lang.reflect.AnnotatedParameterizedType;
import java.lang.reflect.Field;
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
 *   <li>중첩 입력 DTO에 {@code @Valid}와 OpenAPI item schema가 함께 연결되는가</li>
 *   <li>서버 소유·응답 전용 필드가 Jackson과 OpenAPI에서 함께 read-only인가</li>
 *   <li>같은 maxLength·enum·required가 커밋된 {@code api-docs.json}까지 전파됐는가</li>
 * </ol>
 *
 * <p>마지막 검사는 DTO 애노테이션만 고치고 api-docs/codegen 갱신을 잊는 로컬 false-green을 막는다.
 * 하류의 {@code codegen:verify}/{@code codegen:verify:zod}와 결합하면
 * Entity → DTO → OpenAPI → TypeScript/Zod 체인이 닫힌다.
 *
 * <p><b>표적 원장은 {@code config/governance/input-contract-mirror-census.json} 이다.</b> 종전에는 표적을 이 클래스의
 * 상수와 도메인 타입 import 로 두었는데, 재사용 base 투영은 제거된 pack 의 타입을 참조하는 파일을 통째로 지우므로
 * <b>남는 코어 DTO 까지 검사하던 이 게이트가 축소 프로필에서 사라졌다</b>(GAP-PACK-001 ④). 원장은 항목마다 참조 타입의
 * 이진 이름과 소유 pack 을 적고, 이 게이트는 현재 트리의 pack manifest 에 남은 pack 의 항목만 검사한다. 빠진 pack 항목은
 * <b>참조 타입 중 하나가 {@code ClassNotFoundException} 일 때만</b> 부재로 인정한다 — 전부 로드되면 pack 태그가 틀린 것이고,
 * 링크 오류는 판정할 수 없는 것이라 둘 다 red 다. 표적 하한({@code MIN_*})은 프로필과 무관하게 원장 <b>전체</b>에 적용한다.
 * 태그가 생성기의 실제 제거 계획과 맞는지는 {@code scripts/input-contract-mirror-census-contract.test.mjs} 가 대조한다.
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
    private static final String PACK_MANIFEST = "config/reusable-base-profiles.json";

    // [2026-09-07] +3 (ISG itntSvcNm/itntSvcExpln/rfltYn).
    // [2026-09-08 PD-MYPG-001] 116 -> 111. MyPageContentDto 5필드가 빠졌다 — 그 DTO 를 걷었기
    //   때문이다(마이페이지 콘텐츠 관리 표면 제거). 검증 약화가 아니라 검증 대상 자체의 소멸이며,
    //   엔티티·테이블은 남으므로 표면이 되살아나면 이 바인딩도 함께 복구한다.
    // ADR-0012: BoardMasterDto.blogYn 제거로 길이/enum 표적을 각각 1개 줄인다.
    // [2026-09-14 DEC-OPS-090] 표적이 원장으로 옮겨졌다. 하한은 원장 전체에 적용한다 — 축소 프로필에서
    //   검사하는 부분집합은 작아지지만, 원장을 비워 게이트를 줄이는 경로는 여전히 red 다.
    private static final int MIN_LENGTH_FIELDS = 127;
    private static final int MIN_ENUM_FIELDS = 14;
    private static final int MIN_NESTED_VALIDATION_FIELDS = 2;
    // [2026-09-06 병합] CommunityDto.cmntyNm·DeptJobBoxDto.deptTaskBoxNm 필수화(+2), SmsRecptnDto.rcptnTelno 해제(-1) → 37.
    // [2026-09-07] +2 (ISG itntSvcNm/itntSvcExpln).
    private static final int MIN_REQUIRED_FIELDS = 42;
    // [2026-09-07] +3 (ISG itntSrvcSn/lastMdfrId/mdfcnDt).
    private static final int MIN_READ_ONLY_FIELDS = 45;
    private static final int MIN_CALENDAR_DATE_FIELDS = 12;

    private static final java.util.regex.Pattern TYPE_NAME = java.util.regex.Pattern.compile(
            "[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)*\\.[A-Z][A-Za-z0-9_]*(?:\\$[A-Z][A-Za-z0-9_]*)*");
    private static final java.util.regex.Pattern FIELD_NAME = java.util.regex.Pattern.compile("[a-z][A-Za-z0-9_]*");

    private static final Map<String, Class<? extends Annotation>> REQUIRED_CONSTRAINTS = Map.of(
            "NotBlank", NotBlank.class,
            "NotNull", NotNull.class,
            "NotEmpty", NotEmpty.class);

    private static Census census;

    /** 현재 트리의 원장·pack manifest 로 해석한 표적. 한 테스트 JVM 에서 한 번만 읽는다. */
    private static synchronized Census census() {
        if (census == null) {
            Path root = HarnessSourceIndex.repoRoot();
            Registry registry = Registry.parse(readRepoFile(root, CENSUS_REGISTRY));
            Set<String> presentPacks = presentPacks(registry, readRepoFile(root, PACK_MANIFEST));
            ClassLoader loader = InputContractMirrorLinterTest.class.getClassLoader();
            census = resolve(registry, presentPacks, name -> Class.forName(name, false, loader));
        }
        return census;
    }

    @Test
    @DisplayName("달력 날짜 입력 제약이 OpenAPI와 생성 Zod의 원본까지 전파된다")
    void calendarDatePatternsReachCommittedOpenApi() throws Exception {
        JsonNode schemas = new ObjectMapper().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        List<String> violations = new ArrayList<>();
        for (FieldsBinding binding : census().calendarDateBindings()) {
            for (String name : binding.fields()) {
                Pattern pattern;
                try {
                    pattern = binding.dtoType().getDeclaredField(name).getAnnotation(Pattern.class);
                } catch (NoSuchFieldException inherited) {
                    pattern = binding.dtoType().getMethod("get" + Character.toUpperCase(name.charAt(0)) + name.substring(1)).getAnnotation(Pattern.class);
                }
                if (pattern == null || !nuri.foundation.core.validation.Ymd.OPTIONAL_PATTERN.equals(pattern.regexp())) {
                    violations.add(binding.dtoType().getSimpleName() + "." + name + " — calendar constraint missing");
                }
                JsonNode property = openApiProperty(schemas, binding.dtoType(), name, violations);
                if (property != null && !nuri.foundation.core.validation.Ymd.OPTIONAL_PATTERN.equals(property.path("pattern").asText())) {
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
        for (LengthBinding binding : census.lengthBindings()) {
            for (String fieldName : binding.fields()) {
                Field entityField = declaredField(binding.entityType(), binding.entityField(fieldName), violations, "Entity");
                Field dtoField = declaredField(binding.dtoType(), fieldName, violations, "DTO");
                if (entityField == null || dtoField == null) {
                    continue;
                }
                Column column = entityField.getAnnotation(Column.class);
                Size size = dtoField.getAnnotation(Size.class);
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
        log.info("✅ 입력 계약 표적 미러(남은 pack {}): 길이 {}필드, enum {}필드.", census.presentPacks(),
                census.lengthBindings().stream().mapToInt(binding -> binding.fields().size()).sum(),
                census.enumBindings().size());
    }

    @Test
    @DisplayName("입력 DTO 길이와 enum 제약이 api-docs.json까지 전파된다")
    void targetedDtoConstraintsReachCommittedOpenApi() throws IOException {
        Census census = census();
        JsonNode schemas = new ObjectMapper().readTree(HarnessSourceIndex.read(resolveApiDocs()))
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
                            + " — OpenAPI maxLength=" + property.path("maxLength").asText("<missing>")
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
            property.path("enum").forEach(node -> actualEnum.add(node.asText()));
            Set<String> expectedEnum = new LinkedHashSet<>(binding.allowedValues());
            if (!actualEnum.equals(expectedEnum)) {
                violations.add(binding.dtoType().getSimpleName() + "." + binding.field()
                        + " — OpenAPI enum=" + actualEnum + " (expected=" + expectedEnum + ")");
            }
            String expectedPattern = canonicalPattern(binding.allowedValues());
            if (!expectedPattern.equals(property.path("pattern").asText())) {
                violations.add(binding.dtoType().getSimpleName() + "." + binding.field()
                        + " — OpenAPI pattern=" + property.path("pattern").asText("<missing>")
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
        JsonNode schemas = new ObjectMapper().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        List<String> violations = new ArrayList<>();
        for (NestedValidationBinding binding : census.nestedValidationBindings()) {
            Field parentField = declaredField(binding.parentType(), binding.field(), violations, "DTO");
            if (parentField == null) {
                continue;
            }
            if (!parentField.isAnnotationPresent(Valid.class)) {
                violations.add(binding.parentType().getSimpleName() + "." + binding.field()
                        + " — @Valid가 없어 중첩 DTO 제약이 요청 검증에 전파되지 않습니다");
            }
            if (!(parentField.getGenericType() instanceof ParameterizedType parameterized)
                    || parameterized.getActualTypeArguments().length != 1
                    || !binding.itemType().equals(parameterized.getActualTypeArguments()[0])) {
                violations.add(binding.parentType().getSimpleName() + "." + binding.field()
                        + " — 중첩 item 타입이 " + binding.itemType().getSimpleName() + "이 아닙니다");
            }
            if (!(parentField.getAnnotatedType() instanceof AnnotatedParameterizedType annotated)
                    || annotated.getAnnotatedActualTypeArguments().length != 1
                    || !annotated.getAnnotatedActualTypeArguments()[0].isAnnotationPresent(NotNull.class)) {
                violations.add(binding.parentType().getSimpleName() + "." + binding.field()
                        + " — null item을 400으로 거절하는 type-use @NotNull이 필요합니다");
            }

            JsonNode property = openApiProperty(schemas, binding.parentType(), binding.field(), violations);
            if (property == null) {
                continue;
            }
            String expectedRef = "#/components/schemas/" + binding.itemType().getSimpleName();
            if (!"array".equals(property.path("type").asText())
                    || !expectedRef.equals(property.path("items").path("$ref").asText())) {
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

        JsonNode schemas = new ObjectMapper().readTree(HarnessSourceIndex.read(resolveApiDocs()))
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
        schema.path("required").forEach(node -> actual.add(node.asText()));
        return actual.equals(expected);
    }

    @Test
    @DisplayName("인가 응답 필수 필드는 요청으로 주입할 수 없고 입력 필수 계약도 줄어들지 않는다")
    void authorizationResponseFieldsCannotBecomeRequestPermissions() throws IOException {
        var mapper = new ObjectMapper();
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
            actual.path("required").forEach(field -> { if (!removed.equals(field.asText())) required.add(field.asText()); });
            ((com.fasterxml.jackson.databind.node.ObjectNode) changed).set("required", required);
            org.junit.jupiter.api.Assertions.assertFalse(schemaRequiredFieldsMatch(changed, expected), removed);
        }
    }

    @Test
    @DisplayName("서버 소유 필드는 요청 역직렬화와 OpenAPI에서 함께 read-only다")
    void serverOwnedFieldsRemainReadOnlyAtRuntimeAndInOpenApi() throws IOException {
        Census census = census();
        JsonNode schemas = new ObjectMapper().readTree(HarnessSourceIndex.read(resolveApiDocs()))
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
    @DisplayName("부정 증명: pack 필터는 참조 타입 중 하나의 '클래스 없음' 만 부재로 인정하고 태그·링크 오류·낡은 원장을 red 로 만든다")
    void packFilterAcceptsOnlyMissingClassesAsAbsence() {
        Registry registry = Registry.parse(json("{'schemaVersion':1,'packs':['base','extra'],"
                + "'lengthBindings':["
                + "{'entity':'example.kept.KeptEntity','dto':'example.kept.KeptDto','fields':['name'],'pack':'base'},"
                + "{'entity':'example.kept.KeptEntity','dto':'example.gone.GoneDto','fields':['name'],'pack':'extra'}],"
                + "'enumBindings':[],'nestedValidationBindings':[],"
                + "'requiredBindings':["
                + "{'dto':'example.kept.KeptDto','fields':[],'pack':'base'},"
                + "{'dto':'example.gone.GoneDto','fields':[],'pack':'extra'}],"
                + "'requiredResponseFields':[],'readOnlyBindings':[],'calendarDateBindings':[]}"));

        // ① 모든 pack 이 있으면 전 항목을 검사한다.
        Census all = resolve(registry, Set.of("base", "extra"), name -> Object.class);
        assertThat(all.lengthBindings()).hasSize(2);

        // ② 빠진 pack 항목은 참조 타입 중 하나가 정말 없을 때만 빠진다(엔티티는 남아도 된다).
        Census reduced = resolve(registry, Set.of("base"), name -> {
            if (name.startsWith("example.gone.")) {
                throw new ClassNotFoundException(name);
            }
            return Object.class;
        });
        assertThat(reduced.lengthBindings()).hasSize(1);
        assertThat(reduced.requiredBindings()).hasSize(1);

        // ③ 빠진 pack 인데 참조 타입이 모두 남아 있으면 pack 태그가 틀린 것이다.
        assertThatThrownBy(() -> resolve(registry, Set.of("base"), name -> Object.class))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("example.gone.GoneDto")
                .hasMessageContaining("pack 태그");

        // ④ 링크 오류는 부재로 인정하지 않는다.
        assertThatThrownBy(() -> resolve(registry, Set.of("base"), name -> {
            if (name.startsWith("example.gone.")) {
                throw new NoClassDefFoundError(name);
            }
            return Object.class;
        }))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("링크 오류");

        // ⑤ 남은 pack 항목의 타입이 없으면 원장이 낡은 것이다.
        assertThatThrownBy(() -> resolve(registry, Set.of("base", "extra"), name -> {
            if (name.equals("example.kept.KeptEntity")) {
                throw new ClassNotFoundException(name);
            }
            return Object.class;
        }))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("example.kept.KeptEntity");
    }

    @Test
    @DisplayName("부정 증명: 원장 형식·교차 일관성·하한 위반은 fail-closed 로 거부한다")
    void registryIsFailClosed() {
        String tail = "'enumBindings':[],'nestedValidationBindings':[],'requiredResponseFields':[],"
                + "'readOnlyBindings':[],'calendarDateBindings':[]}";
        String length = "{'entity':'example.kept.KeptEntity','dto':'example.kept.KeptDto','fields':['name'],'pack':'base'}";
        String required = "{'dto':'example.kept.KeptDto','fields':[{'field':'name','constraint':'NotBlank','groups':[]}],'pack':'base'}";
        String head = "{'schemaVersion':1,'packs':['base','extra'],";

        assertThatThrownBy(() -> Registry.parse(json(head + "'packs':['base'],'lengthBindings':[],'requiredBindings':[]," + tail)))
                .as("중복 키").isInstanceOf(AssertionError.class);
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length.replace("'base'", "'other'")
                + "],'requiredBindings':[" + required + "]," + tail)))
                .as("어휘 밖 pack").isInstanceOf(AssertionError.class).hasMessageContaining("other");
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
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length + "],'requiredBindings':["
                + required.replace("'base'", "'extra'") + "]," + tail)))
                .as("같은 DTO 의 pack 불일치").isInstanceOf(AssertionError.class).hasMessageContaining("pack");
        assertThatThrownBy(() -> Registry.parse(json(head + "'lengthBindings':[" + length.replace("'pack'", "'note':'x','pack'")
                + "],'requiredBindings':[" + required + "]," + tail)))
                .as("모르는 필드").isInstanceOf(AssertionError.class).hasMessageContaining("note");

        String withResponse = head + "'lengthBindings':[" + length + "],'requiredBindings':[" + required + "],"
                + tail.replace("'requiredResponseFields':[]", "'requiredResponseFields':[RESPONSE]");
        assertThatThrownBy(() -> Registry.parse(json(withResponse.replace("RESPONSE",
                "{'dto':'example.kept.OtherDto','fields':['groups'],'pack':'base'}"))))
                .as("필수 binding 없는 응답 전용 DTO").isInstanceOf(AssertionError.class).hasMessageContaining("requiredBindings");
        assertThatThrownBy(() -> Registry.parse(json(withResponse.replace("RESPONSE",
                "{'dto':'example.kept.KeptDto','fields':['groups'],'pack':'extra'}"))))
                .as("응답 전용 필드 pack 불일치").isInstanceOf(AssertionError.class).hasMessageContaining("pack");
        assertThat(Registry.parse(json(withResponse.replace("RESPONSE",
                "{'dto':'example.kept.KeptDto','fields':['groups'],'pack':'base'}"))).requiredResponseFields())
                .as("대조군: 짝이 맞으면 받는다").hasSize(1);

        Registry small = Registry.parse(json(head + "'lengthBindings':[" + length + "],'requiredBindings':[" + required + "]," + tail));
        assertThat(floorViolations(small)).as("하한은 원장 전체 기준으로 계산한다").isNotEmpty();
        assertThat(presentPacks(small, json("{'packs':{'base':{}}}"))).containsExactly("base");
        assertThatThrownBy(() -> presentPacks(small, json("{'packs':{'base':{},'newcomer':{}}}")))
                .as("원장 어휘에 없는 manifest pack").isInstanceOf(AssertionError.class).hasMessageContaining("newcomer");
    }

    /** 원장 전체(프로필 무관) 표적 하한. 축소 프로필의 부분집합이 아니라 원장 자체의 축소를 막는다. */
    static List<String> floorViolations(Registry registry) {
        List<String> violations = new ArrayList<>();
        int length = registry.lengthBindings().stream().mapToInt(spec -> spec.fields().size()).sum();
        int required = registry.requiredBindings().stream().mapToInt(spec -> spec.fields().size()).sum();
        int readOnly = registry.readOnlyBindings().stream().mapToInt(spec -> spec.fields().size()).sum();
        int calendar = registry.calendarDateBindings().stream().mapToInt(spec -> spec.fields().size()).sum();
        if (length < MIN_LENGTH_FIELDS) violations.add("length=" + length + " < " + MIN_LENGTH_FIELDS);
        if (registry.enumBindings().size() < MIN_ENUM_FIELDS) violations.add("enum=" + registry.enumBindings().size() + " < " + MIN_ENUM_FIELDS);
        if (registry.nestedValidationBindings().size() < MIN_NESTED_VALIDATION_FIELDS) {
            violations.add("nested=" + registry.nestedValidationBindings().size() + " < " + MIN_NESTED_VALIDATION_FIELDS);
        }
        if (required < MIN_REQUIRED_FIELDS) violations.add("required=" + required + " < " + MIN_REQUIRED_FIELDS);
        if (readOnly < MIN_READ_ONLY_FIELDS) violations.add("readOnly=" + readOnly + " < " + MIN_READ_ONLY_FIELDS);
        if (calendar < MIN_CALENDAR_DATE_FIELDS) violations.add("calendar=" + calendar + " < " + MIN_CALENDAR_DATE_FIELDS);
        return violations;
    }

    /**
     * 남은 pack 의 표적을 클래스로 해석한다. 순수 함수 — 클래스 로드는 주입된 resolver 로만 한다.
     *
     * <p>빠진 pack 항목은 참조 타입 중 하나가 {@link ClassNotFoundException} 을 던질 때만 제외한다.
     */
    static Census resolve(Registry registry, Set<String> presentPacks, TypeResolver resolver) {
        Map<String, Class<?>> loaded = new LinkedHashMap<>();
        List<String> violations = new ArrayList<>();
        for (Spec spec : registry.allSpecs()) {
            boolean present = presentPacks.contains(spec.pack());
            boolean anyMissing = false;
            boolean linkageBroken = false;
            for (String type : spec.types()) {
                try {
                    Class<?> clazz = loaded.containsKey(type) ? loaded.get(type) : resolver.resolve(type);
                    loaded.put(type, clazz);
                } catch (ClassNotFoundException ex) {
                    anyMissing = true;
                    if (present) {
                        violations.add(spec.label() + ": " + type + " 는 남은 pack '" + spec.pack()
                                + "' 표적인데 클래스가 없습니다 — 원장이 낡았습니다.");
                    }
                } catch (LinkageError ex) {
                    linkageBroken = true;
                    violations.add(spec.label() + ": " + type + " 로드 중 링크 오류(" + ex + ") — 부재인지 판정할 수 없습니다.");
                }
            }
            if (!present && !anyMissing && !linkageBroken) {
                violations.add(spec.label() + " 는 빠진 pack '" + spec.pack()
                        + "' 표적으로 적혀 있는데 참조 타입이 모두 남아 있습니다 — pack 태그가 틀렸습니다.");
            }
        }
        if (!violations.isEmpty()) {
            throw new AssertionError("🔒 [INPUT CONTRACT] 표적 pack 판정 실패:\n   · " + String.join("\n   · ", violations));
        }

        List<LengthBinding> lengths = new ArrayList<>();
        for (LengthSpec spec : registry.lengthBindings()) {
            if (presentPacks.contains(spec.pack())) {
                lengths.add(new LengthBinding(loaded.get(spec.entity()), loaded.get(spec.dto()), spec.fields(), spec.entityFields()));
            }
        }
        List<EnumBinding> enums = new ArrayList<>();
        for (EnumSpec spec : registry.enumBindings()) {
            if (presentPacks.contains(spec.pack())) {
                enums.add(new EnumBinding(loaded.get(spec.dto()), spec.field(), spec.allowedValues()));
            }
        }
        List<NestedValidationBinding> nested = new ArrayList<>();
        for (NestedSpec spec : registry.nestedValidationBindings()) {
            if (presentPacks.contains(spec.pack())) {
                nested.add(new NestedValidationBinding(loaded.get(spec.parent()), spec.field(), loaded.get(spec.item())));
            }
        }
        List<RequiredBinding> required = new ArrayList<>();
        for (RequiredSpec spec : registry.requiredBindings()) {
            if (presentPacks.contains(spec.pack())) {
                List<RequiredField> fields = new ArrayList<>();
                for (RequiredFieldSpec field : spec.fields()) {
                    fields.add(new RequiredField(field.field(), REQUIRED_CONSTRAINTS.get(field.constraint()), Set.copyOf(field.groups())));
                }
                required.add(new RequiredBinding(loaded.get(spec.dto()), List.copyOf(fields)));
            }
        }
        Map<Class<?>, Set<String>> responseFields = new LinkedHashMap<>();
        for (FieldsSpec spec : registry.requiredResponseFields()) {
            if (presentPacks.contains(spec.pack())) {
                responseFields.put(loaded.get(spec.dto()), Set.copyOf(spec.fields()));
            }
        }
        return new Census(registry, Set.copyOf(presentPacks), List.copyOf(lengths), List.copyOf(enums), List.copyOf(nested),
                List.copyOf(required), Map.copyOf(responseFields),
                fieldsBindings(registry.readOnlyBindings(), presentPacks, loaded),
                fieldsBindings(registry.calendarDateBindings(), presentPacks, loaded));
    }

    private static List<FieldsBinding> fieldsBindings(List<FieldsSpec> specs, Set<String> presentPacks, Map<String, Class<?>> loaded) {
        List<FieldsBinding> bindings = new ArrayList<>();
        for (FieldsSpec spec : specs) {
            if (presentPacks.contains(spec.pack())) {
                bindings.add(new FieldsBinding(loaded.get(spec.dto()), spec.fields()));
            }
        }
        return List.copyOf(bindings);
    }

    /** 원장의 pack 어휘와 현재 트리 manifest 의 pack 을 대조해 남은 pack 을 돌려준다. */
    static Set<String> presentPacks(Registry registry, String manifestJson) {
        JsonNode packs = readJson(manifestJson, PACK_MANIFEST).get("packs");
        if (packs == null || !packs.isObject() || packs.isEmpty()) {
            throw new AssertionError(PACK_MANIFEST + " 의 packs 가 비어 있거나 객체가 아닙니다.");
        }
        Set<String> present = new TreeSet<>();
        for (Iterator<String> names = packs.fieldNames(); names.hasNext(); ) {
            String name = names.next();
            if (!registry.packs().contains(name)) {
                throw new AssertionError("pack manifest 의 '" + name + "' 가 " + CENSUS_REGISTRY
                        + " 의 packs 어휘에 없습니다. 새 pack 의 입력 계약 표적을 먼저 판정하십시오.");
            }
            present.add(name);
        }
        return present;
    }

    private static Field declaredField(Class<?> type, String name, List<String> violations, String layer) {
        try {
            return type.getDeclaredField(name);
        } catch (NoSuchFieldException e) {
            violations.add(layer + " 필드 부재: " + type.getSimpleName() + "." + name);
            return null;
        }
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

    private static Set<RequiredField> requiredContracts(Class<?> dtoType) {
        Set<RequiredField> contracts = new LinkedHashSet<>();
        for (Field field : dtoType.getDeclaredFields()) {
            for (Class<? extends Annotation> constraint : List.of(NotNull.class, NotBlank.class, NotEmpty.class)) {
                Annotation annotation = field.getAnnotation(constraint);
                if (annotation != null) {
                    Set<String> groupNames = new TreeSet<>();
                    Arrays.stream(validationGroups(annotation)).map(Class::getName).forEach(groupNames::add);
                    contracts.add(new RequiredField(field.getName(), constraint, Set.copyOf(groupNames)));
                }
            }
        }
        return contracts;
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
        if (type.isTextual() && "null".equals(type.asText())) {
            return true;
        }
        if (type.isArray()) {
            for (JsonNode candidate : type) {
                if ("null".equals(candidate.asText())) {
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
        } catch (IOException ex) {
            throw new AssertionError(source + " 를 JSON 으로 읽지 못했습니다: " + ex.getMessage(), ex);
        }
    }

    private static String json(String singleQuoted) {
        return singleQuoted.replace('\'', '"');
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

    record Census(Registry registry, Set<String> presentPacks, List<LengthBinding> lengthBindings,
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

    /** 원장 항목의 공통 형태 — 판정에 필요한 참조 타입 이진 이름과 소유 pack. */
    interface Spec {
        String label();

        String pack();

        List<String> types();
    }

    record LengthSpec(String entity, String dto, List<String> fields, Map<String, String> entityFields, String pack) implements Spec {
        public String label() { return "lengthBindings " + dto; }

        public List<String> types() { return List.of(entity, dto); }
    }

    record EnumSpec(String dto, String field, List<String> allowedValues, String pack) implements Spec {
        public String label() { return "enumBindings " + dto + "." + field; }

        public List<String> types() { return List.of(dto); }
    }

    record NestedSpec(String parent, String field, String item, String pack) implements Spec {
        public String label() { return "nestedValidationBindings " + parent + "." + field; }

        public List<String> types() { return List.of(parent, item); }
    }

    record RequiredFieldSpec(String field, String constraint, List<String> groups) {
    }

    record RequiredSpec(String dto, List<RequiredFieldSpec> fields, String pack) implements Spec {
        public String label() { return "requiredBindings " + dto; }

        public List<String> types() {
            List<String> types = new ArrayList<>();
            types.add(dto);
            fields.forEach(field -> types.addAll(field.groups()));
            return types;
        }
    }

    record FieldsSpec(String section, String dto, List<String> fields, String pack) implements Spec {
        public String label() { return section + " " + dto; }

        public List<String> types() { return List.of(dto); }
    }

    record Registry(Set<String> packs, List<LengthSpec> lengthBindings, List<EnumSpec> enumBindings,
                    List<NestedSpec> nestedValidationBindings, List<RequiredSpec> requiredBindings,
                    List<FieldsSpec> requiredResponseFields, List<FieldsSpec> readOnlyBindings,
                    List<FieldsSpec> calendarDateBindings) {

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
            topAllowed.addAll(Set.of("schemaVersion", "description", "packs"));
            Set<String> topRequired = new TreeSet<>(sections);
            topRequired.addAll(Set.of("schemaVersion", "packs"));
            requireFields(root, CENSUS_REGISTRY, topAllowed, topRequired);
            if (root.get("schemaVersion").asInt(-1) != 1) {
                throw new AssertionError(CENSUS_REGISTRY + " schemaVersion 은 1 이어야 합니다.");
            }
            Set<String> packs = new LinkedHashSet<>();
            JsonNode packNodes = root.get("packs");
            if (!packNodes.isArray() || packNodes.isEmpty()) {
                throw new AssertionError(CENSUS_REGISTRY + " packs 는 비어 있지 않은 배열이어야 합니다.");
            }
            for (JsonNode pack : packNodes) {
                if (!pack.isTextual() || pack.asText().isBlank() || !packs.add(pack.asText())) {
                    throw new AssertionError(CENSUS_REGISTRY + " packs 에 빈 값·중복·비문자열이 있습니다: " + pack);
                }
            }

            List<LengthSpec> lengths = new ArrayList<>();
            Map<String, String> lengthPacks = new LinkedHashMap<>();
            for (JsonNode node : array(root, "lengthBindings")) {
                requireFields(node, "lengthBindings", Set.of("entity", "dto", "fields", "entityFields", "pack"),
                        Set.of("entity", "dto", "fields", "pack"));
                String dto = typeName(node, "dto");
                Map<String, String> entityFields = new LinkedHashMap<>();
                JsonNode mapping = node.get("entityFields");
                if (mapping != null) {
                    if (!mapping.isObject()) {
                        throw new AssertionError("lengthBindings.entityFields 는 객체여야 합니다: " + node);
                    }
                    for (Map.Entry<String, JsonNode> entry : mapping.properties()) {
                        entityFields.put(fieldName(entry.getKey()), fieldName(entry.getValue().asText()));
                    }
                }
                LengthSpec spec = new LengthSpec(typeName(node, "entity"), dto, fieldList(node, "fields", false),
                        Map.copyOf(entityFields), pack(node, packs));
                if (lengthPacks.put(dto, spec.pack()) != null) {
                    throw new AssertionError("길이 binding DTO 중복: " + dto);
                }
                lengths.add(spec);
            }

            List<EnumSpec> enums = new ArrayList<>();
            Set<String> enumKeys = new LinkedHashSet<>();
            for (JsonNode node : array(root, "enumBindings")) {
                requireFields(node, "enumBindings", Set.of("dto", "field", "allowedValues", "pack"),
                        Set.of("dto", "field", "allowedValues", "pack"));
                EnumSpec spec = new EnumSpec(typeName(node, "dto"), fieldName(text(node, "field")),
                        stringList(node, "allowedValues"), pack(node, packs));
                if (!enumKeys.add(spec.dto() + "." + spec.field())) {
                    throw new AssertionError("enumBindings 중복: " + spec.dto() + "." + spec.field());
                }
                enums.add(spec);
            }

            List<NestedSpec> nested = new ArrayList<>();
            for (JsonNode node : array(root, "nestedValidationBindings")) {
                requireFields(node, "nestedValidationBindings", Set.of("parent", "field", "item", "pack"),
                        Set.of("parent", "field", "item", "pack"));
                nested.add(new NestedSpec(typeName(node, "parent"), fieldName(text(node, "field")), typeName(node, "item"),
                        pack(node, packs)));
            }

            List<RequiredSpec> required = new ArrayList<>();
            Map<String, String> requiredPacks = new LinkedHashMap<>();
            for (JsonNode node : array(root, "requiredBindings")) {
                requireFields(node, "requiredBindings", Set.of("dto", "fields", "pack"), Set.of("dto", "fields", "pack"));
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
                        groups.add(typeNameValue(group.asText(), "requiredBindings.groups"));
                    }
                    if (!new ArrayList<>(new TreeSet<>(groups)).equals(groups)) {
                        throw new AssertionError("requiredBindings.groups 는 중복 없이 정렬돼야 합니다: " + dto + "." + field + " " + groups);
                    }
                    if (!fieldNames.add(field)) {
                        throw new AssertionError("필수 binding 필드 중복: " + dto + "." + field);
                    }
                    fields.add(new RequiredFieldSpec(field, constraint, List.copyOf(groups)));
                }
                RequiredSpec spec = new RequiredSpec(dto, List.copyOf(fields), pack(node, packs));
                if (requiredPacks.put(dto, spec.pack()) != null) {
                    throw new AssertionError("필수 binding DTO 중복: " + dto);
                }
                required.add(spec);
            }
            if (!requiredPacks.keySet().equals(lengthPacks.keySet())) {
                throw new AssertionError("필수 binding DTO 집합=" + new TreeSet<>(requiredPacks.keySet())
                        + " 이 길이 binding DTO 집합=" + new TreeSet<>(lengthPacks.keySet()) + " 과 다릅니다.");
            }
            if (!requiredPacks.equals(lengthPacks)) {
                throw new AssertionError("같은 DTO 의 길이·필수 binding pack 이 다릅니다: 길이=" + lengthPacks + " 필수=" + requiredPacks);
            }

            // 응답 전용 필수 필드는 필수 binding 검사 안에서만 소비된다 — 짝이 없는 DTO 는 받아 두고 영영 검사하지 않게 된다.
            List<FieldsSpec> responseFields = fieldsSpecs(root, "requiredResponseFields", packs);
            for (FieldsSpec spec : responseFields) {
                if (!requiredPacks.containsKey(spec.dto())) {
                    throw new AssertionError("requiredResponseFields DTO 에 requiredBindings 항목이 없어 검사되지 않습니다: " + spec.dto());
                }
                if (!requiredPacks.get(spec.dto()).equals(spec.pack())) {
                    throw new AssertionError("requiredResponseFields 의 pack 이 필수 binding pack 과 다릅니다: " + spec.dto());
                }
            }

            return new Registry(Set.copyOf(packs), List.copyOf(lengths), List.copyOf(enums), List.copyOf(nested),
                    List.copyOf(required), responseFields,
                    fieldsSpecs(root, "readOnlyBindings", packs), fieldsSpecs(root, "calendarDateBindings", packs));
        }

        private static List<FieldsSpec> fieldsSpecs(JsonNode root, String section, Set<String> packs) {
            List<FieldsSpec> specs = new ArrayList<>();
            Set<String> dtos = new LinkedHashSet<>();
            for (JsonNode node : array(root, section)) {
                requireFields(node, section, Set.of("dto", "fields", "pack"), Set.of("dto", "fields", "pack"));
                FieldsSpec spec = new FieldsSpec(section, typeName(node, "dto"), fieldList(node, "fields", false), pack(node, packs));
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
            if (value == null || !value.isTextual() || value.asText().isBlank()) {
                throw new AssertionError(field + " 는 비어 있지 않은 문자열이어야 합니다: " + node);
            }
            return value.asText();
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
                if (!value.isTextual() || value.asText().isEmpty()) {
                    throw new AssertionError(field + " 에 빈 값·비문자열이 있습니다: " + node);
                }
                values.add(value.asText());
            }
            if (values.isEmpty() || new LinkedHashSet<>(values).size() != values.size()) {
                throw new AssertionError(field + " 는 비어 있지 않고 중복이 없어야 합니다: " + node);
            }
            return List.copyOf(values);
        }

        private static List<String> fieldList(JsonNode node, String field, boolean allowEmpty) {
            List<String> values = new ArrayList<>();
            for (JsonNode value : array(node, field)) {
                values.add(fieldName(value.asText()));
            }
            if ((!allowEmpty && values.isEmpty()) || new LinkedHashSet<>(values).size() != values.size()) {
                throw new AssertionError(field + " 는 비어 있지 않고 중복이 없어야 합니다: " + node);
            }
            return List.copyOf(values);
        }

        private static String pack(JsonNode node, Set<String> packs) {
            String value = node.path("pack").isTextual() ? node.get("pack").asText() : "";
            if (!packs.contains(value)) {
                throw new AssertionError("원장 항목의 pack '" + value + "' 가 packs 어휘 " + packs + " 에 없습니다: " + node);
            }
            return value;
        }

        private static void requireFields(JsonNode node, String section, Set<String> allowed, Set<String> required) {
            if (node == null || !node.isObject()) {
                throw new AssertionError(section + " 항목은 객체여야 합니다: " + node);
            }
            for (Iterator<String> names = node.fieldNames(); names.hasNext(); ) {
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
