package com.company.project.service.code;

import com.company.project.domain.code.AdministCode;
import com.company.project.repository.code.AdministCodeRepository;
import com.company.project.service.code.dto.AdministCodeDto;
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

@ExtendWith(MockitoExtension.class)
class AdministCodeServiceTest {

    @Mock
    private AdministCodeRepository administCodeRepository;

    @InjectMocks
    private AdministCodeService administCodeService;

    @Test
    @DisplayName("행정코드 목록 조회 테스트")
    void getAdministCodeList_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        AdministCode entity = AdministCode.builder()
                .administZoneCode("1100000000")
                .administZoneNm("서울특별시")
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
    @DisplayName("행정코드 검색 조회 테스트")
    void getAdministCodeList_WithSearch_Success() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        AdministCode entity = AdministCode.builder()
                .administZoneCode("1100000000")
                .administZoneNm("서울특별시")
                .build();
        Page<AdministCode> page = new PageImpl<>(Collections.singletonList(entity));
        given(administCodeRepository.findByAdministZoneNmContaining(eq("서울"), any())).willReturn(page);

        // when
        Page<AdministCodeDto> result = administCodeService.getAdministCodeList("서울", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        verify(administCodeRepository).findByAdministZoneNmContaining(eq("서울"), any());
    }

    @Test
    @DisplayName("행정코드 상세 조회 테스트")
    void getAdministCodeDetail_Success() {
        // given
        AdministCode entity = AdministCode.builder()
                .administZoneCode("1100000000")
                .administZoneNm("서울특별시")
                .build();
        given(administCodeRepository.findById("1100000000")).willReturn(Optional.of(entity));

        // when
        AdministCodeDto result = administCodeService.getAdministCodeDetail("1100000000");

        // then
        assertThat(result.getAdministZoneNm()).isEqualTo("서울특별시");
    }

    @Test
    @DisplayName("행정코드 등록 테스트")
    void createAdministCode_Success() {
        // given
        AdministCodeDto dto = AdministCodeDto.builder()
                .administZoneCode("1100000000")
                .administZoneNm("서울특별시")
                .build();
        AdministCode entity = AdministCode.builder()
                .administZoneCode("1100000000")
                .administZoneNm("서울특별시")
                .build();
        given(administCodeRepository.save(any(AdministCode.class))).willReturn(entity);

        // when
        String result = administCodeService.createAdministCode(dto, "webmaster");

        // then
        assertThat(result).isEqualTo("1100000000");
        verify(administCodeRepository).save(any(AdministCode.class));
    }

    @Test
    @DisplayName("행정코드 삭제 테스트")
    void deleteAdministCode_Success() {
        // when
        administCodeService.deleteAdministCode("1100000000");

        // then
        verify(administCodeRepository).deleteById("1100000000");
    }
}
