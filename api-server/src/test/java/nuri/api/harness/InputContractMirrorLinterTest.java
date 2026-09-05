package nuri.api.harness;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.business.domain.addressbook.AddressBook;
import nuri.business.domain.addressbook.AddressBookUser;
import nuri.business.domain.auth.Authority;
import nuri.business.domain.auth.RoleInfo;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.code.CommonCode;
import nuri.business.domain.code.CommonCodeCategory;
import nuri.business.domain.code.CommonCodeGroup;
import nuri.business.domain.group.GroupManage;
import nuri.business.domain.mypage.MyPageContent;
import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.system.content.banner.Banner;
import nuri.business.domain.system.content.community.Community;
import nuri.business.domain.system.content.popup.Popup;
import nuri.business.domain.user.entity.DeptManage;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.sms.Sms;
import nuri.business.domain.sms.SmsRecptnId;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.service.addressbook.dto.AddressBookUserDto;
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
import nuri.business.domain.template.Template;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserValidationGroups;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
import nuri.business.service.workspace.dto.MyPageContentDto;
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
 * 관리자 입력의 직접 저장 필드만 명시적으로 묶는다. 이 표적은 다음 다섯 구간을 한 번에 보호한다.
 *
 * <ol>
 *   <li>Entity {@code @Column(length)}보다 DTO {@code @Size(max)}가 크거나 빠지지 않았는가</li>
 *   <li>문자열 상태 코드가 런타임 {@code @Pattern}과 OpenAPI {@code allowableValues}로 제한되는가</li>
 *   <li>명시적으로 동결한 필수 필드가 런타임 제약과 OpenAPI required 양쪽에 남아 있는가</li>
 *   <li>중첩 입력 DTO에 {@code @Valid}와 OpenAPI item schema가 함께 연결되는가</li>
 *   <li>같은 maxLength·enum·required가 커밋된 {@code api-docs.json}까지 전파됐는가</li>
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
                            "ansYn", "stsfdgYn")),
            // [2026-08-29 표적 확장] tb_tmplt_info 는 다섯 컬럼이 전부 NOT NULL 인데 DTO 는
            //   useYn 하나만 제약하고 있었다. 특히 tmpltId 는 PK 이자 NOT NULL 이고 생성 전략이
            //   없어 클라이언트가 보내야 하는데, 등록 폼이 그 값을 묻지도 않아 **등록이 언제나
            //   실패**했다. 길이·필수를 요청 단계에서 요구하게 하고 그 대응을 여기서 동결한다.
            new LengthBinding(Template.class, TemplateDto.class,
                    List.of("tmpltId", "tmpltNm", "tmpltSeCd", "tmpltPath", "useYn")),
            new LengthBinding(Sms.class, SmsDto.class, List.of("sndngTelno", "sndngCn")),
            new LengthBinding(SmsRecptnId.class, SmsRecptnDto.class, List.of("rcptnTelno")),
            // [GAP-CONTRACT-001] 실제 서비스가 요청값을 직접 저장하는 필드만 묶는다.
            // ID·감사 필드와 서버가 인증 주체에서 주입하는 작성자 필드는 의도적으로 제외한다.
            new LengthBinding(MyPageContent.class, MyPageContentDto.class,
                    List.of("cntntsNm", "cntcUrl", "cntntsUseYn", "cntntsLinkUrl", "cntntsDc")),
            new LengthBinding(Scrap.class, ScrapDto.class,
                    List.of("scrapNm", "scrapUrl", "scrapExpln", "useYn")),
            new LengthBinding(AddressBook.class, AddressBookDto.class,
                    List.of("adbkNm", "rlsScopeCd", "trgetOgnzId", "useYn")),
            new LengthBinding(AddressBookUser.class, AddressBookUserDto.class,
                    List.of("userId", "nm", "emlAddr", "homeTelno", "mblTelno", "ofcTelno", "faxNo")));

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
            new EnumBinding(BoardMasterDto.class, "stsfdgYn", List.of("Y", "N")),
            new EnumBinding(MyPageContentDto.class, "cntntsUseYn", List.of("Y", "N")),
            new EnumBinding(ScrapDto.class, "useYn", List.of("Y", "N")),
            new EnumBinding(AddressBookDto.class, "useYn", List.of("Y", "N")));

    private static final List<NestedValidationBinding> NESTED_VALIDATION_BINDINGS = List.of(
            new NestedValidationBinding(SmsDto.class, "recipients", SmsRecptnDto.class),
            new NestedValidationBinding(AddressBookDto.class, "adbkMan", AddressBookUserDto.class));

    /**
     * 요청 필수 의미의 명시적 기준선.
     *
     * <p>현재 {@code @Not*} 애노테이션이나 DB nullable에서 자동 파생하지 않는다. 런타임 제약과
     * OpenAPI required를 함께 지우는 공동 약화가 green이 되는 것을 막고, 생성·수정·기본값 등
     * 요청 의미가 DB nullable과 다른 필드를 오판하지 않기 위해서다.
     */
    private static final List<RequiredBinding> REQUIRED_BINDINGS = List.of(
            requiredNotBlank(BannerDto.class, "bnrNm"),
            requiredNotBlank(PopupDto.class, "popupTtlNm"),
            requiredNotBlank(CommunityDto.class, "useYn"),
            new RequiredBinding(UserDto.class, List.of(
                    requiredField("pswd", NotBlank.class, UserValidationGroups.OnCreate.class),
                    requiredField("userId", NotBlank.class),
                    requiredField("userNm", NotBlank.class))),
            requiredNotBlank(CmmnClCodeDto.class, "useYn"),
            requiredNotBlank(CmmnCodeDto.class, "useYn"),
            requiredNotBlank(CmmnDetailCodeDto.class, "useYn"),
            new RequiredBinding(GroupManageDto.class, List.of()),
            requiredNotBlank(RoleManageDto.class, "roleNm"),
            requiredNotBlank(AuthorManageDto.class, "authrtCd", "authrtNm"),
            requiredNotBlank(DeptManageDto.class, "ognzNm"),
            new RequiredBinding(BoardMasterDto.class, List.of(
                    requiredField("atchPsbltyFileSz", NotNull.class),
                    requiredField("bbsAtrbCd", NotBlank.class),
                    requiredField("bbsTtl", NotBlank.class),
                    requiredField("bbsTypeCd", NotBlank.class),
                    requiredField("useYn", NotBlank.class))),
            requiredNotBlank(TemplateDto.class, "tmpltId", "tmpltNm", "tmpltPath", "tmpltSeCd", "useYn"),
            new RequiredBinding(SmsDto.class, List.of(
                    requiredField("recipients", NotEmpty.class),
                    requiredField("sndngCn", NotBlank.class),
                    requiredField("sndngTelno", NotBlank.class))),
            requiredNotBlank(SmsRecptnDto.class, "rcptnTelno"),
            new RequiredBinding(MyPageContentDto.class, List.of()),
            requiredNotBlank(ScrapDto.class, "useYn"),
            requiredNotBlank(AddressBookDto.class, "adbkNm", "rlsScopeCd"),
            requiredNotBlank(AddressBookUserDto.class, "userId"));

    private static final int MIN_LENGTH_FIELDS = 89;
    private static final int MIN_ENUM_FIELDS = 16;
    private static final int MIN_NESTED_VALIDATION_FIELDS = 2;
    private static final int MIN_REQUIRED_FIELDS = 31;

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

    @Test
    @DisplayName("중첩 입력 DTO 검증과 OpenAPI item schema가 함께 연결된다")
    void nestedInputValidationIsCascadedAndDocumented() throws IOException {
        if (NESTED_VALIDATION_BINDINGS.size() < MIN_NESTED_VALIDATION_FIELDS) {
            fail("게이트 무결성 파손: 중첩 입력 검증 표적이 하한보다 적습니다 (nested="
                    + NESTED_VALIDATION_BINDINGS.size() + ").");
        }

        JsonNode schemas = new ObjectMapper().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        List<String> violations = new ArrayList<>();
        for (NestedValidationBinding binding : NESTED_VALIDATION_BINDINGS) {
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
        log.info("✅ 중첩 입력 계약: {}필드.", NESTED_VALIDATION_BINDINGS.size());
    }

    @Test
    @DisplayName("입력 DTO 필수 필드가 런타임과 OpenAPI에서 함께 유지된다")
    void requiredFieldsRemainRequiredAtRuntimeAndInOpenApi() throws IOException {
        int requiredFieldCount = REQUIRED_BINDINGS.stream().mapToInt(binding -> binding.fields().size()).sum();
        if (requiredFieldCount < MIN_REQUIRED_FIELDS) {
            fail("게이트 무결성 파손: 필수 입력 표적이 하한보다 적습니다 (required="
                    + requiredFieldCount + ").");
        }

        List<String> violations = new ArrayList<>();
        Set<Class<?>> lengthTypes = new LinkedHashSet<>();
        for (LengthBinding binding : LENGTH_BINDINGS) {
            if (!lengthTypes.add(binding.dtoType())) {
                violations.add("길이 binding DTO 중복: " + binding.dtoType().getSimpleName());
            }
        }
        Set<Class<?>> requiredTypes = new LinkedHashSet<>();
        for (RequiredBinding binding : REQUIRED_BINDINGS) {
            if (!requiredTypes.add(binding.dtoType())) {
                violations.add("필수 binding DTO 중복: " + binding.dtoType().getSimpleName());
            }
        }
        if (!requiredTypes.equals(lengthTypes)) {
            violations.add("필수 binding DTO 집합=" + simpleNames(requiredTypes)
                    + " (길이 binding DTO 집합=" + simpleNames(lengthTypes) + ")");
        }

        JsonNode schemas = new ObjectMapper().readTree(HarnessSourceIndex.read(resolveApiDocs()))
                .path("components").path("schemas");
        if (!schemas.isObject()) {
            fail("게이트 무결성 파손: api-docs.json components.schemas가 없습니다");
        }

        for (RequiredBinding binding : REQUIRED_BINDINGS) {
            Set<RequiredField> expectedContracts = new LinkedHashSet<>(binding.fields());
            Set<String> expected = new TreeSet<>();
            binding.fields().stream().map(RequiredField::field).forEach(expected::add);
            if (expectedContracts.size() != binding.fields().size() || expected.size() != binding.fields().size()) {
                violations.add("필수 binding 필드 중복: " + binding.dtoType().getSimpleName()
                        + " " + binding.fields());
            }

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
            Set<String> openApiRequired = new TreeSet<>();
            schema.path("required").forEach(node -> openApiRequired.add(node.asText()));
            if (!openApiRequired.equals(expected)) {
                violations.add(binding.dtoType().getSimpleName() + " — OpenAPI required="
                        + openApiRequired + " (expected=" + expected + ")");
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
        log.info("✅ 입력 필수 계약: {} DTO, {}필드.", REQUIRED_BINDINGS.size(), requiredFieldCount);
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

    private static RequiredBinding requiredNotBlank(Class<?> dtoType, String... fields) {
        return new RequiredBinding(dtoType,
                Arrays.stream(fields).map(field -> requiredField(field, NotBlank.class)).toList());
    }

    private static RequiredField requiredField(String field, Class<? extends Annotation> constraint,
            Class<?>... groups) {
        Set<String> groupNames = new TreeSet<>();
        Arrays.stream(groups).map(Class::getName).forEach(groupNames::add);
        return new RequiredField(field, constraint, Set.copyOf(groupNames));
    }

    private static Set<RequiredField> requiredContracts(Class<?> dtoType) {
        Set<RequiredField> contracts = new LinkedHashSet<>();
        for (Field field : dtoType.getDeclaredFields()) {
            for (Class<? extends Annotation> constraint : List.of(NotNull.class, NotBlank.class, NotEmpty.class)) {
                Annotation annotation = field.getAnnotation(constraint);
                if (annotation != null) {
                    contracts.add(requiredField(field.getName(), constraint, validationGroups(annotation)));
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

    private record NestedValidationBinding(Class<?> parentType, String field, Class<?> itemType) {
    }

    private record RequiredBinding(Class<?> dtoType, List<RequiredField> fields) {
    }

    private record RequiredField(String field, Class<? extends Annotation> constraint, Set<String> groups) {
    }
}
