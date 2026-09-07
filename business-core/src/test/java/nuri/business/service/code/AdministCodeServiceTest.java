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
                new TestingAuthenticationToken("admin", null, "ROLE_ADMIN"));
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
                new TestingAuthenticationToken("user", null, "ROLE_USER"));

        BusinessException error = assertThrows(BusinessException.class,
                () -> administCodeService.deleteAdministCode("1100000000"));

        assertThat(error.getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verify(administCodeRepository, never()).delete(any());
    }
}
