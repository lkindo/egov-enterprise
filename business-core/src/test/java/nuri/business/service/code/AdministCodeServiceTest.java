package nuri.business.service.code;

import nuri.business.domain.code.AdministCode;
import nuri.business.repository.code.AdministCodeRepository;
import nuri.business.service.code.dto.AdministCodeDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.code.exception.CodeErrorCode;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.spy;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdministCodeService (행정코드 관리) 테스트")
class AdministCodeServiceTest {

    @BeforeEach
    void authenticateAdmin() {
        SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("admin", "ESNTL_admin", "ROLE_ADMIN"));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Mock
    private AdministCodeRepository administCodeRepository;

    @InjectMocks
    private AdministCodeService administCodeService;

    @Test
    @DisplayName("행정코드 목록 조회 성공")
    void getAdministCodeList_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        AdministCode entity = AdministCode.builder()
                .admdstCd("1100000000")
                .admdstZoneNm("서울특별시")
                .build();
        Page<AdministCode> page = new PageImpl<>(Collections.singletonList(entity));
        given(administCodeRepository.findAll(pageable)).willReturn(page);

        // when
        Page<AdministCodeDto> result = administCodeService.getAdministCodeList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAdmdstZoneNm()).isEqualTo("서울특별시");
    }

    @Test
    @DisplayName("행정코드 검색 조회 성공")
    void getAdministCodeList_WithSearch_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        AdministCode entity = AdministCode.builder()
                .admdstCd("1100000000")
                .admdstZoneNm("서울특별시")
                .build();
        Page<AdministCode> page = new PageImpl<>(Collections.singletonList(entity));
        given(administCodeRepository.findByAdmdstZoneNmContaining(eq("서울"), any())).willReturn(page);
 
        // when
        Page<AdministCodeDto> result = administCodeService.getAdministCodeList("서울", pageable);
 
        // then
        assertThat(result.getContent()).hasSize(1);
        verify(administCodeRepository).findByAdmdstZoneNmContaining(eq("서울"), any());
    }

    @Test
    @DisplayName("행정코드 상세 조회 테스트 - 존재하지 않는 경우")
    void getAdministCodeDetail_NotFound() {
        // given
        given(administCodeRepository.findById("NOT_FOUND")).willReturn(Optional.empty());

        nuri.foundation.core.exception.BusinessException error =
                org.junit.jupiter.api.Assertions.assertThrows(
                        nuri.foundation.core.exception.BusinessException.class,
                        () -> administCodeService.getAdministCodeDetail("NOT_FOUND"));

        assertThat(error.getErrorCode())
                .isEqualTo(nuri.business.domain.code.exception.CodeErrorCode.CODE_NOT_FOUND);
    }

    @Test
    @DisplayName("행정코드 등록 성공")
    void createAdministCode_Success() {
        // given
        AdministCodeDto dto = AdministCodeDto.builder()
                .admdstCd("1100000000")
                .admdstZoneNm("서울특별시")
                .build();
        AdministCode entity = AdministCode.builder()
                .admdstCd("1100000000")
                .admdstZoneNm("서울특별시")
                .build();
        given(administCodeRepository.save(any(AdministCode.class))).willReturn(entity);
 
        // when
        String result = administCodeService.createAdministCode(dto, "webmaster");
 
        // then
        assertThat(result).isEqualTo("1100000000");
        verify(administCodeRepository).save(any(AdministCode.class));
    }

    @Test
    @DisplayName("행정코드 수정 성공")
    void updateAdministCode_Success() {
        // given
        AdministCode entity = spy(AdministCode.builder()
                .admdstCd("1100000000")
                .admdstZoneNm("Old Name")
                .build());
        given(administCodeRepository.findById("1100000000")).willReturn(Optional.of(entity));
 
        AdministCodeDto dto = AdministCodeDto.builder()
                .admdstZoneNm("New Name")
                .build();
 
        // when
        administCodeService.updateAdministCode("1100000000", dto, "admin");
 
        // then
        verify(entity).update(any(), eq("New Name"), any(), any(), eq("admin"));
    }

    @Test
    @DisplayName("행정코드 수정 실패 - 존재하지 않는 경우")
    void updateAdministCode_NotFound_ThrowsException() {
        // given
        given(administCodeRepository.findById("NOT_FOUND")).willReturn(Optional.empty());
        AdministCodeDto dto = AdministCodeDto.builder().build();

        // when & then
        // [W1-F3] 미존재는 400 이 아니라 404 다.
        nuri.foundation.core.exception.BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(
                nuri.foundation.core.exception.BusinessException.class,
                () -> administCodeService.updateAdministCode("NOT_FOUND", dto, "admin"));
        org.junit.jupiter.api.Assertions.assertEquals(
                nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("행정코드 삭제 성공 — 하위 코드가 없을 때만 지운다")
    void deleteAdministCode_Success() {
        AdministCode entity = AdministCode.builder().admdstCd("1100000000").admdstZoneNm("서울특별시").build();
        given(administCodeRepository.findById("1100000000")).willReturn(Optional.of(entity));
        given(administCodeRepository.countByUpAdmdstCd("1100000000")).willReturn(0L);

        administCodeService.deleteAdministCode("1100000000");

        verify(administCodeRepository).delete(entity);
    }

    @Test
    @DisplayName("없는 행정코드 삭제는 조용히 성공하지 않는다")
    void deleteAdministCode_NotFound_ThrowsException() {
        given(administCodeRepository.findById("NOT_FOUND")).willReturn(Optional.empty());

        BusinessException error = assertThrows(BusinessException.class,
                () -> administCodeService.deleteAdministCode("NOT_FOUND"));

        assertThat(error.getErrorCode()).isEqualTo(CodeErrorCode.CODE_NOT_FOUND);
        verify(administCodeRepository, never()).delete(any());
    }

    @Test
    @DisplayName("하위 행정코드가 남아 있으면 상위 삭제를 거부한다 — 끊긴 상위 참조를 만들지 않는다")
    void deleteAdministCode_WithChildren_Rejected() {
        AdministCode entity = AdministCode.builder().admdstCd("1100000000").admdstZoneNm("서울특별시").build();
        given(administCodeRepository.findById("1100000000")).willReturn(Optional.of(entity));
        given(administCodeRepository.countByUpAdmdstCd("1100000000")).willReturn(3L);

        BusinessException error = assertThrows(BusinessException.class,
                () -> administCodeService.deleteAdministCode("1100000000"));

        assertThat(error.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        assertThat(error.getMessage()).contains("3");
        verify(administCodeRepository, never()).delete(any());
    }

    @Test
    @DisplayName("행정코드 쓰기는 서비스 계층에서도 일반 사용자를 거부한다")
    void administCodeWriteRequiresAdminAtServiceBoundary() {
        SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("user", "ESNTL_user", "ROLE_USER"));

        BusinessException error = assertThrows(BusinessException.class,
                () -> administCodeService.deleteAdministCode("1100000000"));

        assertThat(error.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verify(administCodeRepository, never()).delete(any());
    }
    /**
     * 상위 행정구역 지정의 무결성. [2026-09-17]
     *
     * <p>{@code tb_admdst_cd} 에는 자기참조 FK 가 없어 DB 가 아무것도 막지 않는다. 삭제 방향은
     * 하위 코드 가드가 닫았지만(DEC-OPS-061) 쓰기 방향은 통째로 열려 있었다 — 존재하지 않는 상위,
     * 자기 자신, 순환 중 어느 것도 거부되지 않았다.
     *
     * <p>분기마다 부정 테스트를 두는 이유는 이 클래스가 CI 뮤테이션 하드 게이트 범위이기 때문이다.
     */
    @Test
    @DisplayName("상위 행정구역은 실재해야 하고 자기 자신·순환은 거부한다 (빈 값은 최상위로 통과)")
    void rejectsMissingSelfReferencingAndCyclicParents() {
        SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("admin", "ESNTL_admin", "ROLE_ADMIN"));

        // (가) 없는 상위 — 404
        given(administCodeRepository.existsById("1111000000")).willReturn(false);
        given(administCodeRepository.existsById("9999999999")).willReturn(false);
        BusinessException missing = assertThrows(BusinessException.class,
                () -> administCodeService.createAdministCode(dto("1111000000", "9999999999"), "admin"));
        assertThat(missing.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);

        // (나) 자기 자신 — 400. 저장되면 하위 건수 집계가 자기 자신을 세어 삭제까지 막힌다.
        BusinessException self = assertThrows(BusinessException.class,
                () -> administCodeService.createAdministCode(dto("1111000000", "1111000000"), "admin"));
        assertThat(self.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);

        // (다) 2단 순환 — A→B, B→A. FK 로는 막지 못하는 형태다.
        given(administCodeRepository.existsById("2200000000")).willReturn(true);
        given(administCodeRepository.findById("2200000000")).willReturn(java.util.Optional.of(
                AdministCode.builder().admdstCd("2200000000").upAdmdstCd("1111000000").build()));
        BusinessException cycle = assertThrows(BusinessException.class,
                () -> administCodeService.createAdministCode(dto("1111000000", "2200000000"), "admin"));
        assertThat(cycle.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);

        // (라) 대조군 — 빈 값은 최상위다. 시·도 등록을 막으면 안 된다(DEC-OPS-061 이 푼 제약).
        given(administCodeRepository.save(any())).willAnswer(call -> call.getArgument(0));
        administCodeService.createAdministCode(dto("1111000000", ""), "admin");
        verify(administCodeRepository).save(any());
    }

    @Test
    @DisplayName("이미 등록된 코드로 등록하면 거부한다 — save() 가 merge 라 기존 행이 조용히 덮인다")
    void rejectsDuplicateCodeOnCreate() {
        SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("admin", "ESNTL_admin", "ROLE_ADMIN"));
        given(administCodeRepository.existsById("1100000000")).willReturn(true);

        BusinessException duplicate = assertThrows(BusinessException.class,
                () -> administCodeService.createAdministCode(dto("1100000000", ""), "admin"));

        assertThat(duplicate.getErrorCode())
                .isEqualTo(nuri.business.domain.code.exception.CodeErrorCode.DUPLICATE_CODE);
        verify(administCodeRepository, never()).save(any());
    }

    private static AdministCodeDto dto(String code, String parent) {
        AdministCodeDto dto = new AdministCodeDto();
        dto.setAdmdstCd(code);
        dto.setUpAdmdstCd(parent);
        dto.setAdmdstSeCd("1");
        dto.setAdmdstZoneNm("시험 구역");
        dto.setUseYn("Y");
        return dto;
    }
}
