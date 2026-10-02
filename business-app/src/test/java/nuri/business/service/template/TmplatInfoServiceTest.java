package nuri.business.service.template;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.template.Template;
import nuri.business.domain.template.TemplateRepository;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.dto.TemplateMapper;
import nuri.foundation.core.template.TemplateReferenceContributor;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.Spy;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import nuri.foundation.core.exception.BusinessException;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DisplayName("템플릿 정보 서비스 테스트")
class TmplatInfoServiceTest {

    @Mock
    private TemplateRepository templateRepository;

    // 실제 MapStruct 매퍼 구현체를 주입해 기존 매핑 검증 의미를 보존한다.
    @Spy
    private TemplateMapper templateMapper = Mappers.getMapper(TemplateMapper.class);

    // 참조 포트가 여러 도메인의 참조 건수를 합산하는 계약을 검증한다.
    @Mock
    private TemplateReferenceContributor boardReferences;

    @Mock
    private TemplateReferenceContributor additionalReferences;

    private TmplatInfoService tmplatInfoService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        MockitoAnnotations.openMocks(this);
        tmplatInfoService = new TmplatInfoService(templateRepository, templateMapper, List.of(boardReferences, additionalReferences));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("템플릿 목록 조회")
    void selectTmplatInfoList() {
        // given
        when(templateRepository.findAll()).thenReturn(Collections.emptyList());

        // when
        List<TemplateDto> result = tmplatInfoService.selectTmplatInfoList();

        // then
        assertThat(result).isEmpty();
        verify(templateRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("템플릿 상세 조회")
    void selectTmplatInfoDetail() {
        // given
        Template tmplat = Template.builder().tmpltId("TMPLT_001").build();
        when(templateRepository.findById("TMPLT_001")).thenReturn(Optional.of(tmplat));

        // when
        TemplateDto result = tmplatInfoService.selectTmplatInfoDetail("TMPLT_001");

        // then
        assertThat(result).isNotNull();
        assertThat(result.getTmpltId()).isEqualTo("TMPLT_001");
    }

    @Test
    @DisplayName("템플릿 등록")
    void insertTmplatInfo() {
        authenticate("TEMPLATE_CREATE");
        // given
        // [2026-08-29] 종전 fixture 에는 tmpltId 가 없었다. 리포지토리가 mock 이라 NOT NULL PK 를
        //   강제하지 않아 green 이었지만, 운영에서는 같은 요청이 DB 제약 위반으로 죽었다.
        //   저장 계약을 실제 스키마와 같은 모양으로 맞춘다.
        TemplateDto tmplatDto = TemplateDto.builder()
                .tmpltId("TMPLT_NEW")
                .tmpltNm("New Template")
                .tmpltSeCd("TMPT01")
                .tmpltPath("/src/templates/new.html")
                .useYn("Y")
                .build();

        // when
        tmplatInfoService.insertTmplatInfo(tmplatDto);

        // then
        verify(templateRepository).insert(argThat(template -> "TMPLT_NEW".equals(template.getTmpltId())
                && "New Template".equals(template.getTmpltNm())
                && "TMPT01".equals(template.getTmpltSeCd())
                && "/src/templates/new.html".equals(template.getTmpltPath())
                && "Y".equals(template.getUseYn())));
        verify(templateRepository, never()).save(any(Template.class));
    }

    @Test
    @DisplayName("기존 ID 등록은 수정으로 바뀌지 않고 중복으로 거절한다")
    void insertTmplatInfoRejectsExistingId() {
        authenticate("TEMPLATE_CREATE");
        when(templateRepository.existsById("TMPLT_EXISTS")).thenReturn(true);
        TemplateDto request = TemplateDto.builder().tmpltId("TMPLT_EXISTS")
                .tmpltNm("변경 시도").tmpltSeCd("TMPT01").tmpltPath("/changed").useYn("N").build();

        assertThatThrownBy(() -> tmplatInfoService.insertTmplatInfo(request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);

        verify(templateRepository, never()).save(any(Template.class));
        verify(templateRepository, never()).insert(any(Template.class));
    }

    @Test
    @DisplayName("템플릿 타입별 목록 조회")
    void selectTmplatInfoListByType() {
        // given
        when(templateRepository.findByTmpltSeCd("TYPE01")).thenReturn(Collections.emptyList());

        // when
        List<TemplateDto> result = tmplatInfoService.selectTmplatInfoListByType("TYPE01");

        // then
        assertThat(result).isEmpty();
        verify(templateRepository, times(1)).findByTmpltSeCd("TYPE01");
    }

    @Test
    @DisplayName("템플릿 상세 조회 실패 - 존재하지 않음")
    void selectTmplatInfoDetailFail() {
        // given
        when(templateRepository.findById("NOT_FOUND")).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> tmplatInfoService.selectTmplatInfoDetail("NOT_FOUND"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("템플릿 삭제 — 존재하는 대상을 찾아 지운다(종전 deleteById 는 없는 ID 도 조용히 성공했다)")
    void deleteTmplatInfo() {
        authenticate("TEMPLATE_DELETE");
        Template template = Template.builder().tmpltId("TMPLT_001").tmpltNm("n").tmpltSeCd("TMPT01").tmpltPath("/p").useYn("Y").build();
        when(templateRepository.findByIdForUpdate("TMPLT_001")).thenReturn(Optional.of(template));

        tmplatInfoService.deleteTmplatInfo("TMPLT_001");

        verify(templateRepository, times(1)).delete(template);
        verify(templateRepository, never()).deleteById(anyString());
    }

    // 참조 차단 — tb_bbs_master 의 문자열 참조는 DB 가 막지 않는다.
    @Test
    @DisplayName("여러 도메인이 참조 중인 템플릿은 RESOURCE_IN_USE(409) 로 거부하고 참조원·건수를 밝힌다")
    void deleteTmplatInfo_blockedWhenReferenced() {
        authenticate("TEMPLATE_DELETE");
        Template template = Template.builder().tmpltId("TMPLT_001").tmpltNm("n").tmpltSeCd("TMPT01").tmpltPath("/p").useYn("Y").build();
        when(templateRepository.findByIdForUpdate("TMPLT_001")).thenReturn(Optional.of(template));
        when(boardReferences.sourceLabel()).thenReturn("게시판");
        when(boardReferences.countReferences("TMPLT_001")).thenReturn(2L);
        when(additionalReferences.sourceLabel()).thenReturn("확장 도메인");
        when(additionalReferences.countReferences("TMPLT_001")).thenReturn(1L);

        assertThatThrownBy(() -> tmplatInfoService.deleteTmplatInfo("TMPLT_001"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_IN_USE)
                .hasMessageContaining("게시판 2건")
                .hasMessageContaining("확장 도메인 1건");
        verify(templateRepository, never()).delete(any(Template.class));
    }

    @Test
    @DisplayName("참조가 하나도 없으면 삭제하고, 참조원이 등록되지 않은 projection 에서도 삭제는 동작한다")
    void deleteTmplatInfo_allowedWithoutReferences() {
        authenticate("TEMPLATE_DELETE");
        Template template = Template.builder().tmpltId("TMPLT_002").tmpltNm("n").tmpltSeCd("TMPT01").tmpltPath("/p").useYn("Y").build();
        when(templateRepository.findByIdForUpdate("TMPLT_002")).thenReturn(Optional.of(template));
        when(boardReferences.countReferences("TMPLT_002")).thenReturn(0L);
        when(additionalReferences.countReferences("TMPLT_002")).thenReturn(0L);

        tmplatInfoService.deleteTmplatInfo("TMPLT_002");
        verify(templateRepository).delete(template);

        // 참조 도메인이 base projection 에서 빠진 경우(포트 미등록·null 주입) — 삭제 자체는 막지 않는다.
        TmplatInfoService withoutContributors = new TmplatInfoService(templateRepository, templateMapper, null);
        withoutContributors.deleteTmplatInfo("TMPLT_002");
        verify(templateRepository, times(2)).delete(template);
        verify(boardReferences, never()).sourceLabel();
    }

    // [2026-09-05 DEC-OPS-036] 수정 경로 신설 — 종전에는 등록·조회만 가능했다.
    @Test
    @DisplayName("템플릿 수정 — ID 는 두고 명칭·구분·경로·사용여부를 갱신한다")
    void updateTmplatInfo() {
        authenticate("TEMPLATE_UPDATE");
        Template template = Template.builder().tmpltId("TMPLT_001").tmpltNm("Old").tmpltSeCd("TMPT01").tmpltPath("/old").useYn("Y").build();
        when(templateRepository.findByIdForUpdate("TMPLT_001")).thenReturn(Optional.of(template));
        TemplateDto dto = TemplateDto.builder().tmpltId("IGNORED").tmpltNm("New").tmpltSeCd("TMPT02").tmpltPath("/new").useYn("N").build();

        TemplateDto result = tmplatInfoService.updateTmplatInfo("TMPLT_001", dto);

        assertThat(result.getTmpltId()).isEqualTo("TMPLT_001");
        assertThat(result.getTmpltNm()).isEqualTo("New");
        assertThat(result.getTmpltSeCd()).isEqualTo("TMPT02");
        assertThat(result.getTmpltPath()).isEqualTo("/new");
        assertThat(result.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("없는 템플릿의 수정·삭제는 RESOURCE_NOT_FOUND")
    void updateOrDeleteTmplatInfo_NotFound() {
        when(templateRepository.findByIdForUpdate("NONE")).thenReturn(Optional.empty());

        authenticate("TEMPLATE_UPDATE");
        assertThatThrownBy(() -> tmplatInfoService.updateTmplatInfo("NONE", TemplateDto.builder().tmpltNm("x").build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
        authenticate("TEMPLATE_DELETE");
        assertThatThrownBy(() -> tmplatInfoService.deleteTmplatInfo("NONE"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
        verify(templateRepository, never()).delete(any(Template.class));
    }

    @ParameterizedTest(name = "{0} denies {1} before accessing business dependencies")
    @MethodSource("deniedWrites")
    void writesRequireTheirExactPermission(String operation, String identity) {
        authenticateDeniedIdentity(identity, operation);
        TemplateDto request = TemplateDto.builder().tmpltId("TMPLT_001").tmpltNm("Changed")
                .tmpltSeCd("TMPT01").tmpltPath("/changed").useYn("Y").build();

        assertDenied(() -> {
            switch (operation) {
                case "CREATE" -> tmplatInfoService.insertTmplatInfo(request);
                case "UPDATE" -> tmplatInfoService.updateTmplatInfo("TMPLT_001", request);
                case "DELETE" -> tmplatInfoService.deleteTmplatInfo("TMPLT_001");
                default -> throw new IllegalArgumentException(operation);
            }
        });

        verifyNoInteractions(templateRepository, templateMapper, boardReferences, additionalReferences);
    }

    @Test
    void foreignCreatorIsManageableOnlyWithTheExactUpdateOrDeleteGrant() {
        Template existing = Template.builder().tmpltId("TMPLT_001").tmpltNm("Original")
                .tmpltSeCd("TMPT01").tmpltPath("/original").useYn("Y").build();
        existing.setFrstRgtrId("foreign-creator");
        TemplateDto request = TemplateDto.builder().tmpltNm("Changed")
                .tmpltSeCd("TMPT01").tmpltPath("/changed").useYn("Y").build();

        authenticate();
        assertDenied(() -> tmplatInfoService.updateTmplatInfo("TMPLT_001", request));
        assertDenied(() -> tmplatInfoService.deleteTmplatInfo("TMPLT_001"));
        verifyNoInteractions(templateRepository, templateMapper, boardReferences, additionalReferences);
        assertThat(existing.getTmpltNm()).isEqualTo("Original");

        authenticate("TEMPLATE_UPDATE");
        when(templateRepository.findByIdForUpdate("TMPLT_001")).thenReturn(Optional.of(existing));
        tmplatInfoService.updateTmplatInfo("TMPLT_001", request);
        assertThat(existing.getTmpltNm()).isEqualTo("Changed");
        assertThat(existing.getFrstRgtrId()).isEqualTo("foreign-creator");

        authenticate("TEMPLATE_DELETE");
        tmplatInfoService.deleteTmplatInfo(existing.getTmpltId());
        verify(templateRepository).delete(existing);
        verify(boardReferences).countReferences("TMPLT_001");
        verify(additionalReferences).countReferences("TMPLT_001");
    }

    private static Stream<Arguments> deniedWrites() {
        return Stream.of("CREATE", "UPDATE", "DELETE").flatMap(operation ->
                Stream.of("NO_AUTHENTICATION", "ANONYMOUS", "NO_PERMISSION", "WRONG_OPERATION", "ROLE_ONLY")
                        .map(identity -> Arguments.of(operation, identity)));
    }

    private static void authenticateDeniedIdentity(String identity, String operation) {
        switch (identity) {
            case "NO_AUTHENTICATION" -> SecurityContextHolder.clearContext();
            case "ANONYMOUS" -> {
                var user = principal("TEMPLATE_" + operation);
                SecurityContextHolder.getContext().setAuthentication(
                        new AnonymousAuthenticationToken("fixture", user, user.getAuthorities()));
            }
            case "NO_PERMISSION" -> authenticate();
            case "WRONG_OPERATION" -> authenticate("CREATE".equals(operation) ? "TEMPLATE_DELETE" : "TEMPLATE_CREATE");
            case "ROLE_ONLY" -> {
                var user = CustomUserDetails.builder().userId("operator").esntlId("ESNTL_operator").enabled(true)
                        .groups(List.of("ROLE_ADMIN", "ROLE_SYSTEM")).roleName("ADMIN").authorCode("ROLE_ADMIN").build();
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("ROLE_SYSTEM"))));
            }
            default -> throw new IllegalArgumentException(identity);
        }
    }

    private static CustomUserDetails principal(String... permissions) {
        return CustomUserDetails.builder().userId("operator").esntlId("ESNTL_operator").enabled(true)
                .permissions(List.of(permissions)).authorizationVersion("fixture").build();
    }

    private static void authenticate(String... permissions) {
        var user = principal(permissions);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private static void assertDenied(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
    }
}
