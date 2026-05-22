package nuri.foundation.service.code;

import nuri.foundation.domain.code.AdministCode;
import nuri.foundation.repository.code.AdministCodeRepository;
import nuri.foundation.service.code.dto.AdministCodeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.spy;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdministCodeService (행정코드 관리) 테스트")
class AdministCodeServiceTest {

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
        assertThat(result.getContent().get(0).getAdministZoneNm()).isEqualTo("서울특별시");
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

        // when
        AdministCodeDto result = administCodeService.getAdministCodeDetail("NOT_FOUND");

        // then
        assertThat(result).isNull();
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
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class, () -> {
            administCodeService.updateAdministCode("NOT_FOUND", dto, "admin");
        });
    }

    @Test
    @DisplayName("행정코드 삭제 성공")
    void deleteAdministCode_Success() {
        // when
        administCodeService.deleteAdministCode("1100000000");

        // then
        verify(administCodeRepository).deleteById("1100000000");
    }
}
