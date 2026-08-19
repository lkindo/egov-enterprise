package nuri.api.harness;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.business.domain.auth.Authority;
import nuri.business.domain.auth.RoleInfo;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.code.CommonCode;
import nuri.business.domain.code.CommonCodeCategory;
import nuri.business.domain.code.CommonCodeGroup;
import nuri.business.domain.group.GroupManage;
import nuri.business.domain.system.content.banner.Banner;
import nuri.business.domain.system.content.community.Community;
import nuri.business.domain.system.content.popup.Popup;
import nuri.business.domain.user.entity.DeptManage;
import nuri.business.domain.user.entity.User;
import nuri.business.service.auth.dto.AuthorManageDto;
import nuri.business.service.auth.dto.RoleManageDto;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.code.dto.CmmnClCodeDto;
import nuri.business.service.code.dto.CmmnCodeDto;
import nuri.business.service.code.dto.CmmnDetailCodeDto;
import nuri.business.service.department.dto.DeptManageDto;
import nuri.business.service.group.dto.GroupManageDto;
import nuri.business.service.system.content.banner.dto.BannerDto;
import nuri.business.service.system.content.community.dto.CommunityDto;
import nuri.business.service.system.content.popup.dto.PopupDto;
import nuri.business.service.user.dto.UserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 입력 DTO 의미 계약 표적 미러 게이트.
 *
 * <p>DTO는 Entity의 전수 복제본이 아니라 투영이므로 이름이 같은 모든 필드를 기계적으로 비교하면
 * 응답 전용·파생 필드까지 입력 제약으로 오인한다. 대신 실제 {@code @RequestBody}로 저장되는 고위험
 * 관리자 입력의 직접 저장 필드만 명시적으로 묶는다. 이 표적은 다음 세 구간을 한 번에 보호한다.
 *
 * <ol>
 *   <li>Entity {@code @Column(length)}보다 DTO {@code @Size(max)}가 크거나 빠지지 않았는가</li>
 *   <li>문자열 상태 코드가 런타임 {@code @Pattern}과 OpenAPI {@code allowableValues}로 제한되는가</li>
 *   <li>같은 maxLength·enum이 커밋된 {@code api-docs.json}까지 전파됐는가</li>
 * </ol>
 *
 * <p>마지막 검사는 DTO 애노테이션만 고치고 api-docs/codegen 갱신을 잊는 로컬 false-green을 막는다.
 * 하류의 {@code codegen:verify}/{@code codegen:verify:zod}와 결합하면
 * Entity → DTO → OpenAPI → TypeScript/Zod 체인이 닫힌다.
 */
@Tag("governance-harness")
class InputContractMirrorLinterTest {

    private static final Logger log = LoggerFactory.getLogger(InputContractMirrorLinterTest.class);

    private static final String API_DOCS_FILE = "api-docs.json";

    private static final List<LengthBinding> LENGTH_BINDINGS = List.of(
            new LengthBinding(Banner.class, BannerDto.class,
                    List.of("bnrNm", "linkUrl", "bnrImgNm", "bnrExpln", "rfltYn")),
            new LengthBinding(Popup.class, PopupDto.class,
                    List.of("popupTtlNm", "fileUrl", "popupWdthPstn", "popupVrtcPstn",
                            "popupVrtcSz", "popupWdthSz", "stopvewSetupYn", "ntceYn")),
            new LengthBinding(Community.class, CommunityDto.class,
                    List.of("cmntyNm", "cmntyIntroCn", "regSeCd", "tmpltId", "useYn")),
            new LengthBinding(User.class, UserDto.class, List.of("userId", "certDnVl")),
            new LengthBinding(CommonCodeCategory.class, CmmnClCodeDto.class,
                    List.of("clsfCd", "clsfCdNm", "clsfCdExpln", "useYn")),
            new LengthBinding(CommonCodeGroup.class, CmmnCodeDto.class,
                    List.of("cdId", "cdIdNm", "cdIdExpln", "clsfCd", "useYn")),
            new LengthBinding(CommonCode.class, CmmnDetailCodeDto.class,
                    List.of("cdId", "dtlCd", "dtlCdNm", "dtlCdExpln", "useYn")),
            new LengthBinding(GroupManage.class, GroupManageDto.class,
                    List.of("groupId", "groupNm", "groupDc")),
            new LengthBinding(RoleInfo.class, RoleManageDto.class,
                    List.of("roleId", "roleNm", "rolePatrn", "roleExpln", "roleTypeCd")),
            new LengthBinding(Authority.class, AuthorManageDto.class,
                    List.of("authrtCd", "authrtNm", "authrtExpln")),
            new LengthBinding(DeptManage.class, DeptManageDto.class,
                    List.of("ognzId", "ognzNm", "ognzExpln", "upOgnzId")),
            new LengthBinding(BoardMaster.class, BoardMasterDto.class,
                    List.of("bbsId", "bbsTtl", "bbsExpln", "bbsTypeCd", "bbsAtrbCd",
                            "ansPsbltyYn", "fileAtchPsbltyYn", "tmpltId", "useYn", "blogYn",
                            "ansYn", "stsfdgYn")));

