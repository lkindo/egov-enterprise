package nuri.business.service.operation;

import nuri.business.domain.operation.ExternalHr;
import nuri.business.domain.operation.ExternalHrId;
import nuri.business.domain.operation.ExternalHrRepository;
import nuri.business.service.operation.dto.ExternalHrDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("ExternalHrService (외부 인력 관리) 테스트")
class ExternalHrServiceTest {

    @Mock
    private ExternalHrRepository externalHrRepository;

    @InjectMocks
    private ExternalHrService externalHrService;

    private static final Pageable PAGEABLE = PageRequest.of(0, 10);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private static void authenticateAs(String loginId, String role) {
        CustomUserDetails principal = CustomUserDetails.builder()
                .userId(loginId)
                .esntlId("ESNTL_" + loginId)
                .userNm(loginId)
                .password("unused")
                .roleName(role)
                .authorCode("ROLE_" + role)
                .lockAt("N")
                .build();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
    }

    @Test
    @DisplayName("외부 인력 전체 조회 - 페이징")
    void getExternalHrList_Success() {
        // Given
        ExternalHr entity = ExternalHr.builder().evntSn(1L).otsdHrId("HR1").otsdHrNm("Name").build();
        given(externalHrRepository.findAll(PAGEABLE)).willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));

        // When
        var result = externalHrService.getExternalHrList(null, PAGEABLE);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getEvntSn()).isEqualTo(1L);
        assertThat(result.getContent().get(0).getOtsdHrNm()).isEqualTo("Name");
    }

    @Test
    @DisplayName("이름으로 외부 인력 검색 - 페이징")
    void getExternalHrList_SearchByName() {
        // Given
        ExternalHr entity = ExternalHr.builder().evntSn(1L).otsdHrId("HR1").otsdHrNm("Tester").build();
        given(externalHrRepository.findByOtsdHrNmContaining("Test", PAGEABLE))
                .willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));

        // When
        var result = externalHrService.getExternalHrList("Test", PAGEABLE);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("관리자 등록은 요청의 감사자를 무시하고 인증 loginId를 저장한다")
    void createExternalHr_UsesAuthenticatedActorForAuditFields() {
        // Given
        authenticateAs("admin_actor", "ADMIN");
        ExternalHrDto dto = ExternalHrDto.builder()
                .evntSn(2L)
                .otsdHrId("HR2")
                .otsdHrNm("New")
                .frstRgtrId("forged_creator")
                .lastMdfrId("forged_modifier")
                .build();
        given(externalHrRepository.save(any(ExternalHr.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        // When
        ExternalHrDto result = externalHrService.createExternalHr(dto);

        // Then
        ArgumentCaptor<ExternalHr> captor = ArgumentCaptor.forClass(ExternalHr.class);
        verify(externalHrRepository).save(captor.capture());
        assertThat(captor.getValue().getFrstRgtrId()).isEqualTo("admin_actor");
        assertThat(captor.getValue().getLastMdfrId()).isEqualTo("admin_actor");
        assertThat(result.getOtsdHrId()).isEqualTo("HR2");
        assertThat(result.getEvntSn()).isEqualTo(2L);
        assertThat(result.getFrstRgtrId()).isEqualTo("admin_actor");
        assertThat(result.getLastMdfrId()).isEqualTo("admin_actor");
    }

    @Test
    @DisplayName("같은 행사와 외부인사 ID의 중복 등록은 기존 행을 덮어쓰지 않고 거부한다")
    void createExternalHr_RejectsDuplicateCompositeId() {
        authenticateAs("admin_actor", "ADMIN");
        ExternalHrDto dto = ExternalHrDto.builder()
                .evntSn(2L)
                .otsdHrId("HR2")
                .otsdHrNm("Overwrite attempt")
                .build();
        given(externalHrRepository.existsById(new ExternalHrId(2L, "HR2"))).willReturn(true);

        assertThatThrownBy(() -> externalHrService.createExternalHr(dto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);
        verify(externalHrRepository, never()).save(any());
    }

    @Test
    @DisplayName("일반 사용자는 관리자 URL을 우회해도 서비스에서 등록할 수 없다")
    void createExternalHr_RejectsNonAdmin() {
        authenticateAs("ordinary_user", "USER");
        ExternalHrDto dto = ExternalHrDto.builder().evntSn(2L).otsdHrId("HR2").build();

        assertThatThrownBy(() -> externalHrService.createExternalHr(dto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verify(externalHrRepository, never()).save(any());
    }

    @Test
    @DisplayName("SYSTEM 역할도 관리자와 같은 등록 경계를 통과한다")
    void createExternalHr_AllowsSystemRole() {
        authenticateAs("system_actor", "SYSTEM");
        ExternalHrDto dto = ExternalHrDto.builder().evntSn(3L).otsdHrId("HR3").build();
        given(externalHrRepository.save(any(ExternalHr.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        ExternalHrDto result = externalHrService.createExternalHr(dto);

        assertThat(result.getFrstRgtrId()).isEqualTo("system_actor");
        assertThat(result.getLastMdfrId()).isEqualTo("system_actor");
    }

    @Test
    @DisplayName("인증 주체가 없으면 외부인사 등록을 fail-closed 한다")
    void createExternalHr_RejectsMissingAuthentication() {
        ExternalHrDto dto = ExternalHrDto.builder().evntSn(2L).otsdHrId("HR2").build();

        assertThatThrownBy(() -> externalHrService.createExternalHr(dto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verify(externalHrRepository, never()).save(any());
    }

    @Test
    @DisplayName("ADMIN 권한만 있고 신뢰할 loginId가 없으면 감사자를 대체하지 않고 거부한다")
    void createExternalHr_RejectsAdminWithoutTrustedLoginId() {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(
                "string-principal", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        SecurityContextHolder.setContext(context);
        ExternalHrDto dto = ExternalHrDto.builder().evntSn(2L).otsdHrId("HR2").build();

        assertThatThrownBy(() -> externalHrService.createExternalHr(dto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verify(externalHrRepository, never()).save(any());
    }
}