    private static final List<EnumBinding> ENUM_BINDINGS = List.of(
            new EnumBinding(BannerDto.class, "rfltYn", List.of("Y", "N")),
            new EnumBinding(PopupDto.class, "stopvewSetupYn", List.of("Y", "N")),
            new EnumBinding(PopupDto.class, "ntceYn", List.of("Y", "N")),
            new EnumBinding(CommunityDto.class, "useYn", List.of("Y", "N")),
            new EnumBinding(CmmnClCodeDto.class, "useYn", List.of("Y", "N")),
            new EnumBinding(CmmnCodeDto.class, "useYn", List.of("Y", "N")),
            new EnumBinding(CmmnDetailCodeDto.class, "useYn", List.of("Y", "N")),
            new EnumBinding(BoardMasterDto.class, "ansPsbltyYn", List.of("Y", "N")),
            new EnumBinding(BoardMasterDto.class, "fileAtchPsbltyYn", List.of("Y", "N")),
            new EnumBinding(BoardMasterDto.class, "useYn", List.of("Y", "N")),
            new EnumBinding(BoardMasterDto.class, "blogYn", List.of("Y", "N")),
            new EnumBinding(BoardMasterDto.class, "ansYn", List.of("Y", "N")),
            new EnumBinding(BoardMasterDto.class, "stsfdgYn", List.of("Y", "N")));

    private static final int MIN_LENGTH_FIELDS = 61;
    private static final int MIN_ENUM_FIELDS = 13;

    @Test
    @DisplayName("입력 DTO 길이와 enum 제약이 Entity 저장 계약을 넘지 않는다")
    void targetedDtoConstraintsMirrorEntityStorageContract() {
        int lengthFieldCount = LENGTH_BINDINGS.stream().mapToInt(binding -> binding.fields().size()).sum();
        if (lengthFieldCount < MIN_LENGTH_FIELDS || ENUM_BINDINGS.size() < MIN_ENUM_FIELDS) {
            fail("게이트 무결성 파손: 표적 필드가 하한보다 적습니다 (length=" + lengthFieldCount
                    + ", enum=" + ENUM_BINDINGS.size() + "). 표적 삭제로 게이트를 축소하지 마십시오.");
        }

        List<String> violations = new ArrayList<>();
        for (LengthBinding binding : LENGTH_BINDINGS) {
            for (String fieldName : binding.fields()) {
                Field entityField = declaredField(binding.entityType(), fieldName, violations, "Entity");
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

        for (EnumBinding binding : ENUM_BINDINGS) {
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
        log.info("✅ 입력 계약 표적 미러: 길이 {}필드, enum {}필드.", lengthFieldCount, ENUM_BINDINGS.size());
    }

    @Test
    @DisplayName("입력 DTO 길이와 enum 제약이 api-docs.json까지 전파된다")
    void targetedDtoConstraintsReachCommittedOpenApi() throws IOException {
        JsonNode schemas = new ObjectMapper().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        if (!schemas.isObject()) {
            fail("게이트 무결성 파손: api-docs.json components.schemas가 없습니다");
        }

        List<String> violations = new ArrayList<>();
        for (LengthBinding binding : LENGTH_BINDINGS) {
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

        for (EnumBinding binding : ENUM_BINDINGS) {
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
                LENGTH_BINDINGS.size(), ENUM_BINDINGS.size());
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

    private static Path resolveApiDocs() {
        for (Path base : new Path[]{Paths.get(""), Paths.get("").toAbsolutePath().getParent()}) {
            if (base == null) {
                continue;
            }
            Path candidate = base.resolve(API_DOCS_FILE);
            if (Files.isRegularFile(candidate)) {
                return candidate;
            }
        }
        fail("게이트 무결성 파손: " + API_DOCS_FILE + "을 찾을 수 없습니다 (cwd="
                + Paths.get("").toAbsolutePath() + ")");
        return Paths.get(API_DOCS_FILE);
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

    private record LengthBinding(Class<?> entityType, Class<?> dtoType, List<String> fields) {
    }

    private record EnumBinding(Class<?> dtoType, String field, List<String> allowedValues) {
    }
}
